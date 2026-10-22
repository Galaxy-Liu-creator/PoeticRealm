import {isolateViteUpdates} from './isolated-vite-fixture.mjs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {PNG} from 'pngjs';
import {mkdir,writeFile} from 'node:fs/promises';
const out=new URL('../../output/baidicheng-runtime-v01/validation/cache/',import.meta.url).pathname;
await mkdir(out,{recursive:true});
const report={viewport:[1440,900],dpr:1,errors:[],comparisons:[]};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1}),page=await context.newPage();await isolateViteUpdates(context);
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.route('**/__cache_probe__',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}canvas{display:block;width:100%;height:100%}</style><canvas></canvas>'}));
 await page.goto('http://127.0.0.1:5187/__cache_probe__');
 await page.evaluate(async()=>{const {prepareBaidicheng}=await import('/src/scenes/BaidichengScene.ts');const abort=new AbortController();window.probe=await prepareBaidicheng(document.querySelector('canvas'),abort.signal,new URLSearchParams('t=8'));window.probe.api.stop();abort.abort();window.probe.enter();window.probe.api.pause();window.probe.api.stop();});
 report.preparationHandoff=true;
 for(const view of ['CAM_enter','CAM_city','CAM_gorge','CAM_exit','CAM_follow','CAM_boat','CAM_rower'])for(const time of [8,23]){
  const pictures=[];
  for(const cached of [false,true]){
   await page.evaluate(({view,time,cached})=>{const p=window.probe;p.api.setStaticCache(cached);p.api.setView(view);p.api.seek(time);},{view,time,cached});
   const bytes=await page.screenshot();pictures.push(PNG.sync.read(bytes));await writeFile(out+`${view}-${time}-${cached?'cached':'direct'}.png`,bytes);
  }
  let sum=0,changed=0,max=0;const [a,b]=pictures;
  for(let i=0;i<a.data.length;i+=4){let pixel=0;for(let c=0;c<3;c++){const d=Math.abs(a.data[i+c]-b.data[i+c]);pixel+=d;sum+=d;max=Math.max(max,d);}if(pixel>20)changed++;}
  const result={view,time,meanChannelError:sum/(a.width*a.height*3),changedRatio:changed/(a.width*a.height),max,cache:await page.evaluate(()=>window.probe.api.stats().renderCache)};
  report.comparisons.push(result);await writeFile(out+'verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(result));
  assert(result.meanChannelError<.25&&result.changedRatio<.005,'Cached/direct images diverge');
  assert.equal(result.cache.bypassed,['CAM_follow','CAM_boat','CAM_rower'].includes(view));
 }
 report.release=await page.evaluate(()=>window.probe.api.dispose());assert.deepEqual(report.release.memory,{geometries:0,textures:0});assert(report.release.contextLost);assert.deepEqual(report.errors,[]);report.pass=true;
 await writeFile(out+'verification.json',JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();}
