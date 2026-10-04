import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { repositoryPath } from './paths.mjs';
import { guestAuth } from './auth-ui-fixture.mjs';

const origin = process.env.UI_ORIGIN || 'http://127.0.0.1:5173';
const output = repositoryPath('output/playwright/ui-adjustments');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1672, height: 941 }, reducedMotion: 'reduce' });
await guestAuth(context);
const page = await context.newPage();
const errors = [];
const checks = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => { if (response.status() >= 400 && !(response.status() === 503 && /\/api\/v1\/auth\/(login|register)$/.test(new URL(response.url()).pathname))) errors.push(response.status() + ' ' + response.url()); });
const check = (label) => { checks.push(label); console.log('PASS ' + label); };
const route = async (path) => {
  await page.goto(origin + '/#' + path);
  await page.locator('#app[data-ready=ready]').waitFor();
  await page.waitForLoadState('networkidle');
  assert.ok((await page.locator('body').evaluate((node) => getComputedStyle(node).fontFamily)).includes('Noto Sans SC'), 'functional body font on ' + path);
  const inputFonts = await page.locator('input, select, textarea').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fontFamily));
  assert.ok(inputFonts.every((font) => font.includes('Noto Sans SC')), 'functional input fonts on ' + path);
  if (['/', '/favorites', '/profile'].includes(path)) {
    const layout = await page.locator('.landscape-page').boundingBox();
    const backdrop = await page.locator('.landscape-background').evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return { x: rect.x, y: rect.y, width: rect.width, bottom: rect.bottom, image: style.backgroundImage, opacity: style.opacity, pointerEvents: style.pointerEvents };
    });
    const hero = await page.locator('.home-hero, .profile-hero').count() ? await page.locator('.home-hero, .profile-hero').boundingBox() : null;
    assert.equal(backdrop.x, 0);
    assert.equal(backdrop.width, page.viewportSize().width);
    assert.ok(Math.abs(backdrop.y - layout.y - (hero?.height ?? 0)) < 1, 'background joins page header: ' + path);
    assert.ok(Math.abs(backdrop.bottom - layout.y - layout.height) < 1, 'background covers complete page: ' + path);
    assert.ok(backdrop.image.includes('home-background-v1.png'), 'shared bamboo and landscape asset: ' + path);
    assert.equal(backdrop.opacity, '1', 'background remains visible: ' + path);
    assert.equal(backdrop.pointerEvents, 'none');
    assert.equal(await page.evaluate(() => getComputedStyle(document.body, '::before').display), 'none', 'old faint landscape removed: ' + path);
    assert.equal(await page.locator('.favorites-scenery, .home-paper-edge, .home-paper-bottom').count(), 0);
    const containers = await page.locator('.overview, .poem-grid, .favorites-page, .profile-layout').evaluateAll((nodes) => nodes.map((node) => ({ color: getComputedStyle(node).backgroundColor, shadow: getComputedStyle(node).boxShadow })));
    assert.ok(containers.every(({ color, shadow }) => color === 'rgba(0, 0, 0, 0)' && shadow === 'none'), 'no backing panel: ' + path);
  }
};
const shot = async (name) => page.screenshot({ path: `${output}/${name}.png`, fullPage: true, animations: 'disabled' });
const box = async (selector) => page.locator(selector).first().boundingBox();
let complete = false;
try {
  for (const path of ['/login', '/register']) {
    await route(path);
    await shot(path.slice(1) + '-1672');
    const panel = await box('.account-panel');
    const layout = await box('.auth-layout');
    assert.ok(Math.abs(panel.x - layout.x - layout.width * (path === '/login' ? .644 : .6256)) < 1);
    assert.ok(Math.abs(panel.y - layout.y - layout.height * (path === '/login' ? .234 : .189)) < 1);
    assert.equal(await page.locator('.navigation').count(), 0);
    assert.equal(await page.locator('.account-panel').evaluate((node) => getComputedStyle(node).backgroundColor), 'rgba(0, 0, 0, 0)');
    assert.equal(await page.locator('.auth-background').evaluate((node) => getComputedStyle(node).backgroundImage.includes('auth-split-background-v1.png')), true);
    assert.equal(await page.locator('.experience-list li').count(), path === '/login' ? 4 : 3);
    assert.equal(await page.locator('[name=username]').count(), 1);
    await page.getByLabel('密码', { exact: true }).fill('password1');
    await page.getByRole('button', { name: '显示密码', exact: true }).click();
    assert.equal(await page.getByLabel('密码', { exact: true }).getAttribute('type'), 'text');
    await page.getByRole('button', { name: '隐藏密码', exact: true }).click();
    assert.equal(await page.getByLabel('密码', { exact: true }).getAttribute('type'), 'password');
    assert.equal(await page.locator('.account-tabs').count(), 1);
    assert.equal(await page.locator('.account-tabs [aria-current=page]').getAttribute('href'), '#' + path);
  }
  check('login/register: v10 open form placement and illustrated background, both tab controls, 4/3 feature rows, working password controls');
  await page.getByRole('link', { name: '登录', exact: true }).click();
  await page.locator('body[data-page=login]').waitFor();
  await page.getByRole('button', { name: '切换深色模式' }).click();
  assert.equal(await page.locator('body').evaluate((node) => node.classList.contains('dark')), true);
  assert.equal(await page.getByRole('button', { name: '切换深色模式' }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: '切换深色模式' }).click();
  await page.getByRole('link', { name: '返回首页' }).click();
  await page.locator('body[data-page=home]').waitFor();
  check('auth navigation: tabs switch pages, moon toggles saved theme, return-home reaches overview');
  await route('/register');
  await page.getByLabel('用户名', { exact: true }).fill('诗境旅人');
  await page.getByLabel('密码', { exact: true }).fill('abcdefgh');
  await page.getByLabel('确认密码', { exact: true }).fill('abcdefgh');
  await page.getByRole('button', { name: '立即注册' }).click();
  assert.equal(await page.getByRole('checkbox', { name: '我已阅读并同意用户协议与隐私政策' }).evaluate((node) => node.validity.valueMissing), true);
  await page.getByRole('checkbox', { name: '我已阅读并同意用户协议与隐私政策' }).check();
  await page.getByRole('button', { name: '立即注册' }).click();
  await page.getByText('密码需为8–20位，至少包含字母、数字和特殊字符中的两种').waitFor();
  check('registration: explicit agreement and displayed password rule are enforced');
  await route('/favorites');
  assert.equal(await page.locator('.poem-card').count(), 0);
  assert.equal(await page.locator('.empty-state').count(), 1);
  await shot('favorites-empty-1672');
  await route('/');
  await page.locator('[data-favorite=fengqiao]').click();
  await page.locator('[data-favorite=jiangxue]').click();
  await page.locator('[data-favorite=baidicheng]').click();
  for (const id of ['fengqiao', 'jiangxue', 'baidicheng']) await route('/poems/' + id);
  for (const width of [1440, 1672, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    await route('/profile');
    const account = await box('.account-info');
    const panels = await page.locator('.profile-bottom .paper-panel').evaluateAll((nodes) => nodes.map((node) => { const rect = node.getBoundingClientRect(); return { y: rect.y, bottom: rect.bottom, height: rect.height }; }));
    assert.ok(panels.every((panel) => Math.abs(panel.y - account.y) < 1 && Math.abs(panel.height - account.height) < 1));
    await shot('profile-' + width);
  }
  check('profile: account, achievements, settings have matching top, bottom, and height');
  await page.getByRole('switch', { name: '深色模式' }).check();
  assert.equal(await page.locator('.landscape-background').evaluate((node) => getComputedStyle(node).opacity), '0.22');
  await page.getByRole('switch', { name: '深色模式' }).uncheck();
  check('shared background: empty favorites remain illustrated and dark mode dims the scenery');
  for (const [width, columns] of [[1440, 4], [1920, 5], [1024, 3], [600, 2], [390, 1]]) {
    await page.setViewportSize({ width, height: width < 760 ? 844 : 1080 });
    for (const path of ['/', '/favorites']) {
      await route(path);
      assert.equal(await page.locator('.poem-grid').evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length), columns);
      const grid = await box('.poem-grid');
      const first = await box('.poem-card');
      assert.ok(first.width < grid.width / columns + 1);
      assert.ok(await page.getByRole('button', { name: '下一页', exact: true }).isDisabled());
      assert.equal(await page.getByLabel('输入页码').inputValue(), '1');
      assert.equal(await page.locator('.pagination select').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'list overflow ' + width + ' ' + path);
      await shot((path === '/' ? 'home' : 'favorites') + '-' + width);
    }
    for (const path of ['/profile', '/login', '/register', '/poems/baidicheng', '/account']) {
      await route(path);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'horizontal overflow ' + width + ' ' + path);
      if (width === 390 && ['/login', '/register', '/profile'].includes(path)) await shot(path.slice(1) + '-390');
    }
  }
  check('responsive: 4/5 desktop columns, 3/2/1 small-window columns, single-page boundaries, no overflow');
  check('appearance: shared illustrated backgrounds without backing panels; functional text and inputs use the typography specification');

  // Larger catalogs exist only in this isolated browser's module memory; no source or user storage is changed.
  await page.setViewportSize({ width: 1440, height: 900 });
  await route('/');
  await page.evaluate(async () => {
    const { poems } = await import('/src/content/catalog.ts');
    const { artwork } = await import('/src/ui/components/artwork.ts');
    const original = poems[0];
    for (let index = 0; index < 29; index++) {
      const id = 'pagination-fixture-' + index;
      poems.push({ ...original, id, title: '测试诗' + index });
      artwork.covers[id] = artwork.covers[original.id];
    }
    location.hash = '/favorites';
  });
  await page.locator('body[data-page=favorites]').waitFor();
  await page.locator('nav[aria-label=主导航]').getByRole('link', { name: '诗词总览' }).click();
  await page.locator('body[data-page=home] #main').waitFor();
  await page.locator('#app[data-ready=ready]').waitFor();
  assert.equal(await page.locator('.poem-card').count(), 12);
  assert.equal(await page.getByLabel('输入页码').getAttribute('data-page-count'), '3');
  const longBackground = await box('.landscape-background');
  const longFooter = await box('.site-footer');
  assert.ok(longBackground.y + longBackground.height >= longFooter.y + longFooter.height - 1, 'background covers three scrolling rows');
  await shot('home-three-rows-1440');
  const initialIds = await page.locator('.poem-card').evaluateAll((nodes) => nodes.map((node) => node.dataset.poem));
  await page.getByRole('button', { name: '下一页', exact: true }).click();
  assert.equal(await page.getByLabel('输入页码').inputValue(), '2');
  const nextIds = await page.locator('.poem-card').evaluateAll((nodes) => nodes.map((node) => node.dataset.poem));
  assert.ok(nextIds.every((id) => !initialIds.includes(id)));
  await page.getByLabel('输入页码').fill('3');
  await page.getByLabel('输入页码').press('Enter');
  assert.equal(await page.locator('.poem-card').count(), 8);
  assert.ok(await page.getByRole('button', { name: '下一页', exact: true }).isDisabled());
  await page.getByLabel('输入页码').fill('2');
  await page.getByLabel('输入页码').press('Tab');
  assert.equal(await page.getByLabel('输入页码').inputValue(), '2');
  await page.getByLabel('输入页码').fill('abc');
  await page.getByLabel('输入页码').press('Enter');
  assert.equal(await page.getByLabel('输入页码').inputValue(), '2');
  await page.getByText('请输入整数页码（1–3）', { exact: true }).waitFor();
  await page.getByLabel('输入页码').fill('999');
  await page.getByLabel('输入页码').press('Enter');
  assert.equal(await page.getByLabel('输入页码').inputValue(), '3');
  await page.getByLabel('输入页码').fill('0');
  await page.getByLabel('输入页码').press('Enter');
  assert.equal(await page.getByLabel('输入页码').inputValue(), '1');
  await page.getByLabel('输入页码').fill('２');
  await page.getByLabel('输入页码').press('Enter');
  assert.equal(await page.getByLabel('输入页码').inputValue(), '2');
  await page.getByLabel('输入页码').fill('');
  await page.getByLabel('输入页码').press('Tab');
  assert.equal(await page.getByLabel('输入页码').inputValue(), '2');
  await page.getByLabel('输入页码').fill('3');
  await page.getByLabel('输入页码').press('Enter');
  await page.getByRole('button', { name: '上一页', exact: true }).click();
  assert.equal(await page.getByLabel('输入页码').inputValue(), '2');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.poem-grid')).gridTemplateColumns.split(' ').length === 5 && document.querySelector('[data-list-page]').value === '1');
  await page.locator('#app[data-ready=ready]').waitFor();
  assert.equal(await page.getByLabel('输入页码').inputValue(), '1');
  assert.equal(await page.locator('.poem-card').count(), 15);
  const tops = await page.locator('.poem-card').evaluateAll((nodes) => [...new Set(nodes.map((node) => Math.round(node.getBoundingClientRect().top)))]);
  assert.equal(tops.length, 3);
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  assert.ok((await box('.navigation')).y < 0, 'navigation scrolls with content');
  check('pagination: next, previous, text entry via Enter/blur, invalid/empty/out-of-range/full-width input, final page, responsive size, three rows, scrolling navigation');
  assert.deepEqual(errors, []);
  check('no browser exceptions or failed resources');
  complete = true;
} finally {
  await writeFile(output + '/verification.json', JSON.stringify({ complete, checks, errors }, null, 2));
  await browser.close();
}
