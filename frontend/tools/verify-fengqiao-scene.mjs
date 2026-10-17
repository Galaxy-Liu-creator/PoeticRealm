import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {PNG} from 'pngjs';
import {authenticatedUi,openAuthenticatedPage} from './authenticated-ui-fixture.mjs';
import {connectDevTools} from './devtools-client.mjs';

const base=process.env.UI_ORIGIN??'http://127.0.0.1:5187';
const output=resolve(process.env.UI_OUTPUT??'../output/playwright/fengqiao-scene-v03/product');
const measurePerformance=process.argv.includes('--perf');
await mkdir(output,{recursive:true});
const report={scope:measurePerformance?'product-flow-and-named-view-performance':'product-flow-and-visual-smoke',checks:[],errors:[],disposals:[],status:'running'};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist','--remote-debugging-port=9228']});
async function fixture(context){await authenticatedUi(context);await context.route('**/api/v1/account/settings',r=>r.fulfill({status:200,contentType:'application/json',body:'{"library":null}'}));}
// Screencast readbacks are measured separately from the scene's steady frame budget.
const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,...(!measurePerformance?{recordVideo:{dir:output+'/video',size:{width:1440,height:810}}}:{})});
await fixture(context);
await context.addInitScript(()=>{
  window.__sceneDisposals=[];window.__sceneReadbacks=0;
  window.addEventListener('fengqiao:disposed',e=>window.__sceneDisposals.push({memory:e.detail.memory}));
  const original=HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL=function(...args){if(this.hasAttribute('data-scene-canvas'))window.__sceneReadbacks++;return original.apply(this,args);};
  const connect=AudioNode.prototype.connect;window.__sceneAnalysers=[];
  AudioNode.prototype.connect=function(destination,...args){if(destination instanceof AudioDestinationNode){const analyser=this.context.createAnalyser();analyser.fftSize=2048;connect.call(this,analyser);window.__sceneAnalysers.push(analyser);}return connect.call(this,destination,...args);};
});
const page=await context.newPage();let mcp;
page.on('pageerror',e=>report.errors.push(e.message));
page.on('console',e=>{if(e.type()==='error')report.errors.push(e.text());});
const check=label=>{report.checks.push(label);console.log('PASS '+label);};
const shot=name=>page.screenshot({path:resolve(output,name+'.png')});
const seek=t=>page.evaluate(t=>{window.__POETIC_SCENE__.pause();window.__POETIC_SCENE__.seek(t);},t);
const details=()=>page.evaluate(()=>window.__POETIC_SCENE__.details());
const enter=async()=>{await page.locator('[data-poem=fengqiao] .enter-button').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>window.__POETIC_SCENE__?.ready,null,{timeout:45000});};
function delta(a,b){const x=PNG.sync.read(a),y=PNG.sync.read(b);let changed=0;for(let i=0;i<x.data.length;i+=4)if(Math.abs(x.data[i]-y.data[i])+Math.abs(x.data[i+1]-y.data[i+1])+Math.abs(x.data[i+2]-y.data[i+2])>20)changed++;return changed;}
try {
  await openAuthenticatedPage(page,base+'/#/');
  await page.evaluate(()=>window.__POETIC_MOTION__.pause());
  await page.locator('[data-poem=fengqiao] .enter-button').focus();await page.keyboard.press('Enter');
  await page.locator('.realm-transition[data-state=playing]').waitFor({timeout:45000});
  await page.evaluate(()=>window.__preparedCanvas=document.querySelector('.realm-target [data-scene-canvas]'));
  for(const p of [0,.25,.5,.75]){await page.evaluate(p=>window.__POETIC_MOTION__.transition(p),p);await shot('entry-p'+p);}
  await page.evaluate(()=>window.__POETIC_MOTION__.transition(1));
  await page.waitForFunction(()=>window.__POETIC_SCENE__?.ready);
  assert(await page.evaluate(()=>window.__preparedCanvas===document.querySelector('#app [data-scene-canvas]')));
  assert(page.url().endsWith('#/poems/fengqiao'));
  await page.evaluate(()=>window.__POETIC_MOTION__.play());
  check('火光入境准备真实首帧，提交前路由保留，完成后接管同一个Canvas');
  if(measurePerformance){
    report.performance=[];
    const views=(process.env.UI_PERF_VIEWS??'CAM_moonset,CAM_rower,CAM_temple').split(',');
    for(const view of views){
      await page.evaluate(view=>{window.__POETIC_SCENE__.setView(view);window.__POETIC_SCENE__.seek(0);window.__POETIC_SCENE__.play();},view);
      await page.waitForTimeout(1000);
      const sample=await page.evaluate(async()=>{const times=[],states=[];await new Promise(resolve=>{let start;const tick=now=>{start??=now;times.push(now);states.push(window.__POETIC_SCENE__.state());if(now-start<60000)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});const intervals=times.slice(1).map((t,i)=>t-times[i]).sort((a,b)=>a-b),duration=times.at(-1)-times[0];return {fps:(times.length-1)*1000/duration,p95:intervals[Math.floor(intervals.length*.95)],over50:intervals.filter(t=>t>50).length,maxCalls:Math.max(...states.map(s=>s.calls)),maxTriangles:Math.max(...states.map(s=>s.triangles)),audio:window.__POETIC_SCENE__.details().audio};});
      report.performance.push({view,...sample,passed:sample.fps>=50&&sample.p95<=20&&sample.maxCalls<=120});console.log('PERF '+JSON.stringify(report.performance.at(-1)));await writeFile(resolve(output,'progress.json'),JSON.stringify(report,null,2));
    }
    await page.evaluate(()=>window.__POETIC_SCENE__.setView('CAM_moonset'));
    assert(report.performance.every(sample=>sample.passed),'完整页面与声音近景性能门禁失败，'+report.performance.length+'轮证据已保留');
    check('真实产品路由含声音，'+views.length+'个指定机位各60秒性能通过');
  }
  await page.evaluate(()=>window.__POETIC_SCENE__.setView('CAM_moonset'));
  await seek(0);const first=await shot('moon-t0');report.moon=[];
  {const image=PNG.sync.read(first);let moonPixels=0;for(let y=100;y<360;y++)for(let x=700;x<1200;x++){const i=(y*image.width+x)*4;if(image.data[i]>150&&image.data[i+1]>150&&image.data[i+2]>150)moonPixels++;}assert(moonPixels>100,'落月在真实天空画面中不可见');report.visibleMoonPixels=moonPixels;}
  for(const t of [0,8,16,24,32,40]){await seek(t);report.moon.push({t,...(await details()).moon});await shot('moon-t'+t);}
  assert(report.moon[0].visible&&!report.moon[4].visible);assert.deepEqual({...report.moon[4],t:40},report.moon[5]);
  assert(report.moon.slice(1,5).every((s,i)=>s.height<report.moon[i].height));
  await seek(0);assert.deepEqual(first,await shot('moon-repeat'));
  await seek(16);const fog=await shot('fog-on');await page.evaluate(()=>window.__POETIC_SCENE__.setFog(false));const clear=await shot('fog-off');
  assert(delta(fog,clear)>1000);await page.evaluate(()=>window.__POETIC_SCENE__.setFog(true));
  check('月落32秒后保持夜景，同刻重放像素一致；雾实际改变岸边与水面画面');
  report.views=[];
  for(const view of ['CAM_moonset','CAM_riverbank','CAM_temple','CAM_boat']){await page.locator(`.poem-line-button[data-scene-view=${view}]`).focus();await page.keyboard.press('Enter');report.views.push({view,...(await details()).view});await shot('verse-'+view);}
  assert.equal(new Set(report.views.map(v=>JSON.stringify(v.camera))).size,4);
  await page.evaluate(()=>window.__savedCanvas=document.querySelector('[data-scene-canvas]'));
  await seek(16);await page.locator('[data-favorite=fengqiao]').click();
  assert(await page.evaluate(()=>window.__savedCanvas===document.querySelector('[data-scene-canvas]')));assert.equal((await page.evaluate(()=>window.__POETIC_SCENE__.state())).t,16);
  check('四句可键盘切换现有机位，收藏重绘保留Canvas、时间和视角');
  await page.locator('[data-fullscreen]').click();await page.waitForFunction(()=>!!document.fullscreenElement);
  assert(await page.locator('[data-scene-canvas]').evaluate(e=>Math.abs(e.clientHeight-innerHeight)<2));await page.evaluate(()=>document.exitFullscreen());
  await page.locator('[data-scene-replay]').click();assert((await page.evaluate(()=>window.__POETIC_SCENE__.state())).t<.3);assert((await details()).moon.visible);assert((await page.evaluate(()=>window.__POETIC_SCENE__.state())).playing);
  if((await details()).audio.muted||(await details()).audio.state!=='running')await page.locator('[data-scene-sound]').click();await seek(4.95);await page.locator('[data-scene-pause]').click();await page.waitForTimeout(650);
  report.audioAfterCrow=(await details()).audio;
  assert.equal(report.audioAfterCrow.state,'running');assert.equal(report.audioAfterCrow.loops,2);assert(report.audioAfterCrow.events.includes('crow'));
  report.audioRms=await page.evaluate(()=>{const analyser=window.__sceneAnalysers.findLast(a=>a.context.state==='running'),data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);return Math.sqrt(data.reduce((s,n)=>s+n*n,0)/data.length);});assert(report.audioRms>.00001,'真实WebAudio输出无声');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  const hiddenTime=await page.evaluate(()=>window.__POETIC_SCENE__.state().t);await page.waitForTimeout(250);
  assert.equal((await page.evaluate(()=>window.__POETIC_SCENE__.state())).t,hiddenTime);assert.equal((await details()).audio.state,'suspended');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(100);
  assert.equal((await details()).audio.state,'running');assert((await page.evaluate(()=>window.__POETIC_SCENE__.state())).t-hiddenTime<.2);
  check('模拟visibilitychange暂停场景与AudioContext，恢复不补赶后台时间');
  await seek(23.9);await page.locator('[data-scene-pause]').click();await page.waitForTimeout(650);
  report.audioAfterBell=(await details()).audio;assert(report.audioAfterBell.events.includes('bell'));
  await seek(28);assert.equal((await details()).audio.voices,0);await page.locator('[data-scene-pause]').click();await page.waitForTimeout(100);
  assert.equal((await details()).audio.voices,3);await page.locator('[data-scene-sound]').click();assert((await details()).audio.muted);
  await seek(0);await page.locator('[data-scene-pause]').click();await page.waitForTimeout(100);assert.equal((await details()).audio.voices,2);
  check('手势解锁空间音频；水风循环、乌啼与延迟钟声、暂停静音、拖动恢复尾音通过');
  await mkdir(resolve(output,'audio'),{recursive:true});
  const soundData=await page.evaluate(async()=>{const {synthesizeSound}=await import('/src/systems/audio/fengqiaoSound.ts');return Object.fromEntries(['wind','water','crow','bell'].map(kind=>{const samples=synthesizeSound(kind,24000),bytes=new Uint8Array(samples.length*2),view=new DataView(bytes.buffer);for(let i=0;i<samples.length;i++)view.setInt16(i*2,Math.round(samples[i]*32767),true);let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return [kind,btoa(binary)];}));});
  report.audioFiles=[];
  for(const [kind,base64] of Object.entries(soundData)){const pcm=Buffer.from(base64,'base64'),header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(24000,24);header.writeUInt32LE(48000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);const path=resolve(output,'audio',kind+'.wav');await writeFile(path,Buffer.concat([header,pcm]));report.audioFiles.push(path);}
  for(const [width,height] of [[1920,1080],[1440,900],[1280,720]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(100);await seek(8);await page.locator('[data-scene-view=CAM_enter]').click();await shot('product-'+width);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert(await page.locator('[data-scene-pause]').isVisible());
  }
  await page.setViewportSize({width:1920,height:1080});await seek(16);
  await page.evaluate(()=>{window.__savedReadback=HTMLCanvasElement.prototype.toDataURL;HTMLCanvasElement.prototype.toDataURL=function(...args){if(this.hasAttribute('data-scene-canvas'))throw new Error('readback fixture');return window.__savedReadback.apply(this,args);};window.__POETIC_SCENE__.play();});
  await page.locator('[data-back]').click();assert.equal(await page.locator('.page-return').count(),0);const resumedTime=await page.evaluate(()=>window.__POETIC_SCENE__.state().t);await page.waitForTimeout(150);assert((await page.evaluate(()=>window.__POETIC_SCENE__.state())).t>resumedTime);
  await page.evaluate(()=>{HTMLCanvasElement.prototype.toDataURL=window.__savedReadback;});await seek(16);
  check('全屏占满视口；捕获失败恢复播放，保留诗境并允许再次返回');
  mcp=await connectDevTools(output,9228);report.nativeServer=mcp.server;
  const pages=mcp.text(await mcp.call('list_pages'));const selected=pages.split('\n').find(line=>line.includes('#/poems/fengqiao'));assert(selected);const pageId=Number(selected.match(/^(\d+):/)[1]);
  await mcp.call('select_page',{pageId,bringToFront:true});report.dom=mcp.text(await mcp.call('take_snapshot',{pageId}));
  await mcp.call('take_screenshot',{pageId,filePath:resolve(output,'native-product.png')});report.console=mcp.text(await mcp.call('list_console_messages',{pageId,types:['error','warn']}));
  check('1920/1440/1280桌面网页布局与原生Chrome DevTools DOM、截图、Console检查');
  await page.evaluate(()=>{window.__sceneReadbacks=0;window.__POETIC_MOTION__.pause();});await page.locator('[data-back]').click();await page.locator('.page-return[data-state=playing]').waitFor();
  const capture=await page.evaluate(()=>({count:window.__sceneReadbacks,sources:[...document.querySelectorAll('.page-return [data-scene-snapshot]')].map(e=>e.src),live:window.__POETIC_SCENE__.state()}));
  assert.equal(capture.count,1);assert.equal(capture.sources.length,48);assert.equal(new Set(capture.sources).size,1);assert.equal(capture.live.playing,false);
  for(const p of [0,.25,.5,.75]){await page.evaluate(p=>window.__POETIC_MOTION__.return(p),p);await shot('return-p'+p);}
  await page.keyboard.press('Escape');assert(page.url().endsWith('#/poems/fengqiao'));assert.equal(await page.locator('.page-return').count(),0);
  await page.evaluate(()=>window.__POETIC_MOTION__.play());await page.locator('[data-back]').click();await page.locator('body[data-page=home]').waitFor();
  assert.equal(await page.locator('[data-scene-canvas]').count(),0);
  check('翻页返回仅截取一次，48条带共用当前画面；Esc保留诗境，完成后释放场景');
  for(let i=0;i<3;i++){await enter();await page.locator('[data-back]').click();await page.locator('body[data-page=home]').waitFor();}
  report.disposals=await page.evaluate(()=>window.__sceneDisposals);for(const d of report.disposals)assert.deepEqual(d.memory,{geometries:0,textures:0});
  check('正常产品路由反复入境与返回后GPU资源归零');
  report.audioContexts=await page.evaluate(()=>[...new Set(window.__sceneAnalysers.map(a=>a.context))].map(c=>c.state));assert(report.audioContexts.filter(s=>s==='closed').length>=4);
  await page.emulateMedia({reducedMotion:'reduce'});await enter();
  const reduced=await details();assert(reduced.reducedMotion&&!reduced.moon.visible);assert.equal((await page.evaluate(()=>window.__POETIC_SCENE__.state())).playing,false);
  const still=await shot('reduced');await page.waitForTimeout(200);assert.deepEqual(still,await shot('reduced-repeat'));
  await page.locator('.poem-line-button[data-scene-view=CAM_temple]').click();assert(await page.locator('[data-scene-canvas]').isVisible());
  check('减少动态保留静态夜景与手动选景');
  const fault=await browser.newContext({viewport:{width:1440,height:900}});await fixture(fault);const fp=await fault.newPage();
  await openAuthenticatedPage(fp,base+'/#/');await fp.route('**/scene_v02.glb',r=>r.fulfill({status:404,body:'missing asset fixture'}));
  await fp.locator('[data-poem=fengqiao] .enter-button').focus();await fp.keyboard.press('Enter');await fp.locator('.realm-transition[data-state=failed]').waitFor();assert(fp.url().endsWith('#/'));
  await fp.unroute('**/scene_v02.glb');await fp.locator('.realm-transition [data-retry]').click();await fp.waitForFunction(()=>window.__POETIC_SCENE__?.ready,null,{timeout:45000});
  await fp.evaluate(()=>location.hash='/');await fp.locator('body[data-page=home]').waitFor();
  let release,requested;const held=new Promise(r=>release=r),request=new Promise(r=>requested=r);
  await fp.route('**/scene_v02.glb',async r=>{requested();await held;await r.continue().catch(()=>{});});
  await fp.locator('[data-poem=fengqiao] .enter-button').focus();await fp.keyboard.press('Enter');await request;await fp.locator('.realm-transition [data-cancel]').click();release();await fp.waitForTimeout(1500);
  assert(fp.url().endsWith('#/'));assert.equal(await fp.locator('.realm-transition').count(),0);assert.equal(await fp.locator('[data-scene-canvas]').count(),0);
  await fault.close();check('模型404保留总览且可重试，加载中取消后迟到模型不接管页面');
  assert.deepEqual(report.errors,[]);report.details=reduced;report.status='pass';
}catch(error){report.failure=error.stack;report.status='failed';await shot('failure').catch(()=>{});throw error;}
finally{report.finalDisposals=await page.evaluate(()=>window.__sceneDisposals).catch(()=>[]);const video=page.video();await context.close();if(video)report.video=await video.path();await writeFile(resolve(output,'verification.json'),JSON.stringify(report,null,2));mcp?.close();await browser.close();}
console.log(JSON.stringify({status:report.status,checks:report.checks,output}));
