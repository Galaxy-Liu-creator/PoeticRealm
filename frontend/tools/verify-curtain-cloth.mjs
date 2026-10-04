import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { repositoryPath } from './paths.mjs';
import { guestAuth } from './auth-ui-fixture.mjs';
import { referenceSamples, motionSample, sampleProgress } from './curtain-reference.mjs';

const origin = process.env.UI_ORIGIN || 'http://127.0.0.1:5173';
const output = process.env.CURTAIN_OUTPUT || repositoryPath('output/playwright/curtain-v6');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CURTAIN_BROWSER_CHANNEL ? { channel: process.env.CURTAIN_BROWSER_CHANNEL } : {}) });
const checks = [], errors = [], timings = [];
const pass = name => { checks.push(name); console.log('PASS ' + name); };
const nextFrames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function context(options = {}, allowGpuFailure = false) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference', ...options });
  await guestAuth(ctx);
  ctx.on('page', page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && !(allowGpuFailure && message.text().includes('Error creating WebGL context'))) errors.push(message.text());
    });
  });
  return ctx;
}
async function enter(page, label = '登录') {
  await page.goto(origin + '/#/account');
  await page.locator('#app[data-ready=ready]').waitFor();
  await page.getByRole('link', { name: label, exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.curtain-motion-clock')?.getAnimations().length > 0);
}
async function seek(page, progress) {
  await page.locator('.curtain-transition').evaluate((overlay, progress) => {
    overlay.getAnimations({ subtree: true }).forEach(animation => { animation.pause(); animation.currentTime = Number(overlay.dataset.duration) * progress; });
  }, progress);
  await nextFrames(page);
}
// Compare with the executed user-supplied demo, rather than duplicating easing math.
function compare(actual, expected, path = '') {
  if (typeof expected === 'object') {
    for (const key of Object.keys(expected)) compare(actual[key], expected[key], path + '.' + key);
    return;
  }
  const numbers = value => value.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
  const a = numbers(actual), b = numbers(expected);
  assert.equal(a.length, b.length, path + ': ' + actual + ' / ' + expected);
  if (!b.length) assert.equal(actual, expected, path);
  b.forEach((value, index) => assert.ok(Math.abs(a[index] - value) < .002, path + ': ' + actual + ' / ' + expected));
}

try {
  const reference = await referenceSamples(browser, origin, output);
  assert.equal(reference.duration, 3.3);
  const ctx = await context();
  const page = await ctx.newPage();
  await page.goto(origin);
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return 'unavailable';
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    const name = extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'unavailable';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  });
  await enter(page);
  assert.equal(await page.locator('.curtain-transition').getAttribute('data-duration'), '3300');
  assert.equal(await page.locator('#app').evaluate(app => app.inert), true);
  await seek(page, 0);
  assert.equal(await page.locator('.curtain-stage').count(), 0);
  assert.equal(await page.locator('.curtain-cloth').count(), 0);
  await page.evaluate(() => { window.__movingPanels = document.querySelector('.curtain-transition .curtain-system'); });
  const samples = [];
  for (const progress of sampleProgress.slice(0, -1)) {
    await seek(page, progress);
    const sample = await motionSample(page);
    samples.push({ progress, ...sample });
    const { progress: _referenceProgress, ...expected } = reference.samples.find(sample => sample.progress === progress);
    compare(sample, expected);
    await page.screenshot({ path: output + '/curtain-' + Math.round(progress * 1000) + '.png' });
  }
  const nearEnd = PNG.sync.read(await page.screenshot());
  await page.locator('.curtain-transition').evaluate(overlay => overlay.getAnimations({ subtree: true }).forEach(animation => animation.play()));
  await page.locator('.curtain-transition').waitFor({ state: 'detached' });
  assert.equal(await page.locator('#app').evaluate(app => app.inert), false);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('name')), 'username');
  assert.equal(await page.locator('canvas.curtain-cloth').count(), 0);
  assert.equal(await page.locator('.account-page').evaluate(main => getComputedStyle(main).opacity), '1');
  assert.equal(await page.locator('.auth-curtain-corners').count(), 1);
  assert.equal(await page.evaluate(() => window.__movingPanels === document.querySelector('.auth-curtain-corners')), true);
  assert.equal(await page.locator('.account-page').evaluate(main => main.style.filter + main.style.transform + main.style.opacity), '');
  assert.equal(await page.locator('.auth-curtain-corners .curtain-half').first().evaluate(panel => getComputedStyle(panel).willChange), 'auto');
  const endpoint = PNG.sync.read(await page.screenshot({ path: output + '/login-open.png' }));
  let endpointDifference = 0, endpointChannels = 0;
  for (let y = 0; y < 180; y += 3) for (let x = 0; x < endpoint.width; x += 3) {
    if (x > 210 && x < endpoint.width - 210) continue;
    const offset = (y * endpoint.width + x) * 4;
    for (let channel = 0; channel < 3; channel++) {
      endpointDifference += Math.abs(nearEnd.data[offset + channel] - endpoint.data[offset + channel]);
      endpointChannels++;
    }
  }
  assert.ok(endpointDifference / endpointChannels < 1, 'The same panels must remain without an endpoint jump: ' + endpointDifference / endpointChannels);
  const steadyCanvasCount = await page.locator('canvas').count();
  pass('v6 reference: seven sought frames match masks, transforms, folds, ridge, sheen, page development, mist, seam and glow; same panels retained at completion');

  for (const label of ['登录', '注册', '登录']) {
    await page.goto(origin + '/#/account');
    await page.locator('#app[data-ready=ready]').waitFor();
    await page.evaluate(() => {
      window.__frameTimes = [];
      window.__measure = true;
      let previous;
      const tick = now => {
        const moving = document.querySelector('.curtain-motion-clock')?.getAnimations()[0]?.playState === 'running';
        if (moving && previous) window.__frameTimes.push(now - previous);
        previous = moving ? now : undefined;
        if (window.__measure) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.getByRole('link', { name: label, exact: true }).click();
    await page.locator('.curtain-transition').waitFor();
    await page.locator('.curtain-transition').waitFor({ state: 'detached' });
    const intervals = await page.evaluate(() => { window.__measure = false; return window.__frameTimes; });
    timings.push({ label, frames: intervals.length, median: intervals.toSorted((a, b) => a - b)[Math.floor(intervals.length / 2)], over50ms: intervals.filter(value => value > 50).length });
    assert.equal(await page.locator('canvas.curtain-cloth').count(), 0);
    assert.equal(await page.locator('canvas').count(), steadyCanvasCount);
    assert.equal(await page.evaluate(() => document.getAnimations().filter(animation => animation.id === 'curtain-pull').length), 0);
    assert.equal(await page.locator('.auth-curtain-corners').count(), 1);
    await page.screenshot({ path: output + '/' + (label === '注册' ? 'register' : 'login') + '-open.png' });
  }
  pass('login/register real-time playback: both targets reachable, repeated opening releases clock and timeline');
  if (process.env.CURTAIN_BROWSER_CHANNEL === 'chromium') {
    assert.ok(timings.every(sample => sample.frames >= 150 && sample.median < 21 && sample.over50ms <= 5), JSON.stringify(timings));
    pass('full Chromium performance: all three 3.3-second playbacks retain near-60fps median with at most five long frames');
  }

  await page.evaluate(async () => {
    const { CurtainReveal } = await import('/src/transition/CurtainReveal.ts');
    window.__reveal = new CurtainReveal();
    window.__result = window.__reveal.play(document.querySelector('#app'), false, Promise.resolve(true));
  });
  await page.waitForFunction(() => document.querySelector('.curtain-motion-clock')?.getAnimations().length > 0);
  const paused = await page.evaluate(async () => {
    window.__reveal.setHidden(true);
    const clock = document.querySelector('.curtain-motion-clock').getAnimations()[0];
    await clock.ready;
    return clock.currentTime;
  });
  await page.waitForTimeout(180);
  assert.equal(await page.locator('.curtain-motion-clock').evaluate(marker => marker.getAnimations()[0].currentTime), paused);
  await page.evaluate(() => window.__reveal.setHidden(false));
  await page.waitForTimeout(100);
  assert.ok(await page.locator('.curtain-motion-clock').evaluate(marker => marker.getAnimations()[0].currentTime) > paused);
  await page.evaluate(() => window.__reveal.cancel());
  assert.equal(await page.evaluate(() => window.__result), 'cancelled');
  assert.equal(await page.locator('.curtain-transition').count(), 0);
  assert.equal(await page.locator('#app').evaluate(app => app.inert), false);
  assert.equal(await page.locator('.account-page').evaluate(main => getComputedStyle(main).opacity), '1');
  pass('visibility: clock pauses/resumes; cancellation removes motion styles and unlocks the form');

  await page.evaluate(() => {
    const root = document.querySelector('#app');
    window.__oldReveal = window.__reveal.play(root, false, new Promise(() => {}));
    window.__reveal.cancel();
    window.__newReveal = window.__reveal.play(root, false, Promise.resolve(true));
  });
  await page.waitForFunction(() => document.querySelector('.curtain-motion-clock')?.getAnimations().length > 0);
  assert.equal(await page.evaluate(() => window.__oldReveal), 'cancelled');
  assert.equal(await page.locator('#app').evaluate(app => app.inert), true);
  await page.evaluate(() => window.__reveal.cancel());
  assert.equal(await page.evaluate(() => window.__newReveal), 'cancelled');
  assert.equal(await page.locator('.curtain-transition').count(), 0);
  pass('preparation cancellation: immediate reopening keeps the new reveal locked and releases cancelled resources');

  for (const viewport of [{ width: 1920, height: 880 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await enter(page, '注册');
    await seek(page, .5);
    const extent = await page.locator('.curtain-transition .curtain-system').boundingBox();
    assert.equal(extent.width, viewport.width); assert.equal(extent.height, viewport.height);
    const profile = await motionSample(page);
    assert.equal(profile.scene.opacity, '0.51');
    assert.equal(profile.left.clipPath, reference.samples.find(sample => sample.progress === .5).left.clipPath);
    await page.screenshot({ path: output + '/curtain-50-' + viewport.width + '.png' });
    await page.goBack();
    await page.locator('.curtain-entry').waitFor();
    assert.equal(await page.locator('.curtain-transition').count(), 0);
  }
  pass('responsive: reference panels cover desktop/mobile viewport; browser back safely interrupts the reveal');

  const reduced = await context({ reducedMotion: 'reduce' });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(origin + '/#/account');
  await reducedPage.locator('#app[data-ready=ready]').waitFor();
  await reducedPage.getByRole('link', { name: '登录', exact: true }).click();
  await reducedPage.locator('[name=username]').waitFor();
  assert.equal(await reducedPage.locator('.curtain-transition').count(), 0);
  assert.equal(await reducedPage.locator('.auth-curtain-corners').count(), 1);
  assert.equal(await reducedPage.locator('.account-page').evaluate(main => getComputedStyle(main).opacity), '1');
  await reduced.close();
  const fallback = await context({}, true);
  await fallback.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...options) {
      return type.startsWith('webgl') ? null : getContext.call(this, type, ...options);
    };
  });
  const fallbackPage = await fallback.newPage();
  await fallbackPage.goto(origin + '/#/account');
  await fallbackPage.locator('#app[data-ready=ready]').waitFor();
  await fallbackPage.getByRole('link', { name: '注册', exact: true }).click();
  await fallbackPage.waitForFunction(() => document.querySelector('.curtain-motion-clock')?.getAnimations().length > 0);
  assert.equal(await fallbackPage.locator('.curtain-transition').getAttribute('data-duration'), '3300');
  await fallbackPage.locator('.curtain-transition').waitFor({ state: 'detached' });
  await fallbackPage.locator('[name=confirmation]').waitFor();
  assert.equal(await fallbackPage.locator('#app').evaluate(app => app.inert), false);
  assert.equal(await fallbackPage.locator('.auth-curtain-corners').count(), 1);
  assert.equal(await fallbackPage.locator('.account-page').evaluate(main => getComputedStyle(main).opacity), '1');
  await fallback.close();
  pass('accessibility: reduced motion opens directly; unavailable WebGL still plays the complete v6 DOM effect');

  await page.setViewportSize({ width: 1440, height: 900 });
  for (const route of ['/', '/favorites', '/profile', '/poems/fengqiao', '/login', '/register', '/missing']) {
    await page.goto(origin + '/#' + route);
    await page.locator('#app[data-ready=ready]').waitFor();
    const brand = page.locator('.brand, .auth-brand');
    assert.equal(await brand.count(), 1);
    assert.deepEqual(await brand.evaluate(element => ({ tag: element.tagName, tabIndex: element.tabIndex, interactive: !!element.closest('a, button, [role=link], [role=button]') })), { tag: 'DIV', tabIndex: -1, interactive: false });
    await brand.click();
    assert.equal(await page.evaluate(() => location.hash), '#' + route);
  }
  await page.getByRole('link', { name: '诗词总览', exact: true }).click();
  await page.locator('.home-page').waitFor();
  pass('all page brands display without click/keyboard navigation; explicit navigation still works');

  assert.deepEqual(errors, []);
  pass('no uncaught browser exceptions');
  await writeFile(output + '/verification.json', JSON.stringify({ checks, renderer, channel: process.env.CURTAIN_BROWSER_CHANNEL || 'headless-shell', reference, samples, timings, endpointDifference: endpointDifference / endpointChannels, errors }, null, 2));
  console.log(JSON.stringify({ timings, renderer, endpointDifference: endpointDifference / endpointChannels }));
  await ctx.close();
} finally { await browser.close(); }
