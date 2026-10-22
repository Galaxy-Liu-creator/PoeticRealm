import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {authenticatedUi} from './authenticated-ui-fixture.mjs';
const revision=process.argv.find(a=>a.startsWith('--revision='))?.slice(11)??'03';
if(!['01','02','03'].includes(revision))throw new Error('Invalid revision');
const folder=process.argv.find(a=>a.startsWith('--out='))?.slice(6)??'browser';
if(!/^[a-z0-9-]+$/.test(folder))throw new Error('Invalid evidence folder');
const evidence=process.argv.find(a=>a.startsWith('--evidence='))?.slice(11)??'baidicheng-model-v'+revision;
if(!/^baidicheng-(model|runtime)-v[0-9]+$/.test(evidence))throw new Error('Invalid evidence root');
const out=new URL('../../output/'+evidence+'/validation/'+folder+'/',import.meta.url).pathname;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist']});
const assetBytes=await readFile(new URL('../public/assets/models/baidicheng/scene_v'+revision+'.glb',import.meta.url));
const report={assetSHA256:createHash('sha256').update(assetBytes).digest('hex'),errors:[],warnings:[],views:[]};
try {
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});await authenticatedUi(context);
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());if(m.type()==='warning')report.warnings.push(m.text());});
  await page.goto(`http://127.0.0.1:5187/?scene=baidicheng&lab=baidicheng&t=0&asset=scenes/baidicheng.scene-v${revision}.json`);
  await page.locator('#app[data-initialized=true]').waitFor({timeout:30000});
  await page.evaluate(async()=>{const {tabSession}=await import('/src/api/TabSession.ts');tabSession.set({token:'t'.repeat(43),lease:'l'.repeat(43)});});await page.reload();
  await page.waitForFunction(()=>!!window.__BAIDICHENG_SAMPLE__,null,{timeout:90000});
  await page.evaluate(()=>{window.__BAIDICHENG_SAMPLE__.pause();window.__BAIDICHENG_SAMPLE__.stop();});
  report.renderer=await page.evaluate(()=>{const gl=document.querySelector('canvas').getContext('webgl2'),d=gl.getExtension('WEBGL_debug_renderer_info');return d?gl.getParameter(d.UNMASKED_RENDERER_WEBGL):'unknown';});
  const views=process.argv.includes('--all')?['CAM_enter','CAM_city','CAM_follow','CAM_gorge','CAM_exit','CAM_boat','CAM_rower']:['CAM_enter'];
  for(const view of views){
    await page.evaluate(view=>{window.__BAIDICHENG_SAMPLE__.setView(view);window.__BAIDICHENG_SAMPLE__.seek(0);},view);
    await page.screenshot({path:out+view+'-1440.png'});report.views.push(await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.stats()));console.log(view);
  }
  await page.addStyleTag({content:'.jx-label,.jx-tools{visibility:hidden}'});await page.evaluate(()=>{window.__BAIDICHENG_SAMPLE__.setView('CAM_enter');window.__BAIDICHENG_SAMPLE__.seek(0);});await page.screenshot({path:out+'review-main.png'});
  if(process.argv.includes('--video')){
    const recording=await page.evaluate(async()=>{
      const canvas=document.querySelector('canvas'),stream=canvas.captureStream(12),type='video/webm;codecs=vp8';
      if(!MediaRecorder.isTypeSupported(type))throw new Error('VP8 unavailable');
      const recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:1800000}),chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      const stopped=new Promise(resolve=>recorder.onstop=resolve),start=performance.now();recorder.start();
      const views=['CAM_enter','CAM_city','CAM_follow','CAM_boat','CAM_gorge','CAM_exit'];const steps=[];
      window.__BAIDICHENG_SAMPLE__.play();
      for(const view of views){window.__BAIDICHENG_SAMPLE__.setView(view);steps.push({view,wallSeconds:(performance.now()-start)/1000,sceneTime:window.__BAIDICHENG_SAMPLE__.stats().time});await new Promise(resolve=>setTimeout(resolve,3500));}
      window.__BAIDICHENG_SAMPLE__.pause();window.__BAIDICHENG_SAMPLE__.stop();recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());
      const blob=new Blob(chunks,{type}),buffer=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<buffer.length;i+=8192)binary+=String.fromCharCode(...buffer.subarray(i,i+8192));
      return {base64:btoa(binary),mime:type,bytes:blob.size,wallSeconds:(performance.now()-start)/1000,steps,width:canvas.width,height:canvas.height,audio:false};
    });
    await writeFile(out+'inspection.webm',Buffer.from(recording.base64,'base64'));delete recording.base64;report.video=recording;
  }
  report.release=await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.dispose());
  report.pass=report.errors.length===0;await writeFile(out+'capture.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  if(!report.pass)process.exitCode=1;
}catch(error){report.failure=String(error);await writeFile(out+'capture-failed.json',JSON.stringify(report,null,2)+'\n');throw error;}
finally{await browser.close();}
