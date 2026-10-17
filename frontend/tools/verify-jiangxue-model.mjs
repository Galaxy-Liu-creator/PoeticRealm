import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {authenticatedUi} from './authenticated-ui-fixture.mjs';
const revision=process.argv.find(a=>a.startsWith('--revision='))?.split('=')[1]??'03';
assert.match(revision,/^(01|02|03)$/);
const out=new URL(`../../output/jiangxue-model-v${revision}/validation/`,import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--enable-webgl','--ignore-gpu-blocklist']});
const report={revision,fixture:'isolated authentication; real Chrome/WebGL and published Jiangxue GLB',errors:[],warnings:[],views:[],release:[],performance:[]};
try {
  const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});await authenticatedUi(context);
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());if(message.type()==='warning')report.warnings.push(message.text());});
  const url=`http://127.0.0.1:5187/?scene=jiangxue&lab=jiangxue&t=0&asset=scenes/jiangxue.scene-v${revision}.json`;
  await page.goto(url);await page.evaluate(async()=>{const {tabSession}=await import('/src/api/TabSession.ts');tabSession.set({token:'t'.repeat(43),lease:'l'.repeat(43)});});
  await page.reload();await page.waitForFunction(()=>!!window.__JIANGXUE_SAMPLE__,null,{timeout:45000});
  if(revision==='03'){
    report.navigation=[];
    for(const time of [0,8,23,32,90,300,10000]){
      await page.evaluate(t=>window.__JIANGXUE_SAMPLE__.seek(t),time);
      const n=(await page.evaluate(()=>window.__JIANGXUE_SAMPLE__.stats())).navigation;
      assert(Math.abs(n.position[1]-n.waterSurface+.3)<1e-6,'Boat no longer tracks the water level');
      assert(Math.abs(n.lineWaterGap+.006)<1e-5,'Fishing line left the water');
      assert(n.worldForward[2]<-.94,'Bow points across the river');
      assert(n.worldForward.reduce((sum,v,i)=>sum+v*n.forward[i],0)>.9999,'Bow no longer follows its course');
      const y=-n.position[2],c=y=>7*Math.sin(y*.009)+5*Math.sin(y*.019);
      assert(Math.abs(n.position[0]-(2+c(y)-c(-2)))<.08,'Boat left the authored river corridor');
      report.navigation.push({time,...n});
    }
    assert(report.navigation.at(-1).position[2]<report.navigation[0].position[2]-50,'Boat did not travel downstream');
    await page.evaluate(()=>{window.__JIANGXUE_SAMPLE__.setView('CAM_boat');window.__JIANGXUE_SAMPLE__.seek(0);});
    const a=await page.evaluate(()=>window.__JIANGXUE_SAMPLE__.stats());await page.evaluate(()=>window.__JIANGXUE_SAMPLE__.seek(90));
    const b=await page.evaluate(()=>window.__JIANGXUE_SAMPLE__.stats());
    const distance=s=>Math.hypot(s.camera[0]-s.navigation.position[0],s.camera[2]-s.navigation.position[2]);
    assert(Math.abs(distance(a)-distance(b))<.001,'Boat camera did not follow');report.boatCameraFollows=true;
  }
  for(const [width,height] of [[1920,1080],[1440,900]]) {
    await page.setViewportSize({width,height});
    for(const view of ['CAM_enter','CAM_birds','CAM_path','CAM_fog','CAM_boat','CAM_fisherman','CAM_nature',...(revision!=='01'?['CAM_rocks']:[])]) {
      await page.evaluate(view=>{window.__JIANGXUE_SAMPLE__.setView(view);window.__JIANGXUE_SAMPLE__.seek(8);},view);
      await page.screenshot({path:out+`${view}-${width}.png`});
      report.views.push({width,height,...await page.evaluate(()=>window.__JIANGXUE_SAMPLE__.stats())});
    }
  }
  await page.setViewportSize({width:1920,height:1080});
  const hashes=[];
  for(const t of [8,23,8]) {
    await page.evaluate(t=>{window.__JIANGXUE_SAMPLE__.setView('CAM_enter');window.__JIANGXUE_SAMPLE__.seek(t);},t);
    const png=await page.screenshot();hashes.push((await import('node:crypto')).createHash('sha256').update(png).digest('hex'));
  }
  assert.equal(hashes[0],hashes[2],'seek(8) after seek(23) changed fixed-time rendering');report.seekHashes=hashes;
  if(process.argv.includes('--full')) {
    for(const view of ['CAM_enter','CAM_boat','CAM_fisherman']) {
      await page.evaluate(view=>{window.__JIANGXUE_SAMPLE__.setView(view);window.__JIANGXUE_SAMPLE__.play();},view);
      await page.waitForTimeout(2000);
      const measurement=await page.evaluate(()=>new Promise(resolve=>{
        const frames=[];let previous=performance.now(),start=previous;
        const tick=now=>{frames.push(now-previous);previous=now;if(now-start<60000)requestAnimationFrame(tick);else{const sorted=frames.slice().sort((a,b)=>a-b);resolve({durationMs:now-start,frames:frames.length,fps:frames.length*1000/(now-start),p95Ms:sorted[Math.floor(sorted.length*.95)],stats:window.__JIANGXUE_SAMPLE__.stats()});}};requestAnimationFrame(tick);
      }));
      report.performance.push({view,...measurement});console.log(JSON.stringify({view,fps:measurement.fps,p95Ms:measurement.p95Ms}));
    }
  }
  if(process.argv.includes('--full')||process.argv.includes('--lifecycle')) {
    for(let i=0;i<10;i++) {
      const before=await page.evaluate(()=>window.__JIANGXUE_SAMPLE__.stats());
      const after=await page.evaluate(()=>window.__JIANGXUE_SAMPLE__.dispose());
      assert.equal(after.memory.geometries,0);assert.equal(after.memory.textures,0);
      assert.equal(after.contextLost,true);
      await page.evaluate(()=>window.__JIANGXUE_SAMPLE__.reload());
      const restored=await page.evaluate(()=>window.__JIANGXUE_SAMPLE__.stats());
      assert.deepEqual(restored.memory,before.memory);report.release.push({cycle:i+1,before:before.memory,after:after.memory,restored:restored.memory});
    }
    await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.__JIANGXUE_SAMPLE__.reload());
    assert.equal((await page.evaluate(()=>window.__JIANGXUE_SAMPLE__.stats())).playing,false);
    if(revision==='03'){
      await page.evaluate(()=>window.__JIANGXUE_SAMPLE__.seek(23));
      const n=(await page.evaluate(()=>window.__JIANGXUE_SAMPLE__.stats())).navigation;
      assert.equal(n.effectiveTime,0);assert(Math.hypot(n.position[0]-2,n.position[2]-2)<1e-6);report.reducedBoatFrozen=true;
    }
    await page.keyboard.press('Tab');report.keyboardFocus=await page.evaluate(()=>document.activeElement?.tagName);report.reducedMotion=true;
    await page.route(`**/assets/models/jiangxue/scene_v${revision}.glb`,route=>route.fulfill({status:404,body:'missing fixture'}));
    await page.evaluate(()=>window.__JIANGXUE_SAMPLE__.reload());await page.getByRole('button',{name:'重试',exact:true}).waitFor();
    assert.match(await page.locator('.jx-status').innerText(),/加载失败/);report.missingAssetHandled=true;
    await page.unroute(`**/assets/models/jiangxue/scene_v${revision}.glb`);await page.getByRole('button',{name:'重试',exact:true}).click();await page.waitForFunction(()=>!!window.__JIANGXUE_SAMPLE__);report.retryRecovered=true;
    await page.route(`**/assets/models/jiangxue/scene_v${revision}.glb`,async route=>{await new Promise(resolve=>setTimeout(resolve,1200));await route.continue();});
    const pending=page.evaluate(()=>window.__JIANGXUE_SAMPLE__.reload());await page.getByRole('button',{name:'取消',exact:true}).click();await pending;
    assert.match(await page.locator('.jx-status').innerText(),/已取消/);report.cancelHandled=true;
  }
  assert.equal(report.errors.filter(e=>!e.includes('404')).length,0,'Browser errors');
  report.functionalPass=true;
  report.performanceAccepted=report.performance.length===3&&report.performance.every(result=>result.fps>=50&&result.p95Ms<=20);
  if(process.argv.includes('--full'))assert(report.performanceAccepted,'1920/DPR1 performance gate: >=50fps and P95 <=20ms');
  report.pass=true;
} catch(error){report.pass=false;report.failure=error.stack;process.exitCode=1;}
finally {await writeFile(out+(process.argv.includes('--full')?'browser-full.json':process.argv.includes('--lifecycle')?'browser-lifecycle.json':'browser-visual.json'),JSON.stringify(report,null,2));await browser.close();}
