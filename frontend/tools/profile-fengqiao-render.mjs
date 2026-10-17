import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {authenticatedUi,openAuthenticatedPage} from './authenticated-ui-fixture.mjs';
import {openCurtainForm} from './entry-navigation.mjs';
const output=resolve(process.env.PROFILE_OUTPUT??fileURLToPath(new URL('../../output/playwright/fengqiao-scene-v01/profiling-v01',import.meta.url)));
const base=process.env.PROFILE_BASE??'http://127.0.0.1:5187';
const asset=process.env.PROFILE_ASSET??'scenes/fengqiao.scene-v01.json';
const product=process.env.PROFILE_PRODUCT==='true';
const view=process.env.PROFILE_VIEW??'CAM_enter';
const durationMs=Number(process.env.PROFILE_DURATION_MS??12000);
if(!Number.isFinite(durationMs)||durationMs<1000)throw new Error('Invalid profiling duration');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
await authenticatedUi(context);
await context.route('**/api/v1/account/settings',route=>route.fulfill({status:200,contentType:'application/json',body:'{"library":null}'}));
const page=await context.newPage(),errors=[],samples=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
try {
  if(product){
    await openAuthenticatedPage(page,base+'/#/poems/fengqiao');
    await page.waitForFunction(()=>window.__POETIC_SCENE__?.ready,null,{timeout:45000});
  }else{
    await page.goto(`${base}/?scene=fengqiao&lab=fengqiao&asset=${encodeURIComponent(asset)}`);
    await openCurtainForm(page);
    await page.locator('[name=username]').fill('motion_fixture');
    await page.locator('[name=password]').fill('Fixturepass123!');
    await page.locator('[type=submit]').click();
    await page.waitForFunction(()=>window.__POETIC__?.ready,null,{timeout:45000});
  }
  await page.evaluate(product=>{window.__PROFILE_SCENE__=product?window.__POETIC_SCENE__:window.__FENGQIAO_SAMPLE__;window.__PROFILE_CLOCK__=product?window.__POETIC_SCENE__:window.__POETIC__;},product);
  if(process.env.PROFILE_TIMINGS==='true') await page.evaluate(async()=>{
    const {Engine}=await import('/src/engine/Engine.ts'),original=Engine.prototype.frame;
    window.__RENDER_TIMINGS__={cpu:[],gpu:[],pending:[]};
    Engine.prototype.frame=function(dt) {
      const measurements=window.__RENDER_TIMINGS__,gl=this.renderer.getContext(),extension=gl.getExtension('EXT_disjoint_timer_query_webgl2');
      while(measurements.pending.length && gl.getQueryParameter(measurements.pending[0],gl.QUERY_RESULT_AVAILABLE)) {
        const query=measurements.pending.shift();
        if(!gl.getParameter(extension.GPU_DISJOINT_EXT))measurements.gpu.push(gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6);
        gl.deleteQuery(query);
      }
      const query=extension && measurements.pending.length<4?gl.createQuery():null;
      if(query)gl.beginQuery(extension.TIME_ELAPSED_EXT,query);
      const start=performance.now();original.call(this,dt);measurements.cpu.push(performance.now()-start);
      if(query){gl.endQuery(extension.TIME_ELAPSED_EXT);measurements.pending.push(query);}
    };
  });
  const cases=process.env.PROFILE_VIEWS_ONLY==='true'
    ? ['enter','riverbank','boat','rower','temple','bridge','bell','nature'].map(name=>[name,'CAM_'+name,true,true,true])
    : [
    ...(process.env.PROFILE_STATIC_COMPARE==='true'?[['unmerged',view,true,true,true,false]]:[]),
    ['all-on',view,true,true,true],['wind-off',view,true,true,false],
    ['shadow-off',view,true,false,true],['reflection-off',view,false,true,true],
    ...(process.env.PROFILE_FOG_COMPARE==='true'?[['fog-off',view,true,true,true,true,false]]:[]),
    ...(process.env.PROFILE_VIEW?[]:[['boat','CAM_boat',true,true,true],['temple','CAM_temple',true,true,true]]),['all-on-repeat',view,true,true,true],
  ];
  for(const [label,view,reflection,shadows,wind,merge=true,fog=true] of cases) {
    await page.evaluate(({view,reflection,shadows,wind,merge,fog})=>{
      const api=window.__PROFILE_SCENE__;api.setView(view);api.setReflection(reflection);api.setShadows(shadows);api.setWind(wind);
      api.setStaticMerge?.(merge);api.setFog?.(fog);
      window.__PROFILE_CLOCK__.seek(8);window.__PROFILE_CLOCK__.play();
    },{view,reflection,shadows,wind,merge,fog});
    await page.waitForTimeout(1000);
    if(process.env.PROFILE_TIMINGS==='true') await page.evaluate(()=>{window.__RENDER_TIMINGS__.cpu=[];window.__RENDER_TIMINGS__.gpu=[];});
    const measurement=await page.evaluate(async durationMs=>{
      const times=[],states=[];
      await new Promise(resolve=>{let start;const tick=now=>{start??=now;times.push(now);states.push(window.__PROFILE_CLOCK__.state());if(now-start<durationMs)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});
      const intervals=times.slice(1).map((t,i)=>t-times[i]).sort((a,b)=>a-b),duration=times.at(-1)-times[0];
      return {fps:(times.length-1)*1000/duration,p95:intervals[Math.floor(intervals.length*.95)],maxCalls:Math.max(...states.map(s=>s.calls)),maxTriangles:Math.max(...states.map(s=>s.triangles))};
    },durationMs);
    const sample={label,view,...measurement,details:await page.evaluate(()=>window.__PROFILE_SCENE__.details())};samples.push(sample);
    if(process.env.PROFILE_TIMINGS==='true') sample.timings=await page.evaluate(()=>{
      const percentile=values=>{values.sort((a,b)=>a-b);return {samples:values.length,p50:values[Math.floor(values.length*.5)],p95:values[Math.floor(values.length*.95)]};};
      return {cpuMilliseconds:percentile(window.__RENDER_TIMINGS__.cpu),gpuMilliseconds:percentile(window.__RENDER_TIMINGS__.gpu)};
    });
    console.log(JSON.stringify({label,view,...measurement,timings:sample.timings,reflectionScissor:sample.details.reflectionScissor}));
    await writeFile(resolve(output,'profile.json'),JSON.stringify({scope:'render-diagnostic',product,durationMs,samples,errors},null,2));
  }
} finally {await browser.close();}
if(errors.length)throw new Error(JSON.stringify(errors));
