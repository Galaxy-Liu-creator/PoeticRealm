import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { repositoryPath } from './paths.mjs';
import { authenticatedUi, openAuthenticatedPage } from './authenticated-ui-fixture.mjs';

const origin=process.env.UI_ORIGIN || 'http://127.0.0.1:5184';
const output=process.env.UI_OUTPUT || repositoryPath('docs/plans/R2-动态特效/assets');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const checks=[],errors=[];
const report={checks,errors,complete:false};
const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference',recordVideo:{dir:output+'/video',size:{width:1440,height:900}}});
await authenticatedUi(context);
const recordingStart=performance.now();report.timeline=[];
const page=await context.newPage();
page.on('pageerror',error=>errors.push(error.message));
const check=label=>{checks.push(label);console.log('PASS '+label);};
const enter=async(scene)=>{
  const link=page.locator(`[data-poem=${scene}] .enter-button`);
  const box=await link.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await link.click();
};
const home=async()=>{
  await openAuthenticatedPage(page, origin+'/#/');
  await page.locator('.home-hero[data-motion=active]').waitFor();
};
try {
  await home();
  const hoverBox=await page.locator('[data-poem=fengqiao] .enter-button').boundingBox();
  await page.mouse.move(hoverBox.x+hoverBox.width/2,hoverBox.y+hoverBox.height/2);
  const before=await page.locator('.poem-grid').evaluate(e=>e.style.transform);
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.poem-grid').evaluate(e=>e.style.transform),before);
  check('hover pauses the entire aligned grid');
  await page.setViewportSize({width:1440,height:480});
  await page.mouse.move(10,10);
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await page.locator('.home-hero[data-motion=paused]').waitFor();
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.locator('.home-hero[data-motion=active]').waitFor();
  await page.setViewportSize({width:1440,height:900});
  check('hero stops offscreen and resumes');
  await enter('jiangxue');await page.locator('.realm-transition[data-state=playing]').waitFor();
  // Automation keeps tabs visible even after native minimization. Exercise the real
  // application handler while browser RAF remains available; record this as simulation.
  await page.evaluate(()=>{
    window.__motionHiddenDescriptor=Object.getOwnPropertyDescriptor(document,'hidden');
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const frozen=await page.evaluate(()=>document.querySelector('.realm-transition').dataset.progress);
  await page.waitForTimeout(700);
  assert.equal(await page.evaluate(()=>document.querySelector('.realm-transition').dataset.progress),frozen);
  assert.equal(await page.evaluate(()=>document.querySelector('.home-hero').dataset.motion),'paused');
  await page.evaluate(()=>{
    if(window.__motionHiddenDescriptor) Object.defineProperty(document,'hidden',window.__motionHiddenDescriptor);
    else delete document.hidden;
    delete window.__motionHiddenDescriptor;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(100);
  const resumed=await page.evaluate(()=>document.querySelector('.realm-transition').dataset.progress);
  assert(Number(resumed)>Number(frozen));assert(Number(resumed)-Number(frozen)<.3);
  await page.keyboard.press('Escape');
  check('simulated visibilitychange stops application RAF; restore resumes without catching up');
  for(const scene of ['fengqiao','jiangxue','baidicheng']) {
    await enter(scene);
    await page.locator('.realm-transition[data-state=playing]').waitFor();
    const started=performance.now()-recordingStart;
    assert.ok(page.url().endsWith('#/'));
    await page.locator('body[data-page=poem] #main').waitFor();
    assert.ok(page.url().endsWith('#/poems/'+scene));
    assert.equal(await page.locator('.realm-transition').count(),0);
    assert.equal(await page.locator('#app').evaluate(e=>e.inert),false);
    report.timeline.push({scene,startedMs:started,finishedMs:performance.now()-recordingStart});
    await page.screenshot({path:output+`/${scene}-end.png`});
    await page.locator('[data-back]').click();
    await page.locator('body[data-page=home] .overview').waitFor();
    assert.equal(await page.locator('#app canvas').count(),1);
  }
  check('three continuous entries commit only at completion and release canvas');
  await home();await page.evaluate(()=>window.__POETIC_MOTION__.pause());
  const entry=page.locator('[data-poem=fengqiao] .enter-button');await entry.focus();
  await page.keyboard.press('Enter');await page.locator('.realm-transition[data-state=playing]').waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.realm-transition').count(),0);
  assert.ok(await entry.evaluate(e=>e===document.activeElement));
  assert.equal(await page.locator('#app').evaluate(e=>e.inert),false);
  check('keyboard entry and Esc restore focus and source');
  await page.evaluate(()=>window.__POETIC_MOTION__.play());
  {
  // A fresh context prevents an earlier successful scene decode from hiding a network fault.
  const fault=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  await authenticatedUi(fault);
  const page=await fault.newPage();
  const home=async()=>{await openAuthenticatedPage(page,origin+'/#/');};
  const enter=async(scene)=>{await page.locator(`[data-poem=${scene}] .enter-button`).focus();await page.keyboard.press('Enter');};
  try {
  await home();
  await page.route('**/S02-fengqiao-cover*.jpg*',(route)=>route.abort());
  await enter('fengqiao');
  await page.locator('.realm-transition[data-state=failed]').waitFor();
  assert.ok(page.url().endsWith('#/'));
  await page.unroute('**/S02-fengqiao-cover*.jpg*');
  await page.getByRole('button',{name:'重试',exact:true}).click();
  await page.locator('body[data-page=poem]').waitFor();
  check('failed image keeps source and retry succeeds');
  await home();
  let release;const held=new Promise(resolve=>{release=resolve;});
  await page.route('**/S03-jiangxue-desktop-asset-1*.jpg*',async route=>{await held;await route.continue().catch(()=>{});});
  await enter('jiangxue');
  await page.locator('.realm-transition[data-state=loading]').waitFor();
  await page.getByRole('button',{name:'取消入境'}).click();
  assert.equal(await page.locator('.realm-transition').count(),0);assert.ok(page.url().endsWith('#/'));
  release();await page.unroute('**/S03-jiangxue-desktop-asset-1*.jpg*');
  await page.waitForTimeout(200);assert.equal(await page.locator('.realm-transition').count(),0);
  check('cancel during actual pending request unlocks source; late completion stays cancelled');
  } finally { await fault.close(); }
  }
  await page.evaluate(()=>{document.querySelector('[data-poem=baidicheng] .enter-button').click();document.querySelector('[data-poem=fengqiao] .enter-button').click();});
  await page.locator('.realm-transition[data-state=playing]').waitFor();
  assert.equal(await page.locator('.realm-transition').count(),1);
  await page.evaluate(()=>{location.hash='/favorites';});
  await page.locator('body[data-page=favorites]').waitFor();assert.equal(await page.locator('.realm-transition').count(),0);
  check('rapid requests share one transaction; route changes cancel it');
  await home();await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('.home-hero[data-motion=paused]').waitFor();
  assert.equal(await page.locator('.poem-grid').evaluate(e=>e.style.transform),'none');
  await enter('jiangxue');
  await page.locator('body[data-page=poem]').waitFor();assert.equal(await page.locator('.realm-transition').count(),0);
  check('live reduced-motion change stops atmosphere and skips reveal after preparation');
  const fallback=await browser.newContext({reducedMotion:'no-preference'});
  await authenticatedUi(fallback);
  await fallback.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'||type==='webgl2'?null:original.call(this,type,...args);};
  });
  const noGL=await fallback.newPage();await openAuthenticatedPage(noGL,origin+'/#/');
  await noGL.locator('[data-poem=baidicheng] .enter-button').focus();await noGL.keyboard.press('Enter');await noGL.locator('body[data-page=poem]').waitFor();
  assert.equal(await noGL.locator('#app').evaluate(e=>e.inert),false);await fallback.close();
  check('unavailable WebGL retains static UI and completes CSS fallback');
  assert.deepEqual(errors,[]);report.complete=true;
} finally {
  await context.close();report.video=await page.video().path();
  await writeFile(output+'/motion-verification.json',JSON.stringify(report,null,2));
  await browser.close();
}
