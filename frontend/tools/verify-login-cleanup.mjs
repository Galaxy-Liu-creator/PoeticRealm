import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {authenticatedUi} from './authenticated-ui-fixture.mjs';
import {connectDevTools} from './devtools-client.mjs';
import {openCurtainForm} from './entry-navigation.mjs';

const output=resolve(process.env.LOGIN_OUTPUT??'../output/playwright/login-cleanup-v02');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--remote-debugging-port=9231']});
const report={scope:'login-copy-and-credential-editing',checks:[],errors:[]};
let mcp;
const url='http://127.0.0.1:5187/#/login';
const saved={authenticated:true,user:{id:99001,username:'motion_fixture',birthday:null,gender:'',createdAt:'2026-10-05T00:00:00Z'},token:'t'.repeat(43),lease:'l'.repeat(43)};
async function identity(waitForRemembered) {
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await authenticatedUi(context);
  await context.route('**/api/v1/account/settings',route=>route.fulfill({status:200,contentType:'application/json',body:'{"library":null}'}));
  await context.route('**/api/v1/auth/remembered',async route=>{
    if(waitForRemembered)await waitForRemembered;
    await route.fulfill({status:200,contentType:'application/json',body:'{"remembered":true,"username":"motion_fixture"}'});
  });
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(url);await openCurtainForm(page);
  if(!waitForRemembered)await page.waitForFunction(()=>document.querySelector('[data-account-form]')?.dataset.remembered==='true');
  return {context,page};
}
async function absent(page) {
  for(const text of ['使用其他账号或密码','已记住登录凭据','正在登录'])assert.equal(await page.getByText(text,{exact:false}).count(),0);
  assert.equal(await page.locator('[data-remembered-hint], [data-use-password]').count(),0);
  assert(await page.evaluate(()=>document.querySelector('.login-options').nextElementSibling.matches('.auth-submit')));
}
try {
  const {context,page}=await identity();
  for(const [width,height] of [[1920,1080],[1440,900],[1280,720]]) {
    await page.setViewportSize({width,height});await absent(page);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:resolve(output,`remembered-${width}.png`)});
  }
  report.checks.push('记住凭据状态无额外入口或占位，1920/1440/1280桌面布局正常');
  await page.setViewportSize({width:1440,height:900});
  assert.equal(await page.locator('[name=username]').evaluate(input=>input.readOnly),false);
  assert.equal(await page.locator('[name=password]').evaluate(input=>input.readOnly),false);
  await page.locator('[name=username]').fill('another_fixture');
  await page.locator('[name=password]').fill('Fixturepass123!');
  assert.equal(await page.locator('[name=password]').inputValue(),'Fixturepass123!');
  assert.equal(await page.locator('[name=password]').evaluate(input=>input.required),true);
  assert.equal(await page.locator('[data-password]').isEnabled(),true);
  let release,requests=0,rememberedRequests=0;
  const delayed=new Promise(resolve=>release=resolve);
  await context.route('**/api/v1/auth/login-remembered',route=>{rememberedRequests++;return route.fulfill({status:401,contentType:'application/json',body:'{"message":"wrong login mode"}'});});
  await context.route('**/api/v1/auth/login',async route=>{
    requests++;const data=route.request().postDataJSON();
    assert.equal(data.username,'another_fixture');assert.equal(data.password,'Fixturepass123!');
    await delayed;await route.fulfill({status:401,contentType:'application/json',body:'{"message":"账号或密码错误"}'});
  });
  await page.locator('[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('[data-account-form]')?.dataset.busy==='true');
  assert(await page.locator('[type=submit]').isDisabled());
  assert.equal((await page.locator('.form-feedback').textContent()).trim(),'');await absent(page);
  await page.evaluate(()=>document.querySelector('[data-account-form]').requestSubmit());
  await page.waitForTimeout(150);assert.equal(requests,1);assert.equal(rememberedRequests,0);
  await page.screenshot({path:resolve(output,'password-pending.png')});
  mcp=await connectDevTools(output,9231);report.nativeServer=mcp.server;
  const pages=mcp.text(await mcp.call('list_pages'));
  const selected=pages.split('\n').find(line=>line.includes('#/login'));assert(selected);
  const pageId=Number(selected.match(/^(\d+):/)[1]);
  await mcp.call('select_page',{pageId,bringToFront:true});
  report.dom=mcp.text(await mcp.call('take_snapshot',{pageId}));
  report.console=mcp.text(await mcp.call('list_console_messages',{pageId,types:['error','warn']}));
  await mcp.call('take_screenshot',{pageId,filePath:resolve(output,'native-login.png')});
  assert(!report.dom.includes('使用其他账号或密码'));assert(!report.dom.includes('正在登录'));
  release();await page.locator('.form-feedback').filter({hasText:'账号或密码错误'}).waitFor();
  assert(await page.locator('[type=submit]').isEnabled());await absent(page);
  report.checks.push('直接编辑已有字段使用输入的账号密码；等待无文案，重复提交拦截与错误重试正常');
  await context.close();

  const passwordOnly=await identity();
  let passwordRequests=0;
  await passwordOnly.context.route('**/api/v1/auth/login',route=>{
    const data=route.request().postDataJSON();assert.equal(data.username,'motion_fixture');assert.equal(data.password,'Otherpass123!');passwordRequests++;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(saved)});
  });
  await passwordOnly.page.locator('[name=password]').fill('Otherpass123!');
  await passwordOnly.page.locator('[type=submit]').click();
  await passwordOnly.page.locator('body[data-page=home] #app[data-ready=ready]').waitFor();assert.equal(passwordRequests,1);
  report.checks.push('只修改原有密码字段即可正常登录，无需额外按钮');
  await passwordOnly.context.close();

  const remembered=await identity();let rememberedLogin=0;
  await remembered.context.route('**/api/v1/auth/login-remembered',route=>{
    rememberedLogin++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(saved)});
  });
  await remembered.page.locator('[type=submit]').click();
  await remembered.page.locator('body[data-page=home] #app[data-ready=ready]').waitFor();assert.equal(rememberedLogin,1);
  report.checks.push('未编辑时仍可点击立即登录使用已记住凭据');
  await remembered.context.close();

  let releaseRemembered;const lateRemembered=new Promise(resolve=>releaseRemembered=resolve);
  const late=await identity(lateRemembered);
  await late.page.locator('[name=username]').fill('typed_fixture');
  await late.page.locator('[name=password]').fill('Typedpass123!');
  const reply=late.page.waitForResponse('**/api/v1/auth/remembered');releaseRemembered();await reply;
  await late.page.waitForTimeout(100);
  assert.equal(await late.page.locator('[name=username]').inputValue(),'typed_fixture');
  assert.equal(await late.page.locator('[name=password]').inputValue(),'Typedpass123!');
  assert.equal(await late.page.locator('[data-account-form]').evaluate(form=>form.dataset.remembered),undefined);
  await absent(late.page);
  report.checks.push('迟到的记住凭据响应不会覆盖已经输入的账号密码');
  await late.context.close();
  assert.equal(report.errors.length,0);report.status='pass';
}catch(error){report.status='failed';report.failure=error.stack;throw error;}
finally{await writeFile(resolve(output,'verification.json'),JSON.stringify(report,null,2)+'\n');mcp?.close();await browser.close();}
console.log(JSON.stringify({status:report.status,checks:report.checks,errors:report.errors,output}));
