import {isolateViteUpdates} from './isolated-vite-fixture.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {authenticatedUi} from './authenticated-ui-fixture.mjs';
import {readAsset} from './asset-contract.mjs';
import {checkContract} from './check-contract.mjs';
import {checkBudget} from './check-budget.mjs';
import {createOarClearance} from './oar-clearance.mjs';
import {checkBaidicheng} from './baidicheng-contract.mjs';
const revision=process.argv.find(a=>a.startsWith('--revision='))?.slice(11)??'03';
if(!['01','02','03'].includes(revision))throw new Error('Invalid revision');
const phase=process.argv.find(a=>a.startsWith('--phase='))?.slice(8)??'all';
assert(['all','core','release','recovery','performance','performance-follow','lod'].includes(phase));
const evidence=process.argv.find(a=>a.startsWith('--evidence='))?.slice(11)??'baidicheng-model-v'+revision;
assert(/^baidicheng-(model|runtime)-v[0-9]+$/.test(evidence));
const out=new URL('../../output/'+evidence+'/validation/lifecycle/',import.meta.url).pathname;
await mkdir(out,{recursive:true});
const asset=await readAsset(`frontend/public/assets/scenes/baidicheng.scene-v${revision}.json`);
const report={phase,assetSHA256:createHash('sha256').update(asset.bytes).digest('hex'),contract:checkContract(asset),budget:checkBudget(asset),errors:[],expectedErrors:[],warnings:[],release:[],navigation:[]};
const raised=structuredClone(asset.gltf),bank=raised.nodes.find(n=>n.name==='cliff_right_near');bank.translation??=[0,0,0];bank.translation[1]+=.3;
assert.throws(()=>checkBaidicheng({...asset,gltf:raised}),/水线/);report.badWaterlineRejected=true;
if(revision==='03'){const invalid=structuredClone(asset.gltf),far=invalid.nodes.find(n=>n.name==='cliff_right_near_lod');far.translation??=[0,0,0];far.translation[1]+=.3;assert.throws(()=>checkBaidicheng({...asset,gltf:invalid}),/水线/);report.badFarWaterlineRejected=true;assert.throws(()=>checkContract({...asset,gltf:invalid}),/近远层级/);report.badLodTransformRejected=true;}
const fixture=await mkdtemp(join(tmpdir(),'baidicheng-contract-'));
try {
 report.badManifests=[];
 for(const [name,patch] of [['missing-camera',{requiredNodes:asset.manifest.requiredNodes.filter(n=>n!=='CAM_city')}],['wrong-terrain',{terrain:'jiangxue-v06'}],['mixed-revision',{terrain:revision==='02'?'baidicheng-v01':'baidicheng-v02'}],['wrong-model',{model:'../other.glb'}],['wrong-scope',{scope:'full-scene'}],['bad-route',{boatNavigation:{...asset.manifest.boatNavigation,speed:0}}]]){
  const path=join(fixture,name+'.json');await writeFile(path,JSON.stringify({...asset.manifest,...patch}));
  let rejected=false;try{checkContract(await readAsset(path));}catch{rejected=true;}assert(rejected,name+' was not rejected');report.badManifests.push(name);
 }

 if(revision==='03'){
  for(const [name,patch] of [['missing-lod',{distanceLods:asset.manifest.distanceLods.slice(1)}],['bad-lod-distance',{distanceLods:asset.manifest.distanceLods.map((d,i)=>i?d:{...d,distance:0})}],['missing-city-detail',{requiredNodes:asset.manifest.requiredNodes.filter(n=>n!=='city_joinery_detail')}]]){
   const path=join(fixture,name+'.json');await writeFile(path,JSON.stringify({...asset.manifest,...patch}));let rejected=false;try{checkContract(await readAsset(path));}catch{rejected=true;}assert(rejected);report.badManifests.push(name);
  }
 }
}finally{await rm(fixture,{recursive:true,force:true});}
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist']});
try {
 const viewport=phase==='release'?{width:1440,height:900}:{width:1920,height:1080};report.viewport=viewport;
 report.initialViewport={width:1440,height:900};const context=await browser.newContext({viewport:report.initialViewport,deviceScaleFactor:1});await isolateViteUpdates(context);await authenticatedUi(context);const page=await context.newPage();let expected=false;
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')(expected?report.expectedErrors:report.errors).push(m.text());if(m.type()==='warning')report.warnings.push(m.text());});
 await page.goto(`http://127.0.0.1:5187/?scene=baidicheng&lab=baidicheng&t=0&asset=scenes/baidicheng.scene-v${revision}.json`);await page.locator('#app[data-initialized=true]').waitFor();
 await page.evaluate(async()=>{const {tabSession}=await import('/src/api/TabSession.ts');tabSession.set({token:'t'.repeat(43),lease:'l'.repeat(43)});});await page.reload();await page.waitForFunction(()=>!!window.__BAIDICHENG_SAMPLE__,null,{timeout:90000});
 await page.evaluate(()=>{window.__BAIDICHENG_SAMPLE__.pause();window.__BAIDICHENG_SAMPLE__.stop();});
 if(phase!=='release')await page.setViewportSize(viewport);
 report.renderer=await page.evaluate(()=>{const gl=document.querySelector('canvas').getContext('webgl2'),d=gl.getExtension('WEBGL_debug_renderer_info');return {backend:d?gl.getParameter(d.UNMASKED_RENDERER_WEBGL):'unknown',userAgent:navigator.userAgent};});
 if(revision==='03'&&['all','lod'].includes(phase)){
  report.lodChecks={modes:[],views:[]};const hashes=[];
  for(const mode of ['near','far','near','auto']){
   await page.evaluate(mode=>{const api=window.__BAIDICHENG_SAMPLE__;api.setView('CAM_enter');api.seek(0);api.setLods(mode);},mode);
   const state=await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.stats());assert.equal(state.lods.length,9);assert(state.lods.every(d=>d.nearVisible!==d.farVisible));
   if(mode!=='auto'){assert(state.lods.every(d=>d.level===mode));assert.equal(state.terrainLod.level,mode);}
   report.lodChecks.modes.push({mode,...state});hashes.push(createHash('sha256').update(await page.screenshot()).digest('hex'));
  }
  assert.equal(hashes[0],hashes[2]);report.lodChecks.nearRepeatHashes=[hashes[0],hashes[2]];
  assert(report.lodChecks.modes[1].triangles<report.lodChecks.modes[0].triangles*.8);
  for(const view of ['CAM_enter','CAM_city','CAM_follow','CAM_gorge','CAM_exit','CAM_boat','CAM_rower']){
   await page.evaluate(view=>{window.__BAIDICHENG_SAMPLE__.setView(view);window.__BAIDICHENG_SAMPLE__.setLods('auto');},view);
   const state=await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.stats());assert(state.lods.every(d=>d.level===(d.cameraDistance<d.distance?'near':'far')));assert.equal(state.terrainLod.level,state.terrainLod.distance<state.terrainLod.threshold?'near':'far');report.lodChecks.views.push(state);
  }
  for(const mode of ['near','far']){await page.evaluate(mode=>{window.__BAIDICHENG_SAMPLE__.setView('CAM_city');window.__BAIDICHENG_SAMPLE__.setLods(mode);},mode);await page.screenshot({path:out+`city-${mode}.png`});}
  await page.evaluate(()=>{window.__BAIDICHENG_SAMPLE__.setReduced(true);window.__BAIDICHENG_SAMPLE__.setLods('far');window.__BAIDICHENG_SAMPLE__.seek(23);});const reduced=await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.stats());assert.equal(reduced.playing,false);assert(reduced.lods.every(d=>d.level==='far'));report.lodChecks.reduced=true;
  await page.evaluate(()=>{window.__BAIDICHENG_SAMPLE__.setReduced(false);window.__BAIDICHENG_SAMPLE__.setLods('auto');});console.log('9 LOD pairs / seven views / terrain / repeated near / reduced motion passed');
 }
 if(['all','core'].includes(phase)){
 const poses=await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.sampleMotion(Array.from({length:97},(_,i)=>i*4/96)));
 const clearance=createOarClearance(asset);report.rowing={samples:97,maxGrip:0,maxSkinHand:0,maxFoot:0,maxTether:0,highestBlade:-Infinity,intersections:0,poses:[]};
 for(const pose of poses){const check=clearance.check(pose);report.rowing.intersections+=check.intersections;report.rowing.maxGrip=Math.max(report.rowing.maxGrip,...pose.gripErrors);report.rowing.maxSkinHand=Math.max(report.rowing.maxSkinHand,...pose.skinHandErrors);report.rowing.maxFoot=Math.max(report.rowing.maxFoot,...pose.footErrors);report.rowing.maxTether=Math.max(report.rowing.maxTether,pose.tetherError);report.rowing.highestBlade=Math.max(report.rowing.highestBlade,pose.blade[1]);report.rowing.poses.push({t:pose.t,...check});}
 assert(report.rowing.maxGrip<.01&&report.rowing.maxSkinHand<.04&&report.rowing.maxFoot<.01&&report.rowing.maxTether<.001);assert(report.rowing.highestBlade<0);assert.equal(report.rowing.intersections,0);console.log('97 rowing poses passed');
 const samples=await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.sampleMotion([0,8,23,32,90,300,10000]));
 for(const pose of samples){const n=pose.navigation;assert(pose.worldForward.reduce((s,x,i)=>s+x*n.forward[i],0)>.999);assert(pose.gripErrors.every(e=>e<.01));report.navigation.push({time:pose.t,...n});}
 assert(report.navigation.at(-1).position[2]<-237);console.log('Authored course passed');
 await page.evaluate(()=>{window.__BAIDICHENG_SAMPLE__.setView('CAM_follow');window.__BAIDICHENG_SAMPLE__.seek(0);});const start=await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.stats());await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.seek(90));const end=await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.stats());
 const distance=s=>Math.hypot(s.camera[0]-s.navigation.position[0],s.camera[2]-s.navigation.position[2]);assert(Math.abs(distance(start)-distance(end))<.001);report.follow=true;
 const hashes=[];for(const t of [8,23,8]){await page.evaluate(t=>{window.__BAIDICHENG_SAMPLE__.setView('CAM_enter');window.__BAIDICHENG_SAMPLE__.seek(t);},t);hashes.push(createHash('sha256').update(await page.screenshot()).digest('hex'));}assert.equal(hashes[0],hashes[2]);report.seekHashes=hashes;
 await page.screenshot({path:out+'overview-1920.png'});await page.setViewportSize({width:1440,height:900});
 const before=await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.stats().camera);await page.mouse.move(750,400);await page.mouse.down();await page.mouse.move(860,440,{steps:5});await page.mouse.up();const after=await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.stats().camera);assert.notDeepEqual(before,after);report.orbit=true;
 }
 if(['all','release'].includes(phase)){
 for(let i=0;i<10;i++){const before=await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.stats());const after=await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.dispose());assert.deepEqual(after.memory,{geometries:0,textures:0});assert(after.contextLost);await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.reload());await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.stop());const restored=await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.stats());assert.deepEqual(restored.memory,before.memory);report.release.push({cycle:i+1,before:before.memory,after:after.memory,restored:restored.memory});await writeFile(out+'verification-release.partial.json',JSON.stringify(report,null,2)+'\n');console.log('Release cycle',i+1);}
 }
 if(['all','recovery'].includes(phase)){
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{window.__BAIDICHENG_SAMPLE__.setReduced(true);window.__BAIDICHENG_SAMPLE__.seek(23);});const frozen=await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.stats());assert.equal(frozen.playing,false);assert(Math.hypot(frozen.navigation.position[0]-10,frozen.navigation.position[2]-28)<1e-6);report.reduced=true;
 expected=true;await page.route(`**/assets/models/baidicheng/scene_v${revision}.glb`,route=>route.fulfill({status:404,body:'missing asset fixture'}));await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.reload());await page.getByRole('button',{name:'重试',exact:true}).waitFor();assert.match(await page.locator('.jx-status').innerText(),/加载失败/);report.missing=true;
 await page.unroute(`**/assets/models/baidicheng/scene_v${revision}.glb`);await page.getByRole('button',{name:'重试',exact:true}).click();await page.waitForFunction(()=>!!window.__BAIDICHENG_SAMPLE__,null,{timeout:90000});expected=false;report.retry=true;
 await page.route(`**/assets/models/baidicheng/scene_v${revision}.glb`,async route=>{await new Promise(r=>setTimeout(r,1500));await route.continue().catch(()=>{});});const pending=page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.reload());await page.getByRole('button',{name:'取消',exact:true}).click();await pending;assert.match(await page.locator('.jx-status').innerText(),/已取消/);report.cancel=true;
 await page.unroute(`**/assets/models/baidicheng/scene_v${revision}.glb`);await page.getByRole('button',{name:'重试',exact:true}).click();await page.waitForFunction(()=>!!window.__BAIDICHENG_SAMPLE__,null,{timeout:90000});await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.stop());
 }
 if(['all','performance','performance-follow'].includes(phase)){
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>{window.__BAIDICHENG_SAMPLE__.setReduced(false);window.__BAIDICHENG_SAMPLE__.setView('CAM_enter');window.__BAIDICHENG_SAMPLE__.play();});
 if(phase==='performance-follow')await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.setView('CAM_follow'));
 report.performance=await page.evaluate(()=>new Promise(resolve=>{const rows=[];let last=performance.now(),start=last;const frame=now=>{rows.push(now-last);last=now;if(now-start<12000)requestAnimationFrame(frame);else{const sorted=[...rows].sort((a,b)=>a-b);resolve({scope:'12-second diagnostic; not the three-round 60-second gate',durationMs:now-start,frames:rows.length,fps:rows.length*1000/(now-start),p95Ms:sorted[Math.floor(sorted.length*.95)],stats:window.__BAIDICHENG_SAMPLE__.stats()});}};requestAnimationFrame(frame);}));
 await page.evaluate(()=>{window.__BAIDICHENG_SAMPLE__.pause();window.__BAIDICHENG_SAMPLE__.stop();});
 }
 report.finalRelease=await page.evaluate(()=>window.__BAIDICHENG_SAMPLE__.dispose());report.functionalPass=report.errors.length===0;assert(report.functionalPass);
 await writeFile(out+(phase==='all'?'verification.json':`verification-${phase}.json`),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({functionalPass:report.functionalPass,phase,rowing:report.rowing?.maxSkinHand,release:report.release.length,performance:report.performance}));
}catch(error){report.failure=String(error);await writeFile(out+`failed-${phase}.json`,JSON.stringify(report,null,2)+'\n');throw error;}
finally{await browser.close();}
