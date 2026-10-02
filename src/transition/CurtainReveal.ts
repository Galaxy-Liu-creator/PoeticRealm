import { artwork } from '../ui/components/artwork';
export class CurtainReveal {
  private overlay?: HTMLElement;
  private animations: Animation[] = [];
  private container?: HTMLElement;
  private resolveCancellation?: () => void;
  async play(container: HTMLElement, reduced: boolean, ready: Promise<boolean>, sourceCopy = ''): Promise<'complete' | 'failed' | 'cancelled'> {
    if (reduced) return await ready ? 'complete' : 'failed';
    const overlay = document.createElement('div');
    overlay.className = 'curtain-transition';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `<div class="curtain-half left" style="${artwork.curtainLeft}"></div><div class="curtain-half right" style="${artwork.curtainRight}"></div><div class="curtain-copy">${sourceCopy}</div>`;
    overlay.querySelectorAll('a').forEach((link) => { link.tabIndex = -1; });
    document.body.append(overlay);
    this.overlay = overlay;
    container.inert = true;
    this.container = container;
    try {
      const loaded = await Promise.race([ready, new Promise<void>((resolve) => { this.resolveCancellation = resolve; })]);
      if (this.overlay !== overlay) return 'cancelled';
      if (loaded === false) return 'failed';
      this.animations = Array.from(overlay.querySelectorAll('.curtain-half')).map((panel, index) => panel.animate(
        [{ transform: 'translateX(0)' }, { transform: `translateX(${index ? '' : '-'}102%)` }],
        { duration: 1200, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' },
      ));
      const copy = overlay.querySelector<HTMLElement>('.curtain-copy')!;
      this.animations.push(copy.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }));
      if (document.hidden) this.setHidden(true);
      await Promise.all(this.animations.map((animation) => animation.finished));
      return 'complete';
    }
    catch { return 'cancelled'; }
    finally { this.cancel(); container.inert = false; }
  }
  cancel(): void {
    this.resolveCancellation?.();
    this.resolveCancellation = undefined;
    if (this.container) this.container.inert = false;
    this.container = undefined;
    this.animations.forEach((animation) => animation.cancel());
    this.animations = [];
    this.overlay?.remove();
    this.overlay = undefined;
  }
  setHidden(hidden: boolean): void {
    this.animations.forEach((animation) => {
      if (animation.playState === 'finished') return;
      if (hidden) animation.pause(); else animation.play();
    });
  }
}
