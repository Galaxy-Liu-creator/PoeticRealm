import { Clock } from '../../engine/Clock';

/** Shared presentation clock. RAF timestamps only advance Clock; drawings sample f(t). */
export class MotionLoop {
  readonly clock = new Clock();
  private frameId = 0;
  private last = -1;
  private entries = new Set<{ active: () => boolean; update: (t: number) => void }>();
  private hidden = document.hidden;
  private visibility = (): void => { this.hidden = document.hidden; this.refresh(); };
  constructor() { document.addEventListener('visibilitychange', this.visibility); }
  subscribe(active: () => boolean, update: (t: number) => void): () => void {
    const entry = { active, update }; this.entries.add(entry); this.refresh();
    return () => { this.entries.delete(entry); this.refresh(); };
  }
  refresh(): void {
    const running = !this.hidden && this.clock.playing && [...this.entries].some(e => e.active());
    if (!running) { cancelAnimationFrame(this.frameId); this.frameId = 0; this.last = -1; }
    else if (!this.frameId) this.frameId = requestAnimationFrame(this.frame);
  }
  private frame = (now: number): void => {
    this.frameId = 0;
    this.clock.tick(this.last < 0 ? 0 : (now - this.last) / 1000); this.last = now;
    for (const e of this.entries) if (e.active()) e.update(this.clock.time);
    this.refresh();
  };
  seek(t: number): void { this.clock.seek(t); for (const e of this.entries) e.update(this.clock.time); }
  pause(): void { this.clock.pause(); this.refresh(); }
  play(): void { this.clock.play(); this.refresh(); }
  dispose(): void { this.pause(); this.entries.clear(); document.removeEventListener('visibilitychange', this.visibility); }
}
