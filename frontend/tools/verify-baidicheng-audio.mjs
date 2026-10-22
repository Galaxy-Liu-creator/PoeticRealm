import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {authenticatedUi,openAuthenticatedPage} from './authenticated-ui-fixture.mjs';

const base=process.env.BASE_URL??'http://127.0.0.1:5186';
const stamp=new Date().toISOString().replaceAll(':','-');
const output=resolve('output/baidicheng-audio-v01/validation',stamp);
await mkdir(output,{recursive:true});
const report={base,output,checks:[],errors:[],networkFailures:[]};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
await authenticatedUi(context);
await context.route('**/api/v1/account/settings',route=>route.fulfill({status:200,contentType:'application/json',body:'{"library":null}'}));
await context.route('**/api/v1/account/devices',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
await context.addInitScript(()=>{
  window.bdAudioSources=[];window.bdAudioAnalysers=[];window.bdDisposals=[];
  window.addEventListener('baidicheng:disposed',event=>window.bdDisposals.push(event.detail));
  const create=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(){
    const source=create.call(this),start=source.start;
    source.start=function(when=0,offset=0,...rest){window.bdAudioSources.push({source,offset,when});return start.call(this,when,offset,...rest);};
    return source;
  };
  const connect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(destination,...rest){
    if(destination instanceof AudioDestinationNode){const analyser=this.context.createAnalyser();analyser.fftSize=4096;connect.call(this,analyser);window.bdAudioAnalysers.push(analyser);}
    return connect.call(this,destination,...rest);
  };
});
const page=await context.newPage();page.setDefaultTimeout(120000);
page.on('pageerror',error=>report.errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
page.on('requestfailed',request=>report.networkFailures.push({url:request.url(),error:request.failure()?.errorText}));
const check=async label=>{report.checks.push(label);console.log(label);await writeFile(resolve(output,'verification.json'),JSON.stringify(report,null,2)+'\n');};
const sample=()=>page.evaluate(()=>{
  const analyser=window.bdAudioAnalysers.findLast(node=>node.context.state==='running');
  if(!analyser)return 0;
  const values=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(values);
  return Math.sqrt(values.reduce((sum,value)=>sum+value*value,0)/values.length);
});
const silence=()=>page.waitForFunction(()=>{
  const analyser=window.bdAudioAnalysers.findLast(node=>node.context.state==='running');
  if(!analyser)return false;
  const values=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(values);
  return Math.sqrt(values.reduce((sum,value)=>sum+value*value,0)/values.length)<.000001;
},null,{timeout:3000,polling:50});
const stage=async time=>page.evaluate(time=>{const scene=window.__POETIC_SCENE__;scene.pause();scene.seek(time);scene.play();scene.seek(time);return scene.details().audio;},time);
try{
  await page.goto(base+'/');await page.locator('body[data-page=account] [data-curtain]').first().waitFor();
  assert.equal(await page.locator('[data-scene-canvas]').count(),0);
  await openAuthenticatedPage(page,base+'/#/');
  await page.locator('[data-poem=baidicheng] .enter-button').focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>window.__POETIC_SCENE__?.id==='baidicheng'&&window.__POETIC_SCENE__.ready||document.querySelector('.realm-transition[data-state=failed]'));
  if(!await page.evaluate(()=>window.__POETIC_SCENE__?.ready))assert.fail(await page.locator('.realm-transition').getAttribute('data-failure',{timeout:1000}).catch(()=> 'Scene preparation failed'));
  await page.evaluate(()=>{const scene=window.__POETIC_SCENE__;scene.pause();scene.stop();scene.seek(0);});
  let details=await page.evaluate(()=>window.__POETIC_SCENE__.details());
  if(details.audio.muted||details.audio.state!=='running')await page.locator('[data-scene-sound]').click();
  details=await page.evaluate(()=>window.__POETIC_SCENE__.details());
  assert.equal(details.model,'models/baidicheng/scene_v03.glb');
  assert.deepEqual(details.audio.sounds,['wind','water','ape-left','ape-right']);
  report.initial={model:details.model,view:details.view,audio:details.audio};
  await check('Ordinary curtain/login and overview enter the deployed v03 scene with both ape banks');
  const left=await stage(1.7);assert.equal(left.lastEvent,'ape-left');assert.equal(left.apeCues.length,1);
  await page.waitForTimeout(220);report.leftRms=await sample();assert(report.leftRms>.00001);
  const leftStart=await page.evaluate(()=>{const voice=window.bdAudioSources.findLast(item=>Math.abs(item.source.buffer.duration-4.2)<.001);window.bdLeftBuffer=voice.source.buffer;return voice.offset;});
  assert(Math.abs(leftStart-.3)<.001);report.left=left;
  const right=await stage(6.6);assert.equal(right.lastEvent,'ape-right');assert.equal(right.apeCues.length,1);
  await page.waitForTimeout(220);report.rightRms=await sample();assert(report.rightRms>.00001);
  const rightStart=await page.evaluate(()=>{const voice=window.bdAudioSources.findLast(item=>Math.abs(item.source.buffer.duration-4.6)<.001);window.bdRightBuffer=voice.source.buffer;return voice.offset;});
  assert(Math.abs(rightStart-.3)<.001);report.right=right;
  assert.notDeepEqual(left.apeCues[0].position,right.apeCues[0].position);
  await check('Actual Web Audio emits nonzero left/right calls from distinct authored world positions and restores offsets');
  report.stereo=await page.evaluate(async positions=>{
    const listener=window.bdAudioSources.at(-1).source.context.listener;
    const render=async(buffer,position)=>{
      const offline=new OfflineAudioContext(2,Math.ceil(buffer.duration*24000),24000),source=offline.createBufferSource(),panner=offline.createPanner();
      source.buffer=buffer;panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=10;panner.rolloffFactor=.12;
      [panner.positionX,panner.positionY,panner.positionZ].forEach((parameter,index)=>parameter.value=position[index]);
      for(const property of ['positionX','positionY','positionZ','forwardX','forwardY','forwardZ','upX','upY','upZ'])offline.listener[property].value=listener[property].value;
      source.connect(panner);panner.connect(offline.destination);source.start();
      const result=await offline.startRendering();
      return [0,1].map(channel=>Math.sqrt(result.getChannelData(channel).reduce((sum,value)=>sum+value*value,0)/result.length));
    };
    return {left:await render(window.bdLeftBuffer,positions.left),right:await render(window.bdRightBuffer,positions.right)};
  },{left:left.apeCues[0].position,right:right.apeCues[0].position});
  assert(report.stereo.left[0]>report.stereo.left[1]*1.03);assert(report.stereo.right[1]>report.stereo.right[0]*1.03);
  await check('Real HRTF offline rendering places the left bank left and right bank right from the overview camera');
  const eventCount=right.events.length;
  await page.evaluate(()=>{window.__POETIC_SCENE__.seek(6.7);window.__POETIC_SCENE__.seek(6.7);});
  assert.equal((await page.evaluate(()=>window.__POETIC_SCENE__.details().audio)).events.length,eventCount);
  await page.evaluate(()=>{window.__POETIC_SCENE__.pause();window.__POETIC_SCENE__.seek(6.7);});
  await silence();report.pauseRms=await sample();assert(report.pauseRms<.000001);
  assert.equal((await page.evaluate(()=>window.__POETIC_SCENE__.details().audio)).voices,0);
  await stage(3);await page.locator('[data-scene-sound]').click();await silence();report.muteRms=await sample();assert(report.muteRms<.000001);
  await page.evaluate(()=>window.__POETIC_SCENE__.seek(6.6));
  await page.locator('[data-scene-sound]').click();await page.evaluate(()=>window.__POETIC_SCENE__.seek(6.7));
  assert.equal((await page.evaluate(()=>window.__POETIC_SCENE__.details().audio)).lastEvent,'ape-right');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal((await page.evaluate(()=>window.__POETIC_SCENE__.details().audio)).state,'suspended');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>window.__POETIC_SCENE__.details().audio.state==='running');
  await page.evaluate(()=>{window.__POETIC_SCENE__.stop();window.__POETIC_SCENE__.pause();window.__POETIC_SCENE__.seek(0);});
  assert.equal((await page.evaluate(()=>window.__POETIC_SCENE__.details().audio)).apeCues.length,0);
  await check('Repeated frames, pause, mute/unmute, background suspension and replay preserve the cue lifecycle');
  await page.evaluate(()=>{window.__POETIC_SCENE__.setView('CAM_follow');window.__POETIC_SCENE__.seek(8);});
  assert.equal((await page.evaluate(()=>window.__POETIC_SCENE__.details())).view.name,'CAM_follow');
  await page.evaluate(()=>{window.__POETIC_SCENE__.setView('CAM_enter');window.__POETIC_SCENE__.seek(8);});
  await page.screenshot({path:resolve(output,'deployed-1440.png')});
  await page.setViewportSize({width:1920,height:1080});await page.evaluate(()=>window.__POETIC_SCENE__.seek(8));
  await page.screenshot({path:resolve(output,'deployed-1920.png')});
  const pcm=await page.evaluate(async()=>{
    const offline=new OfflineAudioContext(2,24*24000,24000);
    for(const [start,buffer,pan] of [[1.4,window.bdLeftBuffer,-.65],[6.3,window.bdRightBuffer,.65],[11,window.bdLeftBuffer,-.65],[15.7,window.bdRightBuffer,.65],[19.4,window.bdLeftBuffer,-.65]]) {
      const source=offline.createBufferSource(),panner=offline.createStereoPanner(),gain=offline.createGain();
      source.buffer=buffer;panner.pan.value=pan;gain.gain.value=.32;
      source.connect(gain);gain.connect(panner);panner.connect(offline.destination);source.start(start);
    }
    const result=await offline.startRendering(),bytes=new Uint8Array(result.length*4),view=new DataView(bytes.buffer);
    for(let index=0;index<result.length;index++)for(let channel=0;channel<2;channel++)view.setInt16((index*2+channel)*2,Math.round(Math.max(-1,Math.min(1,result.getChannelData(channel)[index]))*32767),true);
    let binary='';for(let index=0;index<bytes.length;index+=16384)binary+=String.fromCharCode(...bytes.subarray(index,index+16384));return btoa(binary);
  });
  const bytes=Buffer.from(pcm,'base64'),header=Buffer.alloc(44);
  header.write('RIFF');header.writeUInt32LE(bytes.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(24000,24);header.writeUInt32LE(96000,28);header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(bytes.length,40);
  await writeFile(resolve(output,'two-banks-preview.wav'),Buffer.concat([header,bytes]));
  report.preview={file:'two-banks-preview.wav',duration:24,channels:2,sampleRate:24000,scope:'Original dry calls with stereo pans for listening; in-product localization uses authored HRTF positions'};
  await page.locator('.navigation a[href="#/"]').first().click();
  await page.waitForFunction(()=>document.body.dataset.page==='home'&&!window.__POETIC_SCENE__);
  report.release=await page.evaluate(()=>window.bdDisposals.at(-1));assert.deepEqual(report.release.memory,{geometries:0,textures:0});
  report.contexts=await page.evaluate(()=>[...new Set(window.bdAudioSources.map(item=>item.source.context))].map(audio=>audio.state));
  assert(report.contexts.includes('closed'));
  await page.reload();await page.locator('body[data-page=account]').waitFor();
  await check('Follow view, two desktop sizes, return resource disposal and refresh curtain pass on the deployed frontend');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.networkFailures,[]);report.pass=true;
}catch(error){
  report.failure=String(error);report.page=await page.evaluate(()=>({url:location.href,text:document.body.innerText.slice(0,1200)})).catch(()=>null);
  await page.screenshot({path:resolve(output,'failure.png'),timeout:15000}).catch(()=>{});throw error;
}finally{
  await writeFile(resolve(output,'verification.json'),JSON.stringify(report,null,2)+'\n');await browser.close();console.log(output);
}
