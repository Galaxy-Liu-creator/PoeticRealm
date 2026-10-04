import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { repositoryPath } from './paths.mjs';

const origin = process.env.UI_ORIGIN || 'http://127.0.0.1:5173';
const output = repositoryPath(process.env.AUTH_OUTPUT || 'output/playwright/auth');
const suffix = process.env.AUTH_RUN_ID || Date.now().toString(36);
assert.match(suffix, /^[a-z0-9]{1,8}$/i, 'AUTH_RUN_ID must be 1–8 letters or digits');
const first = '旅人A' + suffix;
const second = '旅人B' + suffix;
const testAccounts = [first, second];
const password = 'Testpass123!';
const checks = [];
const errors = [];
const responses = [];
let complete = false;
await mkdir(output, { recursive: true });
// Record only the exact test usernames so a database-backed run can clean up its own data.
await writeFile(output + '/test-accounts.json', JSON.stringify({ runId: suffix, usernames: testAccounts }, null, 2));
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1672, height: 941 }, reducedMotion: 'reduce' });
const page = await context.newPage();
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => {
  if (response.url().includes('/api/v1/')) responses.push({ path: new URL(response.url()).pathname, status: response.status() });
});
const check = (name) => { checks.push(name); console.log('PASS ' + name); };
const route = async (path) => {
  await page.goto(origin + '/#' + path);
  await page.locator('#app[data-ready=ready]').waitFor();
  await page.waitForFunction(() => document.querySelector('#app').dataset.auth !== undefined);
};
const register = async (username) => {
  await route('/register');
  await page.getByLabel('用户名', { exact: true }).fill(username);
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByLabel('确认密码', { exact: true }).fill(password);
  await page.getByRole('checkbox', { name: '我已阅读并同意用户协议与隐私政策' }).check();
  await page.getByRole('button', { name: '立即注册' }).click();
  await page.getByText('注册成功，请使用新账号登录。', { exact: true }).waitFor();
};
const login = async (username, remember = false) => {
  await page.getByLabel('用户名', { exact: true }).fill(username);
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByRole('checkbox', { name: '30天内记住我' }).setChecked(remember);
  await page.getByRole('button', { name: '立即登录' }).click();
  await page.locator('body[data-page=profile] #app[data-auth=authenticated]').waitFor();
  await page.waitForLoadState('networkidle');
  assert.match(await page.locator('.account-info').innerText(), new RegExp(username));
};
const logout = async () => {
  await page.getByRole('button', { name: '退出登录' }).click();
  await page.locator('#app[data-auth=guest]').waitFor();
  assert.equal((await context.request.get(origin + '/api/v1/me')).status(), 401);
};
try {
  await route('/');
  await page.getByRole('button', { name: '收藏《枫桥夜泊》', exact: true }).click();
  await register(first);
  assert.equal(await page.getByLabel('用户名', { exact: true }).inputValue(), first);
  assert.equal(await page.getByLabel('密码', { exact: true }).inputValue(), '');
  assert.equal(page.url().endsWith('#/login'), true);
  check('registration: real account creation, login redirect, no automatic authentication, passwords cleared');

  await route('/register');
  await page.getByRole('button', { name: '《隐私政策》', exact: true }).click();
  await page.getByRole('dialog').getByText('开发测试约定与数据说明', { exact: true }).waitFor();
  await page.getByRole('button', { name: '关闭说明' }).click();
  await page.getByLabel('用户名', { exact: true }).fill(first);
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByLabel('确认密码', { exact: true }).fill(password);
  await page.getByRole('checkbox', { name: '我已阅读并同意用户协议与隐私政策' }).check();
  await page.getByRole('button', { name: '立即注册' }).click();
  await page.getByText('这个用户名已被使用，请换一个', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('密码', { exact: true }).inputValue(), '');
  check('duplicate account: server rejection displayed and password cleared; development data notice readable');

  await route('/login');
  await login(first, true);
  assert.equal(await page.locator('.profile-summary h2').innerText(), first);
  assert.equal(await page.locator('.profile-right .mini-poem').count(), 0);
  const cookies = await context.cookies();
  assert.equal(cookies.find((cookie) => cookie.name === 'JSESSIONID').httpOnly, true);
  const remembered = cookies.find((cookie) => cookie.name === 'POETIC_REMEMBER');
  assert.equal(remembered.httpOnly, true); assert.equal(remembered.sameSite, 'Lax');
  check('login: authenticated profile, HttpOnly cookies, guest favorites not imported');

  await page.goto(origin + '/#/');
  await page.locator('#app[data-auth=authenticated]').waitFor();
  await page.getByRole('button', { name: '收藏《江雪》', exact: true }).click();
  await page.goto(origin + '/#/profile');
  await page.locator('#app[data-auth=authenticated]').waitFor();
  await page.reload();
  await page.locator('#app[data-auth=authenticated]').waitFor();
  assert.equal(await page.locator('.profile-right .mini-poem').count(), 1);
  assert.equal(await page.evaluate((secret) => Object.values(localStorage).some((value) => value.includes(secret)), password), false);
  check('refresh: server session and account library restored; no password in browser storage');

  const identity = await (await context.request.get(origin + '/api/v1/me')).json();
  await route('/poems/fengqiao');
  await page.locator('#app[data-auth=authenticated]').waitFor();
  const libraries = await page.evaluate((id) => ({
    guest: JSON.parse(localStorage.getItem('poetic-realm.library.v1')),
    account: JSON.parse(localStorage.getItem('poetic-realm.library.v1.account.' + id)),
  }), identity.id);
  assert.equal(libraries.guest.visits.length, 0);
  assert.equal(libraries.account.visits.some((visit) => visit.id === 'fengqiao'), true);
  await route('/profile');
  await page.locator('#app[data-auth=authenticated]').waitFor();
  check('deep link: initial reading history waits for session restoration and belongs to the account');

  await context.clearCookies({ name: 'JSESSIONID' });
  await page.reload();
  await page.locator('#app[data-auth=authenticated]').waitFor();
  assert.match(await page.locator('.account-info').innerText(), new RegExp(first));
  assert.ok((await context.cookies()).find((cookie) => cookie.name === 'POETIC_REMEMBER').value !== remembered.value,
    'Persistent token must rotate');
  check('remember me: actual identity restored with only the persistent cookie and token rotated');

  await logout();
  assert.match(await page.locator('.account-info').innerText(), /访客/);
  assert.match(await page.locator('.profile-right .mini-poem').innerText(), /枫桥夜泊/);
  assert.equal((await context.cookies()).some((cookie) => cookie.name === 'POETIC_REMEMBER'), false);
  check('logout: protected API denied, persistent cookie removed and original guest library restored');

  await register(second); await login(second, false);
  assert.equal(await page.locator('.profile-right .mini-poem').count(), 0);
  assert.equal((await context.cookies()).some((cookie) => cookie.name === 'POETIC_REMEMBER'), false);
  await logout();
  await route('/login'); await login(first, false);
  assert.match(await page.locator('.profile-right .mini-poem').innerText(), /江雪/);
  await logout();
  check('account switching: two accounts and guest remain separate; unchecked remember me issues no persistent cookie');

  await route('/login');
  await page.getByLabel('用户名', { exact: true }).fill(first);
  await page.getByLabel('密码', { exact: true }).fill('wrongpass1');
  await page.getByRole('button', { name: '立即登录' }).click();
  await page.getByText('用户名或密码不正确', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('密码', { exact: true }).inputValue(), '');
  assert.equal(page.url().endsWith('#/login'), true);
  check('invalid credentials: generic server error, no false login, password cleared');

  await page.route('**/api/v1/auth/login', (request) => request.abort());
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByRole('button', { name: '立即登录' }).click();
  await page.getByText('无法连接账号服务，请检查网络后重试。', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: '立即登录' }).isEnabled(), true);
  assert.equal(await page.getByLabel('密码', { exact: true }).inputValue(), '');
  await page.unroute('**/api/v1/auth/login');
  await page.screenshot({ path: output + '/login-retry.png' });
  check('network failure: accurate feedback, password cleared and retry remains enabled');
  assert.deepEqual(errors, []); check('no browser exceptions');
  complete = true;
} finally {
  if (!complete) {
    await page.screenshot({ path: output + '/failure.png' }).catch(() => {});
    console.error('AUTH FAILURE', JSON.stringify({ url: page.url(), feedback: await page.locator('.form-feedback').textContent().catch(() => null), responses }));
  }
  await writeFile(output + '/verification.json', JSON.stringify({ complete, checks, errors, responses, testAccounts }, null, 2));
  await browser.close();
}
