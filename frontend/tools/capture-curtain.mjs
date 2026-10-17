import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { repositoryPath } from './paths.mjs';
import { guestAuth } from './auth-ui-fixture.mjs';
const origin = process.env.UI_ORIGIN || 'http://127.0.0.1:5173';
const output = process.env.CURTAIN_OUTPUT || repositoryPath('output/playwright/curtain-v6/capture');
await mkdir(output + '/videos', { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.CURTAIN_BROWSER_CHANNEL || 'chromium' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
await guestAuth(context);
const page = await context.newPage();
await page.goto(origin + '/#/account');
await page.locator('#app[data-ready=ready]').waitFor();
await page.getByRole('link', { name: '登录', exact: true }).click();
await page.waitForFunction(() => document.querySelector('.curtain-motion-clock')?.getAnimations().length > 0);
await page.locator('.curtain-transition').evaluate((overlay) => {
  overlay.getAnimations({ subtree: true }).forEach((animation) => animation.pause());
});
for (const progress of [0, .25, .5, .75]) {
  await page.locator('.curtain-transition').evaluate((overlay, value) => {
    overlay.getAnimations({ subtree: true }).forEach((animation) => { animation.currentTime = Number(overlay.dataset.duration) * value; });
  }, progress);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: output + '/T05-progress-' + progress * 100 + '.png' });
}
await page.locator('.curtain-transition').evaluate((overlay) => {
  overlay.getAnimations({ subtree: true }).forEach((animation) => animation.play());
});
await page.locator('.curtain-transition').waitFor({ state: 'detached' });
await page.screenshot({ path: output + '/T05-progress-100.png' });
await context.close();
const recorded = await browser.newContext({
  viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference',
  recordVideo: { dir: output + '/videos', size: { width: 1440, height: 900 } },
});
const videoPage = await recorded.newPage();
await guestAuth(recorded);
await videoPage.goto(origin + '/#/account');
await videoPage.locator('#app[data-ready=ready]').waitFor();
await videoPage.getByRole('link', { name: '注册', exact: true }).click();
await videoPage.locator('.curtain-transition').waitFor();
await videoPage.locator('.curtain-transition').waitFor({ state: 'detached' });
await videoPage.locator('[name=confirmation]').waitFor();
const video = videoPage.video();
await recorded.close();
const path = await video.path();
await writeFile(output + '/curtain-evidence.json', JSON.stringify({ viewport: '1440x900', progress: [0, 25, 50, 75, 100], video: path }, null, 2));
console.log(JSON.stringify({ video: path }));
await browser.close();
