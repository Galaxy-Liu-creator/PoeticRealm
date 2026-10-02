import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { repositoryPath } from './paths.mjs';

const origin = process.env.UI_ORIGIN || 'http://127.0.0.1:5173';
const output = repositoryPath('output/playwright/typography-login');
const memoryKey = 'poetic-realm.login-memory.v1';
const duration = 30 * 24 * 60 * 60 * 1000;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1672, height: 941 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const checks = [];
const errors = [];
const fontRequests = [];
const platformFonts = {};
let complete = false;
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
page.on('request', (request) => { if (/fonts\.google|\.(woff2?|ttf|otf)(?:\?|$)/.test(request.url())) fontRequests.push(request.url()); });
const check = (name) => { checks.push(name); console.log('PASS ' + name); };
const route = async (path) => {
  await page.goto(origin + '/#' + path);
  await page.locator('#app[data-ready=ready]').waitFor();
  await page.evaluate(() => document.fonts.ready);
};
const font = async (selector, family, weight) => {
  const styles = await page.locator(selector).evaluateAll((nodes) => nodes.map((node) => ({ family: getComputedStyle(node).fontFamily, weight: getComputedStyle(node).fontWeight })));
  assert.ok(styles.length, 'missing typography element ' + selector);
  for (const style of styles) {
    assert.ok(style.family.includes(family), selector + ': ' + style.family);
    if (weight) assert.equal(style.weight, String(weight), selector);
  }
};
try {
  for (const path of ['/login', '/register']) {
    await route(path);
    await font('.auth-brand strong, .account-intro h1', 'STXingkai', 400);
    await font('.account-panel > h2', 'Noto Serif SC', 700);
    await font('.experience-list h2', 'Noto Serif SC', 600);
    await font('.auth-brand small, .account-tagline, .form-subtitle, .experience-list p', 'LXGW WenKai', 400);
    await font('.field, .account-tabs, .auth-tools, .account-switch', 'Noto Sans SC');
    await font('.field', 'Noto Sans SC', 500);
    await font('input, .field small, .form-feedback', 'Noto Sans SC', 400);
    await font('.auth-submit', 'Noto Serif SC', 600);
    await page.screenshot({ path: `${output}/${path.slice(1)}-1672.png`, fullPage: true });
  }
  check('login/register: shared four-role typography, required title/button/label weights');
  await route('/');
  await font('.brand, .hero-copy h1', 'STXingkai', 400);
  await font('.section-title', 'Noto Serif SC', 700);
  await font('.card-heading h3', 'Noto Serif SC', 600);
  await font('.hero-copy p, .excerpt', 'LXGW WenKai', 400);
  await font('.navigation nav a, .pagination', 'Noto Sans SC');
  await font('.enter-button', 'Noto Serif SC', 600);
  await page.screenshot({ path: `${output}/home-1672.png`, fullPage: true });
  await page.locator('[data-favorite=fengqiao]').click();
  await route('/favorites');
  await font('.page-heading h1', 'Noto Serif SC', 700);
  await font('.page-heading p, .excerpt', 'LXGW WenKai', 400);
  await font('.cancel-favorite', 'Noto Sans SC');
  await route('/profile');
  await font('.profile-hero h1', 'Noto Serif SC', 700);
  await font('.profile-summary h2, .panel-title', 'Noto Serif SC', 600);
  await font('.profile-summary > p:not(.profile-role), .profile-hero > p', 'LXGW WenKai', 400);
  await font('.profile-stats strong, .achievement strong, .account-info dl, .settings', 'Noto Sans SC');
  await page.screenshot({ path: `${output}/profile-1672.png`, fullPage: true });
  await route('/poems/fengqiao');
  await font('.poem-title h1', 'Noto Serif SC', 700);
  await font('.poem-columns p', 'LXGW WenKai', 400);
  assert.ok(await page.locator('.poem-columns p').first().evaluate((node) => Math.abs(parseFloat(getComputedStyle(node).lineHeight) / parseFloat(getComputedStyle(node).fontSize) - 1.9) < .01));
  await page.getByRole('button', { name: '笺注 · 译文' }).click();
  await font('.notes-panel h2, .notes-panel h3', 'Noto Serif SC', 600);
  await font('.notes-panel p:not(.culture-long)', 'LXGW WenKai', 400);
  await route('/account');
  await font('.entry-copy h1', 'STXingkai', 400);
  await font('.entry-copy > p', 'LXGW WenKai', 400);
  await font('.entry-copy > div a', 'Noto Serif SC', 600);
  check('overview/favorites/profile/poems/curtain: semantic title, poetry, brand and functional fonts');

  await route('/login');
  const cdp = await context.newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  for (const selector of ['.account-panel > h2', '.login-options label', '.account-tagline', '.account-intro h1']) {
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    platformFonts[selector] = (await cdp.send('CSS.getPlatformFontsForNode', { nodeId })).fonts.map((value) => value.familyName);
  }
  assert.ok(platformFonts['.account-panel > h2'].some((value) => /Noto Serif|Source Han Serif|宋体/i.test(value)));
  assert.ok(platformFonts['.login-options label'].some((value) => /Noto Sans|Source Han Sans|微软雅黑/i.test(value)));
  assert.ok(platformFonts['.account-tagline'].some((value) => /WenKai|KaiTi|楷体|Kaiti/i.test(value)));
  assert.deepEqual(fontRequests, []);
  assert.equal(await page.evaluate(() => document.fonts.status), 'loaded');
  const before = await page.locator('.account-panel').boundingBox();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.deepEqual(await page.locator('.account-panel').boundingBox(), before);
  check('font loading: actual serif/kai rendering, no remote font downloads or late font layout change');

  const remember = page.getByRole('checkbox', { name: '30天内记住我' });
  assert.equal(await remember.isEnabled(), true);
  await page.getByLabel('用户名', { exact: true }).fill('诗境旅人');
  await page.getByLabel('密码', { exact: true }).fill('password1');
  await remember.focus();
  await page.keyboard.press('Space');
  assert.equal(await remember.isChecked(), true);
  const record = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), memoryKey);
  assert.deepEqual(Object.keys(record).sort(), ['expiresAt', 'username', 'version']);
  assert.equal(record.username, '诗境旅人');
  assert.ok(Math.abs(record.expiresAt - Date.now() - duration) < 3000);
  await page.reload();
  await page.locator('#app[data-ready=ready]').waitFor();
  assert.equal(await remember.isChecked(), true);
  assert.equal(await page.getByLabel('用户名', { exact: true }).inputValue(), '诗境旅人');
  assert.equal(await page.getByLabel('密码', { exact: true }).inputValue(), '');
  await page.getByLabel('用户名', { exact: true }).fill('山河旅人');
  await page.getByLabel('用户名', { exact: true }).press('Tab');
  await page.getByRole('link', { name: '注册', exact: true }).click();
  await page.locator('body[data-page=register]').waitFor();
  await page.getByRole('link', { name: '登录', exact: true }).click();
  await page.locator('body[data-page=login]').waitFor();
  assert.equal(await page.getByLabel('用户名', { exact: true }).inputValue(), '山河旅人');
  await remember.uncheck();
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), memoryKey), null);
  await page.reload();
  await page.locator('#app[data-ready=ready]').waitFor();
  assert.equal(await remember.isChecked(), false);
  assert.equal(await page.getByLabel('用户名', { exact: true }).inputValue(), '');
  check('remember me: keyboard/mouse enabled, refresh and route restore, updated name, deselection clears, no stored password');

  await page.evaluate(({ key }) => localStorage.setItem(key, JSON.stringify({ version: 1, username: '旧用户名', expiresAt: Date.now() - 1 })), { key: memoryKey });
  await page.reload();
  await page.locator('#app[data-ready=ready]').waitFor();
  assert.equal(await remember.isChecked(), false);
  assert.equal(await page.getByLabel('用户名', { exact: true }).inputValue(), '');
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), memoryKey), null);
  const malicious = '<img src=x onerror=alert(1)>';
  await page.evaluate(({ key, username, duration }) => localStorage.setItem(key, JSON.stringify({ version: 1, username, expiresAt: Date.now() + duration })), { key: memoryKey, username: malicious, duration });
  await page.reload();
  await page.locator('#app[data-ready=ready]').waitFor();
  assert.equal(await page.getByLabel('用户名', { exact: true }).inputValue(), malicious);
  assert.equal(await page.locator('.account-panel img').count(), 0);
  await remember.uncheck();
  check('remember me boundaries: expired data removed, saved names restored as text');

  const blocked = await browser.newContext({ reducedMotion: 'reduce' });
  try {
    await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage blocked'); } }));
    const blockedPage = await blocked.newPage();
    blockedPage.on('pageerror', (error) => errors.push(error.message));
    await blockedPage.goto(origin + '/#/login');
    await blockedPage.locator('#app[data-ready=ready]').waitFor();
    await blockedPage.getByRole('checkbox', { name: '30天内记住我' }).check();
    await blockedPage.getByText('浏览器无法保存“记住我”设置，请检查存储权限。', { exact: true }).waitFor();
  } finally { await blocked.close(); }
  check('storage unavailable: selection remains usable and saving failure is explained');
  assert.deepEqual(errors, []);
  check('no browser exceptions or missing resources');
  complete = true;
} finally {
  await writeFile(`${output}/verification.json`, JSON.stringify({ complete, checks, errors, fontRequests, platformFonts }, null, 2));
  await browser.close();
}
