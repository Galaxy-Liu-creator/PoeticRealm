import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {authenticatedUi,openAuthenticatedPage} from './authenticated-ui-fixture.mjs';

const base=process.env.UI_ORIGIN??'http://127.0.0.1:5187';
const out=resolve(process.env.UI_OUTPUT??'output/jiangxue-product-v01/validation/browser');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']});
const report={scope:'normal authenticated product routes; actual v06 assets; isolated account API',checks:[],errors:[],networkFailures:[],disposals:[],status:'running'};
async function fixture(context){
  await authenticatedUi(context);let library=null;
  await context.route('**/api/v1/account/settings',async route=>{
    if(route.request().method()==='PUT')library=route.request().postDataJSON();
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({library})});
  });
  await context.addInitScript(()=>{
    window.__jxDisposals=[];window.__jxReadbacks=0;window.__jxAnalysers=[];
    for(const name of ['jiangxue:disposed','fengqiao:disposed'])window.addEventListener(name,event=>window.__jxDisposals.push({scene:name,...event.detail}));
    const capture=HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL=function(...args){if(this.hasAttribute('data-scene-canvas'))window.__jxReadbacks++;return capture.apply(this,args);};
    const connect=AudioNode.prototype.connect;
    AudioNode.prototype.connect=function(destination,...args){if(destination instanceof AudioDestinationNode){const analyser=this.context.createAnalyser();connect.call(this,analyser);window.__jxAnalysers.push(analyser);}return connect.call(this,destination,...args);};
  });
}
const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});await fixture(context);
const page=await context.newPage();page.setDefaultTimeout(60000);
page.on('pageerror',error=>report.errors.push(error.message));
page.on('requestfailed',request=>report.networkFailures.push({url:request.url(),error:request.failure()?.errorText}));
page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
const shot=name=>page.screenshot({path:resolve(out,name+'.png'),timeout:15000});
const check=label=>{report.checks.push(label);console.log('PASS '+label);};
const seek=t=>page.evaluate(t=>{window.__POETIC_SCENE__.pause();window.__POETIC_SCENE__.seek(t);},t);
const details=()=>page.evaluate(()=>window.__POETIC_SCENE__.details());
const enter=async(id='jiangxue')=>{
  await page.locator(`[data-poem=${id}] .enter-button`).focus();await page.keyboard.press('Enter');
  await page.waitForFunction(id=>window.__POETIC_SCENE__?.ready&&window.__POETIC_SCENE__.id===id,id,{timeout:60000});
};
const back=async()=>{await page.locator('[data-back]').click();await page.locator('body[data-page=home]').waitFor();};
try{
  await page.goto(base+'/');await page.locator('body[data-page=account] [data-curtain]').first().waitFor();
  assert.equal(await page.locator('[data-scene-canvas]').count(),0);check('普通打开仍先展示大帘幕');
  await openAuthenticatedPage(page,base+'/#/');
  await page.evaluate(()=>window.__POETIC_MOTION__.pause());
  await page.locator('[data-poem=jiangxue] .enter-button').focus();await page.keyboard.press('Enter');
  await page.locator('.realm-jiangxue[data-state=playing]').waitFor();
  assert(page.url().endsWith('#/'));
  await page.evaluate(()=>window.__stagedJiangxue=document.querySelector('.realm-target [data-scene-canvas]'));
  if(!process.argv.includes('--skip-entry-frames'))for(const p of [0,.25,.5,.75]){await page.evaluate(p=>window.__POETIC_MOTION__.transition(p),p);await shot('snow-entry-'+p);}
  await page.evaluate(()=>window.__POETIC_MOTION__.transition(1));
  await page.waitForFunction(()=>window.__POETIC_SCENE__?.id==='jiangxue');
  assert(await page.evaluate(()=>window.__stagedJiangxue===document.querySelector('#app [data-scene-canvas]')));
  assert(page.url().endsWith('#/poems/jiangxue'));await page.evaluate(()=>window.__POETIC_MOTION__.play());
  report.asset=await details();assert.equal(report.asset.model,'models/jiangxue/scene_v06.glb');
  check('雪幕准备真实v06首帧，完成入境后复用同一Canvas');
  await seek(8);
  assert.deepEqual(await page.locator('[aria-label=原诗] .poem-line-button').allTextContents(),['千山鸟飞绝','万径人踪灭','孤舟蓑笠翁','独钓寒江雪']);
  report.views=[];
  for(const view of ['CAM_birds','CAM_path','CAM_boat','CAM_fisherman']){
    await page.locator(`.poem-line-button[data-scene-view=${view}]`).focus();await page.keyboard.press('Enter');
    const data=await details();assert.equal(data.view.name,view);report.views.push(data.view);await shot('verse-'+view);
  }
  assert.equal(new Set(report.views.map(v=>JSON.stringify(v.camera))).size,4);check('四句原诗竖排右起，键盘切换对应Blender机位');
  await page.locator('[data-scene-view=CAM_enter]').click();await seek(8);
  const first=await shot('fixed-t8');await seek(23);await seek(8);assert.equal(createHash('sha256').update(first).digest('hex'),createHash('sha256').update(await shot('fixed-t8-repeat')).digest('hex'));
  await page.evaluate(()=>window.__savedJiangxue=document.querySelector('[data-scene-canvas]'));
  await page.locator('[data-favorite=jiangxue]').click();
  assert(await page.evaluate(()=>window.__savedJiangxue===document.querySelector('[data-scene-canvas]')));
  assert.equal((await page.evaluate(()=>window.__POETIC_SCENE__.state())).t,8);
  check('确定性跳转重放一致，收藏重绘保留模型、时间和视角');
  await page.locator('[data-notes]').first().click();assert(await page.locator('#poem-notes').isVisible());
  await page.locator('[aria-label=关闭笺注]').click();
  await page.locator('[data-fullscreen]').click();await page.waitForFunction(()=>!!document.fullscreenElement);
  assert(await page.locator('[data-scene-canvas]').evaluate(canvas=>Math.abs(canvas.clientHeight-innerHeight)<2));await page.evaluate(()=>document.exitFullscreen());
  const replay=await page.locator('[data-scene-replay]').evaluate(button=>{button.click();return window.__POETIC_SCENE__.state();});assert.equal(replay.t,0);assert(replay.playing);assert.equal((await details()).view.name,'CAM_enter');
  check('笺注译文、全屏与重看可用');
  if((await details()).audio.muted||(await details()).audio.state!=='running')await page.locator('[data-scene-sound]').click();
  await seek(8);await page.locator('[data-scene-pause]').click();
  await page.waitForFunction(()=>window.__POETIC_SCENE__.details().audio.loops===2);
  report.audio=(await details()).audio;assert.deepEqual(report.audio.sounds,['wind','water']);assert.deepEqual(report.audio.events,[]);
  const rms=await page.evaluate(()=>Math.max(...window.__jxAnalysers.map(analyser=>{const values=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(values);return Math.sqrt(values.reduce((s,n)=>s+n*n,0)/values.length);})));assert(rms>0,'No actual audio samples');
  await page.locator('[data-scene-sound]').click();assert((await details()).audio.muted);await seek(23);assert.equal((await details()).audio.voices,0);
  check('真实WebAudio仅轻风/水声，暂停、静音与释放生效');
  for(const [width,height] of [[1920,1080],[1440,900],[1280,720]]){
    await page.setViewportSize({width,height});await seek(8);await page.locator('[data-scene-view=CAM_enter]').click();await shot('product-'+width);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const overlap=await page.evaluate(()=>{const a=document.querySelector('.poem-toolbar').getBoundingClientRect(),b=document.querySelector('.scene-controls').getBoundingClientRect();return Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));});assert.equal(overlap,0);
  }
  check('1920、1440、1280桌面布局无横向溢出或工具遮挡');
  await page.setViewportSize({width:1920,height:1080});await seek(8);
  await page.evaluate(()=>{window.__jxReadbacks=0;window.__POETIC_MOTION__.pause();});await page.locator('[data-back]').click();await page.locator('.page-return[data-state=playing]').waitFor();
  const frozen=await page.evaluate(()=>({readbacks:window.__jxReadbacks,sources:[...document.querySelectorAll('[data-scene-snapshot]')].map(image=>image.src),playing:window.__POETIC_SCENE__.state().playing}));
  assert.equal(frozen.readbacks,1);assert.equal(frozen.sources.length,48);assert.equal(new Set(frozen.sources).size,1);assert.equal(frozen.playing,false);
  for(const p of [0,.5,.75]){await page.evaluate(p=>window.__POETIC_MOTION__.return(p),p);await shot('return-'+p);}
  await page.keyboard.press('Escape');assert(page.url().endsWith('#/poems/jiangxue'));await page.evaluate(()=>window.__POETIC_MOTION__.play());await back();
  report.disposals=await page.evaluate(()=>window.__jxDisposals);assert.deepEqual(report.disposals.at(-1).memory,{geometries:0,textures:0});
  assert.equal(await page.locator('[data-scene-canvas]').count(),0);check('翻页仅一次捕获、48条带共用；取消可恢复，返回后资源归零');
  await page.emulateMedia({reducedMotion:'reduce'});await enter();const reduced=await details();assert(reduced.reducedMotion);assert.equal((await page.evaluate(()=>window.__POETIC_SCENE__.state())).playing,false);
  await seek(23);assert.equal((await details()).navigation.effectiveTime,0);
  await page.locator('.poem-line-button[data-scene-view=CAM_boat]').click();await back();
  check('减少动态固定舟位，保留读诗、选景和返回');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{location.hash='/poems/jiangxue';});await page.waitForFunction(()=>window.__POETIC_SCENE__?.id==='jiangxue');await back();
  await enter('fengqiao');assert.equal((await details()).audio.profile,'fengqiao');await seek(8);await page.locator('.poem-line-button[data-scene-view=CAM_temple]').click();await back();await enter();await back();
  report.disposals=await page.evaluate(()=>window.__jxDisposals);for(const d of report.disposals)assert.deepEqual(d.memory,{geometries:0,textures:0});
  report.audioContexts=await page.evaluate(()=>[...new Set(window.__jxAnalysers.map(a=>a.context))].map(c=>c.state));assert(report.audioContexts.includes('closed'));
  check('同页直达江雪、枫桥往返及多次重入无场景串用或资源增长');
  const fault=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});await fixture(fault);
  const fp=await fault.newPage();fp.setDefaultTimeout(60000);await openAuthenticatedPage(fp,base+'/#/');
  await fp.route('**/models/jiangxue/scene_v06.glb',route=>route.fulfill({status:404,body:'missing asset fixture'}));
  await fp.locator('[data-poem=jiangxue] .enter-button').click();await fp.locator('.realm-transition[data-state=failed]').waitFor();assert(fp.url().endsWith('#/'));
  await fp.unroute('**/models/jiangxue/scene_v06.glb');await fp.locator('.realm-transition [data-retry]').click();await fp.waitForFunction(()=>window.__POETIC_SCENE__?.id==='jiangxue');
  await fp.locator('[data-back]').click();await fp.locator('body[data-page=home]').waitFor();
  let release,requested;const held=new Promise(r=>release=r),request=new Promise(r=>requested=r);
  await fp.route('**/models/jiangxue/scene_v06.glb',async route=>{requested();await held;await route.continue().catch(()=>{});});
  await fp.locator('[data-poem=jiangxue] .enter-button').click();await request;await fp.locator('.realm-transition [data-cancel]').click();release();await fp.waitForTimeout(1200);
  assert(fp.url().endsWith('#/'));assert.equal(await fp.locator('.realm-transition').count(),0);assert.equal(await fp.locator('[data-scene-canvas]').count(),0);await fault.close();
  check('模型404可重试，加载中取消保留原页面并丢弃迟到结果');
  assert.deepEqual(report.errors,[]);report.status='pass';
}catch(error){report.failure=error.stack;report.status='failed';report.page=await page.evaluate(()=>({route:location.hash,page:document.body.dataset.page,transition:document.querySelector('.realm-transition')?.dataset,sceneStatus:document.querySelector('.poem-scene-status')?.textContent,ready:!!window.__POETIC_SCENE__})).catch(()=>null);await shot('failure').catch(()=>{});throw error;}
finally{await writeFile(resolve(out,'verification.json'),JSON.stringify(report,null,2));await context.close();await browser.close();}
console.log(JSON.stringify({status:report.status,checks:report.checks.length,out}));
