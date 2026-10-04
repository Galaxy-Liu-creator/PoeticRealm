import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { repositoryPath } from './paths.mjs';
import { guestAuth } from './auth-ui-fixture.mjs';

const origin = process.env.UI_ORIGIN || 'http://127.0.0.1:5173';
const output = repositoryPath('output/playwright/curtain-v6/profile/' + (process.env.CURTAIN_FULL_CHROMIUM ? 'full-chromium' : 'headless-shell'));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CURTAIN_FULL_CHROMIUM ? { channel: 'chromium' } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
await guestAuth(context);
const page = await context.newPage();
const results = [];
try {
  for (const [name, css] of [
    ['baseline', ''],
    ['no-panel-shadow', '.curtain-transition .curtain-half { filter: none !important; }'],
    ['no-scene-filter', '.curtain-revealing { filter: none !important; }'],
    ['no-blending', '.curtain-transition :is(.fabric-folds, .fabric-depth, .fabric-sheen) { mix-blend-mode: normal !important; }'],
    ['paint-containment', '.curtain-transition .curtain-half { contain: paint; will-change: transform, opacity, clip-path, filter; }'],
  ]) {
    await page.goto(origin + '/#/account');
    await page.reload();
    await page.locator('#app[data-ready=ready]').waitFor();
    if (css) await page.addStyleTag({ content: css });
    await page.evaluate(() => {
      window.__intervals = [];
      window.__stopProfile = false;
      let previous;
      const tick = now => {
        const clock = document.querySelector('.curtain-motion-clock')?.getAnimations()[0];
        if (clock?.playState === 'running') {
          if (previous) window.__intervals.push(now - previous);
          previous = now;
        } else previous = undefined;
        if (!window.__stopProfile) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.getByRole('link', { name: '登录', exact: true }).click();
    await page.locator('.curtain-transition').waitFor();
    await page.locator('.curtain-transition').waitFor({ state: 'detached' });
    const intervals = await page.evaluate(() => { window.__stopProfile = true; return window.__intervals; });
    const sorted = intervals.toSorted((a, b) => a - b);
    const result = { name, frames: intervals.length, median: sorted[Math.floor(sorted.length / 2)], over50ms: intervals.filter(value => value > 50).length };
    results.push(result);
    console.log(JSON.stringify(result));

    await page.goto(origin + '/#/account');
    await page.locator('#app[data-ready=ready]').waitFor();
    if (css) await page.addStyleTag({ content: css });
    await page.getByRole('link', { name: '登录', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.curtain-motion-clock')?.getAnimations().length > 0);
    await page.locator('.curtain-transition').evaluate(overlay => overlay.getAnimations({ subtree: true }).forEach(animation => { animation.pause(); animation.currentTime = 1650; }));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: output + '/' + name + '.png' });
  }
  await writeFile(output + '/timings.json', JSON.stringify(results, null, 2));
} finally { await browser.close(); }
