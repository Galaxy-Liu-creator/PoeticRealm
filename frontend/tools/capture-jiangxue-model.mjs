import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {authenticatedUi} from './authenticated-ui-fixture.mjs';
const revision=process.argv.find(a=>a.startsWith('--revision='))?.split('=')[1]??'05';
if(!/^(01|02|03|04|05)$/.test(revision))throw new Error('Unknown Jiangxue revision');
const out=new URL(`../../output/jiangxue-model-v${revision}/validation/`,import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1');
await mkdir(out+'capture',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:[...(process.platform==='win32'?['--use-angle=d3d11']:[]),'--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,recordVideo:{dir:out+'capture',size:{width:1440,height:900}}});
await authenticatedUi(context);const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto(`http://127.0.0.1:5187/?scene=jiangxue&lab=jiangxue&t=0&asset=scenes/jiangxue.scene-v${revision}.json`);
  await page.evaluate(async()=>{const {tabSession}=await import('/src/api/TabSession.ts');tabSession.set({token:'t'.repeat(43),lease:'l'.repeat(43)});});
  await page.reload();await page.waitForFunction(()=>!!window.__JIANGXUE_SAMPLE__,null,{timeout:45000});
  for(const view of ['CAM_enter','CAM_boat','CAM_fisherman','CAM_nature',...(revision!=='01'?['CAM_rocks']:[])]) {
    await page.evaluate(view=>{window.__JIANGXUE_SAMPLE__.setView(view);window.__JIANGXUE_SAMPLE__.seek(0);window.__JIANGXUE_SAMPLE__.play();},view);
    await page.waitForTimeout(3500);
  }
  await page.evaluate(()=>window.__JIANGXUE_SAMPLE__.dispose());
} finally {
  const video=page.video();await context.close();await video.saveAs(out+'jiangxue-inspection.webm');
  await writeFile(out+'capture.json',JSON.stringify({revision,fixture:'isolated auth; actual Chrome video; inspection cuts, not automatic product cinematics',viewport:[1440,900],secondsPerView:3.5,errors},null,2));
  await browser.close();
}
