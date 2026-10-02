import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { repositoryPath } from './paths.mjs';

const origin = process.env.UI_ORIGIN || 'http://127.0.0.1:5173';
const output = repositoryPath('output/playwright/ui-adjustments');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
const checks = [];
let complete = false;
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
const check = (label) => { checks.push(label); console.log('PASS ' + label); };
const route = async (path) => {
  await page.goto(origin + '/#' + path);
  await page.locator(`body[data-page=${path.slice(1)}] #main`).waitFor();
  await page.locator('#app[data-ready=ready]').waitFor();
  await page.waitForLoadState('networkidle');
};
const fits = async (label) => {
  const viewport = page.viewportSize();
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
  assert.ok(dimensions.width <= viewport.width + 1, 'horizontal overflow: ' + label);
  assert.ok(dimensions.height <= viewport.height + 1, 'vertical overflow: ' + label + ': ' + dimensions.height);
  const controls = await page.locator('.account-panel input, .account-panel button, .account-panel a, .account-tabs a, .auth-tools button, .auth-tools a, .form-feedback:not(:empty)').evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
  }));
  assert.ok(controls.every((rect) => rect.top >= 0 && rect.bottom <= viewport.height + 1 && rect.left >= 0 && rect.right <= viewport.width + 1), 'form control outside viewport: ' + label);
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  assert.equal(await page.evaluate(() => scrollY), 0, 'page should fit without scrolling: ' + label);
};
try {
  for (const [width, height] of [[1920, 880], [1920, 1080], [1672, 941], [1440, 900], [1366, 768], [1280, 720], [1024, 768]]) {
    await page.setViewportSize({ width, height });
    for (const path of ['/login', '/register']) {
      await route(path);
      await fits(`${path} ${width}x${height}`);
      if (width === 1920 && height === 880 || width === 1366) {
        await page.screenshot({ path: `${output}/${path.slice(1)}-fit-${width}x${height}.png`, fullPage: true });
      }
      await page.getByLabel('用户名', { exact: true }).fill('诗境旅人');
      await page.getByLabel('密码', { exact: true }).fill('password1');
      if (path === '/register') {
        await page.getByLabel('确认密码', { exact: true }).fill('password1');
        await page.getByRole('checkbox', { name: '我已阅读并同意用户协议与隐私政策' }).check();
      }
      await page.getByRole('button', { name: path === '/register' ? '立即注册' : '立即登录' }).click();
      await page.getByText('账号服务尚未接入，暂不能提交。你可以返回总览继续浏览诗境。', { exact: true }).waitFor();
      await fits(`${path} feedback ${width}x${height}`);
    }
  }
  check('login/register: seven desktop/tablet viewports fit without scrolling, with all controls and feedback visible');

  await page.setViewportSize({ width: 1672, height: 941 });
  const noInputRing = async (selector) => {
    const input = page.locator(selector).first();
    await input.focus();
    const style = await input.evaluate((node) => ({ outline: getComputedStyle(node).outlineStyle, shadow: getComputedStyle(node).boxShadow, caret: getComputedStyle(node).caretColor, active: document.activeElement === node }));
    assert.equal(style.active, true, selector);
    assert.equal(style.outline, 'none', selector);
    assert.equal(style.shadow, 'none', selector);
    assert.notEqual(style.caret, 'rgba(0, 0, 0, 0)', selector);
  };
  await route('/login');
  await page.getByRole('link', { name: '注册', exact: true }).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.name), 'username');
  assert.equal(await page.getByLabel('用户名', { exact: true }).evaluate((node) => getComputedStyle(node).outlineStyle), 'none');
  await noInputRing('[name=password]');
  await page.getByLabel('用户名', { exact: true }).click();
  assert.equal(await page.getByLabel('用户名', { exact: true }).evaluate((node) => getComputedStyle(node).outlineStyle), 'none');
  await route('/register');
  for (const selector of ['[name=username]', '[name=password]', '[name=confirmation]', '[name=birthday]', '[name=gender]', '[name=agreement]']) await noInputRing(selector);
  await page.goto(origin + '/#/');
  await page.locator('#app[data-ready=ready]').waitFor();
  await noInputRing('[data-list-page]');
  await page.goto(origin + '/#/profile');
  await page.locator('#app[data-ready=ready]').waitFor();
  await page.getByRole('button', { name: '编辑资料' }).click();
  for (const selector of ['.profile-editor input:not([type=file]):not([type=range])', '.profile-editor textarea', '.profile-editor select']) {
    if (await page.locator(selector).count()) await noInputRing(selector);
  }
  await page.locator('.profile-editor').evaluate((node) => node.close());
  check('input focus: keyboard and mouse show caret without outline/shadow in auth, date, radio/checkbox, page jump and profile editor');

  for (const [width, height] of [[1672, 941], [1920, 880], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await route('/account');
    await page.screenshot({ path: `${output}/curtain-entry-${width}x${height}.png`, fullPage: true });
    await page.locator('.entry-copy').evaluate((node) => { node.hidden = true; });
    const expected = await page.evaluate(async () => {
      const background = getComputedStyle(document.querySelector('.curtain-half.left')).backgroundImage;
      const image = new Image();
      image.src = background.slice(5, -2);
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = innerWidth;
      canvas.height = innerHeight;
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    const reference = PNG.sync.read(Buffer.from(expected, 'base64'));
    const actual = PNG.sync.read(await page.screenshot());
    let difference = 0;
    let channels = 0;
    // Compare the joining strip to the whole source image to detect a crop/stretch seam.
    for (let y = 8; y < height - 8; y += 8) {
      for (let x = width / 2 - 24; x <= width / 2 + 24; x += 4) {
        const offset = (y * width + x) * 4;
        for (let channel = 0; channel < 3; channel++) {
          difference += Math.abs(actual.data[offset + channel] - reference.data[offset + channel]);
          channels++;
        }
      }
    }
    assert.ok(difference / channels < 3, `curtain join differs from intact background at ${width}x${height}: ${difference / channels}`);
    await page.locator('.entry-copy').evaluate((node) => { node.hidden = false; });
    assert.ok(await page.getByRole('link', { name: '登录', exact: true }).isVisible());
    assert.ok(await page.getByRole('link', { name: '注册', exact: true }).isVisible());
  }
  check('curtain: center pixels match the continuous full-source image at three desktop sizes, buttons remain visible');
  assert.deepEqual(errors, []);
  check('no browser exceptions or failed resources');
  complete = true;
} finally {
  await writeFile(`${output}/account-fit-verification.json`, JSON.stringify({ complete, checks, errors }, null, 2));
  await browser.close();
}
