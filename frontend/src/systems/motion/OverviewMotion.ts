import { MotionLoop } from './MotionLoop';
import { EffectPlane } from './EffectPlane';

export class OverviewMotion {
  private hero?: HTMLElement;
  private grid?: HTMLElement;
  private plane?: EffectPlane;
  private observer: IntersectionObserver;
  private stop: () => void;
  private heroVisible = false;
  private gridVisible = false;
  private enabled = true;
  private suspended = false;
  private suspendedAt = 0;
  private holding = false;
  private heldAt = 0;
  private offset = 0;
  constructor(root: HTMLElement, private loop: MotionLoop) {
    this.hero = root.querySelector<HTMLElement>('.home-hero') ?? undefined;
    this.grid = root.querySelector<HTMLElement>('.poem-grid') ?? undefined;
    if (this.hero) {
      const canvas = document.createElement('canvas'); canvas.className='hero-motion'; canvas.setAttribute('aria-hidden','true');
      this.hero.querySelector('.hero-art')!.append(canvas);
      try { this.plane = new EffectPlane(canvas,0); this.plane.render(loop.clock.time); }
      catch { canvas.remove(); this.hero.dataset.motion='unavailable'; }
    }
    this.grid?.addEventListener('pointerenter',this.hold);
    this.grid?.addEventListener('pointerleave',this.resume);
    this.grid?.addEventListener('focusin',this.hold);
    this.grid?.addEventListener('focusout',this.resume);
    this.observer = new IntersectionObserver(entries => {
      for(const e of entries) {
        if(e.target===this.hero) this.heroVisible=e.isIntersecting;
        if(e.target===this.grid) this.gridVisible=e.isIntersecting;
      }
      this.mark(); loop.refresh();
    });
    if(this.hero) this.observer.observe(this.hero);
    if(this.grid) this.observer.observe(this.grid);
    this.stop=loop.subscribe(()=>this.enabled && !this.suspended && (this.heroVisible && !!this.plane || this.gridVisible && !this.holding),this.update);
  }
  private hold = (): void => { if(!this.holding) {this.heldAt=this.loop.clock.time;this.holding=true;} this.loop.refresh(); };
  private resume = (): void => {
    queueMicrotask(()=>{
      if(this.grid?.matches(':hover, :focus-within')) return;
      if(this.holding) this.offset+=this.loop.clock.time-this.heldAt;
      this.holding=false; this.loop.refresh();
    });
  };
  setEnabled(value: boolean): void { this.enabled=value; this.update(this.loop.clock.time);this.mark();this.loop.refresh(); }
  setSuspended(value: boolean): void {
    if(value===this.suspended) return;
    if(value) this.suspendedAt=this.loop.clock.time;
    else if(!this.holding) this.offset+=this.loop.clock.time-this.suspendedAt;
    this.suspended=value;this.mark();this.loop.refresh();
  }
  private mark(): void {
    if(this.hero && this.plane) this.hero.dataset.motion=this.enabled && !this.suspended && this.heroVisible && !document.hidden ? 'active' : 'paused';
    if(this.grid) this.grid.dataset.motion=this.enabled && !this.suspended && this.gridVisible && !this.holding && !document.hidden?'active':'paused';
  }
  private update = (t: number): void => {
    if(this.suspended) return;
    if(this.heroVisible || !this.enabled) this.plane?.render(this.enabled?t:0);
    if(this.grid && (this.gridVisible || !this.enabled)) {
      const phase=(this.holding?this.heldAt:t)-this.offset;
      this.grid.style.transform=this.enabled?`translateY(${-1.5*(1-Math.cos(phase*Math.PI/4))}px)`:'none';
    }
    this.mark();
  };
  dispose(): void {
    this.stop();this.observer.disconnect();this.plane?.dispose();
    this.grid?.removeEventListener('pointerenter',this.hold);this.grid?.removeEventListener('pointerleave',this.resume);
    this.grid?.removeEventListener('focusin',this.hold);this.grid?.removeEventListener('focusout',this.resume);
  }
}
