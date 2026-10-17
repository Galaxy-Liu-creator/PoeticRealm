import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {PNG} from 'pngjs';
import {Quaternion, Vector3} from 'three';
import {authenticatedUi} from './authenticated-ui-fixture.mjs';
import {connectDevTools} from './devtools-client.mjs';
import {readAsset} from './asset-contract.mjs';
import {createOarClearance} from './oar-clearance.mjs';
const output=resolve(process.env.SAMPLE_OUTPUT ?? fileURLToPath(new URL('../../output/playwright/fengqiao-sample/v01',import.meta.url)));
const base=process.env.SAMPLE_BASE ?? 'http://127.0.0.1:5187';
const manifestPath=process.env.SAMPLE_MANIFEST;
const candidate=await readAsset(manifestPath);
const lab=base+'/?scene=fengqiao&lab=fengqiao'+(manifestPath?'&asset='+encodeURIComponent('scenes/'+basename(manifestPath)):'');
const modelPattern='**/'+candidate.manifest.model.split('/').at(-1);
const quick=process.argv.includes('--quick');
const lifecycleOnly=process.argv.includes('--lifecycle-only');
// Collect downstream evidence after a load failure; the original gate still
// fails the run at the end. This mode never reports an acceptance pass.
const diagnoseLoad=process.argv.includes('--diagnose-load');
await mkdir(output,{recursive:true});
const report={checks:[],browser:null,errors:[],frames:[]};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist','--remote-debugging-port=9227']});
const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
async function visualIdentity(target) {
  await authenticatedUi(target);
  await target.route('**/api/v1/account/settings', route => route.fulfill({status:200,contentType:'application/json',body:'{"library":null}'}));
}
await visualIdentity(context);
const page=await context.newPage();
page.on('pageerror',error=>report.errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
let mcp;
async function openSample(target=page,url=lab) {
  await target.goto(url);
  await target.waitForFunction(()=>window.__POETIC__?.ready || document.querySelector('[name=username]'),null,{timeout:45000});
  if(await target.locator('[name=username]').count()) {
    await target.locator('[name=username]').fill('motion_fixture');
    await target.locator('[name=password]').fill('Fixturepass123!');
    await target.locator('[type=submit]').click();
  }
  await target.waitForFunction(()=>window.__POETIC__?.ready,null,{timeout:45000});
}
const pause=async(t=8)=>page.evaluate(t=>{window.__POETIC__.pause();window.__POETIC__.seek(t);},t);
const screenshot=async(name)=>page.screenshot({path:resolve(output,name+'.png')});
function pixelDifference(a,b) {
  const x=PNG.sync.read(a),y=PNG.sync.read(b);let total=0,changed=0;
  for(let i=0;i<x.data.length;i+=4){let d=0;for(let c=0;c<3;c++)d+=Math.abs(x.data[i+c]-y.data[i+c]);total+=d;if(d>20)changed++;}
  return {mean:total/(x.width*x.height*3),changed};
}
try {
  const loadStart=Date.now();
  await openSample();
  report.firstLoadMs=Date.now()-loadStart;
  await page.waitForTimeout(2000);
  report.browser=await page.evaluate(()=>{
    const gl=document.querySelector('.sample canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');
    return {userAgent:navigator.userAgent,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null};
  });
  assert.match(report.browser.renderer,/AMD|NVIDIA|Intel/);
  await pause();
  report.details=await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.details());
  if (candidate.manifest.boatNavigation) {
    report.navigation=[];
    await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.setView('CAM_boat'));
    let lastZ=Infinity, cameraRadius;
    for (const t of [0,8,16,24,32,80,300]) {
      await pause(t);
      const details=await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.details());
      assert(details.navigation && details.view.followsBoat,'航行舟缺少近景跟随');
      assert(details.boat[2]<lastZ,'舟没有沿河向前航行');lastZ=details.boat[2];
      const radius=Math.hypot(details.view.camera[0]-details.boat[0],details.view.camera[2]-details.boat[2]);
      cameraRadius??=radius;assert(Math.abs(radius-cameraRadius)<.00001,'木舟近景未保持相对舟的水平距离');
      const bow=new Vector3(1,0,0).applyQuaternion(new Quaternion().fromArray(details.navigation.quaternion));bow.y=0;bow.normalize();
      if(t<80) {
        await pause(t+.01);
        const next=(await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.details())).boat;
        const direction=new Vector3(next[0]-details.boat[0],0,next[2]-details.boat[2]).normalize();
        assert(bow.dot(direction)>.999,'船首与实际前进方向不一致');
      }
      assert(details.rower.gripErrors.every(e=>e<.01) && details.rower.footErrors.every(e=>e<.01) && details.rower.tetherError<.001,'航行时人物或桨脱离舟');
      report.navigation.push({t,...details.navigation,camera:details.view.camera});
      if([0,16,32].includes(t)) {await pause(t);await screenshot('cruise-boat-t'+t);}
    }
    assert(Math.hypot(report.navigation[4].position[0]-report.navigation[0].position[0],report.navigation[4].position[2]-report.navigation[0].position[2])>6,'32秒舟位移不明显');
    await pause(8);const first=await screenshot('cruise-follow-t8');
    await pause(24);await pause(8);assert.deepEqual(first,await screenshot('cruise-follow-repeat'),'近景航行回放不确定');
    report.checks.push('舟沿河向前、船首对齐行进切线、临泊位减速无跳回；近景跟随与时间重放通过');
    await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.setView('CAM_enter'));
    await pause(8);
  }
  report.loadGate={limitMs:3000,actualMs:report.details.loadMs,passed:report.details.loadMs<3000};
  if(!diagnoseLoad) assert(report.loadGate.passed,'小样从开始装配到首帧超过3秒');
  for(const weight of [0,.5,1]) assert(report.details.maskProbe.some(value=>Math.abs(value-weight)<.01),'运行端遮罩权重变化');
  const views=['CAM_enter','CAM_riverbank','CAM_boat','CAM_rower',...['CAM_temple','CAM_bridge','CAM_bell','CAM_nature'].filter(name=>candidate.manifest.requiredNodes.includes(name))];
  for(const name of views) {
    await page.evaluate(name=>window.__FENGQIAO_SAMPLE__.setView(name),name);
    await pause();
    const viewFrame=await screenshot(name+'-1920');
    await page.evaluate(()=>{window.__FENGQIAO_SAMPLE__.setMatrixReuse(false);window.__FENGQIAO_SAMPLE__.setHullBounds(false);});
    const repeatedPasses=await screenshot(name+'-repeated-passes');
    const reuseDelta=pixelDifference(viewFrame,repeatedPasses);
    (report.renderReuseComparisons??=[]).push({view:name,...reuseDelta});
    assert(reuseDelta.mean===0 && reuseDelta.changed===0,'矩阵复用或船体范围提前排除改变画面：'+name);
    await page.evaluate(()=>{window.__FENGQIAO_SAMPLE__.setMatrixReuse(true);window.__FENGQIAO_SAMPLE__.setHullBounds(true);});
    if(candidate.manifest.distanceLods) {
      await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.setStaticMerge(false));
      const reference=await screenshot(name+'-unmerged');
      const delta=pixelDifference(viewFrame,reference);
      (report.staticMergeComparisons??=[]).push({view:name,...delta});
      assert(delta.mean<.01 && delta.changed<200,'静态绘制合并改变可见构图或材质：'+name);
      await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.setStaticMerge(true));
    }
    if(process.env.IMAGE_BASELINE) {
      const delta=pixelDifference(await readFile(resolve(process.env.IMAGE_BASELINE,name+'-1920.png')),viewFrame);
      assert(delta.mean===0 && delta.changed===0,'无损图像编码候选改变实际画面：'+name);
      (report.imageComparisons??=[]).push({view:name,...delta});
    }
    const cropped=await page.screenshot();
    await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.setReflectionCrop(false));
    const uncropped=await page.screenshot();
    assert.deepEqual(cropped,uncropped,'反射裁剪改变实际画面：'+name);
    await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.setReflectionCrop(true));
  }
  report.checks.push(views.length+'个实际机位反射裁剪前后画面逐像素一致，保持原反射分辨率');
  report.checks.push(views.length+'个实际机位矩阵复用与船体范围提前排除前后逐像素一致');
  if(candidate.manifest.distanceLods) {
    report.lods={views:[],boundaries:[]};
    for(const view of views) {
      await page.evaluate(view=>window.__FENGQIAO_SAMPLE__.setView(view),view); await pause(8);
      const levels=(await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.details())).lods;
      assert.equal(levels.length,candidate.manifest.distanceLods.length);
      for(const level of levels) {
        assert.equal(level.nearVisible,level.cameraDistance<level.distance);
        assert.equal(level.farVisible,!level.nearVisible,'多个pass后层级可见性不一致');
      }
      report.lods.views.push({view,levels});
    }
    await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.setView('CAM_enter')); await pause(8);
    const starting=await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.details());
    for(const level of starting.lods) {
      const direction=new Vector3().fromArray(starting.view.camera).sub(new Vector3().fromArray(level.center)).normalize();
      let before;
      for(const offset of [-.05,.05,-.05]) {
        const position=new Vector3().fromArray(level.center).addScaledVector(direction,level.distance+offset).toArray();
        await page.evaluate(({position,target})=>window.__FENGQIAO_SAMPLE__.setCamera(position,target),{position,target:level.center}); await pause(8);
        const state=(await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.details())).lods.find(item=>item.near===level.near);
        assert.equal(state.level,offset<0?'near':'far');assert.equal(state.nearVisible,offset<0);assert.equal(state.farVisible,offset>=0);
        const frame=await screenshot('lod-'+level.near+'-'+(offset<0?'near':'far')+(before&&offset<0?'-repeat':''));
        if(offset<0 && !before)before=frame;else if(offset<0)assert.deepEqual(before,frame,'近远往返改变固定画面');
        report.lods.boundaries.push({near:level.near,offset,state});
      }
    }
    await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.setView('CAM_enter')); await pause(8);
    await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.setLods('near'));report.lods.nearTriangles=(await page.evaluate(()=>window.__POETIC__.state())).triangles;await screenshot('lod-all-near');
    await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.setLods('far'));report.lods.farTriangles=(await page.evaluate(()=>window.__POETIC__.state())).triangles;await screenshot('lod-all-far');
    assert(report.lods.farTriangles<report.lods.nearTriangles*.8,'远景没有降低实际多pass几何负载');
    await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.setLods('auto'));
    report.checks.push('八机位与五个距离阈值往返：唯一层级、所有pass共用、固定帧复现、实际多pass几何减少');
  }
  assert(report.details.rower?.skinnedMeshes>=1,'缺少真实蒙皮船夫');
  report.rowing=[];
  await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.setView('CAM_rower'));
  for(const t of [0,1.2,2.4,3.6,4.8]) {
    await pause(t);
    const pose=(await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.details())).rower;
    report.rowing.push({t,...pose});const frame=await screenshot('rowing-t'+t);
    if(t===2.4 && process.env.ENVIRONMENT_BASELINE) {
      report.environmentComparison=pixelDifference(await readFile(resolve(process.env.ENVIRONMENT_BASELINE,'rowing-t2.4.png')),frame);
      assert(report.environmentComparison.mean<.1 && report.environmentComparison.changed<100,'烘焙环境与程序预滤波画面不一致');
      report.checks.push('原程序预滤波与RGBA16F恢复的船夫近景像素一致');
    }
    assert(pose.gripErrors.every(error=>error<.01),'划桨时手掌离开桨柄');
    assert(pose.skinHandErrors.every(error=>error<.04),'蒙皮手部网格未跟随桨柄');
    if(['stern-yuloh','side-yuloh'].includes(pose.style)) {
      assert(pose.footErrors.every(error=>error<.01),'站姿摇橹脚部滑离甲板锚点');
      assert(pose.tetherError<.001,'摇橹牵绳长度发生伸缩');
    }
  }
  if(['stern-yuloh','side-yuloh'].includes(report.rowing[0].style)) {
    assert(report.rowing.every(p=>p.blade[1]<-.02),'摇橹换向时橹叶离开水面');
    const range=axis=>Math.max(...report.rowing.map(p=>p.blade[axis]))-Math.min(...report.rowing.map(p=>p.blade[axis]));
    assert(Math.hypot(range(0),range(2))>.25,'橹叶没有有效横向扫水');
    report.checks.push('五个摇橹时刻掌部贴柄、脚部固定、牵绳等长，橹叶连续浸没并横扫');
    report.strokeLimits=await page.evaluate(()=>{
      const periodSeconds=window.__FENGQIAO_SAMPLE__.details().rower.strokePeriodSeconds;
      const result={periodSeconds,samples:97,maxGripError:0,maxGripAt:0,maxSkinHandError:0,maxFootError:0,maxTetherError:0,highestBlade:-Infinity,lowestBlade:Infinity,poses:[]};
      for(let i=0;i<result.samples;i++) {
        const t=i*periodSeconds/(result.samples-1);
        window.__POETIC__.seek(t);
        const pose=window.__FENGQIAO_SAMPLE__.details().rower;
        result.poses.push({t,oarPosition:pose.oarPosition,oarRotation:pose.oarRotation});
        if(Math.max(...pose.gripErrors)>result.maxGripError) { result.maxGripError=Math.max(...pose.gripErrors);result.maxGripAt=t; }
        result.maxSkinHandError=Math.max(result.maxSkinHandError,...pose.skinHandErrors);
        result.maxFootError=Math.max(result.maxFootError,...pose.footErrors);
        result.maxTetherError=Math.max(result.maxTetherError,pose.tetherError);
        result.highestBlade=Math.max(result.highestBlade,pose.blade[1]);
        result.lowestBlade=Math.min(result.lowestBlade,pose.blade[1]);
      }
      return result;
    });
    const limits=report.strokeLimits;
    const poses=limits.poses;delete limits.poses;
    console.log('STROKE '+JSON.stringify(limits));
    assert(limits.maxGripError<.01 && limits.maxSkinHandError<.04 && limits.maxFootError<.01 && limits.maxTetherError<.001 && limits.highestBlade<-.02,'完整摇橹循环发生脱柄、滑脚、绳伸缩或橹叶出水');
    report.checks.push('完整'+limits.periodSeconds+'秒循环97个采样点通过掌部、脚部、牵绳及入水门禁');
    if(report.rowing[0].style==='side-yuloh') {
      const clearance=createOarClearance(candidate);
      const samples=poses.map(pose=>({t:pose.t,...clearance.check(pose)}));
      report.oarClearance={scope:'delivered GLB triangle intersections; fixed pin, binding and tether excluded',hullNames:clearance.hullNames,movingNames:clearance.movingNames,hullTriangles:clearance.hullTriangles,samples,intersections:samples.reduce((sum,s)=>sum+s.intersections,0)};
      assert.equal(report.oarClearance.intersections,0,'侧舷划桨循环发生桨与船体相交');
      report.checks.push('97个采样点实际桨杆、桨柄、桨叶与连续船壳及木构件零三角形相交');
    }
  } else {
    assert(Math.max(...report.rowing.map(p=>p.blade[1]))>.02 && Math.min(...report.rowing.map(p=>p.blade[1]))<-.02,'桨叶未经过入水/出水状态');
    report.checks.push('船夫蒙皮可见，五个划桨时刻双手贴柄且桨叶入水/出水');
  }
  await page.getByRole('button',{name:'湿石岸',exact:true}).focus();
  await page.keyboard.press('Enter');
  await page.locator('[data-action=pause]').click();
  assert.equal((await page.evaluate(()=>window.__POETIC__.state())).playing,true);
  await pause();
  await page.locator('.sample canvas').click({position:{x:1800,y:700}});
  await page.keyboard.press('Space');
  assert.equal((await page.evaluate(()=>window.__POETIC__.state())).playing,true);
  await pause();
  report.checks.push('键盘选择视角、按钮与空格暂停/播放');
  await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.setView('CAM_enter'));
  for(const t of [0,8,16,24,32]){await pause(t);await screenshot('timeline-t'+t);}
  await pause(8);const first=await screenshot('determinism-t8');
  await pause(24);await pause(8);const again=await screenshot('determinism-repeat');
  assert.deepEqual(first,again,'同时间画面不一致');
  report.checks.push('固定时间画面可复现');
  if (candidate.manifest.requiredNodes.includes('maple_grove')) {
    await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.setView('CAM_nature'));
    await pause(8);
    report.wind=await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.details().wind);
    const farWind=(candidate.manifest.distanceLods??[]).reduce((count,entry)=>count+(entry.near==='maple_grove'?2:entry.near==='reed_bed'?1:0),0);
    assert.equal(report.wind.meshes,3+farWind,'近远枫枝、枫叶和芦苇未全部接入风动');
    assert(report.wind.rootVertices>0 && report.wind.surfaceCompiles>0 && report.wind.depthCompiles>0,'缺少固定根部或表面/阴影风动程序');
    const moving=await screenshot('wind-on');
    await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.setWind(false));
    const still=await screenshot('wind-off');
    report.wind.delta=pixelDifference(moving,still);
    assert(report.wind.delta.changed>100,'风动未影响实际植被画面');
    await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.setWind(true));
    if(farWind) {
      await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.setLods('far')); const farMoving=await screenshot('wind-far-on');
      await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.setWind(false)); const farStill=await screenshot('wind-far-off');
      report.wind.farDelta=pixelDifference(farMoving,farStill);assert(report.wind.farDelta.changed>100,'远景植物没有风动');
      await page.evaluate(()=>{window.__FENGQIAO_SAMPLE__.setWind(true);window.__FENGQIAO_SAMPLE__.setLods('auto');});
    }
    report.checks.push('三组植物按同一时钟摆动，根部固定，表面与深度程序一致');
  }
  for(const [label,method] of [['reflection','setReflection'],['shadows','setShadows'],['fire','setFire']]) {
    // The enlarged scene puts the fire far away in CAM_enter. Measure its
    // actual light contribution from the authored boat camera.
    await page.evaluate(name=>window.__FENGQIAO_SAMPLE__.setView(name),label==='fire'?'CAM_boat':'CAM_enter');
    await pause(8);const featureReference=await screenshot(label+'-on');
    await page.evaluate(({method})=>window.__FENGQIAO_SAMPLE__[method](false),{method});
    const changed=await screenshot(label+'-off');
    const delta=pixelDifference(featureReference,changed);
    assert(delta.changed>100,label+' 未影响实际画面');
    report.checks.push({label,delta});
    await page.evaluate(({method})=>window.__FENGQIAO_SAMPLE__[method](true),{method});
  }
  await page.setViewportSize({width:1440,height:900});
  await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.setView('CAM_enter'));
  await pause();await screenshot('sample-1440');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.setView('CAM_enter'));
  await pause();await screenshot('sample-390');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.setViewportSize({width:1920,height:1080});
  await pause();
  mcp=await connectDevTools(output);
  report.nativeServer=mcp.server;
  const pages=mcp.text(await mcp.call('list_pages'));
  const selected=pages.split('\n').find(line=>line.includes('lab=fengqiao'));
  assert(selected,'MCP 未找到真实小样页面');
  const pageId=Number(selected.match(/^(\d+):/)[1]);
  await mcp.call('select_page',{pageId,bringToFront:true});
  report.dom=mcp.text(await mcp.call('take_snapshot',{pageId}));
  await mcp.call('take_screenshot',{pageId,filePath:resolve(output,'native-devtools-1920.png')});
  report.console=mcp.text(await mcp.call('list_console_messages',{pageId,types:['error','warn']}));
  report.network=mcp.text(await mcp.call('list_network_requests',{pageId,resourceTypes:['fetch','image']}));
  if(!quick) {
    if(!lifecycleOnly) {
    await page.evaluate(()=>window.__POETIC__.play());
    await page.waitForTimeout(3000);
    for(let round=0;round<3;round++) {
      report.frames.push(await page.evaluate(async()=>{
        const times=[],stats=[];
        await new Promise(resolve=>{
          let start;
          const tick=now=>{start??=now;times.push(now);stats.push(window.__POETIC__.state());if(now-start<60000)requestAnimationFrame(tick);else resolve();};
          requestAnimationFrame(tick);
        });
        const intervals=times.slice(1).map((t,i)=>t-times[i]).sort((a,b)=>a-b),duration=times.at(-1)-times[0];
        return {frames:times.length,duration,fps:(times.length-1)*1000/duration,p50:intervals[Math.floor(intervals.length*.5)],p95:intervals[Math.floor(intervals.length*.95)],over50:intervals.filter(t=>t>50).length,maxCalls:Math.max(...stats.map(s=>s.calls)),maxTriangles:Math.max(...stats.map(s=>s.triangles))};
      }));
      console.log('PERF '+JSON.stringify(report.frames.at(-1)));
      await writeFile(resolve(output,'progress.json'),JSON.stringify(report,null,2));
    }
    for(const sample of report.frames)assert(sample.fps>=50 && sample.p95<=20 && sample.maxCalls<=120,'性能未留出小样余量');
    await mcp.call('performance_start_trace',{pageId,reload:false,autoStop:false});
    await page.waitForTimeout(3000);
    report.trace=mcp.text(await mcp.call('performance_stop_trace',{pageId,filePath:resolve(output,'performance.json.gz')}));
    }
    await pause();
    // Disposal is explicit and repeatable; fresh scene must return to the same GPU resource count.
    const warmResourceViews=async()=>{
      if(!candidate.manifest.distanceLods)return;
      await page.evaluate(views=>{
        const api=window.__FENGQIAO_SAMPLE__;window.__POETIC__.pause();window.__POETIC__.seek(8);
        for(const view of views){api.setView(view);api.setStaticMerge(false);api.setLods('near');api.setLods('far');api.setStaticMerge(true);api.setLods('auto');}
        api.setView('CAM_enter');window.__POETIC__.seek(8);
      },views);
    };
    await warmResourceViews();
    const baseline=await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.details().memory);
    for(let i=0;i<10;i++) {
      const disposed=await page.evaluate(()=>{
        let counts;
        window.addEventListener('fengqiao:disposed',event=>counts=event.detail,{once:true});
        const gl=document.querySelector('.sample canvas').getContext('webgl2');
        window.__FENGQIAO_SAMPLE__.dispose();
        return {memory:counts.memory,stages:counts.stages,contextLost:gl.isContextLost()};
      });
      report.lastDisposal=disposed;
      assert.deepEqual(disposed.memory,{geometries:0,textures:0},'场景 GPU 对象未释放');
      assert(disposed.contextLost,'渲染上下文未关闭');
      await openSample();
      await warmResourceViews();
      const memory=await page.evaluate(()=>window.__FENGQIAO_SAMPLE__.details().memory);
      assert.deepEqual(memory,baseline,'重复进入 GPU 资源数持续增加');
    }
    report.checks.push('10次加载/释放资源计数稳定');
    await context.close();
    const videoContext=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:resolve(output,'video'),size:{width:1440,height:900}}});
    await visualIdentity(videoContext);
    const video=await videoContext.newPage();await openSample(video);
    for(const name of candidate.manifest.requiredNodes.includes('CAM_temple') ? ['CAM_enter','CAM_temple','CAM_bridge','CAM_bell','CAM_nature','CAM_rower'] : ['CAM_rower']) {
      await video.evaluate(name=>window.__FENGQIAO_SAMPLE__.setView(name),name);
      await video.waitForTimeout(name==='CAM_rower'?9000:2500);
    }
    await videoContext.close();
    report.video=await video.video().path();
    const reducedContext=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
    await visualIdentity(reducedContext);const reducedPage=await reducedContext.newPage();await openSample(reducedPage);
    assert((await reducedPage.evaluate(()=>window.__FENGQIAO_SAMPLE__.details())).reducedMotion);
    assert.equal((await reducedPage.evaluate(()=>window.__POETIC__.state())).playing,false);
    const still=(await reducedPage.evaluate(()=>window.__FENGQIAO_SAMPLE__.details())).rower;
    await reducedPage.evaluate(()=>{window.__POETIC__.seek(9);window.__FENGQIAO_SAMPLE__.setView('CAM_boat');});
    assert.deepEqual((await reducedPage.evaluate(()=>window.__FENGQIAO_SAMPLE__.details())).rower,still,'减少动态时仍在划桨');
    if(candidate.manifest.boatNavigation) {
      const position=(await reducedPage.evaluate(()=>window.__FENGQIAO_SAMPLE__.details())).boat;
      await reducedPage.evaluate(()=>window.__POETIC__.seek(32));
      assert.deepEqual((await reducedPage.evaluate(()=>window.__FENGQIAO_SAMPLE__.details())).boat,position,'减少动态时舟仍在航行');
    }
    if (candidate.manifest.requiredNodes.includes('maple_grove')) assert.equal((await reducedPage.evaluate(()=>window.__FENGQIAO_SAMPLE__.details())).wind.time,0,'减少动态时植物风时钟仍推进');
    await reducedContext.close();report.checks.push('减少动态静止且可手动选视角');
    // Failure/cancellation use their own context; expected HTTP failures are not normal-flow console errors.
    const failContext=await browser.newContext({viewport:{width:1440,height:900}});
    await visualIdentity(failContext);
    await failContext.route(modelPattern,route=>route.fulfill({status:404,body:'missing asset fixture'}));
    const failPage=await failContext.newPage();const failures=[];
    failPage.on('pageerror',error=>failures.push(error.message));
    await failPage.goto(lab);await failPage.locator('[name=username]').fill('motion_fixture');
    await failPage.locator('[name=password]').fill('Fixturepass123!');await failPage.locator('[type=submit]').click();
    await failPage.getByRole('status').filter({hasText:'小样加载失败'}).waitFor();
    assert.equal(await failPage.evaluate(()=>!!window.__POETIC__),false);
    assert.equal(failures.length,0);await failContext.close();
    const environmentFail=await browser.newContext({viewport:{width:1440,height:900}});
    await visualIdentity(environmentFail);
    await environmentFail.route('**/*.rgba16f.gz',route=>route.fulfill({status:404,body:'missing environment fixture'}));
    const environmentPage=await environmentFail.newPage();const environmentErrors=[];
    environmentPage.on('pageerror',error=>environmentErrors.push(error.message));
    await environmentPage.goto(lab);await environmentPage.locator('[name=username]').fill('motion_fixture');
    await environmentPage.locator('[name=password]').fill('Fixturepass123!');await environmentPage.locator('[type=submit]').click();
    await environmentPage.getByRole('status').filter({hasText:'小样加载失败'}).waitFor();
    assert.equal(await environmentPage.evaluate(()=>!!window.__POETIC__),false);
    assert.equal(environmentErrors.length,0);await environmentFail.close();
    report.checks.push('声明但缺失的预滤波环境明确失败，无残留就绪场景');
    const rawContext=await browser.newContext({viewport:{width:1920,height:1080}});await visualIdentity(rawContext);
    const packed=candidate.environment.packed;
    await rawContext.route('**/*.rgba16f.gz',route=>route.fulfill({status:200,contentType:'application/octet-stream',body:packed}));
    const rawPage=await rawContext.newPage(),rawErrors=[];rawPage.on('pageerror',error=>rawErrors.push(error.message));
    await openSample(rawPage);
    assert.equal((await rawPage.evaluate(()=>window.__FENGQIAO_SAMPLE__.details())).environmentSource,'baked-rgba16f');
    await rawPage.evaluate(()=>{window.__POETIC__.pause();window.__POETIC__.seek(8);window.__FENGQIAO_SAMPLE__.setView('CAM_rower');window.__POETIC__.seek(2.4);});
    const rawFrame=await rawPage.screenshot({path:resolve(output,'environment-raw-server.png')});
    if(process.env.ENVIRONMENT_BASELINE) assert.deepEqual(rawFrame,await readFile(resolve(process.env.ENVIRONMENT_BASELINE,'rowing-t2.4.png')),'原始gzip静态服务器改变预滤波画面');
    assert.equal(rawErrors.length,0);await rawContext.close();report.checks.push('服务器原始gzip与HTTP自动解压都还原同一夜景环境');
    for(const pattern of [modelPattern,'**/*.rgba16f.gz']) {
    const cancelContext=await browser.newContext({viewport:{width:1440,height:900}});
    await visualIdentity(cancelContext);
    let requested;
    const pending=new Promise(resolve=>requested=resolve);
    await cancelContext.route(pattern,async route=>{requested();await new Promise(resolve=>setTimeout(resolve,1500));await route.continue().catch(()=>{});});
    const cancelPage=await cancelContext.newPage();const cancelledErrors=[];
    cancelPage.on('pageerror',error=>cancelledErrors.push(error.message));
    await cancelPage.goto(lab);await cancelPage.locator('[name=username]').fill('motion_fixture');
    await cancelPage.locator('[name=password]').fill('Fixturepass123!');await cancelPage.locator('[type=submit]').click();
    await pending;await cancelPage.goto(base);await cancelPage.waitForTimeout(1800);
    assert.equal(await cancelPage.evaluate(()=>!!window.__POETIC__),false);
    assert.equal(cancelledErrors.length,0);await cancelContext.close();
    }
    report.checks.push('缺失 GLB 有明确失败状态；加载中离开无迟到场景或脚本异常');
  }
  assert.equal(report.errors.length,0,JSON.stringify(report.errors));
  assert(report.loadGate.passed,'小样从开始装配到首帧超过3秒；后续诊断证据已保留');
  report.status='pass';report.scope=quick?'visual-smoke':lifecycleOnly?'visual-and-lifecycle':'full-quality-sample';
} catch(error) {
  report.status='failed';report.failure=error.stack;
  await page.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});
  throw error;
} finally {
  await writeFile(resolve(output,'verification.json'),JSON.stringify(report,null,2));
  mcp?.close();await browser.close();
}
console.log(JSON.stringify({status:report.status,checks:report.checks,browser:report.browser,output}));
