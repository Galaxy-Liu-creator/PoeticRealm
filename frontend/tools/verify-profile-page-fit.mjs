import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createWriteStream, writeFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../',import.meta.url));
const out = root+'output/profile-page-2026-10-22/unified-'+new Date().toISOString().replace(/[:.]/g,'-')+'/';
await mkdir(out,{recursive:true});
const checks=[], errors=[], children=[];
let browser, page, username='fit_'+Date.now().toString(36), created=false;
const password='Profile123!';
const check=(name,value=true)=>{assert(value,name);checks.push(name);writeFileSync(out+'verification.json',JSON.stringify({checks,errors,generatedAt:new Date().toISOString()},null,2));console.log('PASS',name);};
const start=(command,args,cwd,env,log)=>{
  const child=spawn(command,args,{cwd,env:{...process.env,...env},detached:true,stdio:['ignore','pipe','pipe']});
  const stream=createWriteStream(out+log);child.stdout.pipe(stream);child.stderr.pipe(stream);children.push(child);return child;
};
const request=async(path,method='GET',body)=>page.evaluate(async({path,method,body})=>{
  const access=JSON.parse(sessionStorage.getItem('poetic-realm.tab-session.v1')||'null');
  const csrf=method==='GET'?null:await fetch('/api/v1/auth/csrf').then(r=>r.json());
  const response=await fetch('/api/v1'+path,{method,headers:{'Content-Type':'application/json',...(access?{'X-POETIC-TOKEN':access.token}:{}),...(csrf?{'X-CSRF-TOKEN':csrf.token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:response.status,data:response.status===204?null:await response.json()};
},{path,method,body});
try{
  start('./mvnw',['-o','spring-boot:test-run','-Dspring-boot.run.arguments=--server.port=5190 --server.address=127.0.0.1'],root+'backend',{},'backend.log');
  start('npm',['--prefix','frontend','run','dev','--','--host','127.0.0.1','--port','5191','--strictPort'],root,{API_PROXY_TARGET:'http://127.0.0.1:5190'},'frontend.log');
  let ready=false;
  for(let attempt=0;attempt<400;attempt++){
    if(children.some(child=>child.exitCode!==null))throw new Error('隔离测试服务启动失败，见服务日志');
    try{if((await fetch('http://127.0.0.1:5191/api/v1/auth/csrf',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  assert(ready,'隔离服务应正常启动');
  if(process.env.PROFILE_SUITE!=='full'){
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'});
  page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:5191/');await page.locator('[data-curtain][href="#/login"]').click();await page.locator('[data-account-form]').waitFor();
  check('隔离账号注册',(await request('/auth/register','POST',{username,password,agreement:true,agreementVersion:'2026-10-02-dev',gender:''})).status===201);created=true;
  await page.locator('[name=username]').fill(username);await page.locator('[name=password]').fill(password);await page.locator('[data-account-form] [type=submit]').click();
  await page.waitForFunction(()=>document.body.dataset.page==='home');
  const tab=async id=>page.locator(`button[data-tab=${id}]`).click();
  const go=async hash=>{await page.evaluate(hash=>{location.hash=hash;},hash);await page.waitForFunction(hash=>location.hash==='#'+hash,hash);};
  const save=async()=>{await page.locator('.editor-footer [type=submit]').click();await page.waitForFunction(()=>document.querySelector('.profile-editor').dataset.dirty==='false');};
  await go('/profile');await page.locator('.editor-main').waitFor();
  await page.waitForFunction(()=>!document.querySelector('[name=remember]').disabled);
  check('个人中心直接展示统一页面及七个栏目',await page.locator('.editor-tabs [role=tab]').count()===7&&await page.locator('.profile-summary').count()===0);
  check('初次进入展示总览，空收藏和空足迹有入口',await page.locator('button[data-tab=overview]').getAttribute('aria-selected')==='true'&&await page.locator('[data-panel=overview] .realm-empty').count()===2);
  await page.evaluate(()=>{for(const name of ['currentPassword','password']){const input=document.querySelector(`[name=${name}]`);input.value='AutofillFixture123!';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}});
  check('初始化及密码自动填充不产生修改提示',await page.locator('.profile-editor').getAttribute('data-dirty')==='false'&&(await page.locator('.editor-feedback').innerText())==='');
  await tab('security');check('密码修改必须主动开启',await page.locator('#editor-password-fields').isHidden());
  await page.locator('[data-enable-password]').click();check('开启修改时清除被动填入的密码',await page.locator('[name=currentPassword]').inputValue()===''&&await page.locator('.profile-editor').getAttribute('data-dirty')==='false');
  await page.locator('[name=currentPassword]').fill('TypedFixture123!');check('主动输入密码才标记修改',await page.locator('.profile-editor').getAttribute('data-dirty')==='true');
  await page.locator('[data-cancel-password]').click();check('取消密码修改恢复干净状态',await page.locator('.profile-editor').getAttribute('data-dirty')==='false');
  await tab('overview');
  check('浏览栏目不显示无关保存按钮',!await page.locator('.editor-footer [type=submit]').isVisible());
  await page.screenshot({path:out+'empty-overview.png',animations:'disabled'});
  const seeded=(await request('/account/settings')).data.library;
  seeded.profile.name='山河客';seeded.favorites=['fengqiao','jiangxue','baidicheng'];
  seeded.visits=Array.from({length:50},(_,i)=>({id:seeded.favorites[i%3],at:new Date(Date.UTC(2026,9,22-Math.floor(i/18),8,30-i%18)).toISOString()}));
  check('测试资料写入隔离账号',(await request('/account/settings','PUT',seeded)).status===200);
  await page.locator('[data-logout]').click();await page.locator('body[data-page=account]').waitFor();
  await page.locator('[data-curtain][href="#/login"]').click();await page.locator('[data-account-form]').waitFor();
  await page.locator('[name=username]').fill(username);await page.locator('[name=password]').fill(password);await page.locator('[data-account-form] [type=submit]').click();
  await page.waitForFunction(()=>document.body.dataset.page==='home');await go('/profile');await page.locator('.editor-main').waitFor();
  await page.waitForFunction(()=>!document.querySelector('[name=remember]').disabled);
  check('总览呈现真实身份、收藏、足迹和浏览进度',(await page.locator('.realm-welcome h2').innerText())==='山河客'&&await page.locator('[data-panel=overview] .realm-poem-row').count()===3);
  await page.evaluate(()=>{location.hash='/profile/edit';});await page.waitForFunction(()=>location.hash==='#/profile');
  check('旧编辑地址归一到个人中心',await page.locator('.editor-main').count()===1);
  for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[1280,720]]){
    await page.setViewportSize({width,height});
    for(const id of ['overview','favorites','visits','basic','security','privacy','preferences']){
      await tab(id);
      const geometry=await page.evaluate(()=>{
        const editor=document.querySelector('.profile-editor'),box=editor.getBoundingClientRect(),header=document.querySelector('.navigation').getBoundingClientRect(),footer=document.querySelector('.editor-footer').getBoundingClientRect(),body=document.querySelector('.editor-body'),style=getComputedStyle(editor),logout=document.querySelector('[data-logout]').getBoundingClientRect();
        return {full:box.x===0&&box.y===header.bottom&&box.width===innerWidth&&box.bottom===innerHeight,flat:style.borderRadius==='0px'&&style.boxShadow==='none',fits:footer.bottom<=innerHeight&&footer.right<=innerWidth&&body.scrollWidth<=body.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth,nav:logout.bottom<=innerHeight};
      });
      check(`${width}×${height} ${id} 满屏、无溢出、操作区及退出可达`,geometry.full&&geometry.flat&&geometry.fits&&geometry.nav);
      if(width===1920||width===1366||width===1280&&id==='overview')await page.screenshot({path:out+`${id}-${width}.png`,animations:'disabled'});
    }
  }
  await tab('visits');check('完整足迹按日期分组并独立滚动',await page.locator('[data-panel=visits] .realm-visit').count()===50&&await page.locator('.realm-history-group').count()===3&&await page.locator('.editor-body').evaluate(e=>e.scrollHeight>e.clientHeight));
  await page.locator('button[data-tab=visits]').focus();await page.keyboard.press('End');check('键盘 End 到最后一栏',await page.locator('button[data-tab=preferences]').getAttribute('aria-selected')==='true');
  await page.keyboard.press('Home');check('键盘 Home 回到总览',await page.locator('button[data-tab=overview]').getAttribute('aria-selected')==='true');
  await tab('basic');await page.locator('[name=name]').fill('整合后的山河客');
  await tab('favorites');await page.locator('[data-center-favorite=fengqiao]').click();await page.waitForFunction(()=>!document.querySelector('[data-center-favorite=fengqiao]'));
  check('取消收藏留在当前栏目，服务端同步且保留资料草稿',(await request('/account/settings')).data.library.favorites.length===2&&(await request('/account/settings')).data.library.profile.name==='山河客'&&await page.locator('[name=name]').inputValue()==='整合后的山河客'&&page.url().endsWith('#/profile'));
  await page.route('**/api/v1/account/settings',route=>route.request().method()==='PUT'?route.fulfill({status:503,contentType:'application/json',body:'{}'}):route.continue(),{times:1});
  await page.locator('[data-center-favorite=jiangxue]').click();await page.waitForFunction(()=>document.querySelector('.editor-feedback').textContent.includes('暂时不可用'));
  check('取消收藏失败保留原列表并显示重试反馈',await page.locator('[data-center-favorite=jiangxue]').count()===1);
  await tab('overview');check('带草稿切到总览仍可保存',await page.locator('.editor-footer [type=submit]').isVisible());await save();
  check('保存后留在同页同栏目并刷新身份',(await page.locator('.realm-welcome h2').innerText())==='整合后的山河客'&&await page.locator('button[data-tab=overview]').getAttribute('aria-selected')==='true'&&(await request('/account/settings')).data.library.profile.name==='整合后的山河客');
  await tab('basic');await page.locator('[name=bio]').fill('踏过山河，归来仍有诗。');await tab('visits');
  await page.locator('[data-center-clear]').click();await page.locator('.paper-question [data-answer=cancel]').click();check('取消清空足迹保留全部记录',await page.locator('[data-panel=visits] .realm-visit').count()===50);
  await page.route('**/api/v1/account/history',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}),{times:1});
  await page.locator('[data-center-clear]').click();await page.locator('.paper-question [data-answer=confirm]').click();await page.waitForFunction(()=>document.querySelector('.editor-feedback').textContent.includes('暂时不可用'));
  check('清空失败保留足迹，草稿未受影响',await page.locator('[data-panel=visits] .realm-visit').count()===50&&await page.locator('[name=bio]').inputValue()==='踏过山河，归来仍有诗。');
  await page.locator('[data-center-clear]').click();await page.locator('.paper-question [data-answer=confirm]').click();await page.waitForFunction(()=>document.querySelectorAll('[data-panel=visits] .realm-visit').length===0);
  const afterClear=(await request('/account/settings')).data.library;
  check('清空足迹实际生效并保留收藏、资料及草稿',afterClear.visits.length===0&&afterClear.favorites.length===2&&afterClear.profile.name==='整合后的山河客'&&await page.locator('[name=bio]').inputValue()==='踏过山河，归来仍有诗。');
  await tab('preferences');await page.locator('[name=dark]').check();check('深色即时预览',await page.evaluate(()=>document.body.classList.contains('dark')));
  for(const id of ['overview','favorites','visits','preferences']){await tab(id);await page.screenshot({path:out+`dark-${id}.png`,animations:'disabled'});}
  await page.locator('.editor-footer [data-cancel]').click();await page.locator('.paper-question [data-answer=confirm]').click();await page.waitForFunction(()=>document.querySelector('.profile-editor').dataset.dirty==='false');
  check('撤销修改留在当前栏，恢复已保存主题与资料',!await page.evaluate(()=>document.body.classList.contains('dark'))&&await page.locator('[name=bio]').inputValue()===seeded.profile.bio&&await page.locator('button[data-tab=preferences]').getAttribute('aria-selected')==='true');
  await tab('basic');await page.locator('[name=name]').fill('离开前的草稿');await page.locator('[data-logout]').click();await page.locator('.paper-question [data-answer=cancel]').click();
  check('退出登录前保护未保存草稿',await page.locator('[name=name]').inputValue()==='离开前的草稿'&&(await request('/account/settings')).status===200);
  await page.locator('.navigation a[href="#/"]').first().click();await page.locator('.paper-question [data-answer=cancel]').click();await page.waitForFunction(()=>location.hash==='#/profile');
  check('离开确认取消后仍在个人中心并保留输入',await page.locator('[name=name]').inputValue()==='离开前的草稿');
  await page.locator('.navigation a[href="#/"]').first().click();await page.locator('.paper-question [data-answer=confirm]').click();await page.locator('.poem-grid').waitFor();await go('/profile');await page.locator('.editor-main').waitFor();
  check('确认放弃后重新进入展示已保存身份',(await page.locator('.realm-welcome h2').innerText())==='整合后的山河客');
  check('页面无脚本异常',errors.length===0);
  }
  if(process.env.PROFILE_FULL==='1'||process.env.PROFILE_SUITE==='full'){
    const full=start('node',['frontend/tools/verify-profile-editor.mjs'],root,{PROFILE_URL:'http://127.0.0.1:5191'},'full-regression.log');
    const code=await new Promise(resolve=>full.once('exit',resolve));
    check('完整资料、安全、隐私与偏好回归',code===0);
  }
} catch(error){await writeFile(out+'failure.txt',String(error));if(page)await page.screenshot({path:out+'failure.png'}).catch(()=>{});throw error;}
finally{
  if(created&&page)await request('/account','DELETE',{password,confirmation:username}).catch(()=>{});
  await writeFile(out+'verification.json',JSON.stringify({checks,errors,generatedAt:new Date().toISOString()},null,2));
  await browser?.close();
  for(const child of children)if(child.pid&&child.exitCode===null)try{process.kill(-child.pid,'SIGTERM');}catch{}
  console.log('Evidence',out);
}
