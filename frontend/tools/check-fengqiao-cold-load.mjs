import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {authenticatedUi} from './authenticated-ui-fixture.mjs';
import {openCurtainForm} from './entry-navigation.mjs';

const output=resolve(process.env.COLD_OUTPUT??fileURLToPath(new URL('../../output/fengqiao-scene-v02/cold-load.json',import.meta.url)));
const report={scope:'five independent fresh Chrome processes on the current device; module start to first rendered frame',limitMs:3000,trials:[]};
await mkdir(dirname(output),{recursive:true});
for(let round=0;round<5;round++) {
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
  try {
    const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});await authenticatedUi(context);
    await context.route('**/api/v1/account/settings',route=>route.fulfill({status:200,contentType:'application/json',body:'{"library":null}'}));
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    await page.goto((process.env.SAMPLE_BASE??'http://127.0.0.1:5187')+'/?scene=fengqiao&lab=fengqiao&asset='+encodeURIComponent(process.env.SAMPLE_ASSET??'scenes/fengqiao.scene-v02.json'));
    await openCurtainForm(page);
    await page.locator('[name=username]').fill('motion_fixture');await page.locator('[name=password]').fill('Fixturepass123!');await page.locator('[type=submit]').click();
    await page.waitForFunction(()=>window.__POETIC__?.ready,null,{timeout:45000});
    const sample=await page.evaluate(()=>{
      const api=window.__FENGQIAO_SAMPLE__,details=api.details(),gl=document.querySelector('.sample canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');
      window.__POETIC__.pause();const renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null;api.dispose();
      return {loadMs:details.loadMs,phases:details.loadPhases,renderer,staticDraws:details.staticDraws,contextLost:gl.isContextLost()};
    });
    assert.match(sample.renderer,/AMD|NVIDIA|Intel/);assert(sample.contextLost);assert.equal(errors.length,0);
    report.trials.push({round:round+1,...sample,passed:sample.loadMs<report.limitMs,errors});
    console.log(JSON.stringify(report.trials.at(-1)));
  } finally {await browser.close();await writeFile(output,JSON.stringify(report,null,2)+'\n');}
}
report.status=report.trials.every(trial=>trial.passed)?'pass':'failed';
await writeFile(output,JSON.stringify(report,null,2)+'\n');assert.equal(report.status,'pass','独立Chrome首帧超过原3秒门禁');
