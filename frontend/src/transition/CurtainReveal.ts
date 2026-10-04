import { curtainPanels } from './CurtainDrape';
import type { CurtainMotion } from './CurtainMotion';
export const CURTAIN_DURATION = 3300;
export class CurtainReveal {
  private overlay?: HTMLElement;
  private animations: Animation[] = [];
  private container?: HTMLElement;
  private target?: HTMLElement;
  private resolveCancellation?: () => void;
  private motion?: CurtainMotion;
  private clock?: Animation;
  private frame?: number;
  private preparationFrame?: number;
  private resolvePreparation?: () => void;
  private hidden = false;
  async play(container: HTMLElement, reduced: boolean, ready: Promise<boolean>, sourceCopy = ''): Promise<'complete' | 'failed' | 'cancelled'> {
    if (reduced) return await ready ? 'complete' : 'failed';
    const overlay = document.createElement('div');
    overlay.className = 'curtain-transition';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `${curtainPanels()}<div class="curtain-copy">${sourceCopy}</div>`;
    overlay.querySelectorAll('a').forEach((link) => { link.tabIndex = -1; });
    document.body.append(overlay);
    this.overlay = overlay;
    container.inert = true;
    this.container = container;
    container.classList.add('curtain-host');
    this.target = container.querySelector<HTMLElement>('.account-page') ?? container;
    this.target.classList.add('curtain-revealing');
    try {
      const preparation = this.prepareMotion(overlay);
      const loaded = await Promise.race([
        Promise.all([ready, preparation]).then(([loaded]) => loaded),
        new Promise<void>((resolve) => { this.resolveCancellation = resolve; }),
      ]);
      if (this.overlay !== overlay) return 'cancelled';
      if (loaded === false) return 'failed';
      const duration = this.motion ? CURTAIN_DURATION : 240;
      overlay.dataset.duration = String(duration);
      if (this.motion) {
        overlay.classList.add('has-motion');
        const marker = document.createElement('span');
        marker.className = 'curtain-motion-clock';
        overlay.append(marker);
        this.clock = marker.animate([{ opacity: 1 }, { opacity: 1 }], { duration, fill: 'forwards' });
        this.clock.id = 'curtain-pull';
        this.animations = [this.clock];
        this.draw();
      } else {
        // A failed optional motion-module load must still allow account access.
        this.animations = [overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration, fill: 'forwards' }),
          this.target.animate([{ opacity: 0 }, { opacity: 1 }], { duration, fill: 'forwards' })];
      }
      const copy = overlay.querySelector<HTMLElement>('.curtain-copy')!;
      this.animations.push(copy.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }));
      if (document.hidden || this.hidden) this.setHidden(true);
      await Promise.all(this.animations.map((animation) => animation.finished));
      if (this.overlay !== overlay) return 'cancelled';
      if (this.motion && this.target) {
        this.motion.render(CURTAIN_DURATION);
        // Keep these exact panels: no new corner layer or texture swap at the endpoint.
        const panels = overlay.querySelector<HTMLElement>('.curtain-system')!;
        this.target.querySelector('.auth-curtain-corners')?.remove();
        panels.classList.add('auth-curtain-corners', 'curtain-open');
        this.target.append(panels);
      }
      return 'complete';
    }
    catch { return 'cancelled'; }
    finally { if (this.overlay === overlay) this.cancel(); }
  }
  private async prepareMotion(overlay: HTMLElement): Promise<void> {
    try {
      const module = await import('./CurtainMotion');
      if (this.overlay !== overlay) return;
      this.motion = new module.CurtainMotion(overlay, this.target!);
      // Paint the closed mask before advancing the clock, inside the cancellation race.
      await new Promise<void>((resolve) => {
        this.resolvePreparation = resolve;
        this.preparationFrame = requestAnimationFrame(() => {
          this.preparationFrame = requestAnimationFrame(() => {
            this.preparationFrame = undefined;
            this.resolvePreparation = undefined;
            resolve();
          });
        });
      });
    } catch {
      if (this.overlay !== overlay) return;
      this.motion?.dispose();
      this.motion = undefined;
    }
  }
  private draw = (): void => {
    if (!this.motion || !this.clock || this.hidden) return;
    this.motion.render(Math.min(CURTAIN_DURATION, Number(this.clock.currentTime ?? 0)));
    this.frame = requestAnimationFrame(this.draw);
  };
  cancel(): void {
    this.resolveCancellation?.();
    this.resolveCancellation = undefined;
    if (this.preparationFrame !== undefined) cancelAnimationFrame(this.preparationFrame);
    this.preparationFrame = undefined;
    this.resolvePreparation?.();
    this.resolvePreparation = undefined;
    if (this.container) {
      this.container.inert = false;
      this.container.classList.remove('curtain-host');
    }
    this.container = undefined;
    this.target?.classList.remove('curtain-revealing');
    for (const property of ['opacity', 'filter', 'transform', 'translate', 'scale', 'rotate']) this.target?.style.removeProperty(property);
    const mist = this.target?.querySelector<HTMLElement>('.curtain-mist');
    for (const property of ['opacity', 'transform']) mist?.style.removeProperty(property);
    this.target = undefined;
    this.animations.forEach((animation) => animation.cancel());
    this.animations = [];
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.clock = undefined;
    this.motion?.dispose();
    this.motion = undefined;
    this.overlay?.remove();
    this.overlay = undefined;
  }
  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.animations.forEach((animation) => {
      if (animation.playState === 'finished') return;
      if (hidden) animation.pause(); else animation.play();
    });
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    if (!hidden) this.draw();
  }
}
