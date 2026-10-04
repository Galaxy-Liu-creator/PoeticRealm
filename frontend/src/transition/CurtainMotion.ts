import { gsap } from 'gsap';
import { LEFT_CLOSED, LEFT_END, RIGHT_CLOSED, RIGHT_END } from './CurtainDrape';

/** The supplied SideCurtain v6 timeline, sought by the existing visibility-aware clock. */
export class CurtainMotion {
  private readonly timeline: gsap.core.Timeline;
  constructor(overlay: HTMLElement, target: HTMLElement) {
    const left = overlay.querySelector<HTMLElement>('.curtain-half.left')!;
    const right = overlay.querySelector<HTMLElement>('.curtain-half.right')!;
    const folds = overlay.querySelectorAll('.fabric-folds');
    const ridges = overlay.querySelectorAll('.inner-ridge');
    const sheenLeft = left.querySelector('.fabric-sheen');
    const sheenRight = right.querySelector('.fabric-sheen');
    const sheens = [sheenLeft, sheenRight];
    const seam = overlay.querySelector('.center-seam');
    const glow = overlay.querySelector('.reveal-glow');
    const mist = target.querySelector('.curtain-mist');
    const tl = this.timeline = gsap.timeline({ paused: true });
    tl.set(target, { opacity: .02, scale: 1.024, filter: 'blur(20px) saturate(0.66) brightness(1.14)' }, 0);
    tl.set(mist, { opacity: .86, scale: 1.028 }, 0);
    tl.set(left, { xPercent: 0, scaleX: 1, skewX: 0, rotationY: 0, opacity: 1, clipPath: LEFT_CLOSED }, 0);
    tl.set(right, { xPercent: 0, scaleX: 1, skewX: 0, rotationY: 0, opacity: 1, clipPath: RIGHT_CLOSED }, 0);
    tl.set(folds, { opacity: .28, scaleX: 1 }, 0);
    tl.set(sheens, { opacity: 0, xPercent: 0 }, 0);
    tl.set(ridges, { opacity: .58, scaleX: 1 }, 0);
    tl.set(seam, { opacity: 1, scaleX: 1 }, 0);
    tl.set(glow, { opacity: 0, scaleX: .05 }, 0);

    tl.to(left, { xPercent: -1.15, scaleX: .955, skewX: -.65, rotationY: -1.6, clipPath: LEFT_END, duration: 3.26, ease: 'sine.inOut' }, 0);
    tl.to(right, { xPercent: 1.15, scaleX: .955, skewX: .65, rotationY: 1.6, clipPath: RIGHT_END, duration: 3.26, ease: 'sine.inOut' }, 0);
    tl.to(folds, { opacity: .54, scaleX: 1.27, duration: 2.55, ease: 'sine.inOut' }, 0);
    tl.to(folds, { opacity: .34, scaleX: 1.16, duration: .71, ease: 'sine.inOut' }, 2.55);
    tl.to(ridges, { opacity: .72, scaleX: 1.30, duration: 1.82, ease: 'power1.inOut' }, .02);
    tl.to(ridges, { opacity: .24, scaleX: .96, duration: 1.36, ease: 'sine.inOut' }, 1.82);
    tl.to(sheenLeft, { opacity: .44, xPercent: -15, duration: 1.48, ease: 'power2.out' }, .18);
    tl.to(sheenRight, { opacity: .44, xPercent: 15, duration: 1.48, ease: 'power2.out' }, .18);
    tl.to(sheens, { opacity: .07, duration: 1.42, ease: 'sine.inOut' }, 1.66);
    tl.to(target, { opacity: 1, scale: 1, filter: 'blur(0px) saturate(1) brightness(1)', duration: 3.30, ease: 'sine.inOut' }, 0);
    tl.to(mist, { opacity: .025, scale: 1, duration: 3.18, ease: 'sine.inOut' }, 0);
    tl.to(seam, { opacity: 0, scaleX: .22, duration: .68, ease: 'power2.out' }, .08);
    tl.to(glow, { opacity: .10, scaleX: 1.55, duration: 1, ease: 'sine.out' }, .08);
    tl.to(glow, { opacity: 0, scaleX: 4.2, duration: 1.60, ease: 'sine.inOut' }, 1.08);
    // Flush GSAP's deferred zero-time sets before the first painted/seekable frame.
    tl.totalTime(.000001).totalTime(0);
  }
  render(milliseconds: number): void { this.timeline.totalTime(milliseconds / 1000); }
  dispose(): void { this.timeline.kill(); }
}
