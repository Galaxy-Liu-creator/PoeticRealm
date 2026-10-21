import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {authenticatedUi,openAuthenticatedPage} from './authenticated-ui-fixture.mjs';

const base=process.env.UI_ORIGIN??'http://127.0.0.1:5187';
const out=resolve(process.env.UI_OUTPUT??'output/poem-scroll-v01');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
await authenticatedUi(context);
let library=null;
await context.route('**/api/v1/account/settings',async route=>{
  if(route.request().method()==='PUT')library=route.request().postDataJSON();
  await route.fulfill({json:{library}});
});
const page=await context.newPage();page.setDefaultTimeout(60000);
const report={origin:base,checks:[],layouts:[],axis:[],errors:[],pass:false};
page.on('pageerror',error=>report.errors.push(error.message));
page.on('crash',()=>report.errors.push('Browser renderer crashed'));
page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
const check=label=>{report.checks.push(label);console.log('PASS '+label);};
const seek=t=>page.evaluate(t=>{window.__POETIC_SCENE__.pause();window.__POETIC_SCENE__.seek(t);},t);
const shot=name=>page.screenshot({path:resolve(out,name+'.png'),timeout:30000,animations:'disabled'});
const scroll=page.locator('[data-poem-scroll]'),toggle=page.locator('[data-scroll-toggle]:visible');
async function assertHorizontal(progress){
  const geometry=await scroll.evaluate(e=>{
    const rect=element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    return {panel:rect(e),left:rect(e.querySelector('.poem-scroll-roller-left')),right:rect(e.querySelector('.poem-scroll-roller-right')),closedWidth:parseFloat(getComputedStyle(e).getPropertyValue('--scroll-closed-width'))};
  });
  const {panel,left,right,closedWidth}=geometry;
  assert(Math.abs(left.x-(panel.x-6))<1);
  assert(Math.abs(right.x-(panel.x+closedWidth-7+(panel.width-closedWidth)*progress))<1);
  for(const roller of [left,right]){
    assert(Math.abs(roller.y-(panel.y-6))<1);
    assert(Math.abs(roller.height-(panel.height+12))<1);
  }
  report.axis.push({progress,...geometry});
}
async function open(id){
  await page.evaluate(id=>location.hash='/poems/'+id,id);
  await page.waitForFunction(id=>window.__POETIC_SCENE__?.ready&&window.__POETIC_SCENE__.id===id,id);
}
try{
  await page.goto(base+'/');
  await page.locator('body[data-page=account] [data-curtain]').first().waitFor();
  check('普通打开保留大帘幕');
  await openAuthenticatedPage(page,base+'/#/');
  for(const id of (process.env.POEM_IDS??'jiangxue,fengqiao').split(',')){
    await open(id);
    assert.equal((await page.evaluate(()=>window.__POETIC_SCENE__.details())).view.name,'CAM_enter');
    if(process.argv.includes('--smoke')){
      await seek(8);assert.equal(await toggle.getAttribute('aria-expanded'),'true');
      await shot(id+'-deployed');
      await toggle.focus();await page.keyboard.press('Enter');
      assert.equal(await toggle.getAttribute('aria-expanded'),'false');
      assert(await page.locator('.poem-scroll-body').evaluate(e=>e.inert));
      await shot(id+'-deployed-collapsed');
      await assertHorizontal(0);
      assert(await scroll.evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.right-24,r.y+r.height/2)?.matches('[data-scene-canvas]');}),id+'：收卷后的空白处可直接操作场景');
      await page.keyboard.press('Space');assert.equal(await toggle.getAttribute('aria-expanded'),'true');
      check(id+'：部署后默认全景、真实场景、展卷和键盘收卷通过');
      await page.evaluate(()=>location.hash='/');await page.locator('body[data-page=home]').waitFor();
      continue;
    }
    await seek(3.95);assert(await scroll.isHidden());
    await seek(4.45);
    const progress=Number(await scroll.evaluate(e=>e.style.getPropertyValue('--scroll-progress')));
    assert(progress>.4&&progress<.6);
    await assertHorizontal(progress);await shot(id+'-horizontal-mid');
    await seek(8);assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    assert.equal(await page.locator('.poem-scroll-section').count(),3);
    assert(await page.locator('.poem-scroll-body').evaluate(e=>!e.inert));
    const first=await scroll.evaluate(e=>e.style.getPropertyValue('--scroll-progress'));
    await seek(23);await seek(8);assert.equal(await scroll.evaluate(e=>e.style.getPropertyValue('--scroll-progress')),first);
    check(id+'：诗句完成后按同一时钟展卷，seek 可复现');
    for(const [width,height] of [[1920,1080],[1440,900],[1280,720]]){
      await page.setViewportSize({width,height});await seek(8);
      const layout=await page.evaluate(()=>{
        const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
        const panel=rect('.poem-scroll'),poem=rect('.poem-columns'),toolbar=rect('.poem-toolbar');
        const body=document.querySelector('.poem-scroll-body');
        return {panel,poem,toolbar,body:{client:body.clientHeight,scroll:body.scrollHeight},overflow:document.documentElement.scrollWidth>innerWidth,roller:rect('.poem-scroll-roller-right')};
      });
      report.layouts.push({id,width,height,...layout});await shot(id+'-'+width);
      assert(!layout.overflow);assert(layout.panel.y>layout.poem.bottom);
      assert(layout.panel.bottom+6<layout.toolbar.y,JSON.stringify(layout));assert(layout.body.client>50);
      await assertHorizontal(1);
    }
    check(id+'：三档桌面卷轴在诗下、操作栏上，正文可滚动');
    await page.setViewportSize({width:1440,height:900});
    const thirdVisible=await page.locator('.poem-scroll-section:last-of-type p').evaluate(p=>p.getBoundingClientRect().bottom<=p.closest('.poem-scroll-body').getBoundingClientRect().bottom);
    assert(thirdVisible,id+'：1440×900 三段正文完整可读');
    if(process.argv.includes('--horizontal')){
      await toggle.focus();await page.keyboard.press('Enter');
      assert.equal(await toggle.getAttribute('aria-expanded'),'false');
      assert(await page.locator('.poem-scroll-open').evaluate(e=>e===document.activeElement));
      assert(await page.locator('.poem-scroll-body').evaluate(e=>e.inert));
      await shot(id+'-horizontal-collapsed');await assertHorizontal(0);
      await page.locator('[data-favorite]').click();
      assert.equal(await toggle.getAttribute('aria-expanded'),'false');
      await toggle.focus();await page.keyboard.press('Space');
      assert.equal(await toggle.getAttribute('aria-expanded'),'true');
      assert(await page.locator('h2 [data-scroll-toggle]').evaluate(e=>e===document.activeElement));
      check(id+'：横向卷为竖直窄轴，键盘焦点与收藏状态保持');
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.keyboard.press('Enter');
      assert.equal(await toggle.getAttribute('aria-expanded'),'false');
      assert.equal(await page.locator('.poem-scroll-paper').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
      await assertHorizontal(0);await page.keyboard.press('Space');await assertHorizontal(1);
      await page.emulateMedia({reducedMotion:'no-preference'});
      check(id+'：减少动态立即完成横向收展');
      await page.evaluate(()=>location.hash='/');await page.locator('body[data-page=home]').waitFor();
      continue;
    }
    if(process.argv.includes('--layout-only')){
      await page.locator('.poem-scroll-body').evaluate(e=>e.scrollTop=e.scrollHeight);
      assert(await page.locator('.poem-scroll-colophon a').isVisible());
      await shot(id+'-scroll-end');
      await page.evaluate(()=>location.hash='/');await page.locator('body[data-page=home]').waitFor();
      continue;
    }
    await toggle.focus();await page.keyboard.press('Enter');
    assert.equal(await toggle.getAttribute('aria-expanded'),'false');
    assert(await page.locator('.poem-scroll-body').evaluate(e=>e.inert));
    await shot(id+'-collapsed');
    await page.locator('[data-favorite]').click();
    assert.equal(await toggle.getAttribute('aria-expanded'),'false');
    await toggle.focus();await page.keyboard.press('Space');
    assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    assert.equal((await page.evaluate(()=>window.__POETIC_SCENE__.details())).view.name,'CAM_enter');
    await page.locator('[data-favorite]').click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    check(id+'：键盘收展、收藏重绘保留状态，展卷恢复全景');
    const closeView=id==='jiangxue'?'CAM_fisherman':'CAM_rower';
    await page.locator(`.scene-controls [data-scene-view=${closeView}]`).click();
    assert.equal(await toggle.getAttribute('aria-expanded'),'false');await shot(id+'-closeup');
    await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    const canvas=page.locator('[data-scene-canvas]'),box=await canvas.boundingBox();
    await page.mouse.move(box.width*.7,box.height*.4);await page.mouse.down();
    await page.mouse.move(box.width*.73,box.height*.43,{steps:4});await page.mouse.up();
    assert.equal(await toggle.getAttribute('aria-expanded'),'false');
    await page.locator('.scene-controls [data-scene-view=CAM_enter]').click();
    assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    await page.locator('[data-notes]').first().click();assert(await page.locator('#poem-notes').isVisible());
    assert.equal(await toggle.getAttribute('aria-expanded'),'false');
    await page.locator('[aria-label=关闭笺注]').click();
    check(id+'：近景、拖动与笺注收卷避让，全景可恢复');
    await page.locator('[data-scene-replay]').evaluate(button=>button.click());
    await seek(0);assert(await scroll.isHidden());await seek(8);
    assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    await page.locator('[data-fullscreen]').click();await page.waitForFunction(()=>!!document.fullscreenElement);
    assert(await toggle.isVisible());await page.evaluate(()=>document.exitFullscreen());
    await page.emulateMedia({reducedMotion:'reduce'});await seek(0);
    assert(await scroll.isVisible());assert.equal(await scroll.evaluate(e=>e.style.getPropertyValue('--scroll-progress')),'1');
    await toggle.click();
    assert.equal(await page.locator('.poem-scroll-paper').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
    await toggle.click();await shot(id+'-reduced');
    await page.emulateMedia({reducedMotion:'no-preference'});
    check(id+'：重看重置、全屏与减少动态可用');
    await page.evaluate(()=>location.hash='/');await page.locator('body[data-page=home]').waitFor();
    assert.equal(await scroll.count(),0);
  }
  assert.deepEqual(report.errors,[]);
  report.pass=true;
}finally{
  await writeFile(resolve(out,'verification.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();
}
