import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {PNG} from 'pngjs';
import {authenticatedUi,openAuthenticatedPage} from './authenticated-ui-fixture.mjs';
import {connectDevTools} from './devtools-client.mjs';

const output=resolve(process.env.REFINEMENT_OUTPUT??'../output/playwright/fengqiao-refinement-v01/accepted');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--remote-debugging-port=9233']});
const report={checks:[],errors:[],frames:[],layouts:[],reflection:[],fonts:[],status:'running'};
let mcp;
async function fixture(context){
  await authenticatedUi(context);
  await context.route('**/api/v1/account/settings',route=>route.fulfill({status:200,contentType:'application/json',body:'{"library":null}'}));
  await context.route('**/api/v1/account/devices',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
}
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:resolve(output,'video'),size:{width:1440,height:900}}});
await fixture(context);
const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
const shot=name=>page.screenshot({path:resolve(output,name+'.png')});
const check=message=>{report.checks.push(message);console.log('PASS '+message);};
const seek=time=>page.evaluate(time=>{window.__POETIC_SCENE__.pause();window.__POETIC_SCENE__.seek(time);},time);
const details=()=>page.evaluate(()=>window.__POETIC_SCENE__.details());
const lines=()=>page.locator('[data-reveal-line]').evaluateAll(elements=>elements.map(e=>Number(getComputedStyle(e).opacity)));
const vectorDistance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
function pixelDelta(a,b){const x=PNG.sync.read(a),y=PNG.sync.read(b);let max=0,changed=0;for(let i=0;i<x.data.length;i+=4){let delta=0;for(let c=0;c<3;c++)delta+=Math.abs(x.data[i+c]-y.data[i+c]);max=Math.max(max,delta);if(delta>20)changed++;}return {max,changed};}
async function font(selector){
 const session=await context.newCDPSession(page);await session.send('DOM.enable');await session.send('CSS.enable');
 const {root}=await session.send('DOM.getDocument');const {nodeId}=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector});
 const result=await session.send('CSS.getPlatformFontsForNode',{nodeId});await session.detach();return result.fonts;
}
try{
 await openAuthenticatedPage(page,'http://127.0.0.1:5187/#/');
 report.fonts.push({selector:'.hero-copy p',faces:await font('.hero-copy p')});
 let release,requested;const held=new Promise(resolve=>release=resolve),request=new Promise(resolve=>requested=resolve);
 await page.route('**/scene_v02.glb',async route=>{requested();await held;await route.continue().catch(()=>{});});
 await page.locator('[data-poem=fengqiao] .enter-button').focus();await page.keyboard.press('Enter');await request;
 await page.locator('.realm-loading.paper-popup').waitFor();await shot('paper-entry-loading');
 assert.equal(await page.locator('.toast').isVisible(),false,'底部通知不能遮挡入境加载纸卷');
 assert.equal(await page.locator('.realm-loading .paper-cloud').count(),2);
 assert.equal(await page.locator('.realm-loading [data-spinning]').count(),1);
 await page.locator('.realm-loading [data-cancel]').click();release();
 await page.unroute('**/scene_v02.glb');assert(page.url().endsWith('#/'));assert.equal(await page.locator('.realm-transition').count(),0);
 check('纸卷加载提示含云纹、墨环和原有取消按钮；取消保留总览');
 await page.locator('[data-poem=fengqiao] .enter-button').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>window.__POETIC_SCENE__?.ready||document.querySelector('.realm-transition')?.dataset.state==='failed',null,{timeout:45000});
 assert(await page.evaluate(()=>window.__POETIC_SCENE__?.ready),await page.locator('.realm-transition').getAttribute('data-failure').catch(()=>null));
 assert.equal((await details()).view.name,'CAM_enter');assert(!(await details()).view.followsBoat);
 await page.evaluate(()=>window.__POETIC_SCENE__.setView('CAM_boat'));assert((await details()).view.followsBoat);
 await seek(0);const initial=await details();await seek(16);const later=await details();
 assert(vectorDistance(initial.view.camera,later.view.camera)>1);
 assert(Math.abs(vectorDistance(initial.view.camera,initial.view.target)-vectorDistance(later.view.camera,later.view.target))<1e-5);
 assert.deepEqual(initial.waterExtent,[1500,1500]);report.follow={initial:initial.view,later:later.view,navigation:later.navigation};
 check('默认全景；切换整船中景后随航向前进，跟随距离恒定，水面延伸至1500m');
 await page.evaluate(()=>window.__POETIC_SCENE__.setView('CAM_enter'));
 for(const time of [0,.5,.95,1.5,1.95,2.5,2.95,3.5,4]){
  await seek(time);const opacity=await lines();report.frames.push({time,opacity});
  for(let i=0;i<4;i++){if(time<=i+.1)assert.equal(opacity[i],0);if(time>=i+.9)assert.equal(opacity[i],1);}
  if(time===.5)assert(opacity[0]>.2&&opacity[0]<.8&&opacity.slice(1).every(v=>v===0));
  await shot('verse-t'+time);
 }
 await seek(1.5);const partial=await lines();await page.waitForTimeout(300);assert.deepEqual(await lines(),partial);
 await page.locator('[data-favorite=fengqiao]').click();assert.deepEqual(await lines(),partial);assert.equal((await details()).view.name,'CAM_enter');
 await shot('paper-toast');
 await page.locator('[data-scene-replay]').click();await page.evaluate(()=>window.__POETIC_SCENE__.pause());assert((await lines()).slice(1).every(v=>v===0));
 await seek(0);await page.evaluate(()=>window.__POETIC_SCENE__.play());await page.waitForTimeout(4200);await page.evaluate(()=>window.__POETIC_SCENE__.pause());assert.deepEqual(await lines(),[1,1,1,1]);
 report.fonts.push({selector:'.poem-line-button',faces:await font('.poem-line-button')});
 assert.equal(report.fonts[0].faces[0].familyName,report.fonts[1].faces[0].familyName);
 check('四句逐句平滑显现；真实连续播放、暂停、收藏重绘和重看同步；诗句与标语实际字形一致');
 for(const [width,height] of [[1920,1080],[1440,900],[1280,720]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(200);await seek(8);
  const layout=await page.evaluate(()=>{const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};return {viewport:[innerWidth,innerHeight],scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],canvas:rect(document.querySelector('[data-scene-canvas]')),reading:rect(document.querySelector('.poem-reading')),toolbar:rect(document.querySelector('.poem-toolbar')),controls:rect(document.querySelector('.scene-controls'))};});
  report.layouts.push(layout);assert(layout.scroll[0]<=width&&layout.scroll[1]<=height);
  assert(layout.canvas.x===0&&layout.canvas.y===0&&layout.canvas.width===width&&layout.canvas.height===height);
  assert(layout.reading.bottom<Math.min(layout.toolbar.y,layout.controls.y),'诗句与底部操作重叠');
  for(const r of [layout.toolbar,layout.controls])assert(r.x>=0&&r.right<=width&&r.bottom<=height);
  await shot('viewport-'+width+'x'+height);
  await page.locator('.poem-toolbar [data-notes]').click();const notes=await page.locator('.notes-panel').boundingBox();assert(notes.y>=0&&notes.y+notes.height<=height);await page.locator('.notes-close').click();
 }
 check('1920/1440/1280桌面网页均满屏、无横竖滚动，诗句与操作区不重叠');
 await page.setViewportSize({width:1440,height:900});
 for(const view of ['CAM_enter','CAM_moonset','CAM_riverbank','CAM_temple','CAM_boat','CAM_rower']){
  await page.evaluate(view=>window.__POETIC_SCENE__.setView(view),view);await seek(8);
  const cropped=await shot('water-'+view);await page.evaluate(()=>window.__POETIC_SCENE__.setReflectionCrop(false));const full=await page.screenshot();
  const delta=pixelDelta(cropped,full);report.reflection.push({view,...delta});assert(delta.changed<10,'延伸水面反射裁切不一致');await page.evaluate(()=>window.__POETIC_SCENE__.setReflectionCrop(true));
 }
 check('六个常用机位水面画面检查；反射裁切与完整反射逐像素对照一致');
 await page.evaluate(()=>window.__POETIC_SCENE__.setView('CAM_boat'));await seek(.5);
 await page.emulateMedia({reducedMotion:'reduce'});assert.deepEqual(await lines(),[1,1,1,1]);assert.equal((await page.evaluate(()=>window.__POETIC_SCENE__.state())).playing,false);
 await shot('reduced');await page.emulateMedia({reducedMotion:'no-preference'});
 check('减少动态直接显示完整诗文并保持静态场景');
 mcp=await connectDevTools(output,9233);report.nativeServer=mcp.server;
 const pages=mcp.text(await mcp.call('list_pages'));const selected=pages.split('\n').find(line=>line.includes('#/poems/fengqiao'));assert(selected);const pageId=Number(selected.match(/^(\d+):/)[1]);
 await mcp.call('select_page',{pageId,bringToFront:true});report.dom=mcp.text(await mcp.call('take_snapshot',{pageId}));report.console=mcp.text(await mcp.call('list_console_messages',{pageId,types:['error','warn']}));
 await mcp.call('take_screenshot',{pageId,filePath:resolve(output,'native-product.png')});
 check('实际Chrome DevTools MCP检查DOM、截图与Console');
 await page.locator('[data-back]').click();await page.locator('body[data-page=home]').waitFor();assert.equal(await page.locator('[data-scene-canvas]').count(),0);
 await page.evaluate(()=>location.hash='/poems/jiangxue');await page.locator('body[data-page=poem]').waitFor();await page.waitForTimeout(4300);assert.deepEqual(await lines(),[1,1,1,1]);assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight),900);
 await page.evaluate(()=>location.hash='/profile');await page.locator('[data-edit-profile]').click();await page.locator('.profile-editor[open]').waitFor();
 await shot('paper-profile-editor');await page.locator('[data-devices]').first().click();await page.locator('.profile-confirm[open]').waitFor();await shot('paper-devices');await page.keyboard.press('Escape');await page.locator('.profile-confirm').waitFor({state:'detached'});
 let revoke=0,history=0;
 await context.route('**/api/v1/account/devices/revoke-others',route=>{revoke++;return route.fulfill({status:204});});
 await context.route('**/api/v1/account/history',route=>{history++;return route.fulfill({status:204});});
 await page.locator('[data-tab=security]').click();await page.locator('[data-revoke]').click();await page.locator('.paper-question[open]').waitFor();
 await shot('paper-confirm');assert.equal(await page.locator('.paper-question .paper-cloud').count(),2);assert.equal(await page.locator('[data-answer=cancel]').evaluate(e=>e===document.activeElement),true);
 await page.keyboard.press('Escape');await page.locator('.paper-question').waitFor({state:'detached'});assert.equal(revoke,0);
 await page.locator('[data-revoke]').click();await page.locator('[data-answer=confirm]').click();await page.waitForTimeout(100);assert.equal(revoke,1);
 await page.locator('[data-tab=privacy]').click();await page.locator('[data-danger]').click();await page.locator('[data-clear-history]').click();await page.locator('[data-answer=cancel]').click();assert.equal(history,0);
 await page.locator('.profile-confirm [data-close]').click();
 await page.locator('[data-tab=security]').click();await page.locator('[data-revoke]').click();await page.evaluate(()=>{document.querySelector('[data-answer=confirm]').click();document.querySelector('.profile-editor').close();});await page.locator('.paper-question').waitFor({state:'detached'});await page.waitForTimeout(100);assert.equal(revoke,1);
 check('全局纸卷确认框默认聚焦取消、Esc取消、确认调用正确；父窗口关闭不触发迟到操作（隔离API夹具）');
 await page.evaluate(()=>location.hash='/register');await page.locator('[data-auth-policy]').first().click();await page.locator('.auth-policy[open]').waitFor();await shot('paper-auth-policy');assert.equal(await page.locator('.auth-policy.paper-dialog .paper-cloud').count(),2);await page.keyboard.press('Escape');await page.locator('.auth-policy').waitFor({state:'detached'});
 check('资料主弹窗、设备列表和协议说明沿用纸卷样式，原有内容和关闭操作保留');
 assert.deepEqual(report.errors,[]);report.status='pass';
}catch(error){report.status='failed';report.failure=error.stack;await shot('failure').catch(()=>{});throw error;}
finally{await context.close();await writeFile(resolve(output,'verification.json'),JSON.stringify(report,null,2)+'\n');mcp?.close();await browser.close();}
console.log(JSON.stringify({status:report.status,checks:report.checks,output}));
