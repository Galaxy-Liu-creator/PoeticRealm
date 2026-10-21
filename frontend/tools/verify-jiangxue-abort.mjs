import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {authenticatedUi,openAuthenticatedPage} from './authenticated-ui-fixture.mjs';
const out=resolve('output/jiangxue-product-v01/validation/abort');await mkdir(out,{recursive:true});
const report={fixture:'hold only KHR program-ready polling; use actual shaders, v06 model and renderer',errors:[]};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});await authenticatedUi(context);
await context.route('**/api/v1/account/settings',r=>r.fulfill({status:200,contentType:'application/json',body:'{"library":null}'}));
await context.addInitScript(()=>{
  window.__holdSceneCompile=true;window.__compilePolls=0;window.__abortDisposals=[];
  window.addEventListener('jiangxue:disposed',e=>window.__abortDisposals.push(e.detail));
  const get=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(kind,options){
    const gl=get.call(this,kind,options);if(kind!=='webgl2'||!this.hasAttribute('data-scene-canvas')||!gl)return gl;
    const extension=gl.getExtension.bind(gl),parameter=gl.getProgramParameter.bind(gl);
    gl.getExtension=name=>name==='KHR_parallel_shader_compile'?{COMPLETION_STATUS_KHR:0x91B1}:extension(name);
    gl.getProgramParameter=(program,name)=>name===0x91B1?(window.__compilePolls++,gl.isContextLost()||!window.__holdSceneCompile):parameter(program,name);
    return gl;
  };
});
const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>report.errors.push(e.message));
try{
  await openAuthenticatedPage(page,'http://127.0.0.1:5186/#/');
  await page.locator('[data-poem=jiangxue] .enter-button').click();
  await page.waitForFunction(()=>window.__compilePolls>0);
  await page.locator('.realm-transition [data-cancel]').click();
  await page.waitForFunction(()=>window.__abortDisposals.length>0);
  report.cancelled=await page.evaluate(()=>({disposals:window.__abortDisposals,route:location.hash,overlays:document.querySelectorAll('.realm-transition').length,canvases:document.querySelectorAll('[data-scene-canvas]').length,inert:document.querySelector('#app').inert}));
  assert.equal(report.cancelled.route,'#/');assert.equal(report.cancelled.overlays,0);assert.equal(report.cancelled.canvases,0);assert.equal(report.cancelled.inert,false);
  assert.deepEqual(report.cancelled.disposals.at(-1).memory,{geometries:0,textures:0});
  await page.evaluate(()=>{window.__holdSceneCompile=false;});
  await page.locator('[data-poem=jiangxue] .enter-button').click();await page.waitForFunction(()=>window.__POETIC_SCENE__?.id==='jiangxue');
  await page.evaluate(()=>{window.__POETIC_SCENE__.pause();window.__POETIC_SCENE__.seek(8);});
  report.restored=await page.evaluate(()=>window.__POETIC_SCENE__.details());assert.equal(report.restored.model,'models/jiangxue/scene_v06.glb');
  await page.screenshot({path:resolve(out,'restored-product.png'),timeout:15000});
  await page.locator('[data-back]').click();await page.locator('body[data-page=home]').waitFor();
  report.finalDisposals=await page.evaluate(()=>window.__abortDisposals);for(const d of report.finalDisposals)assert.deepEqual(d.memory,{geometries:0,textures:0});
  assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.pass=false;report.failure=error.stack;throw error;}
finally{await writeFile(resolve(out,'verification.json'),JSON.stringify(report,null,2));await context.close();await browser.close();}
console.log(JSON.stringify({pass:report.pass,disposed:report.finalDisposals.length}));
