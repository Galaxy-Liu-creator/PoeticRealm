// 调试入口（设计文档 16.5）：URL 参数、键盘、lil-gui、window.__POETIC__（给 tools 用）。
import type GUI from 'lil-gui';
import type { Engine } from './Engine';
import type { DebugParams } from './debugParams';

export interface PoeticHandle {
  ready: boolean;
  seek(t: number): void;
  step(dt: number): void;
  pause(): void;
  play(): void;
  state(): { t: number; playing: boolean; fps: number; calls: number; triangles: number; scene?: string };
}

declare global {
  interface Window {
    __POETIC__?: PoeticHandle;
  }
}

export class Debug {
  /** 仅 ?debug 时存在；其余模块用 `debug.gui?.then(...)` 挂参数。 */
  readonly gui?: Promise<GUI>;

  constructor(engine: Engine, readonly params: DebugParams) {

    window.__POETIC__ = {
      ready: false,
      seek: (t) => engine.seek(t),
      step: (dt) => engine.step(dt),
      pause: () => engine.clock.pause(),
      play: () => engine.clock.play(),
      state: () => ({ t: engine.clock.time, playing: engine.clock.playing, ...engine.stats, scene: this.params.scene }),
    };

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        engine.clock.toggle();
      }
    });

    if (this.params.debug) {
      this.gui = import('lil-gui').then(({ default: GUIClass }) => {
        const gui = new GUIClass({ title: 'PoeticRealm' });
        const clock = gui.addFolder('时钟');
        clock.add(engine.clock, 'time', 0, 60, 0.01).listen().onChange((t: number) => engine.seek(t));
        clock.add(engine.clock, 'playing').listen();
        const stats = gui.addFolder('统计');
        stats.add(engine.stats, 'fps').listen().disable();
        stats.add(engine.stats, 'calls').name('draw calls').listen().disable();
        stats.add(engine.stats, 'triangles').listen().disable();
        return gui;
      });
    }
  }

  markReady(): void {
    window.__POETIC__!.ready = true;
  }
}
