import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {authenticatedUi,openAuthenticatedPage} from './authenticated-ui-fixture.mjs';
const output=resolve(process.env.PROBE_OUTPUT??'../output/playwright/fengqiao-refinement-v01/baseline');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--remote-debugging-port=9232']});
try {
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 await authenticatedUi(context);
 await context.route('**/api/v1/account/settings',route=>route.fulfill({status:200,contentType:'application/json',body:'{"library":null}'}));
 const page=await context.newPage();await openAuthenticatedPage(page,'http://127.0.0.1:5187/#/');
 const cdp=await context.newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
 const {root}=await cdp.send('DOM.getDocument');const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'.hero-copy p'});
 const fonts=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
 const computed=await page.locator('.hero-copy p').evaluate(e=>getComputedStyle(e).fontFamily);
 await page.evaluate(()=>location.hash='/poems/fengqiao');await page.waitForFunction(()=>window.__POETIC_SCENE__?.ready,{},{timeout:30000});
 const views={};
 for(const view of ['CAM_boat','CAM_rower']) {
  await page.evaluate(view=>{const api=window.__POETIC_SCENE__;api.pause();api.seek(0);api.setView(view);},view);
  views[view]=await page.evaluate(()=>window.__POETIC_SCENE__.details());
  await page.screenshot({path:resolve(output,view+'.png')});
 }
 await writeFile(resolve(output,'probe.json'),JSON.stringify({computed,fonts,views},null,2)+'\n');
 console.log(JSON.stringify({computed,fonts,output}));
}finally{await browser.close();}
