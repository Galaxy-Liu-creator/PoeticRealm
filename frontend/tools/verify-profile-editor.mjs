import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.PROFILE_URL || 'http://127.0.0.1:5187';
const out = new URL('../../output/profile-editor/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1672, height: 941 } });
const page = await context.newPage();
const username = 'pqa_' + Date.now().toString(36), password = 'Profile123!';
const checks = [], errors = [], failures = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 500) failures.push({ url: response.url(), status: response.status() }); });
page.on('dialog', dialog => void dialog.accept());
const check = (name, condition = true) => { assert(condition, name); checks.push(name); console.log('PASS', name); };
const request = (path, method = 'GET', body) => page.evaluate(async ({ path, method, body }) => {
  const access = JSON.parse(sessionStorage.getItem('poetic-realm.tab-session.v1') || 'null');
  const csrf = method === 'GET' ? null : await fetch('/api/v1/auth/csrf').then(r => r.json());
  const response = await fetch('/api/v1' + path, { method, credentials: 'same-origin', headers: { 'Content-Type':'application/json', ...(access ? { 'X-POETIC-TOKEN':access.token } : {}), ...(csrf ? { 'X-CSRF-TOKEN':csrf.token } : {}) }, ...(body ? { body:JSON.stringify(body) } : {}) });
  return { status:response.status, data: response.status === 204 ? null : await response.json() };
}, { path, method, body });
const login = async (value = password) => {
  const form = page.locator('[data-account-form]');
  await form.locator('[name=username]').fill(username); await form.locator('[name=password]').fill(value);
  await form.locator('[name=remember]').check(); await form.locator('[type=submit]').click();
  await page.waitForFunction(() => !['login','register'].includes(document.body.dataset.page));
};
const open = async () => {
  await page.evaluate(() => { location.hash='/profile'; });
  await page.locator('[data-edit-profile]').click();
  await page.locator('.profile-editor').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-device]')?.textContent !== '正在读取…');
};
const tab = async id => { await page.locator(`button[data-tab=${id}]`).click(); };
const save = async () => { await page.locator('.profile-editor [type=submit]').click(); await page.locator('.profile-editor').waitFor({ state:'detached' }); };
let created = false, deleted = false, otherContext;
try {
  await page.goto(base + '/#/login');
  await page.waitForSelector('[data-account-form]');
  const registered = await request('/auth/register','POST',{username,password,gender:'男',birthday:'2005-08-16',agreement:true,agreementVersion:'2026-10-02-dev'});
  check('测试账号注册', registered.status === 201); created = true;
  await login(); await open();
  await page.locator('.profile-editor [name=name]').fill('TestAdmin');
  await tab('privacy'); await page.locator('[name=profileVisibility]').selectOption('everyone'); await page.locator('[name=searchable]').check();
  await page.locator('[name=personalization]').check();
  await tab('basic'); check('栏目切换保留未保存输入', await page.locator('.profile-editor [name=name]').inputValue() === 'TestAdmin');
  await save(); await open();
  for (const id of ['basic','security','privacy','preferences']) {
    await tab(id);
    const geometry = await page.evaluate(() => {
      const dialog = document.querySelector('.profile-editor'), body = document.querySelector('.editor-body'), box = dialog.getBoundingClientRect();
      return { x:box.x,y:box.y,width:box.width,height:box.height,overflow:body.scrollHeight-body.clientHeight };
    });
    check(`${id} 原图尺寸及内容无遮挡`, geometry.width === 1062 && geometry.x === 305 && geometry.overflow <= 2);
    await page.screenshot({path:out + `/${id}-1672.png`});
  }
  await tab('basic'); await page.locator('.profile-editor [name=name]').fill('取消修改');
  await page.locator('.editor-footer [data-cancel]').click(); await open();
  check('取消编辑不保存', await page.locator('.profile-editor [name=name]').inputValue() === 'TestAdmin');
  await page.locator('.profile-editor input[type=file]').setInputFiles({name:'invalid.png',mimeType:'image/png',buffer:Buffer.from('not an image')});
  await page.waitForFunction(() => document.querySelector('.editor-feedback').textContent.includes('不是有效'));
  check('拒绝伪造头像文件');
  const png = Buffer.from(await page.evaluate(() => { const canvas=document.createElement('canvas'); canvas.width=16; canvas.height=16; const ctx=canvas.getContext('2d'); ctx.fillStyle='#174f57'; ctx.fillRect(0,0,16,16); return canvas.toDataURL('image/png').split(',')[1]; }), 'base64');
  await page.locator('.profile-editor input[type=file]').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:png});
  await page.locator('.editor-crop').waitFor({state:'visible'});
  check('真实图片可裁切');
  await page.locator('[data-reset]').click();
  check('恢复默认头像', await page.locator('.editor-crop').isHidden());
  await tab('preferences'); await page.locator('[name=motion]').uncheck(); await page.locator('[name=transitions]').uncheck();
  await page.locator('[name=music]').check(); await page.locator('[name=sound]').uncheck();
  await page.locator('[name=startPage]').selectOption('profile'); await page.locator('[name=fontSize][value=large]').check();
  await page.locator('[name=sort]').selectOption('title'); await save();
  check('字号与动态偏好实际生效', await page.evaluate(() => document.body.dataset.fontSize === 'large' && document.body.classList.contains('no-motion')));
  await page.reload(); await page.waitForSelector('[data-edit-profile]');
  check('刷新保留当前页面及登录', new URL(page.url()).hash === '#/profile');
  await open(); check('刷新还原服务器设置', await page.locator('[name=startPage]').inputValue() === 'profile' && await page.locator('[name=music]').isChecked());
  await tab('privacy'); const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-export]').click(); const download = await downloadPromise;
  check('数据导出产生 JSON 下载', download.suggestedFilename().endsWith('.json'));
  const exported = await request('/account/export');
  check('导出包含本人资料并排除密码令牌', exported.data.account.username === username && !/password|passwordHash|"token"|"lease"/.test(JSON.stringify(exported.data)));
  await tab('security'); await page.locator('[data-devices]').last().click();
  await page.locator('.profile-confirm').waitFor(); check('登录设备信息来自当前浏览器', (await page.locator('.profile-confirm').innerText()).includes('当前页面'));
  await page.locator('.profile-confirm [data-close]').click();
  otherContext = await browser.newContext(); const other = await otherContext.newPage();
  await other.goto(base + '/#/login');
  await other.locator('[name=username]').fill(username); await other.locator('[name=password]').fill(password); await other.locator('[type=submit]').click();
  await other.waitForFunction(() => document.body.dataset.page !== 'login');
  await page.locator('[data-revoke]').click();
  await page.waitForFunction(() => document.querySelector('.editor-feedback').textContent.includes('其他设备已退出'));
  await other.reload(); await other.waitForSelector('[data-account-form]');
  check('退出其他设备保留当前页面、撤销另一个页面', (await request('/account/settings')).status === 200 && new URL(other.url()).hash === '#/login');
  await otherContext.close(); otherContext = undefined;
  await tab('basic'); await page.keyboard.press('Escape'); await page.locator('.profile-editor').waitFor({state:'detached'});
  await open(); await page.locator('button[data-tab=basic]').focus(); await page.keyboard.press('ArrowDown');
  check('键盘切换栏目', await page.locator('button[data-tab=security]').getAttribute('aria-selected') === 'true');
  for (const [width,height] of [[1920,1080],[1440,900],[390,844]]) {
    await page.setViewportSize({width,height});
    for (const id of ['basic','security','privacy','preferences']) {
      await tab(id); await page.screenshot({path:out + `/${id}-${width}.png`});
      check(`${width} ${id} 页脚与视口可用`, await page.evaluate(() => { const r=document.querySelector('.editor-footer').getBoundingClientRect(); return r.bottom <= innerHeight && r.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth; }));
    }
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  check('减少动态效果设置得到尊重', await page.evaluate(() => getComputedStyle(document.querySelector('.switch-track'),'::after').transitionDuration === '0s'));
  await page.setViewportSize({width:1672,height:941});
  await tab('security'); await page.locator('[name=currentPassword]').fill(password); await page.locator('[name=password]').fill('Changed123!'); await page.locator('[name=confirmation]').fill('Mismatch123!');
  await page.locator('.profile-editor [type=submit]').click();
  await page.waitForFunction(() => document.querySelector('.editor-feedback').textContent.includes('不一致'));
  check('密码确认不匹配时阻止提交');
  await page.locator('[name=confirmation]').fill('Changed123!'); await page.locator('.profile-editor [type=submit]').click();
  await page.waitForSelector('[data-account-form]'); check('修改密码后当前令牌撤销并要求重新登录');
  await login('Changed123!'); check('显式登录进入设置的默认页面', new URL(page.url()).hash === '#/profile');
  await open(); await tab('privacy'); await page.locator('[data-danger]').click();
  await page.locator('[data-clear-history]').click(); await page.waitForFunction(() => document.querySelector('.editor-feedback').textContent.includes('已清空'));
  check('清空历史保留资料', (await request('/account/settings')).data.library.profile.name === 'TestAdmin');
  await page.locator('[data-danger]').click(); await page.locator('[data-delete-account]').click();
  await page.locator('[name=deletePassword]').fill('Changed123!'); await page.locator('[name=deleteConfirmation]').fill('wrong');
  await page.locator('.profile-confirm [type=submit]').click(); await page.waitForFunction(() => document.querySelector('.confirm-feedback').textContent.includes('确认注销'));
  check('注销需要正确账号确认');
  await page.locator('[name=deleteConfirmation]').fill(username); await page.locator('.profile-confirm [type=submit]').click();
  await page.waitForSelector('[data-account-form]'); deleted = true; check('本人账号可完整注销并退出登录');
  check('页面无脚本异常或服务端错误', errors.length === 0 && failures.length === 0);
  await writeFile(out + '/verification.json', JSON.stringify({base,checks,errors,failures,screenshots:16,generatedAt:new Date().toISOString()},null,2));
} finally {
  if (created && !deleted) {
    try { await request('/account','DELETE',{password,confirmation:username}); } catch { /* Failed run preserves evidence; no broad account cleanup. */ }
  }
  await otherContext?.close(); await context.close(); await browser.close();
}
