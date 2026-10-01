import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Assets } from './engine/Assets';
import { Debug } from './engine/Debug';
import { parseDebugParams } from './engine/debugParams';
import { Engine } from './engine/Engine';
import { detectTier, qualitySettings } from './engine/Quality';
import { InkSim } from './systems/ink/InkSim';
import { PaperTerrain } from './systems/terrain/PaperTerrain';

const params = parseDebugParams(window.location.search);
const quality = qualitySettings(params.q ?? detectTier());

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const engine = new Engine(canvas, quality.pixelRatio);
engine.renderer.setClearColor(0x17191a);
const debug = new Debug(engine, params);
const assets = new Assets();

async function main(): Promise<void> {
  const scene = params.scene ?? 'fengqiao';
  const heightmap = await assets.loadHeightmap(scene);
  const terrain = new PaperTerrain(heightmap, quality.terrainSegments);
  const ink = new InkSim(engine.renderer, heightmap.guideTexture, quality.inkSimSize);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  terrain.grow = reduceMotion ? 1 : params.t === undefined ? 0.68 : Math.min(1, params.t / 12);
  terrain.useInkMask(ink.texture);
  engine.scene.add(terrain.mesh);
  engine.onUpdate((t) => {
    ink.seekTo(reduceMotion ? 12 : Math.min(t, 16));
    terrain.useInkMask(ink.texture);
    if (!params.debug && !reduceMotion) terrain.grow = Math.min(1, t / 12);
  });

  engine.camera.position.set(900, 780, 1020);
  engine.camera.near = 1;
  engine.camera.far = 5000;
  engine.camera.lookAt(0, 36, 0);
  engine.camera.updateProjectionMatrix();
  const controls = new OrbitControls(engine.camera, canvas);
  controls.target.set(0, 36, 0);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.minDistance = 520;
  controls.maxDistance = 2400;
  controls.minPolarAngle = Math.PI * 0.08;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.update();

  const ui = document.querySelector<HTMLElement>('#ui');
  const dismissHint = (): void => {
    if (ui?.dataset.state === 'hint') {
      delete ui.dataset.state;
      ui.textContent = '';
    }
  };
  if (ui) {
    ui.dataset.state = 'hint';
    ui.textContent = reduceMotion
      ? '拖动观山 · 滚轮远近'
      : '拖动观山 · 滚轮远近 · 按 R 重演';
  }
  canvas.addEventListener('pointerdown', dismissHint, { once: true });

  const replay = (event: KeyboardEvent): void => {
    if (event.code === 'KeyR' && !event.repeat && !reduceMotion) {
      engine.clock.play();
      engine.seek(0);
    }
  };
  window.addEventListener('keydown', replay);

  void debug.gui?.then((gui) => {
    const folder = gui.addFolder('纸面地形');
    folder.add(terrain, 'grow', 0, 1, 0.001).name('隆起');
    folder.add(terrain, 'colorize', 0, 1, 0.001).name('染色');
    folder
      .add({ 精度: ink.precision === 'half' ? '半精度浮点' : '八位降级' }, '精度')
      .disable();
  });

  window.addEventListener(
    'pagehide',
    () => {
      canvas.removeEventListener('pointerdown', dismissHint);
      window.removeEventListener('keydown', replay);
      controls.dispose();
      ink.dispose();
      terrain.dispose();
      engine.dispose();
    },
    { once: true },
  );

  engine.start();
  if (params.t !== undefined) engine.seek(params.t);
  debug.markReady();
}

void main().catch((error: unknown) => {
  console.error(error);
  const ui = document.querySelector<HTMLElement>('#ui');
  if (ui) {
    ui.dataset.state = 'error';
    ui.textContent = `诗境加载失败：${error instanceof Error ? error.message : String(error)}`;
  }
});
