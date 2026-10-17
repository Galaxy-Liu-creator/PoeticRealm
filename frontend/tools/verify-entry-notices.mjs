import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {authenticatedUi,openAuthenticatedPage} from './authenticated-ui-fixture.mjs';
import {openCurtainForm} from './entry-navigation.mjs';
import {connectDevTools} from './devtools-client.mjs';

const base=process.env.UI_ORIGIN??'http://127.0.0.1:5187';
const output=resolve(process.env.UI_OUTPUT??'../output/playwright/entry-notices-v01');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist','--remote-debugging-port=9235']});
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:output+'/video',size:{width:1440,height:900}}});
async function fixture(context){await authenticatedUi(context);await context.route('**/api/v1/account/settings',r=>r.fulfill({json:{library:null}}));}
await fixture(context);
const page=await context.newPage(),report={checks:[],entries:[],notices:[],errors:[],status:'running'};
let mcp;
page.on('pageerror',error=>report.errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
const check=label=>{report.checks.push(label);console.log('PASS '+label);};
const ready=()=>page.locator('#app[data-initialized=true][data-ready=ready]').waitFor();
const shot=name=>page.screenshot({path:resolve(output,name+'.png')});
async function notice(selector,label,maxHeight=78){
  const element=page.locator(selector);await element.waitFor({state:'visible'});
  const bounds=await element.evaluate(e=>{const r=e.getBoundingClientRect(),style=getComputedStyle(e.querySelector('[data-popup-message]')),header=document.querySelector('#app>.navigation');return {x:r.x,y:r.y,width:r.width,height:r.height,viewport:[innerWidth,innerHeight],fontSize:style.fontSize,headerCenter:header?.getBoundingClientRect().height/2??32,brandRight:header?.querySelector('.brand-group').getBoundingClientRect().right??0,navLeft:header?.querySelector('nav').getBoundingClientRect().left??innerWidth,buttons:[...e.querySelectorAll('button:not([hidden])')].map(b=>({height:b.getBoundingClientRect().height,disabled:b.disabled}))};});
  assert(Math.abs(bounds.y+bounds.height/2-bounds.headerCenter)<2,label+' must align with the navigation');
  assert(bounds.x>=bounds.brandRight+20&&bounds.x+bounds.width<=bounds.navLeft-20,label+' must not cover the brand or navigation links');
  assert(bounds.height<=maxHeight&&bounds.width<=620,label+' must use compact sizing');
  assert(bounds.x>=0&&bounds.x+bounds.width<=bounds.viewport[0]);
  assert.equal(bounds.fontSize,'18px');assert(bounds.buttons.every(b=>b.height>=32&&!b.disabled));
  report.notices.push({label,...bounds});return bounds;
}
try{
  for(const hash of ['','#/login','#/register','#/account','#/favorites','#/profile','#/poems/fengqiao']){
    const opening=String(report.entries.length);
    await page.goto(base+'/?entry-check='+opening+hash);await ready();
    assert(page.url().endsWith('#/account'));assert.equal(new URL(page.url()).searchParams.get('entry-check'),opening);
    assert(await page.locator('.curtain-closed').isVisible());assert.equal(await page.locator('[data-account-form]').count(),0);
    assert.equal(await page.locator('.home-page,.favorites-page,.poem-page').count(),0);
    report.entries.push({requested:hash,result:page.url()});
  }
  for(const [width,height] of [[1920,1080],[1440,900],[1280,720]]){await page.setViewportSize({width,height});await shot('curtain-'+width);}
  check('每次打开根页面、登录、注册及私人深链都先显示大帘幕，原查询参数保留');
  await page.setViewportSize({width:1440,height:900});await openCurtainForm(page,'register');await shot('curtain-open-register');
  await page.getByRole('link',{name:'登录',exact:true}).click();await page.locator('body[data-page=login] form').waitFor();
  await page.reload();await ready();assert(page.url().endsWith('#/account'));
  await openCurtainForm(page);await page.goBack();await page.locator('body[data-page=account] .curtain-closed').waitFor();
  await page.goForward();await page.locator('body[data-page=login] form').waitFor();
  for(const copy of ['使用其他账号或密码','已记住登录凭据','正在登录'])assert.equal(await page.getByText(copy,{exact:false}).count(),0);
  check('键盘拉开帘幕进入注册/登录，表单切换与浏览器前进后退可用，刷新重新显示帘幕');

  await openAuthenticatedPage(page,base+'/#/');
  let releaseSession;const heldSession=new Promise(r=>releaseSession=r);
  await page.route('**/api/v1/auth/session',async route=>{await heldSession;await route.fallback();});
  await page.reload();await page.locator('body[data-page=account] .curtain-closed').waitFor();
  assert.equal(await page.locator('[data-account-form]').count(),0);assert(page.url().endsWith('#/account'));
  releaseSession();await ready();await page.unroute('**/api/v1/auth/session');assert(page.url().endsWith('#/account'));
  assert.equal(await page.locator('#app').getAttribute('data-auth'),'authenticated');
  await page.evaluate(()=>location.hash='/');await page.locator('body[data-page=home]').waitFor();
  check('已有会话刷新也先显示帘幕，服务响应较慢时帘幕仍可见；身份恢复不会自动跳转表单');

  for(const [width,height] of [[1920,1080],[1440,900],[1280,720]]){
    await page.setViewportSize({width,height});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await ready();
    await page.locator('[data-poem=fengqiao] [data-favorite]').press('Enter');
    await notice('.toast','toast-'+width);await shot('top-toast-'+width);
  }
  await page.setViewportSize({width:1440,height:900});
  let releaseModel,requested;const heldModel=new Promise(r=>releaseModel=r),modelRequest=new Promise(r=>requested=r);
  await page.route('**/scene_v02.glb',async route=>{requested();await heldModel;await route.continue().catch(()=>{});});
  await page.locator('[data-poem=fengqiao] .enter-button').focus();await page.keyboard.press('Enter');await modelRequest;
  await notice('.realm-loading','entry-loading');assert.equal(await page.locator('.toast').evaluate(e=>getComputedStyle(e).visibility),'hidden');await shot('top-entry-loading');
  await page.locator('.realm-loading [data-cancel]').click();releaseModel();await page.unroute('**/scene_v02.glb');
  assert(page.url().endsWith('#/'));assert.equal(await page.locator('.realm-transition').count(),0);
  await page.waitForLoadState('networkidle');
  check('三种桌面尺寸通知和入境加载提示位于顶部，尺寸缩小；通知不遮挡转场，取消保留总览');

  await page.route('**/fengqiao.scene-v03.json',r=>r.fulfill({status:200,json:{contractVersion:'invalid manifest fixture'}}));
  await page.locator('[data-poem=fengqiao] .enter-button').focus();await page.keyboard.press('Enter');
  await page.locator('.realm-transition[data-state=failed]').waitFor();await notice('.realm-loading','entry-failure');await shot('top-entry-failure');
  await page.unroute('**/fengqiao.scene-v03.json');await page.locator('.realm-loading [data-retry]').click();
  await page.waitForFunction(()=>window.__POETIC_SCENE__?.ready,null,{timeout:45000});
  await page.evaluate(()=>{window.__POETIC_SCENE__.pause();window.__POETIC_SCENE__.seek(4);});
  await page.evaluate(()=>{window.__imageDecode=Image.prototype.decode;window.__decodeReleases=[];Image.prototype.decode=function(){return new Promise((resolve,reject)=>window.__decodeReleases.push(()=>window.__imageDecode.call(this).then(resolve,reject)));};});
  await page.locator('[data-back]').click();await notice('.page-return .realm-loading','return-loading');await shot('top-return-loading');
  await page.keyboard.press('Escape');await page.evaluate(()=>{Image.prototype.decode=window.__imageDecode;window.__decodeReleases.forEach(release=>release());});
  assert(page.url().endsWith('#/poems/fengqiao'));assert.equal(await page.locator('.page-return').count(),0);
  check('加载失败的重试/取消与翻页返回提示也统一到顶部，Esc保留原场景');

  await page.evaluate(()=>location.hash='/');await page.locator('body[data-page=home]').waitFor();
  let releaseDirect,requestedDirect;const directHeld=new Promise(r=>releaseDirect=r),directRequest=new Promise(r=>requestedDirect=r);
  await page.route('**/scene_v02.glb',async route=>{requestedDirect();await directHeld;await route.continue().catch(()=>{});});
  await page.evaluate(()=>location.hash='/poems/fengqiao');await directRequest;
  await notice('.poem-scene-status','scene-loading');await shot('top-scene-loading');
  await page.evaluate(()=>location.hash='/');await page.locator('body[data-page=home]').waitFor();releaseDirect();await page.unroute('**/scene_v02.glb');
  check('诗境直接加载的状态提示位于顶部，离开时取消加载且不残留弹窗');

  const blocked=await browser.newContext({viewport:{width:1280,height:720},reducedMotion:'reduce'});await fixture(blocked);
  await blocked.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Storage fixture','QuotaExceededError');};});
  const bp=await blocked.newPage();await openAuthenticatedPage(bp,base+'/#/');
  await bp.locator('[data-poem=fengqiao] [data-favorite]').click();await bp.locator('.storage-warning').waitFor({state:'visible'});
  const stacked=await bp.evaluate(()=>{const a=document.querySelector('.storage-warning').getBoundingClientRect(),b=document.querySelector('.toast').getBoundingClientRect();return {warning:{top:a.top,bottom:a.bottom},toast:{top:b.top,bottom:b.bottom},height:innerHeight};});
  assert(Math.abs((stacked.warning.top+stacked.warning.bottom)/2-32)<2&&stacked.toast.top>=stacked.warning.bottom+7&&stacked.toast.bottom<stacked.height/2);report.stacked=stacked;
  await bp.screenshot({path:resolve(output,'top-stacked-notices.png')});await blocked.close();
  const offline=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});await offline.route('**/api/v1/**',r=>r.fulfill({status:503,json:{message:'offline fixture'}}));
  const op=await offline.newPage();await op.goto(base+'/#/login');await op.locator('#app[data-initialized=true][data-ready=ready]').waitFor();assert(op.url().endsWith('#/account'));assert(await op.locator('.entry-login').isVisible());await offline.close();
  check('存储提示与通知在顶部自然堆叠，减少动态和账号服务不可用时仍可进入大帘幕');

  mcp=await connectDevTools(output,9235);report.nativeServer=mcp.server;
  const pages=mcp.text(await mcp.call('list_pages'));const selected=pages.split('\n').find(line=>line.includes(base+'/')&&line.includes('#/'));assert(selected);const pageId=Number(selected.match(/^(\d+):/)[1]);
  await mcp.call('select_page',{pageId,bringToFront:true});await page.locator('[data-poem=fengqiao] [data-favorite]').focus();await page.keyboard.press('Enter');
  report.dom=mcp.text(await mcp.call('take_snapshot',{pageId}));await mcp.call('take_screenshot',{pageId,filePath:resolve(output,'native-top-notice.png')});
  report.console=mcp.text(await mcp.call('list_console_messages',{pageId,types:['error','warn']}));
  assert.deepEqual(report.errors,[]);report.status='pass';check('真实Chrome DevTools MCP检查桌面DOM、CSS布局、截图与Console');
}catch(error){report.failure=error.stack;report.status='failed';await shot('failure').catch(()=>{});throw error;}
finally{const video=page.video();await context.close();if(video)report.video=await video.path();await writeFile(resolve(output,'verification.json'),JSON.stringify(report,null,2));mcp?.close();await browser.close();}
console.log(JSON.stringify({status:report.status,checks:report.checks,output}));
