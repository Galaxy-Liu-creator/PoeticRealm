import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {authenticatedUi} from './authenticated-ui-fixture.mjs';
import {openCurtainForm} from './entry-navigation.mjs';
const folder=fileURLToPath(new URL('../public/assets/environments/',import.meta.url));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
try {
  const context=await browser.newContext({viewport:{width:1920,height:1080}});await authenticatedUi(context);
  await context.route('**/api/v1/account/settings',route=>route.fulfill({status:200,contentType:'application/json',body:'{"library":null}'}));
  const page=await context.newPage();await page.goto('http://127.0.0.1:5187/?scene=fengqiao&lab=fengqiao&bake-environment');
  await openCurtainForm(page);
  await page.locator('[name=username]').fill('motion_fixture');await page.locator('[name=password]').fill('Fixturepass123!');await page.locator('[type=submit]').click();
  await page.waitForFunction(()=>window.__POETIC__?.ready,{timeout:45000});
  const result=await page.evaluate(()=>window.__FENGQIAO_ENVIRONMENT_BAKE__());
  const header=Buffer.alloc(16);header.write('PRUV',0);header.writeUInt32LE(1,4);header.writeUInt32LE(result.width,8);header.writeUInt32LE(result.height,12);
  const raw=Buffer.concat([header,Buffer.from(result.base64,'base64')]),packed=gzipSync(raw,{level:9});
  await mkdir(folder,{recursive:true});await writeFile(folder+'fengqiao-night-v01.rgba16f.gz',packed);
  const metadata={source:'Project-authored 512×256 night gradient, Three.js 0.186.1 PMREMGenerator on AMD Radeon / D3D11',format:'PRUV v1: 16-byte LE header + bottom-up RGBA16F CubeUV; lossless gzip',width:result.width,height:result.height,rawBytes:raw.length,distributedBytes:packed.length,sha256:createHash('sha256').update(packed).digest('hex'),colorSpace:'LinearSRGB',license:'Project-authored sky; Three.js renderer MIT; no third-party HDRI'};
  await writeFile(folder+'fengqiao-night-v01.json',JSON.stringify(metadata,null,2)+'\n');console.log(JSON.stringify(metadata));
} finally {await browser.close();}
