import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { authenticatedUi, openAuthenticatedPage } from './authenticated-ui-fixture.mjs';

const origin=process.env.UI_ORIGIN||'http://127.0.0.1:5184';
const output=process.env.UI_OUTPUT||'output/playwright/fire';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const report={complete:false,checks:[],frames:[],errors:[]};
const check=label=>{report.checks.push(label);console.log('PASS '+label);};
const attach=page=>page.on('pageerror',e=>report.errors.push(e.message));
const enter=async page=>{
  await page.locator('[data-poem=fengqiao] .enter-button').focus();
  await page.keyboard.press('Enter');
  await page.locator('.realm-transition[data-state=playing]').waitFor();
};
try {
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  await authenticatedUi(context);const page=await context.newPage();attach(page);
  await openAuthenticatedPage(page,origin);
  await page.evaluate(()=>window.__POETIC_MOTION__.pause());await enter(page);
  for(const progress of [0,.03,.06,.09,.1,.15,.25,.5,.75,.99]) {
    const sample=await page.evaluate(p=>{
      window.__POETIC_MOTION__.transition(p);
      const canvas=document.querySelector('.realm-veil canvas'), gl=canvas.getContext('webgl2');
      const pixels=new Uint8Array(canvas.width*canvas.height*4);
      gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      let warm=0,visible=0,fingerprint=2166136261;const quadrants=[0,0,0,0];
      for(let i=0;i<pixels.length;i+=4) {
        const r=pixels[i],g=pixels[i+1],b=pixels[i+2],a=pixels[i+3];
        if(a>30) visible++;
        fingerprint=Math.imul(fingerprint^r,16777619)>>>0;
        if(r>125&&g>20&&r>g*1.08&&b<140&&a>60) {
          warm++;const x=(i/4)%canvas.width,y=Math.floor(i/4/canvas.width);
          quadrants[(x>=canvas.width/2?1:0)+(y>=canvas.height/2?2:0)]++;
        }
      }
      const clip=getComputedStyle(document.querySelector('.realm-target')).clipPath;
      const coordinates=(clip.match(/-?[\d.]+px/g)||[]).map(Number.parseFloat);
      let openingExtent=0;
      for(let i=0;i<coordinates.length;i+=2) openingExtent=Math.max(openingExtent,
        Math.hypot(coordinates[i]-innerWidth/2,coordinates[i+1]-innerHeight/2));
      return {progress:p,warm,visible,quadrants,fingerprint,openingExtent,glError:gl.getError(),route:location.hash};
    },progress);
    report.frames.push(sample);assert.equal(sample.glError,0);
    assert(!sample.route.includes('/poems/'),'Route committed before the reveal finished');
    if(progress===0) assert.equal(sample.visible,0);
    if(progress>0 && progress<=.1) {assert(sample.warm>150,'Ignition must contain visible hot flame');assert(sample.openingExtent<.01,'Paper opened before ignition completed');}
    if([.25,.5,.75].includes(progress)) {assert(sample.warm>1000,'Burning edge lacks visible flame');assert(sample.quadrants.every(n=>n>40),'Flame must follow the opening on every side');}
    if([0,.03,.06,.1,.25,.5,.75,.99].includes(progress)) await page.screenshot({path:output+`/fire-${String(Math.round(progress*1000)).padStart(3,'0')}.png`});
  }
  check('visible animated ignition precedes the paper opening');
  assert.notEqual(report.frames.find(f=>f.progress===.03).fingerprint,report.frames.find(f=>f.progress===.09).fingerprint);
  check('early flames change while the source paper remains closed');
  check('hot flames follow all sides of the opening throughout the burn');
  await page.evaluate(()=>window.__POETIC_MOTION__.transition(1));
  await page.locator('body[data-page=poem] #main').waitFor();
  assert.equal(await page.locator('.realm-transition').count(),0);
  await page.screenshot({path:output+'/fire-1000.png'});
  check('final frame removes fire, commits the target and releases the overlay');

  await context.close();
  // Measure normal entry in a fresh viewport, separate from synchronous GPU readbacks.
  const playbackContext=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'no-preference'});
  await authenticatedUi(playbackContext);const playbackPage=await playbackContext.newPage();attach(playbackPage);
  await openAuthenticatedPage(playbackPage,origin);
  await playbackPage.waitForTimeout(350);
  report.playback=await playbackPage.evaluate(async()=>{
    const gl=document.querySelector('.hero-art canvas')?.getContext('webgl2');
    const debug=gl?.getExtension('WEBGL_debug_renderer_info');
    const renderer=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;
    const timestamps=[];let started=false;
    document.querySelector('[data-poem=fengqiao] .enter-button').click();
    await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(Error('Playback did not complete')),12000);
      const tick=t=>{
        const overlay=document.querySelector('.realm-transition');
        if(overlay?.dataset.state==='playing') {started=true;timestamps.push(t);}
        if(started&&!overlay) {clearTimeout(timeout);resolve();}else requestAnimationFrame(tick);
      };requestAnimationFrame(tick);
    });
    const intervals=timestamps.slice(1).map((t,i)=>t-timestamps[i]).sort((a,b)=>a-b);
    return {viewport:[innerWidth,innerHeight],renderer,frames:timestamps.length,duration:timestamps.at(-1)-timestamps[0],
      p50:intervals[Math.floor(intervals.length/2)],p95:intervals[Math.floor(intervals.length*.95)],over50:intervals.filter(t=>t>50).length};
  });
  assert((report.playback.frames-1)*1000/report.playback.duration>=50,'Playback below 50fps');
  assert(report.playback.p50<=20,'Median frame interval exceeds 20ms');
  check('1920x1080 actual playback remains smooth');
  await playbackContext.close();

  const videoContext=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference',recordVideo:{dir:output+'/video',size:{width:1440,height:900}}});
  await authenticatedUi(videoContext);const videoPage=await videoContext.newPage();attach(videoPage);
  await openAuthenticatedPage(videoPage,origin);
  await videoPage.waitForTimeout(350);await enter(videoPage);
  await videoPage.locator('body[data-page=poem] #main').waitFor();await videoPage.waitForTimeout(650);
  const video=videoPage.video();await videoContext.close();report.video=await video.path();
  assert.deepEqual(report.errors,[]);report.complete=true;
  check('unmodified live playback recorded without page exceptions');
} finally {
  await browser.close();await writeFile(output+'/fire-verification.json',JSON.stringify(report,null,2)+'\n');
}
