// 按"场景 + 时间码"截图。
//
//   node tools/shoot.mjs --query "scene=fengqiao" --t 0,6,12 --out tools/out/shots
//
// 默认对 dist/ 启动 vite preview（先 npm run build）；--url 可指向已在运行的 dev 服务。
// 页面就绪后通过 window.__POETIC__.seek(t) 跳转，等两帧再截图，保证画面对应 t。
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import { preview } from 'vite';

const { values: args } = parseArgs({
  options: {
    query: { type: 'string', default: '' },
    t: { type: 'string', default: '' },
    out: { type: 'string', default: 'tools/out/shots' },
    size: { type: 'string', default: '1280x720' },
    url: { type: 'string' },
    prefix: { type: 'string', default: 'shot' },
    // swiftshader：无 GPU 的软件渲染，结果稳定；d3d11：真实显卡，快
    gl: { type: 'string', default: 'd3d11' },
  },
});

export async function launchBrowser(gl = 'd3d11') {
  return chromium.launch({
    args: [`--use-angle=${gl}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
}

export async function openPage(browser, url, [w, h]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto(url);
  // 有 __POETIC__ 的页面等它就绪；没有的（早期版本）等 load 即可
  await page
    .waitForFunction(() => window.__POETIC__?.ready === true, null, { timeout: 60_000 })
    .catch(() => {});
  return { page, logs };
}

export async function seekAndWait(page, t) {
  await page.evaluate(async (time) => {
    const p = window.__POETIC__;
    if (!p) return;
    p.pause();
    await p.seek(time);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, t);
}

async function main() {
  const [w, h] = args.size.split('x').map(Number);
  let server;
  let base = args.url;
  if (!base) {
    server = await preview({ preview: { port: 4173, strictPort: false } });
    base = server.resolvedUrls.local[0];
  }
  const url = `${base}${args.query ? `?${args.query}` : ''}`;
  const outDir = resolve(args.out);
  await mkdir(outDir, { recursive: true });

  const browser = await launchBrowser(args.gl);
  const { page, logs } = await openPage(browser, url, [w, h]);
  const times = args.t ? args.t.split(',').map(Number) : [null];
  for (const t of times) {
    if (t !== null) await seekAndWait(page, t);
    const file = resolve(outDir, `${args.prefix}${t === null ? '' : `_t${t}`}.png`);
    await page.screenshot({ path: file });
    console.log(file);
  }
  if (logs.length) console.log(logs.join('\n'));
  await browser.close();
  await server?.close();
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
