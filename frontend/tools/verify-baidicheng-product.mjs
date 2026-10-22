import {isolateViteUpdates} from './isolated-vite-fixture.mjs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {authenticatedUi,openAuthenticatedPage} from './authenticated-ui-fixture.mjs';
const phase=process.argv.find(a=>a.startsWith('--phase='))?.slice(8)??'main';assert(['main','failure'].includes(phase));
const out=new URL('../../output/baidicheng-runtime-v01/validation/product/',import.meta.url).pathname;await mkdir(out,{recursive:true});
const report={phase,errors:[],expectedErrors:[],checks:[],layouts:[]};let expected=false,activePage;
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});await isolateViteUpdates(context);await authenticatedUi(context);
 await context.route('**/api/v1/account/settings',r=>r.fulfill({status:200,contentType:'application/json',body:'{"library":null}'}));
 await context.route('**/api/v1/account/devices',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
 const page=activePage=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')(expected?report.expectedErrors:report.errors).push(m.text());});
 const save=async()=>writeFile(out+phase+'.json',JSON.stringify(report,null,2)+'\n');
 const check=async s=>{report.checks.push(s);console.log(s);await save();};
 const ready=async()=>{await page.waitForFunction(()=>window.__POETIC_SCENE__?.id==='baidicheng'&&window.__POETIC_SCENE__.ready||document.querySelector('.realm-transition[data-state=failed]'),null,{timeout:120000});assert(await page.evaluate(()=>window.__POETIC_SCENE__?.ready),await page.locator('.realm-transition').getAttribute('data-failure').catch(()=>null));await page.evaluate(()=>{window.__POETIC_SCENE__.pause();window.__POETIC_SCENE__.stop();});};
 const entry=async()=>{await page.locator('[data-poem=baidicheng] .enter-button').focus();await page.keyboard.press('Enter');};
 const seek=async t=>{await page.waitForFunction(()=>{const c=document.querySelector('[data-scene-canvas]');return c?.width===innerWidth&&c?.height===innerHeight;});await page.evaluate(t=>window.__POETIC_SCENE__.seek(t),t);};
 await openAuthenticatedPage(page,'http://127.0.0.1:5187/#/');
 await page.evaluate(()=>{window.bdDisposals=[];addEventListener('baidicheng:disposed',e=>window.bdDisposals.push(e.detail));});
 if(phase==='main'){
  await entry();await ready();assert(page.url().endsWith('#/poems/baidicheng'));
  const initial=await page.evaluate(()=>window.__POETIC_SCENE__.details());assert.equal(initial.model,'models/baidicheng/scene_v03.glb');assert.equal(initial.view.name,'CAM_enter');assert.equal(initial.audio.profile,'baidicheng');assert(initial.renderCache.enabled);report.initial=initial;await check('Overview enters the real v03 scene with default overview and white-emperor audio profile');
  for(const t of [0,.5,1.5,4]){await seek(t);const opacity=await page.locator('[data-reveal-line]').evaluateAll(es=>es.map(e=>Number(getComputedStyle(e).opacity)));if(t===0)assert(opacity.every(x=>x===0));if(t===.5)assert(opacity[0]>0&&opacity[0]<1&&opacity.slice(1).every(x=>x===0));if(t===4)assert(opacity.every(x=>x===1));}
  await check('Four vertical right-to-left lines reveal from the scene clock');
  const views=['CAM_city','CAM_follow','CAM_gorge','CAM_exit'];for(let i=0;i<4;i++){await page.locator('.poem-line-button').nth(i).click();const d=await page.evaluate(()=>window.__POETIC_SCENE__.details());assert.equal(d.view.name,views[i]);if(views[i]==='CAM_follow')assert(d.renderCache.bypassed);}
  await check('Four line buttons use authored city/follow/gorge/exit cameras; moving view bypasses the cache');
  await page.evaluate(()=>window.__POETIC_SCENE__.setView('CAM_enter'));
  const hashes=[];for(const t of [8,23,8]){await seek(t);hashes.push(createHash('sha256').update(await page.screenshot()).digest('hex'));}assert.equal(hashes[0],hashes[2]);report.seekHashes=hashes;
  await page.evaluate(()=>{window.initialBaidichengCanvas=document.querySelector('[data-scene-canvas]');window.__POETIC_SCENE__.setView('CAM_city');});
  await page.locator('[data-favorite=baidicheng]').click();assert(await page.evaluate(()=>window.initialBaidichengCanvas===document.querySelector('[data-scene-canvas]')));assert.equal((await page.evaluate(()=>window.__POETIC_SCENE__.details())).view.name,'CAM_city');
  await page.locator('[data-notes]').first().click();assert(await page.locator('.notes-panel').isVisible());await page.locator('.notes-close').click();await check('seek8→23→8 is pixel-stable; favorite redraw retains the canvas and camera; notes open and close');
  for(const [width,height] of [[1920,1080],[1440,900],[1280,720]]){
   await page.setViewportSize({width,height});await page.evaluate(()=>window.__POETIC_SCENE__.setView('CAM_enter'));await seek(8);
   const layout=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};return {viewport:[innerWidth,innerHeight],scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],canvas:rect('[data-scene-canvas]'),reading:rect('.poem-reading'),toolbar:rect('.poem-toolbar'),controls:rect('.scene-controls'),cache:window.__POETIC_SCENE__.stats().renderCache};});
   assert.deepEqual(layout.scroll,[width,height]);assert.equal(layout.canvas.width,width);assert.equal(layout.canvas.height,height);assert.equal(layout.cache.width,width);assert.equal(layout.cache.height,height);assert(layout.reading.bottom<Math.min(layout.toolbar.y,layout.controls.y));for(const r of [layout.toolbar,layout.controls])assert(r.x>=0&&r.right<=width&&r.bottom<=height);report.layouts.push(layout);await page.screenshot({path:out+`desktop-${width}.png`});
  }
  await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>window.__POETIC_SCENE__.setView('CAM_city'));await seek(8);await page.screenshot({path:out+'city.png'});
  for(const [label,view] of [['轻舟','CAM_boat'],['船夫','CAM_rower']]){await page.getByRole('button',{name:label,exact:true}).click();assert.equal((await page.evaluate(()=>window.__POETIC_SCENE__.details())).view.name,view);}
  await page.getByRole('button',{name:'全景',exact:true}).click();await seek(8);
  const before=await page.evaluate(()=>window.__POETIC_SCENE__.details().view.camera);await page.mouse.move(1000,480);await page.mouse.down();await page.mouse.move(1100,530,{steps:4});await page.mouse.up();await seek(8);assert.notDeepEqual(await page.evaluate(()=>window.__POETIC_SCENE__.details().view.camera),before);
  await page.locator('[data-scene-replay]').click();await page.evaluate(()=>{window.__POETIC_SCENE__.pause();window.__POETIC_SCENE__.stop();});assert.equal((await page.evaluate(()=>window.__POETIC_SCENE__.details())).view.name,'CAM_enter');
  await page.emulateMedia({reducedMotion:'reduce'});await seek(23);assert.equal((await page.evaluate(()=>window.__POETIC_SCENE__.details())).reducedMotion,true);assert(await page.locator('[data-reveal-line]').evaluateAll(es=>es.every(e=>Number(getComputedStyle(e).opacity)===1)));await page.emulateMedia({reducedMotion:'no-preference'});
  await check('Three desktop sizes, native cache dimensions, close views, mouse orbit, replay and reduced motion pass');
  await page.locator('.navigation a[href="#/"]').first().click();await page.waitForFunction(()=>document.body.dataset.page==='home'&&!window.__POETIC_SCENE__);const disposed=await page.evaluate(()=>window.bdDisposals.at(-1));assert.deepEqual(disposed.memory,{geometries:0,textures:0});report.release=disposed;await check('Page-return transition releases all resources');
  await page.reload();await page.locator('body[data-page=account]').waitFor();await check('Ordinary refresh returns to the account curtain');
 }else{
  let release,requested;const held=new Promise(r=>release=r),request=new Promise(r=>requested=r);
  await page.route('**/assets/models/baidicheng/scene_v03.glb',async r=>{requested();await held;await r.continue().catch(()=>{});});await entry();await request;await page.locator('.realm-loading [data-cancel]').click();release();await page.unroute('**/assets/models/baidicheng/scene_v03.glb');assert(page.url().endsWith('#/'));await check('Cancel during model loading preserves overview');
  expected=true;await page.route('**/assets/models/baidicheng/scene_v03.glb',r=>r.fulfill({status:404,body:'model fixture'}));await entry();await page.locator('.realm-transition[data-state=failed]').waitFor();assert(page.url().endsWith('#/'));await page.unroute('**/assets/models/baidicheng/scene_v03.glb');await page.locator('.realm-loading [data-retry]').click();await ready();expected=false;await check('Failed entry offers retry and retry enters the real scene');
  await page.locator('.navigation a[href="#/"]').first().click();await page.waitForFunction(()=>document.body.dataset.page==='home'&&!window.__POETIC_SCENE__);report.releases=await page.evaluate(()=>window.bdDisposals);assert(report.releases.every(x=>x.memory.geometries===0&&x.memory.textures===0));
 }
 report.pass=report.errors.length===0;assert(report.pass,JSON.stringify(report.errors));await save();
}catch(e){report.failure=String(e);if(activePage){report.pageState=await activePage.evaluate(()=>({url:location.href,text:document.body.innerText.slice(0,2000),ready:!!window.__POETIC_SCENE__?.ready})).catch(()=>null);await activePage.screenshot({path:out+phase+'-failed.png'}).catch(()=>{});}await writeFile(out+phase+'-failed.json',JSON.stringify(report,null,2)+'\n');throw e;}finally{await browser.close();}
