import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const output = 'docs/plans/R1-UI还原/assets';
await mkdir(output + '/videos', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
const page = await context.newPage();
await page.goto('http://127.0.0.1:5173/#/account');
await page.locator('#app[data-ready=ready]').waitFor();
await page.getByRole('link', { name: '登录', exact: true }).click();
await page.waitForFunction(() => document.querySelector('.curtain-half')?.getAnimations().length > 0);
await page.locator('.curtain-transition').evaluate((overlay) => {
  overlay.getAnimations({ subtree: true }).forEach((animation) => animation.pause());
});
for (const progress of [0, .25, .5, .75]) {
  await page.locator('.curtain-transition').evaluate((overlay, value) => {
    overlay.getAnimations({ subtree: true }).forEach((animation) => { animation.currentTime = 1200 * value; });
  }, progress);
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
await videoPage.goto('http://127.0.0.1:5173/#/account');
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
