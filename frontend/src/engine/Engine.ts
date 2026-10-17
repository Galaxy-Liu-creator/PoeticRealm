// 渲染器、主循环、全局时钟、resize。与"诗"无关的底层。
import { PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three';
import { Clock } from './Clock';

/** 每帧回调：t 为全局时间（秒），dt 为本帧推进量（暂停时为 0）。 */
export type UpdateFn = (t: number, dt: number) => void;

export class Engine {
  readonly renderer: WebGLRenderer;
  readonly clock = new Clock();
  readonly scene = new Scene();
  camera: PerspectiveCamera;

  /** 最近一帧的统计，供 Debug 面板与 tools 读取。 */
  readonly stats = { fps: 0, calls: 0, triangles: 0 };

  private updates: UpdateFn[] = [];
  private resizes: ((w: number, h: number) => void)[] = [];
  private renderFn: () => void;
  private lastNow = -1;
  private visible = !document.hidden;
  private readonly handleResize = (): void => this.resize();
  private readonly resizeObserver: ResizeObserver;
  private readonly handleVisibility = (): void => {
    this.visible = !document.hidden;
    this.lastNow = -1;
  };

  constructor(private readonly canvas: HTMLCanvasElement, pixelRatio = Math.min(window.devicePixelRatio, 2)) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.outputColorSpace = SRGBColorSpace;
    // 后处理会多次 render，统计改为每帧手动清零
    this.renderer.info.autoReset = false;

    this.camera = new PerspectiveCamera(40, 1, 0.1, 1000);
    this.renderFn = () => this.renderer.render(this.scene, this.camera);

    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibility);
    this.resize();
    this.resizeObserver=new ResizeObserver(this.handleResize);this.resizeObserver.observe(canvas);
  }

  onUpdate(fn: UpdateFn): () => void {
    this.updates.push(fn);
    return () => {
      this.updates = this.updates.filter((f) => f !== fn);
    };
  }

  onResize(fn: (w: number, h: number) => void): void {
    this.resizes.push(fn);
    fn(window.innerWidth, window.innerHeight);
  }

  /** 替换默认的 renderer.render（PostFX 接管时使用）。 */
  setRender(fn: () => void): void {
    this.renderFn = fn;
  }

  start(): void {
    this.lastNow = -1;
    this.renderer.setAnimationLoop((now: number) => {
      if (!this.visible) return;
      const realDt = this.lastNow < 0 ? 0 : (now - this.lastNow) / 1000;
      this.lastNow = now;
      if (realDt > 0) this.stats.fps += (1 / realDt - this.stats.fps) * 0.05;
      this.frame(this.clock.tick(realDt));
    });
  }

  /** Suspend rendering while a frozen snapshot is used by navigation. */
  stop(): void { this.renderer.setAnimationLoop(null); this.lastNow = -1; }

  /** 跳到 t 并立即画一帧，保证返回时画面已对应 t。 */
  seek(t: number): void {
    this.clock.seek(t);
    this.frame(0);
  }

  /** 逐帧推进并立即画一帧（录制用），暂停时也有效。 */
  step(dt: number): void {
    this.frame(this.clock.step(dt));
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.updates = [];
    this.resizes = [];
    this.renderer.dispose();
  }

  private frame(dt: number): void {
    this.clock.consumeJump();
    const t = this.clock.time;
    for (const fn of this.updates) fn(t, dt);
    this.renderer.info.reset();
    this.renderFn();
    this.stats.calls = this.renderer.info.render.calls;
    this.stats.triangles = this.renderer.info.render.triangles;
  }

  private resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    for (const fn of this.resizes) fn(w, h);
  }
}
