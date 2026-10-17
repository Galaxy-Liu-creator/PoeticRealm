import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { repositoryPath } from './paths.mjs';

export const sampleProgress = [0, .08, .25, .5, .75, .875, .999, 1];
export async function referenceSamples(browser, origin, output) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  // Serve the already installed GSAP to the supplied demo without its CDN dependency.
  await context.route('https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js', async route => {
    const response = await context.request.get(origin + '/node_modules/gsap/dist/gsap.min.js?raw');
    if (!response.ok()) throw new Error('Unable to load the local GSAP reference runtime');
    // Vite's raw export is imported in the app origin, then returned as classic JS.
    const runtime = await context.newPage();
    await runtime.goto(origin);
    const body = await runtime.evaluate(async () => (await import('/node_modules/gsap/dist/gsap.min.js?raw')).default);
    await runtime.close();
    await route.fulfill({ status: 200, contentType: 'text/javascript', body });
  });
  const page = await context.newPage();
  page.on('pageerror', error => console.error('Reference: ' + error.message));
  await page.goto(pathToFileURL(process.env.CURTAIN_REFERENCE || repositoryPath('docs/design/2026-10-03-curtain-v6/PoeticRealm_HyperFrames_SideCurtain_v6.html')).href);
  await page.waitForFunction(() => !!window.__timelines?.['poetic-curtain']);
  await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
  const duration = await page.evaluate(() => window.__timelines['poetic-curtain'].duration());
  // GSAP defers timeline sets until the first render, including the demo's closed frame.
  await page.evaluate(() => { window.__timelines['poetic-curtain'].progress(.00001).pause(); });
  const samples = [];
  await mkdir(output + '/reference', { recursive: true });
  for (const progress of sampleProgress) {
    await page.evaluate(progress => { window.__timelines['poetic-curtain'].progress(progress).pause(); }, progress);
    samples.push({ progress, ...await motionSample(page, true) });
    await page.screenshot({ path: output + '/reference/' + Math.round(progress * 1000) + '.png' });
  }
  await context.close();
  return { duration, samples };
}

export function motionSample(page, reference = false) {
  return page.evaluate(reference => {
    const root = reference ? document : (document.querySelector('.curtain-transition') ?? document.querySelector('.account-page'));
    const properties = (selector, keys) => {
      const style = getComputedStyle(root.querySelector(selector));
      return Object.fromEntries(keys.map(key => [key, style[key]]));
    };
    return {
      left: properties('.curtain-half.left', ['clipPath', 'transform', 'opacity', 'width', 'height']),
      right: properties('.curtain-half.right', ['clipPath', 'transform', 'opacity']),
      folds: properties('.fabric-folds', ['opacity', 'transform']),
      ridge: properties('.inner-ridge', ['opacity', 'transform']),
      sheen: properties('.fabric-sheen', ['opacity', 'transform']),
      scene: (() => {
        const style = getComputedStyle(document.querySelector(reference ? '.register-scene' : '.account-page'));
        return { opacity: style.opacity, filter: style.filter, transform: style.transform };
      })(),
      mist: (() => {
        const style = getComputedStyle(document.querySelector(reference ? '.register-mist' : '.curtain-mist'));
        return { opacity: style.opacity, transform: style.transform };
      })(),
      seam: properties('.center-seam', ['opacity', 'transform']),
      glow: properties('.reveal-glow', ['opacity', 'transform']),
    };
  }, reference);
}

if (process.argv.includes('--capture')) {
  const browser = await chromium.launch({ headless: true });
  try {
    const output = repositoryPath('output/playwright/curtain-v6');
    const result = await referenceSamples(browser, process.env.UI_ORIGIN || 'http://127.0.0.1:5173', output);
    await writeFile(output + '/reference.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ duration: result.duration, middle: result.samples[3], final: result.samples.at(-1) }, null, 2));
  } finally { await browser.close(); }
}
