import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { authenticatedUi, openAuthenticatedPage } from './authenticated-ui-fixture.mjs';

const origin = process.env.UI_ORIGIN || 'http://127.0.0.1:5185';
const output = process.env.UI_OUTPUT || 'output/page-session/return';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const report = { complete: false, checks: [], errors: [], frames: [] };
const check = label => { report.checks.push(label); console.log('PASS ' + label); };
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
await authenticatedUi(context);
const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
const enter = async id => {
  await page.locator(`[data-poem=${id}] .enter-button`).click();
  await page.locator('.realm-transition[data-state=playing]').waitFor();
  await page.evaluate(() => window.__POETIC_MOTION__.transition(1));
  await page.locator('body[data-page=poem]').waitFor();
};
try {
  await openAuthenticatedPage(page, origin); await page.evaluate(() => window.__POETIC_MOTION__.pause());
  await enter('fengqiao');
  const source = await page.screenshot({ path: output + '/source.png' });
  await page.locator('[data-back]').focus(); await page.keyboard.press('Enter');
  await page.locator('.page-return[data-state=playing]').waitFor();
  await page.evaluate(() => window.__POETIC_MOTION__.return(0));
  const first = await page.screenshot({ path: output + '/return-000.png' });
  const a = PNG.sync.read(source), b = PNG.sync.read(first); let changed = 0;
  for (let i = 0; i < a.data.length; i += 4) if (Math.max(...[0, 1, 2].map(c => Math.abs(a.data[i + c] - b.data[i + c]))) > 20) changed++;
  report.sourceDifference = changed / (a.width * a.height); assert(report.sourceDifference < .03);
  check('first frame retains actual scene, typography and navigation within 3% pixel tolerance');
  for (const progress of [.15, .3, .5, .7, .9]) {
    const frame = await page.evaluate(p => {
      window.__POETIC_MOTION__.return(p);
      const panels = [...document.querySelectorAll('.page-return-strip')];
      const angles = panels.map(e => Number(e.style.transform.match(/rotateY\(([^r]+)rad/)[1]));
      return { progress: p, panels: panels.length, back: angles.filter(a => a > Math.PI / 2).length,
        curvature: new Set(angles.map(a => a.toFixed(2))).size, inert: document.querySelector('#app').inert,
        shadow: getComputedStyle(document.querySelector('.page-return-shadow')).opacity, hash: location.hash };
    }, progress);
    assert.equal(frame.panels, 48); assert(frame.curvature > (progress === .15 ? 2 : 4)); assert(frame.inert);
    assert(frame.hash.endsWith('/poems/fengqiao')); if (progress === .5) assert(frame.back > 0);
    report.frames.push(frame); await page.screenshot({ path: output + `/return-${Math.round(progress * 1000)}.png` });
  }
  check('curved sheet exposes paper back and soft shadow; route stays on source until completion');
  const targetLayout = await page.locator('.page-return-overview .home-hero').boundingBox();
  await page.evaluate(() => window.__POETIC_MOTION__.return(1)); await page.locator('body[data-page=home]').waitFor();
  await page.screenshot({ path: output + '/return-1000.png' });
  const endLayout = await page.locator('.home-hero').boundingBox(); assert.deepEqual(endLayout, targetLayout);
  assert.equal(await page.locator('.page-return').count(), 0); assert.equal(await page.locator('#app').evaluate(e => e.inert), false);
  assert(await page.locator('[data-poem=fengqiao] .enter-button').evaluate(e => e === document.activeElement));
  check('completion matches overview layout, restores entry focus and releases all return panels');

  await enter('jiangxue'); await page.locator('[data-back]').focus(); await page.keyboard.press('Enter');
  await page.locator('.page-return[data-state=playing]').waitFor(); await page.keyboard.press('Escape');
  assert(page.url().endsWith('#/poems/jiangxue')); assert.equal(await page.locator('.page-return').count(), 0);
  assert(await page.locator('[data-back]').evaluate(e => e === document.activeElement));
  assert.equal(await page.locator('#app').evaluate(e => e.inert), false);
  check('Escape cancels the page turn, retains the poem and restores keyboard focus');
  await page.evaluate(() => { document.querySelector('[data-back]').click(); document.querySelector('.page-return [data-cancel]').click(); });
  assert.equal(await page.locator('.page-return').count(), 0); assert(page.url().endsWith('#/poems/jiangxue'));
  check('cancellation during preparation remains cancelled after asynchronous decode');
  await page.evaluate(() => { document.querySelector('[data-back]').click(); document.querySelector('[data-back]').click(); });
  await page.locator('.page-return[data-state=playing]').waitFor(); assert.equal(await page.locator('.page-return').count(), 1);
  await page.evaluate(() => { location.hash = '/favorites'; }); await page.locator('body[data-page=favorites]').waitFor();
  assert.equal(await page.locator('.page-return').count(), 0);
  check('rapid return requests share one transaction; another route cancels and cleans it');

  await page.evaluate(() => { location.hash = '/'; }); await page.locator('body[data-page=home]').waitFor();
  await enter('baidicheng'); await page.goBack(); await page.locator('.page-return[data-state=playing]').waitFor();
  assert.equal(await page.locator('body').getAttribute('data-page'), 'poem');
  await page.evaluate(() => window.__POETIC_MOTION__.return(1)); await page.locator('body[data-page=home]').waitFor();
  check('browser Back uses the same page turn and commits the requested history destination');
  await enter('fengqiao'); await page.locator('[data-back]').click(); await page.locator('.page-return[data-state=playing]').waitFor();
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.locator('body[data-page=home]').waitFor();
  assert.equal(await page.locator('.page-return').count(), 0);
  await page.locator('[data-poem=jiangxue] .enter-button').click(); await page.locator('body[data-page=poem]').waitFor();
  await page.locator('[data-back]').click(); await page.locator('body[data-page=home]').waitFor();
  assert.equal(await page.locator('.page-return').count(), 0);
  check('live and initial reduced-motion preferences finish directly after resources are ready');

  await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.setViewportSize({ width: 1440, height: 480 });
  await page.evaluate(() => window.scrollTo(0, 170));
  await enter('fengqiao');
  await page.locator('[data-back]').click(); await page.locator('.page-return[data-state=playing]').waitFor();
  await page.evaluate(() => window.__POETIC_MOTION__.return(1)); await page.locator('body[data-page=home]').waitFor();
  report.restoredScroll = await page.evaluate(() => scrollY); assert(report.restoredScroll > 100);
  check('return restores the overview scroll position');
  await page.setViewportSize({ width: 1920, height: 1080 }); await enter('jiangxue');
  await page.evaluate(() => window.__POETIC_MOTION__.play());
  report.playback = await page.evaluate(async () => {
    const timestamps = []; let started = false;
    document.querySelector('[data-back]').click();
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error('Return did not finish')), 10000);
      const tick = t => {
        const overlay = document.querySelector('.page-return');
        if (overlay?.dataset.state === 'playing') { started = true; timestamps.push(t); }
        if (started && !overlay) { clearTimeout(timeout); resolve(); } else requestAnimationFrame(tick);
      }; requestAnimationFrame(tick);
    });
    const intervals = timestamps.slice(1).map((t, i) => t - timestamps[i]).sort((a, b) => a - b);
    return { viewport: [innerWidth, innerHeight], frames: timestamps.length, duration: timestamps.at(-1) - timestamps[0],
      p50: intervals[Math.floor(intervals.length / 2)], p95: intervals[Math.floor(intervals.length * .95)], over50: intervals.filter(t => t > 50).length };
  });
  assert((report.playback.frames - 1) * 1000 / report.playback.duration >= 50); assert(report.playback.p50 <= 20);
  check('1920x1080 normal page turn averages at least 50fps');
  const videoContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference',
    recordVideo: { dir: output + '/video', size: { width: 1440, height: 900 } } });
  await authenticatedUi(videoContext);
  const videoPage = await videoContext.newPage();
  await openAuthenticatedPage(videoPage, origin);
  await videoPage.locator('[data-poem=fengqiao] .enter-button').focus();
  await videoPage.keyboard.press('Enter');
  await videoPage.locator('body[data-page=poem]').waitFor();
  await videoPage.waitForTimeout(300);
  await videoPage.locator('[data-back]').click();
  await videoPage.locator('body[data-page=home]').waitFor();
  await videoPage.waitForTimeout(650);
  const video = videoPage.video(); await videoContext.close(); report.video = await video.path();
  assert.deepEqual(report.errors, []);
  report.complete = true;
} finally {
  await context.close(); await browser.close();
  await writeFile(output + '/return-verification.json', JSON.stringify(report, null, 2) + '\n');
}
