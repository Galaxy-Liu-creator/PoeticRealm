import { Debug } from './engine/Debug';
import { parseDebugParams } from './engine/debugParams';
import { Engine } from './engine/Engine';
import { detectTier, qualitySettings } from './engine/Quality';

const params = parseDebugParams(window.location.search);
const quality = qualitySettings(params.q ?? detectTier());

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const engine = new Engine(canvas, quality.pixelRatio);
engine.renderer.setClearColor(0xf2ecdf);
const debug = new Debug(engine, params);

engine.start();
if (params.t !== undefined) engine.seek(params.t);
debug.markReady();
