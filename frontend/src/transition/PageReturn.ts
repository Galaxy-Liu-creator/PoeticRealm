import { MotionLoop } from '../systems/motion/MotionLoop';
import { pageCurl } from './pageCurl';
import {paperNotice} from '../ui/components/PaperPopup';

export const pageReturnDuration = .7;
const columnCount = 48;
const overlap = 1.5;

/** Real DOM panels follow a curved 3D sheet; text keeps its fonts and source layout. */
export class PageReturn {
  private state?: {
    overlay: HTMLElement; stage: HTMLElement; target: HTMLElement; shadow: HTMLElement;
    strips: HTMLElement[]; source: HTMLElement; inert: boolean; focus?: HTMLElement;
    panel: HTMLElement; abort: AbortController; stop: () => void; frame: number;
    width: number; height: number; scroll: number; start: number; phase: 'loading' | 'playing' | 'failed';
    resolve: (complete: boolean) => void;
    snapshot?: string;
  };
  private reduced = false;
  private escape = (event: KeyboardEvent): void => { if (event.key === 'Escape') { event.preventDefault(); this.cancel(); } };
  private resize = (): void => { if (this.state?.phase === 'playing') this.finish(true); };
  constructor(private loop: MotionLoop) {}
  get active(): boolean { return !!this.state; }
  setReduced(reduced: boolean): void { this.reduced = reduced; if (reduced && this.state?.phase === 'playing') this.finish(true); }
  play(source: HTMLElement, markup: string, scroll: number, reduced: boolean, snapshot?: string): Promise<boolean> {
    if (this.active) return Promise.resolve(false);
    this.reduced = reduced;
    const sourceScroll = scrollY;
    const overlay = document.createElement('div'); overlay.className = 'page-return'; overlay.dataset.state = 'loading';
    overlay.innerHTML = `<div class="page-return-target" inert aria-hidden="true"></div><div class="page-return-shadow" aria-hidden="true"></div><div class="page-return-stage" aria-hidden="true" inert></div><div class="realm-loading paper-popup" role="status">${paperNotice('正在准备总览…','<button type="button" data-retry hidden>重试</button><button type="button" data-cancel>取消翻页</button>',true)}</div>`;
    const target = overlay.querySelector<HTMLElement>('.page-return-target')!;
    target.innerHTML = `<div class="page-return-overview">${markup}</div>`;
    target.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
    document.body.append(overlay);
    target.scrollTop = scroll;
    const promise = new Promise<boolean>(resolve => {
      const state: NonNullable<PageReturn['state']> = this.state = {
        overlay, target, stage: overlay.querySelector<HTMLElement>('.page-return-stage')!,
        shadow: overlay.querySelector<HTMLElement>('.page-return-shadow')!, strips: [], source,
        inert: source.inert, focus: document.activeElement instanceof HTMLElement ? document.activeElement : undefined,
        panel: overlay.querySelector<HTMLElement>('.realm-loading')!, abort: new AbortController(),
        stop: () => {}, frame: 0, width: innerWidth, height: innerHeight, scroll: sourceScroll, start: 0,
        phase: 'loading', resolve, snapshot,
      };
      source.inert = true;
      overlay.querySelector('[data-cancel]')!.addEventListener('click', () => this.cancel());
      overlay.querySelector('[data-retry]')!.addEventListener('click', () => void this.prepare());
      document.addEventListener('keydown', this.escape);
      window.addEventListener('resize', this.resize);
      state.stop = this.loop.subscribe(() => state.phase === 'playing', t => this.sample((t - state.start) / pageReturnDuration));
    });
    void this.prepare(); return promise;
  }
  private async prepare(): Promise<void> {
    const state = this.state; if (!state) return;
    state.phase = 'loading'; state.overlay.dataset.state = 'loading';
    state.panel.querySelector('span')!.textContent = '正在准备总览…';
    state.panel.querySelector<HTMLElement>('[data-retry]')!.hidden = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancelled = new Promise<never>((_, reject) => state.abort.signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true }));
    try {
      const urls = new Set<string>();
      if(state.snapshot)urls.add(state.snapshot);
      state.target.querySelectorAll('[style]').forEach(e => {
        for (const match of e.getAttribute('style')!.matchAll(/url\('([^']+)'\)/g)) urls.add(match[1]!);
      });
      await Promise.race([
        Promise.all([document.fonts.ready, ...Array.from(urls, async url => { const image = new Image(); image.src = url; await image.decode(); })]),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 10000); }),
        cancelled,
      ]);
      if (this.state !== state) return;
      if (this.reduced) { this.finish(true); return; }
      const width = state.width / columnCount;
      state.stage.style.perspective = `${state.width * 1.5}px`;
      state.shadow.style.width = `${state.width * .16}px`;
      state.stage.replaceChildren(); state.strips = [];
      for (let i = 0; i < columnCount; i++) {
        const strip = document.createElement('div'); strip.className = 'page-return-strip';
        strip.style.width = `${width + overlap}px`; strip.style.height = `${state.height}px`;
        strip.style.transform = `translate3d(${i * width}px,0,0)`;
        const front = document.createElement('div'); front.className = 'page-return-front';
        const copy = state.source.cloneNode(true) as HTMLElement;
        copy.removeAttribute('id'); copy.classList.add('page-return-source'); copy.inert = true;
        copy.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
        copy.querySelectorAll('canvas').forEach(e => {
          if(state.snapshot && e.matches('[data-scene-canvas]')) {
            const image=document.createElement('img');image.src=state.snapshot;image.className=e.className;image.style.cssText=e.style.cssText;image.setAttribute('aria-hidden','true');image.dataset.sceneSnapshot='true';e.replaceWith(image);
          } else e.remove();
        });
        copy.querySelectorAll('.toast, .storage-warning, .skip-link').forEach(e => e.remove());
        copy.style.width = `${state.width}px`; copy.style.left = `${-i * width}px`; copy.style.top = `${-state.scroll}px`;
        front.append(copy);
        const back = document.createElement('div'); back.className = 'page-return-back';
        back.style.backgroundSize = `${state.width}px ${state.height}px, ${state.width}px ${state.height}px`;
        const backOffset = -(columnCount - 1 - i) * width;
        back.style.backgroundPosition = `${backOffset}px 0, ${backOffset}px 0`;
        const backLight = document.createElement('div'); backLight.className = 'page-return-back-light'; back.append(backLight);
        const shade = document.createElement('div'); shade.className = 'page-return-light';
        strip.append(front, back, shade); state.stage.append(strip); state.strips.push(strip);
      }
      // Paint the source panels before starting the clock; warm-up must not consume animation frames.
      await Promise.race([new Promise<void>(resolve => { state.frame = requestAnimationFrame(() => {
        state.frame = requestAnimationFrame(() => resolve());
      }); }), cancelled]);
      if (this.state !== state) return;
      state.phase = 'playing'; state.overlay.dataset.state = 'playing'; state.panel.hidden = true;
      state.start = this.loop.clock.time; this.sample(0); this.loop.refresh();
    } catch {
      if (this.state !== state) return;
      state.phase = 'failed'; state.overlay.dataset.state = 'failed';
      state.panel.querySelector('span')!.textContent = '总览画面加载失败，诗境已保留。';
      const retry = state.panel.querySelector<HTMLButtonElement>('[data-retry]')!; retry.hidden = false; retry.focus();
    } finally { clearTimeout(timer); }
  }
  seek(progress: number): void {
    const state = this.state; if (state?.phase !== 'playing') return;
    const p = Math.max(0, Math.min(1, progress));
    state.start = this.loop.clock.time - p * pageReturnDuration; this.sample(p);
  }
  private sample(progress: number): void {
    const state = this.state; if (state?.phase !== 'playing') return;
    const p = Math.max(0, Math.min(1, progress)), width = state.width / columnCount;
    let leadingEdge = Infinity;
    state.overlay.dataset.progress = p.toFixed(4);
    for (let i = 0; i < state.strips.length; i++) {
      const strip = state.strips[i]!, half = (width + overlap) / 2;
      const point = pageCurl(i * width + half, state.width, p);
      strip.style.transform = `translate3d(${point.x - half}px,0,${point.z}px) rotateY(${point.angle}rad)`;
      const shade = String(Math.sin(point.angle) * .32);
      (strip.lastElementChild as HTMLElement).style.opacity = shade;
      (strip.children[1]!.firstElementChild as HTMLElement).style.opacity = shade;
      if (point.angle > 0) {
        const perspective = state.width * 1.5;
        leadingEdge = Math.min(leadingEdge, state.width / 2 + (point.x - state.width / 2) * perspective / (perspective - point.z));
      }
      strip.style.visibility = point.x > state.width * 1.6 ? 'hidden' : 'visible';
    }
    state.shadow.style.transform = `translate3d(${(Number.isFinite(leadingEdge) ? leadingEdge : 0) - state.width * .08}px,0,0)`;
    state.shadow.style.opacity = String(Math.sin(p * Math.PI) * .7);
    if (p === 1) this.finish(true);
  }
  cancel(): void { this.finish(false); }
  private finish(complete: boolean): void {
    const state = this.state; if (!state) return;
    this.state = undefined; state.abort.abort(); cancelAnimationFrame(state.frame); state.stop();
    state.overlay.remove(); state.source.inert = state.inert;
    document.removeEventListener('keydown', this.escape); window.removeEventListener('resize', this.resize);
    if (!complete && state.focus?.isConnected) state.focus.focus({ preventScroll: true });
    state.resolve(complete);
  }
}
