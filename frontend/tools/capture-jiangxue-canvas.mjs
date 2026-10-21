/** Real-time WebGL canvas capture through Chrome MediaRecorder, without FFmpeg.
 * Inspection cuts are recorded continuously; timestamps and low-fps output stay real.
 */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {authenticatedUi} from './authenticated-ui-fixture.mjs';

const revision=process.argv.find(a=>a.startsWith('--revision='))?.split('=')[1]??'06';
assert.match(revision,/^(04|05|06)$/);
const out=new URL(`../../output/jiangxue-model-v${revision}/validation/canvas-capture/`,import.meta.url);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
// Capture-only context: retain the actual WebGL buffer between presented frames.
await context.addInitScript(()=>{
  const get=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(kind,options){return get.call(this,kind,/^(webgl2?|experimental-webgl)$/.test(kind)?{...options,preserveDrawingBuffer:true}:options);};
});
await authenticatedUi(context);
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(`http://127.0.0.1:5187/?scene=jiangxue&lab=jiangxue&t=0&asset=scenes/jiangxue.scene-v${revision}.json`);
  await page.evaluate(async()=>{const {tabSession}=await import('/src/api/TabSession.ts');tabSession.set({token:'t'.repeat(43),lease:'l'.repeat(43)});});
  await page.reload();await page.waitForFunction(()=>!!window.__JIANGXUE_SAMPLE__,null,{timeout:45000});
  await page.addStyleTag({content:'.jx-label,.jx-tools,.jx-status{visibility:hidden!important}'});
  for(const [view,name] of [['CAM_enter','review-main.png'],['CAM_boat','review-boat.png']]){
    await page.evaluate(view=>{window.__JIANGXUE_SAMPLE__.setView(view);window.__JIANGXUE_SAMPLE__.seek(8);},view);
    await page.getByLabel('江雪三维模型',{exact:true}).screenshot({path:new URL('../'+name,out).pathname});
  }
  await page.evaluate(()=>{window.__JIANGXUE_SAMPLE__.setView('CAM_enter');window.__JIANGXUE_SAMPLE__.seek(0);});
  const recording=await page.evaluate(()=>{
    const canvas=document.querySelector('canvas'),copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;
    const ctx=copy.getContext('2d',{alpha:false}),stream=copy.captureStream(0),track=stream.getVideoTracks()[0],gl=canvas.getContext('webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info');
    const mime=['video/webm;codecs=vp8','video/webm;codecs=vp9','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
    if(!mime)throw new Error('Chrome MediaRecorder has no WebM encoder');
    const chunks=[],recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3500000});
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    const start=performance.now();recorder.start(1000);
    const draw=()=>{ctx.drawImage(canvas,0,0);track.requestFrame();};draw();
    const timer=setInterval(draw,1000/15);window.__JIANGXUE_RECORDER__={stream,recorder,chunks,start,mime,timer,draw};
    return {mime,width:canvas.width,height:canvas.height,requestedStreamFps:15,preserveDrawingBuffer:true,renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null};
  });
  const cuts=[];
  for(const view of ['CAM_enter','CAM_boat','CAM_fisherman','CAM_nature','CAM_rocks']){
    cuts.push(await page.evaluate(view=>{
      window.__JIANGXUE_SAMPLE__.setView(view);window.__JIANGXUE_SAMPLE__.seek(0);window.__JIANGXUE_SAMPLE__.play();
      return {view,elapsedMs:performance.now()-window.__JIANGXUE_RECORDER__.start,stats:window.__JIANGXUE_SAMPLE__.stats()};
    },view));
    await page.waitForTimeout(3500);
  }
  const result=await page.evaluate(()=>new Promise((resolve,reject)=>{
    const r=window.__JIANGXUE_RECORDER__;clearInterval(r.timer);r.draw();
    r.recorder.onerror=e=>reject(new Error(String(e.error)));
    r.recorder.onstop=async()=>{
      r.stream.getTracks().forEach(t=>t.stop());
      const bytes=new Uint8Array(await new Blob(r.chunks,{type:r.mime}).arrayBuffer());let binary='';
      for(let start=0;start<bytes.length;start+=32768)binary+=String.fromCharCode(...bytes.subarray(start,start+32768));
      resolve({base64:btoa(binary),durationMs:performance.now()-r.start,bytes:bytes.length});delete window.__JIANGXUE_RECORDER__;
    };setTimeout(()=>r.recorder.stop(),200);
  }));
  const bytes=Buffer.from(result.base64,'base64');assert(bytes.length>1000);
  await writeFile(new URL('jiangxue-inspection.webm',out),bytes,{flag:'wx'});
  const report={revision,method:'actual WebGL drawing-buffer copies into Canvas MediaRecorder at wall time; capture-only preserved buffer; manual inspection cuts; no audio or UI overlay',...recording,durationMs:result.durationMs,bytes:result.bytes,cuts,decodeReview:'pending sequential playback',decodedFrames:[],errors};
  await writeFile(new URL('capture.json',out),JSON.stringify(report,null,2));
  await page.evaluate(()=>window.__JIANGXUE_SAMPLE__.dispose());
  // Decode actual video frames in Chrome for visual QA of the saved recording.
  await page.route('**/__jiangxue_recording.webm',route=>route.fulfill({status:200,contentType:'video/webm',body:bytes}));
  await page.route('**/__jiangxue_recording_review',route=>route.fulfill({status:200,contentType:'text/html',body:'<html><body style="margin:0;background:#17282d"><video muted style="display:block;width:1440px;height:900px" src="/__jiangxue_recording.webm"></video></body></html>'}));
  await page.goto('http://127.0.0.1:5187/__jiangxue_recording_review');
  await page.waitForFunction(()=>document.querySelector('video').readyState>=2);
  const frames=[];
  for(const target of [2,8,null]){
    // MediaRecorder WebM may lack seek cues. Verify actual sequential playback.
    await page.evaluate(()=>document.querySelector('video').play());
    await page.waitForFunction(target=>{const v=document.querySelector('video');return target===null?v.ended:v.currentTime>=target||v.ended;},target,{timeout:45000});
    const actualTime=await page.evaluate(()=>{const video=document.querySelector('video');video.pause();return video.currentTime;});
    assert(actualTime>=(target??8)-.1,'Recorded video ended before the inspected cut');
    const path=new URL(`frame-${target===null?'last':Math.round(target*1000)+'ms'}.png`,out);
    await page.locator('video').screenshot({path:path.pathname});frames.push({target,actualTime,path:path.pathname});
  }
  report.decodeReview='sequential playback without seeking';report.decodedFrames=frames;
  report.encodedDurationSeconds=await page.evaluate(()=>{const d=document.querySelector('video').duration;return Number.isFinite(d)?d:null;});
  await writeFile(new URL('capture.json',out),JSON.stringify(report,null,2));
  console.log(JSON.stringify({revision,durationMs:result.durationMs,bytes:result.bytes,decodedFrames:frames.length,errors}));
}catch(error){await writeFile(new URL('failure.json',out),JSON.stringify({error:error.stack,errors},null,2));throw error;}
finally{await context.close();await browser.close();}
