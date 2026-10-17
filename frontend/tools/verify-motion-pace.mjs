import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {authenticatedUi,openAuthenticatedPage} from './authenticated-ui-fixture.mjs';
import {referenceSamples,motionSample,sampleProgress} from './curtain-reference.mjs';
import {connectDevTools} from './devtools-client.mjs';

const base=process.env.UI_ORIGIN??'http://127.0.0.1:5187';
const output=resolve(process.env.UI_OUTPUT??'../output/playwright/motion-pace-v01');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist','--remote-debugging-port=9236']});
// Measure playback without the video encoder; capture motion separately after timing checks.
const context=await browser.newContext({viewport:{width:1440,height:900}});
await authenticatedUi(context);
await context.route('**/api/v1/account/settings',r=>r.fulfill({json:{library:null}}));
const page=await context.newPage(),report={checks:[],samples:[],timings:[],notices:[],errors:[],status:'running'};
let mcp;
page.on('pageerror',e=>report.errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
const ready=()=>page.locator('#app[data-initialized=true][data-ready=ready]:not([inert])').waitFor();
const frames=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const pass=label=>{report.checks.push(label);console.log('PASS '+label);};
function compare(actual,expected,path=''){
  if(typeof expected==='object'){for(const key of Object.keys(expected))compare(actual[key],expected[key],path+'.'+key);return;}
  const numbers=s=>s.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number)??[];
  const a=numbers(actual),b=numbers(expected);assert.equal(a.length,b.length,path);
  if(!b.length)assert.equal(actual,expected,path);
  b.forEach((v,i)=>assert(Math.abs(a[i]-v)<.002,path+': '+actual+' / '+expected));
}
async function record(selector){
  await page.evaluate(selector=>{
    window.__pace={selector,frames:[],times:[],start:undefined,end:undefined};
    const tick=now=>{const s=window.__pace,e=document.querySelector(selector),playing=e?.dataset.state==='playing'||e?.querySelector('.curtain-motion-clock')?.getAnimations()[0]?.playState==='running';
      if(playing){if(s.start===undefined)s.start=now;if(s.previous!==undefined)s.frames.push(now-s.previous);s.previous=now;s.times.push(e?.dataset.progress??'');}
      else if(s.start!==undefined&&!e){s.end=now;return;}
      requestAnimationFrame(tick);
    };requestAnimationFrame(tick);
  },selector);
}
async function timing(label,duration){
  const data=await page.evaluate(()=>window.__pace);assert(data.end!==undefined,label+' complete');
  const elapsed=data.end-data.start;
  report.timings.push({label,elapsed,frames:data.frames.length,p95:data.frames.toSorted((a,b)=>a-b)[Math.floor(data.frames.length*.95)],over50:data.frames.filter(t=>t>50).length});
  assert(elapsed>=duration-80&&elapsed<duration+200,label+': '+elapsed);
  assert(data.frames.length>=duration/1000*50-3,label+' should retain at least 50fps');
  assert(data.frames.filter(t=>t>50).length<=5,label+' excessive long frames');
}
try{
  const reference=await referenceSamples(browser,base,output);assert.equal(reference.duration,3.3);
  await page.goto(base+'/#/account');await ready();
  await page.locator('.entry-login').press('Enter');
  await page.waitForFunction(()=>document.querySelector('.curtain-transition')?.dataset.duration==='1800');
  for(const p of sampleProgress.slice(0,-1)){
    await page.locator('.curtain-transition').evaluate((e,p)=>e.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=Number(e.dataset.duration)*p;}),p);await frames();
    const sample=await motionSample(page),{progress,...expected}=reference.samples.find(s=>s.progress===p);compare(sample,expected);report.samples.push({progress,...sample});
    if([0,.5,.999].includes(p))await page.screenshot({path:resolve(output,'curtain-'+Math.round(p*1000)+'.png')});
  }
  await page.locator('.curtain-transition').evaluate(e=>e.getAnimations({subtree:true}).forEach(a=>a.play()));await page.locator('.curtain-transition').waitFor({state:'detached'});await ready();
  assert.equal(await page.locator('.auth-curtain-corners').count(),1);
  pass('1.8秒拉帘保留v6七个进度的全部形态、显影与连续终态');

  for(const mode of ['login','register']){
    await page.evaluate(()=>location.hash='/account');await ready();await record('.curtain-transition');await page.locator('.entry-'+mode).press('Enter');
    await page.locator('.curtain-transition').waitFor({state:'detached'});await frames();await ready();await timing('curtain-'+mode,1800);
    assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.id==='curtain-pull').length),0);
  }
  pass('登录与注册连续播放约1.8秒，帧率与时钟释放正常');
  await openAuthenticatedPage(page,base+'/?pace-auth=1#/');
  for(const [width,height] of [[1920,1080],[1440,900],[1280,720]]){
    await page.setViewportSize({width,height});await frames();await ready();
    for(const route of ['/','/favorites','/profile']){
      await page.evaluate(route=>location.hash=route,route);await ready();
      const trigger=route==='/profile'?'[data-preference=motion]':'[data-favorite]';
      // Favorites gets a saved item from the preceding home action.
      await page.evaluate(()=>{
        window.__noticeObserver?.disconnect();window.__noticeTiming={};
        window.__noticeObserver=new MutationObserver(records=>{
          for(const {target} of records)if(target instanceof HTMLElement&&target.matches('.toast')){
            if(!target.hidden)window.__noticeTiming.start=performance.now();
            else if(window.__noticeTiming.start!==undefined)window.__noticeTiming.elapsed=performance.now()-window.__noticeTiming.start;
          }
        });
        window.__noticeObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden']});
      });
      const before=await page.evaluate(()=>performance.now());await page.locator(trigger).first().press(route==='/profile'?'Space':'Enter');
      await page.evaluate(()=>scrollTo(0,0));
      const toast=page.locator('.toast');await toast.waitFor({state:'visible'});
      const geometry=await toast.evaluate(e=>{const r=e.getBoundingClientRect(),h=document.querySelector('.navigation');return {x:r.x,y:r.y,width:r.width,height:r.height,center:h.getBoundingClientRect().height/2,brand:h.querySelector('.brand-group').getBoundingClientRect().right,nav:h.querySelector('nav').getBoundingClientRect().left};});
      assert(Math.abs(geometry.y+geometry.height/2-geometry.center)<2);assert(geometry.x>=geometry.brand+20&&geometry.x+geometry.width<=geometry.nav-20);
      assert(geometry.height<=78&&geometry.y>=0);
      if(route==='/profile')await page.screenshot({path:resolve(output,'notice-profile-'+width+'.png')});
      await page.waitForTimeout(1000);assert(await toast.isVisible());await toast.waitFor({state:'hidden'});
      const {elapsed}=await page.evaluate(()=>{window.__noticeObserver.disconnect();return window.__noticeTiming;});assert(elapsed>=1400&&elapsed<2000);
      const actionElapsed=await page.evaluate(()=>performance.now())-before;
      report.notices.push({route,width,elapsed,actionElapsed,...geometry});
      if(route==='/profile'){await page.locator('[data-preference=motion]').press('Space');await toast.waitFor({state:'hidden'});}
    }
  }
  pass('三种桌面尺寸、总览/收藏/个人中心提示与导航同高，无重叠，约1.5秒收起');

  await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>location.hash='/');await ready();
  for(const [scene,duration] of [['jiangxue',1200],['baidicheng',900],['fengqiao',1000]]){
    await record('.realm-transition');await page.locator(`[data-poem=${scene}] .enter-button`).press('Enter');
    await page.locator('body[data-page=poem]').waitFor();await frames();await timing('entry-'+scene,duration);
    assert.equal(await page.locator('.realm-transition').count(),0);
    if(scene==='fengqiao')assert(await page.evaluate(()=>window.__POETIC_SCENE__?.ready));
    await record('.page-return');await page.locator('[data-back]').press('Enter');await page.locator('body[data-page=home]').waitFor();await frames();await timing('return-'+scene,700);
  }
  pass('三诗实际入境约0.9–1.2秒，真实三维首帧后火光正常，翻页约0.7秒');
  const blocked=await browser.newContext({viewport:{width:1280,height:720},reducedMotion:'reduce'});await authenticatedUi(blocked);await blocked.route('**/api/v1/account/settings',r=>r.fulfill({json:{library:null}}));
  await blocked.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('fixture','QuotaExceededError');};});
  const bp=await blocked.newPage();await openAuthenticatedPage(bp,base+'/#/');await bp.locator('[data-favorite]').first().press('Enter');
  await bp.locator('.storage-warning').waitFor({state:'visible'});await bp.waitForTimeout(1000);assert(await bp.locator('.storage-warning').isVisible());await bp.locator('.storage-warning').waitFor({state:'hidden'});assert(await bp.locator('.toast').isHidden());await blocked.close();
  pass('存储警告也自动收起，减少动态仍可完成入口和提示');

  mcp=await connectDevTools(output,9236);report.nativeServer=mcp.server;
  const list=mcp.text(await mcp.call('list_pages')),selected=list.split('\n').find(s=>s.includes(base+'/')&&s.includes('#/'));assert(selected);const pageId=Number(selected.match(/^(\d+):/)[1]);
  await mcp.call('select_page',{pageId,bringToFront:true});report.dom=mcp.text(await mcp.call('take_snapshot',{pageId}));
  await page.locator('[data-favorite]').first().press('Enter');await mcp.call('take_screenshot',{pageId,filePath:resolve(output,'native-nav-notice.png')});
  report.console=mcp.text(await mcp.call('list_console_messages',{pageId,types:['error','warn']}));assert.deepEqual(report.errors,[]);
  pass('真实Chrome DevTools MCP检查DOM、顶部提示截图与Console');report.status='pass';
}catch(error){report.status='failed';report.failure=error.stack;await page.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});throw error;}
finally{const video=page.video();await context.close();if(video)report.video=await video.path();await writeFile(resolve(output,'verification.json'),JSON.stringify(report,null,2));mcp?.close();await browser.close();}
console.log(JSON.stringify({status:report.status,checks:report.checks,output}));
