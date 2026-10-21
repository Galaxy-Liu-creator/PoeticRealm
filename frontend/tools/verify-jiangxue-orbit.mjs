import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Matrix4,Quaternion,Vector3} from 'three';
import {chromium} from 'playwright';
import {authenticatedUi,openAuthenticatedPage} from './authenticated-ui-fixture.mjs';

const out=resolve('output/jiangxue-orbit-v01/validation/browser');await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});await authenticatedUi(context);
await context.route('**/api/v1/account/settings',r=>r.fulfill({status:200,contentType:'application/json',body:'{"library":null}'}));
await context.addInitScript(()=>{window.__orbitDisposals=[];window.addEventListener('jiangxue:disposed',e=>window.__orbitDisposals.push(e.detail));});
const page=await context.newPage();page.setDefaultTimeout(60000);
const report={scope:'real mouse input on normal 5186 Jiangxue v06; isolated account API',checks:[],errors:[]};
page.on('pageerror',e=>report.errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
const details=()=>page.evaluate(()=>window.__POETIC_SCENE__.details());
const seek=t=>page.evaluate(t=>{window.__POETIC_SCENE__.pause();window.__POETIC_SCENE__.seek(t);},t);
const check=s=>{report.checks.push(s);console.log('PASS '+s);};
const distance=(a,b)=>new Vector3().fromArray(a).distanceTo(new Vector3().fromArray(b));
const near=(a,b,epsilon=1e-6)=>{assert.equal(a.length,b.length);a.forEach((v,i)=>assert(Math.abs(v-b[i])<epsilon,`${v} != ${b[i]}`));};
const drag=async(button='left',dx=65,dy=14)=>{await page.mouse.move(1020,450);await page.mouse.down({button});await page.mouse.move(1020+dx,450+dy,{steps:3});await page.mouse.up({button});};
const pose=d=>{
  const n=d.navigation,frame=new Matrix4().compose(new Vector3(n.position[0],0,n.position[2]),new Quaternion().setFromUnitVectors(new Vector3(1,0,0),new Vector3().fromArray(n.forward)),new Vector3(1,1,1)).invert();
  const camera=new Matrix4().compose(new Vector3().fromArray(d.camera),new Quaternion().fromArray(d.cameraQuaternion),new Vector3(1,1,1)).premultiply(frame);
  return {camera:camera.toArray(),target:new Vector3().fromArray(d.view.target).applyMatrix4(frame).toArray()};
};
const enter=async()=>{await page.locator('[data-poem=jiangxue] .enter-button').click();await page.waitForFunction(()=>window.__POETIC_SCENE__?.id==='jiangxue');await seek(8);};
try{
  await openAuthenticatedPage(page,'http://127.0.0.1:5186/#/');await enter();
  report.before=await details();assert.equal(report.before.model,'models/jiangxue/scene_v06.glb');
  assert(await page.evaluate(()=>document.elementFromPoint(1020,450)?.matches('[data-scene-canvas]')));
  await page.screenshot({path:resolve(out,'before.png'),timeout:20000});
  await drag();report.dragged=await details();assert(distance(report.before.camera,report.dragged.camera)>1);assert(!report.dragged.playing);
  await seek(8);near((await details()).camera,report.dragged.camera);
  await page.screenshot({path:resolve(out,'dragged.png'),timeout:20000});
  check('暂停和减少动态时，真实左键拖动改变视角且不会被下一帧覆盖');
  await page.mouse.wheel(0,-240);const zoomed=await details();
  assert(distance(zoomed.camera,zoomed.view.target)<distance(report.dragged.camera,report.dragged.view.target));
  await drag('right',25,9);const panned=await details();assert(distance(zoomed.view.target,panned.view.target)>.05);
  check('滚轮缩放和右键平移可用');
  await page.locator('[data-scene-view=CAM_enter]').click();near((await details()).camera,report.before.camera);
  await drag();near((await details()).camera,report.dragged.camera);
  check('点击全景恢复制作机位，重建控制器后同样拖动没有重复响应');
  await page.emulateMedia({reducedMotion:'no-preference'});await seek(8);
  report.views=[];
  for(const view of ['CAM_birds','CAM_path','CAM_boat','CAM_fisherman']){
    await page.locator(`.poem-line-button[data-scene-view=${view}]`).click();const before=await details();await drag('left',40,8);const after=await details();
    assert(distance(before.camera,after.camera)>.2,view);await seek(8);near((await details()).camera,after.camera);
    if(after.view.followsBoat){
      const first=pose(after);await seek(23);const second=pose(await details());near(second.camera,first.camera);near(second.target,first.target);
      await seek(8);near((await details()).camera,after.camera);near((await details()).view.target,after.view.target);
    }
    report.views.push({name:view,before:before.view,after:after.view});
  }
  check('四句切镜后均可旋转；孤舟和蓑笠翁拖动后的相对机位随航行保留，跳转重放一致');
  const initial=await details();await page.locator('[data-scene-pause]').click();await page.waitForFunction(t=>window.__POETIC_SCENE__.details().time>t+.05,initial.time);
  assert((await details()).playing);await page.locator('[data-scene-pause]').click();const paused=await details();
  near(pose(paused).camera,pose(initial).camera);near(pose(paused).target,pose(initial).target);
  await page.locator('[data-notes]').first().click();await page.locator('[aria-label=关闭笺注]').click();near((await details()).camera,paused.camera);
  await page.evaluate(()=>{window.__originalOrbitCanvas=document.querySelector('[data-scene-canvas]');});
  await page.locator('[data-favorite=jiangxue]').click();assert(await page.evaluate(()=>window.__originalOrbitCanvas===document.querySelector('[data-scene-canvas]')));
  await drag();assert(distance((await details()).camera,paused.camera)>.2);
  check('播放和暂停保留手动角度；笺注与收藏不破坏控制器');
  await page.evaluate(()=>window.__POETIC_MOTION__.pause());await page.locator('[data-back]').click();await page.locator('.page-return[data-state=playing]').waitFor();
  const frozen=await details();await drag();near((await details()).camera,frozen.camera);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.page-return'));
  await page.evaluate(()=>window.__POETIC_MOTION__.play());await drag();assert(distance((await details()).camera,frozen.camera)>.2);
  check('翻页冻结期间拖动无效，取消返回后恢复拖动');
  await page.locator('[data-scene-replay]').click();const replay=await details();assert.equal(replay.view.name,'CAM_enter');near(replay.camera,report.before.camera);
  await page.locator('[data-back]').click();await page.locator('body[data-page=home]').waitFor();
  await page.emulateMedia({reducedMotion:'reduce'});await enter();const reentered=await details();await drag();assert(distance((await details()).camera,reentered.camera)>1);
  await page.locator('[data-back]').click();await page.locator('body[data-page=home]').waitFor();
  report.disposals=await page.evaluate(()=>window.__orbitDisposals);assert.equal(report.disposals.length,2);for(const d of report.disposals)assert.deepEqual(d.memory,{geometries:0,textures:0});
  check('重看复位，离开后资源归零，再进入可正常拖动');
  assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.pass=false;report.failure=error.stack;await page.screenshot({path:resolve(out,'failure.png'),timeout:20000}).catch(()=>{});throw error;}
finally{await writeFile(resolve(out,'verification.json'),JSON.stringify(report,null,2));await context.close();await browser.close();}
console.log(JSON.stringify({pass:report.pass,checks:report.checks.length}));
