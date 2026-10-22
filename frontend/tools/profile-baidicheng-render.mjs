import {isolateViteUpdates} from './isolated-vite-fixture.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const label=process.argv.find(a=>a.startsWith('--stage='))?.slice(8)??'baseline';
if(!/^[a-z0-9-]+$/.test(label))throw new Error('Invalid stage');
const output=resolve('output/baidicheng-runtime-v01/profiling/'+label);await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist']});
const report={stage:label,viewport:[1920,1080],dpr:1,errors:[],cases:[]};
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1}),page=await context.newPage();await isolateViteUpdates(context);
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.route('**/__render_probe__',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}canvas{width:100%;height:100%;display:block}</style><canvas></canvas>'}));
 await page.goto('http://127.0.0.1:5187/__render_probe__');
 await page.evaluate(async()=>{const {prepareBaidicheng}=await import('/src/scenes/BaidichengScene.ts');window.probe=await prepareBaidicheng(document.querySelector('canvas'),new AbortController().signal,new URLSearchParams('t=8'));window.probe.api.stop();});
 await page.setViewportSize({width:1920,height:1080});
 report.renderer=await page.evaluate(()=>{const gl=window.probe.engine.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e.UNMASKED_RENDERER_WEBGL);});
 const cases=process.argv.find(a=>a.startsWith('--cases='))?.slice(8).split(',')??['full','reflection-off','shadow-cached','basic-shadow','shadow-off','full-repeat'];
 for(const name of cases){
  const result=await page.evaluate(async name=>{
   const p=window.probe,e=p.engine,r=e.renderer,three=await import('/node_modules/.vite/deps/three.js'),sun=e.scene.children.find(o=>o.isDirectionalLight),gl=r.getContext();
   window.stopCache?.();window.stopCache=null;p.api.setStaticCache?.(name!=='direct');
   p.api.setReflection(name!=='reflection-off');r.shadowMap.enabled=name!=='shadow-off';r.shadowMap.type=name==='basic-shadow'?three.BasicShadowMap:three.PCFShadowMap;
   e.scene.traverse(o=>{if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.needsUpdate=true;});sun.shadow.needsUpdate=true;
   p.api.seek(8);gl.finish();
   if(name==='shadow-cached')window.stopCache=e.onUpdate(()=>sun.shadow.needsUpdate=false);
   const rows=[];for(let i=0;i<3;i++){const started=performance.now();p.api.seek(8+i/60);const pixel=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);gl.finish();rows.push({ms:performance.now()-started,...e.stats});}
   return {name,rows,size:[p.canvas.width,p.canvas.height,p.canvas.clientWidth,p.canvas.clientHeight,gl.drawingBufferWidth,gl.drawingBufferHeight],contextLost:gl.isContextLost(),cache:p.api.stats().renderCache,memory:{...r.info.memory}};
  },name);
  await page.evaluate(()=>window.probe.api.seek(8));await page.screenshot({path:output+'/'+name+'.png'});report.cases.push(result);await writeFile(output+'/profile.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(result));
 }
 report.release=await page.evaluate(()=>window.probe.api.dispose());await writeFile(output+'/profile.json',JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();}
