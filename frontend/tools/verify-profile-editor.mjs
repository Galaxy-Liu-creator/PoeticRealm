import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';

// Run only against an isolated H2 test server. Each account belongs to this run.
const base = process.env.PROFILE_URL || 'http://127.0.0.1:5191';
const out = new URL('../../output/profile-page-2026-10-22/', import.meta.url).pathname + new Date().toISOString().replace(/[:.]/g,'-') + '/';
await mkdir(out, {recursive:true});
console.log('Evidence',out);
const browser = await chromium.launch({headless:true,...(process.env.CHROME_BIN ? {executablePath:process.env.CHROME_BIN} : {channel:'chrome'})});
const context = await browser.newContext({viewport:{width:1920,height:1080}});
await context.addInitScript(() => {
  window.__qaAudio = {starts:0};
  const create = AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator = function(...args) {
    const oscillator = create.apply(this,args), start = oscillator.start.bind(oscillator);
    oscillator.start = (...times) => { ++window.__qaAudio.starts; return start(...times); };
    return oscillator;
  };
});
const page = await context.newPage();
const username = 'pqa_' + Date.now().toString(36), viewerName = 'pqb_' + Date.now().toString(36);
let password = 'Profile123!', viewerContext, viewer, otherContext, created = false, deleted = false, viewerCreated = false;
const checks = [], errors = [], failures = [], geometry = [];
const responses = [];
page.on('response', response => { if(response.url().includes('/api/')) responses.push({path:new URL(response.url()).pathname,status:response.status()}); });
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 500 && !response.headers()['x-qa-fixture']) failures.push({url:response.url(),status:response.status()}); });
const check = (name, condition = true) => { assert(condition, name); checks.push(name); writeFileSync(out+'verification.json',JSON.stringify({base,checks,errors,failures,geometry,responses,generatedAt:new Date().toISOString()},null,2)); console.log('PASS', name); };
const request = (target, path, method = 'GET', body) => target.evaluate(async ({path,method,body}) => {
  const access = JSON.parse(sessionStorage.getItem('poetic-realm.tab-session.v1') || 'null');
  const csrf = method === 'GET' ? null : await fetch('/api/v1/auth/csrf').then(r => r.json());
  const response = await fetch('/api/v1' + path, {method,credentials:'same-origin',headers:{'Content-Type':'application/json',...(access ? {'X-POETIC-TOKEN':access.token} : {}),...(csrf ? {'X-CSRF-TOKEN':csrf.token} : {})},...(body ? {body:JSON.stringify(body)} : {})});
  return {status:response.status,data:response.status === 204 ? null : await response.json()};
}, {path,method,body});
const enter = async target => {
  await target.goto(base);
  await target.locator('body[data-page=account]').waitFor();
  await target.locator('[data-curtain][href="#/login"]').click();
  await target.locator('[data-account-form]').waitFor();
  await target.waitForFunction(() => !document.querySelector('.curtain-transition'));
};
const login = async (target = page, name = username, value = password) => {
  const form = target.locator('[data-account-form]');
  await form.locator('[name=username]').fill(name); await form.locator('[name=password]').fill(value);
  await form.locator('[name=remember]').check(); await form.locator('[type=submit]').click();
  await target.waitForFunction(() => !['login','register','account'].includes(document.body.dataset.page));
};
const register = async (target, name) => request(target,'/auth/register','POST',{username:name,password:'Profile123!',gender:'男',birthday:'2005-08-16',agreement:true,agreementVersion:'2026-10-02-dev'});
const go = async hash => { await page.evaluate(hash => { location.hash = hash; }, hash); await page.waitForFunction(hash => location.hash === '#' + hash, hash); };
const open = async () => {
  await go('/profile');
  await page.locator('.editor-main').waitFor();
  await page.waitForFunction(() => !document.querySelector('[name=remember]').disabled);
  await page.waitForFunction(() => document.querySelector('[data-device]')?.textContent !== '正在读取…'); await tab('basic');
};
const tab = async id => page.locator(`button[data-tab=${id}]`).click();
const save = async () => { await page.locator('.editor-footer [type=submit]').click(); await page.waitForFunction(() => document.querySelector('.profile-editor')?.dataset.dirty==='false'); };
const discard = async () => { await page.locator('.editor-footer [data-cancel]').click(); const question = page.locator('.paper-question'); await question.waitFor(); await question.locator('[data-answer=confirm]').click(); await page.waitForFunction(() => document.querySelector('.profile-editor')?.dataset.dirty==='false'); };
try {
  await enter(page); check('每次打开先展示帘幕，登录入口可用');
  check('隔离测试账号注册', (await register(page,username)).status === 201); created = true;
  await login();
  await page.locator('.poem-grid').hover({force:true});
  await page.locator('[data-favorite]').first().click();
  await go('/favorites'); await page.locator('.favorites-grid .poem-card').waitFor();
  for (const [width,height] of [[1920,1080],[1672,941],[1440,900],[1366,768],[1280,720],[1920,720]]) {
    await page.setViewportSize({width,height});
    for (const [route,name] of [['/','home'],['/favorites','favorites']]) {
      await go(route); await page.locator('.pagination').waitFor();
      const box = await page.evaluate(() => {
        const pager=document.querySelector('.pagination').getBoundingClientRect(),footer=document.querySelector('.site-footer').getBoundingClientRect(),copyright=document.querySelector('.site-footer span').getBoundingClientRect();
        return {pagerBottom:pager.bottom,footerTop:footer.top,footerBottom:footer.bottom,copyrightTop:copyright.top,height:innerHeight,overflow:document.documentElement.scrollWidth-innerWidth};
      });
      geometry.push({width,height,name,...box});
      check(`${width}×${height} ${name} 分页靠底、版权在下、无横向溢出`, Math.abs(box.footerBottom-height)<2 && box.pagerBottom<=box.copyrightTop-16 && box.footerTop-box.pagerBottom<=2 && box.overflow<=0);
      if (width===1920 || width===1366) await page.screenshot({animations:'disabled',path:out+`${name}-${width}.png`});
    }
  }
  await page.setViewportSize({width:1440,height:900});
  await go('/');
  await page.evaluate(async () => {
    const {poems}=await import('/src/content/catalog.ts'),{artwork}=await import('/src/ui/components/artwork.ts');
    for(let i=0;i<29;i++){const id='pagination-fixture-'+i;poems.push({...poems[0],id,title:'测试诗'+i});artwork.covers[id]=artwork.covers.fengqiao;}
    location.hash='/favorites';
  });
  await page.locator('body[data-page=favorites]').waitFor(); await go('/'); await page.locator('.poem-card').nth(11).waitFor();
  check('长列表在分页上方自然展开，无内容覆盖', await page.evaluate(() => document.querySelector('.pagination-count').getBoundingClientRect().top >= document.querySelector('.poem-grid').getBoundingClientRect().bottom+20));
  await page.locator('[data-page-step="1"]').click(); check('下一页跳到第二页', await page.locator('[data-list-page]').inputValue()==='2');
  await page.locator('[data-list-page]').fill('３'); await page.locator('[data-list-page]').press('Enter'); check('全角数字选页可用', await page.locator('[data-list-page]').inputValue()==='3');
  check('末页边界按钮禁用', await page.locator('[data-page-step="1"]').isDisabled());
  await page.locator('[data-list-page]').fill('abc'); await page.keyboard.press('Tab'); check('非法页码失焦后恢复当前页', await page.locator('[data-list-page]').inputValue()==='3');
  await page.locator('.site-footer').scrollIntoViewIfNeeded(); await page.screenshot({animations:'disabled',path:out+'long-home-1440.png',fullPage:true});
  await page.evaluate(async () => {const {poems}=await import('/src/content/catalog.ts');poems.splice(3);location.hash='/favorites';});
  await page.locator('body[data-page=favorites]').waitFor();
  await page.setViewportSize({width:1920,height:1080});
  await open(); check('个人中心统一承载资料与活动，无模态编辑框', page.url().endsWith('#/profile') && await page.locator('main.profile-editor').count() === 1 && await page.locator('dialog.profile-editor').count() === 0);
  check('编辑页铺满顶栏下方、无外框圆角阴影', await page.evaluate(() => {
    const editor=document.querySelector('.profile-editor'),box=editor.getBoundingClientRect(),top=document.querySelector('.navigation').getBoundingClientRect().bottom,style=getComputedStyle(editor);
    return box.x===0 && box.y===top && box.width===innerWidth && box.bottom===innerHeight && style.borderRadius==='0px' && style.boxShadow==='none';
  }));
  for (const id of ['basic','security','privacy','preferences']) {
    await tab(id); await page.screenshot({animations:'disabled',path:out+`${id}-1920.png`});
    check(`${id} 大页面宽度与保存按钮正常`, await page.evaluate(() => {const e=document.querySelector('.profile-editor'),b=document.querySelector('.editor-body');return e.clientWidth>=1400 && b.scrollWidth<=b.clientWidth+1 && document.querySelector('.editor-footer').getBoundingClientRect().bottom<=innerHeight;}));
  }
  await tab('basic'); await page.locator('[name=name]').fill('山河测试客');
  await tab('privacy'); await page.locator('[name=profileVisibility]').selectOption('everyone'); await page.locator('[name=searchable]').check();
  await tab('basic'); check('栏目切换保留草稿', await page.locator('[name=name]').inputValue() === '山河测试客');
  await page.locator('.editor-footer [data-cancel]').click(); await page.locator('.paper-question [data-answer=cancel]').click();
  check('取消放弃操作后继续保留输入', await page.locator('[name=name]').inputValue() === '山河测试客' && page.url().endsWith('#/profile'));
  await save();
  await open(); check('资料与公开范围实际保存', await page.locator('[name=name]').inputValue() === '山河测试客' && (await request(page,'/account/settings')).data.library.privacy.searchable);
  await page.locator('[name=birthday]').fill('2099-01-01'); await page.locator('.editor-footer [type=submit]').click();
  await page.waitForFunction(() => document.querySelector('.editor-feedback').textContent.includes('生日')); check('生日校验保留表单');
  await page.locator('[name=birthday]').fill('2005-08-16');
  await page.locator('input[type=file]').setInputFiles({name:'invalid.png',mimeType:'image/png',buffer:Buffer.from('not an image')});
  await page.waitForFunction(() => document.querySelector('.editor-feedback').textContent.includes('不是有效')); check('头像检查文件内容');
  const png=Buffer.from(await page.evaluate(() => { const c=document.createElement('canvas');c.width=64;c.height=64;const x=c.getContext('2d');x.fillStyle='#174f57';x.fillRect(0,0,64,64);return c.toDataURL('image/png').split(',')[1]; }),'base64');
  await page.locator('input[type=file]').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:png}); await page.locator('.editor-crop').waitFor({state:'visible'});
  await page.locator('.editor-crop input').fill('1.5'); await save(); await open();
  check('头像裁剪结果持久保存', (await request(page,'/account/settings')).data.library.profile.avatar.startsWith('data:image/webp;'));
  await page.locator('[data-reset]').click(); await save(); await open(); check('恢复默认头像并持久保存', (await request(page,'/account/settings')).data.library.profile.avatar === '');
  await tab('preferences'); await page.locator('[name=dark]').check(); await page.locator('[name=motion]').uncheck(); await page.locator('[name=fontSize][value=large]').check();
  check('主题、字号与动态开关立即预览', await page.evaluate(() => document.body.classList.contains('dark') && document.body.classList.contains('no-motion') && document.body.dataset.fontSize==='large'));
  await page.screenshot({animations:'disabled',path:out+'preferences-dark-preview.png'});
  await discard(); check('放弃编辑恢复原主题与字号', await page.evaluate(() => !document.body.classList.contains('dark') && document.body.dataset.fontSize==='normal'));
  await open(); await tab('preferences');
  const audioBefore=await page.evaluate(() => window.__qaAudio.starts);
  await page.locator('[name=music]').check(); await page.waitForFunction(before => window.__qaAudio.starts>before,audioBefore);
  check('背景音乐开关驱动真实 Web Audio 音符');
  await page.locator('[name=sound]').uncheck(); await page.locator('[name=transitions]').uncheck(); await page.locator('[name=motion]').uncheck();
  await page.locator('[name=startPage]').selectOption('profile'); await page.locator('[name=sort]').selectOption('title'); await page.locator('[name=fontSize][value=large]').check();
  await save(); await page.reload(); await page.locator('body[data-page=account]').waitFor(); check('刷新仍先展示大帘幕');
  await page.locator('[data-curtain][href="#/login"]').click(); await page.locator('[data-account-form]').waitFor();
  await page.locator('[data-account-form] [type=submit]').click(); await page.locator('body[data-page=profile]').waitFor();
  check('记住凭据仍需点击登录，登录后使用默认进入页面', page.url().endsWith('#/profile'));
  await go('/'); await page.locator('.poem-grid').waitFor();
  check('诗词名称排序实际应用到列表', await page.evaluate(() => {const names=[...document.querySelectorAll('.card-heading h3')].map(e=>e.textContent);return JSON.stringify(names)===JSON.stringify([...names].sort((a,b)=>a.localeCompare(b,'zh-CN')));}));
  await open(); await tab('preferences'); check('偏好从服务器恢复', await page.locator('[name=music]').isChecked() && !await page.locator('[name=sound]').isChecked() && await page.locator('[name=sort]').inputValue()==='title');
  for (const [width,height] of [[1440,900],[1366,768],[1280,720]]) {
    await page.setViewportSize({width,height});
    for (const id of ['basic','security','privacy','preferences']) {
      await tab(id);
      check(`${width} ${id} 内容独立滚动且保存区可达`, await page.evaluate(() => { const r=document.querySelector('.editor-footer').getBoundingClientRect();return r.bottom<=innerHeight && r.right<=innerWidth && document.documentElement.scrollWidth<=innerWidth; }));
      if (width===1366) await page.screenshot({animations:'disabled',path:out+`${id}-${width}.png`});
    }
  }
  await page.setViewportSize({width:1920,height:1080});
  await tab('basic'); await page.locator('[name=name]').fill('保留失败草稿');
  await page.route('**/api/v1/account/settings', async route => route.request().method()==='PUT' ? route.fulfill({status:503,contentType:'application/json',headers:{'x-qa-fixture':'true'},body:'{}'}) : route.continue(), {times:1});
  await page.locator('.editor-footer [type=submit]').click(); await page.waitForFunction(() => document.querySelector('.editor-feedback').textContent.includes('暂时不可用'));
  check('保存失败保留草稿并可重试', await page.locator('[name=name]').inputValue()==='保留失败草稿'); await save();
  await page.route('**/api/v1/auth/remembered', route => route.fulfill({status:503,contentType:'application/json',headers:{'x-qa-fixture':'true'},body:'{}'}), {times:1});
  await go('/'); await page.locator('.poem-grid').waitFor(); await go('/profile'); await page.locator('[data-retry-settings]').waitFor({state:'visible'}); await page.locator('[data-retry-settings]').click();
  await page.waitForFunction(() => !document.querySelector('[name=remember]').disabled); check('凭据读取失败可以原页重试');
  await tab('privacy'); const downloadPromise=page.waitForEvent('download'); await page.locator('[data-export]').click(); const download=await downloadPromise;
  check('导出生成 JSON 下载', download.suggestedFilename().endsWith('.json'));
  const exported=await request(page,'/account/export'); check('导出本人数据且排除密码令牌', exported.data.account.username===username && !/password|passwordHash|"token"|"lease"/.test(JSON.stringify(exported.data)));
  viewerContext=await browser.newContext(); viewer=await viewerContext.newPage(); await enter(viewer); check('隐私访问测试账号注册', (await register(viewer,viewerName)).status===201); viewerCreated=true; await login(viewer,viewerName,'Profile123!');
  let publicData=await request(viewer,'/profiles/'+username); check('公开主页可见、私密收藏与足迹被隐藏', publicData.status===200 && publicData.data.favorites.length===0 && publicData.data.visits.length===0);
  await page.locator('[data-find-profile]').click(); await page.locator('.profile-confirm [name=query]').fill(username); await page.locator('.profile-confirm [type=submit]').click();
  await page.locator('[data-search-results] a').waitFor(); check('账号搜索返回真实公开账号'); await page.locator('[data-search-results] a').click(); await page.locator('body[data-page=public-profile]').waitFor(); await page.locator('[data-public-profile] h1').waitFor(); check('公开主页有独立页面与真实资料', (await page.locator('[data-public-profile] h1').innerText())==='保留失败草稿');
  await open(); await tab('privacy'); await page.locator('[name=favoritesVisibility]').selectOption('everyone'); await save();
  publicData=await request(viewer,'/profiles/'+username); check('收藏改为公开后其他账号看到实际收藏', publicData.data.favorites.includes('fengqiao'));
  await open(); await tab('privacy'); await page.locator('[name=profileVisibility]').selectOption('private'); await save();
  check('主页改为私密后其他账号无法访问', (await request(viewer,'/profiles/'+username)).status===404 && (await request(viewer,'/profiles?query='+username)).data.length===0);
  await open(); await tab('security'); await page.locator('[data-devices]').last().click(); await page.locator('.profile-confirm').waitFor(); check('设备面板显示实际当前浏览器', (await page.locator('.profile-confirm').innerText()).includes('当前页面')); await page.locator('.profile-confirm [data-close]').click();
  await page.locator('[name=remember]').uncheck(); await save(); await open(); await tab('security');
  check('关闭记住凭据在服务器与界面均生效', !await page.locator('[name=remember]').isChecked() && !(await request(page,'/auth/remembered')).data.remembered);
  await page.locator('[name=remember]').check(); await save(); await open(); await tab('security');
  check('重新开启记住凭据可持久保存', await page.locator('[name=remember]').isChecked());
  otherContext=await browser.newContext(); const other=await otherContext.newPage(); await enter(other); await login(other);
  await page.locator('[data-revoke]').click(); await page.locator('.paper-question [data-answer=confirm]').click(); await page.waitForFunction(() => document.querySelector('.editor-feedback').textContent.includes('其他设备已退出'));
  check('退出其他设备撤销其他会话、保留当前会话', (await request(other,'/account/settings')).status===401 && (await request(page,'/account/settings')).status===200); await otherContext.close(); otherContext=undefined;
  await tab('basic'); await page.locator('button[data-tab=basic]').focus(); await page.keyboard.press('ArrowDown'); check('键盘上下键切换栏目', await page.locator('button[data-tab=security]').getAttribute('aria-selected')==='true');
  await page.emulateMedia({reducedMotion:'reduce'}); check('尊重减少动态偏好', await page.evaluate(() => getComputedStyle(document.querySelector('.switch-track'),'::after').transitionDuration==='0s'));
  await page.locator('[data-enable-password]').click();await page.locator('[name=currentPassword]').fill(password); await page.locator('[name=password]').fill('Changed123!'); await page.locator('[name=confirmation]').fill('Mismatch123!');
  await page.locator('.editor-footer [type=submit]').click(); await page.waitForFunction(() => document.querySelector('.editor-feedback').textContent.includes('不一致')); check('密码确认不匹配阻止提交');
  await page.locator('[name=confirmation]').fill('Changed123!'); await page.locator('.editor-footer [type=submit]').click(); await page.locator('body[data-page=account]').waitFor(); password='Changed123!';
  check('修改密码撤销会话并返回帘幕'); await page.locator('[data-curtain][href="#/login"]').click(); await login(); check('新密码可以重新登录');
  await open(); await tab('privacy'); await page.locator('[data-danger]').click(); await page.locator('[data-clear-history]').click(); await page.locator('.paper-question [data-answer=confirm]').click();
  await page.waitForFunction(() => document.querySelector('.editor-feedback').textContent.includes('已清空')); check('清空历史保留本人资料和收藏', (await request(page,'/account/settings')).data.library.profile.name==='保留失败草稿');
  await page.locator('[name=saveHistory]').uncheck(); await save(); check('关闭浏览记录保存实际生效', !(await request(page,'/account/settings')).data.library.privacy.saveHistory);
  await open(); await tab('privacy'); await page.locator('[data-danger]').click(); await page.locator('[data-delete-account]').click(); await page.locator('[name=deletePassword]').fill(password); await page.locator('[name=deleteConfirmation]').fill('wrong'); await page.locator('.profile-confirm [type=submit]').click();
  await page.waitForFunction(() => document.querySelector('.confirm-feedback').textContent.includes('确认注销')); check('注销必须正确确认本人账号');
  await page.locator('[name=deleteConfirmation]').fill(username); await page.locator('.profile-confirm [type=submit]').click(); await page.locator('body[data-page=account]').waitFor(); deleted=true; check('本人测试账号完成注销并退出');
  check('正常路径无脚本异常或服务端错误', !errors.length && !failures.length);
} catch (error) {
  await page.screenshot({animations:'disabled',path:out+'failure.png'});
  await writeFile(out+'failure.txt', String(error) + '\n' + await page.locator('body').innerText());
  throw error;
} finally {
  await writeFile(out+'verification.json',JSON.stringify({base,checks,errors,failures,geometry,responses,generatedAt:new Date().toISOString()},null,2));
  if(created&&!deleted) try {await request(page,'/account','DELETE',{password,confirmation:username});} catch {}
  if(viewerCreated) try {await request(viewer,'/account','DELETE',{password:'Profile123!',confirmation:viewerName});} catch {}
  await otherContext?.close(); await viewerContext?.close(); await context.close(); await browser.close();
}
