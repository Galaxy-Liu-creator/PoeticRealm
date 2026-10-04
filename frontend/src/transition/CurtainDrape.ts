import { artwork } from '../ui/components/artwork';

// Kept for the earlier cloth prototype; the v6 reveal uses the reference DOM masks.
export const CURTAIN_FABRIC_HEIGHT = 0.92;
export const CURTAIN_CORNER_TEXTURE_WIDTH = 0.42;
export const CURTAIN_CORNER_WIDTH = 0.15;
export const CURTAIN_CORNER_HEIGHT = 0.32;
export const CURTAIN_COMPACT_WIDTH = 0.12;
export const CURTAIN_COMPACT_HEIGHT = 0.15;

export const LEFT_CLOSED = 'polygon(0% 0%, 100% 0%, 100% 8%, 100% 16%, 100% 25%, 100% 35%, 100% 46%, 100% 58%, 100% 70%, 100% 82%, 100% 92%, 100% 100%, 0% 100%)';
export const LEFT_END = 'polygon(0% 0%, 14% 0%, 12.5% 8%, 10.5% 16%, 8.5% 25%, 6.3% 35%, 4.3% 46%, 2.7% 58%, 1.4% 70%, 0.6% 82%, 0% 92%, 0% 100%, 0% 100%)';
export const RIGHT_CLOSED = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 92%, 0% 82%, 0% 70%, 0% 58%, 0% 46%, 0% 35%, 0% 25%, 0% 16%, 0% 8%)';
export const RIGHT_END = 'polygon(86% 0%, 100% 0%, 100% 100%, 100% 100%, 100% 92%, 99.4% 82%, 98.6% 70%, 97.3% 58%, 95.7% 46%, 93.7% 35%, 91.5% 25%, 89.5% 16%, 87.5% 8%)';

// One set of panels for the entry, moving curtain, and directly visited auth pages.
export function curtainPanels(open = false): string {
  return `<div class="curtain-system${open ? ' auth-curtain-corners curtain-open' : ''}" aria-hidden="true">${['left', 'right'].map(side => {
    const left = side === 'left';
    const final = open ? `clip-path:${left ? LEFT_END : RIGHT_END};transform:translateX(${left ? '-' : ''}1.15%) rotateY(${left ? '-' : ''}1.6deg) skewX(${left ? '-' : ''}.65deg) scaleX(.955);` : `clip-path:${left ? LEFT_CLOSED : RIGHT_CLOSED};`;
    return `<div class="curtain-half ${side}" style="${left ? artwork.curtainLeft : artwork.curtainRight};${final}"><div class="fabric-folds"></div><div class="fabric-depth"></div><div class="fabric-sheen"></div><div class="inner-ridge"></div></div>`;
  }).join('')}</div>${open ? '' : '<div class="center-seam" aria-hidden="true"></div><div class="reveal-glow" aria-hidden="true"></div>'}`;
}

export function curtainCorners(): string {
  return `<div class="curtain-mist" aria-hidden="true"></div><div class="curtain-vignette" aria-hidden="true"></div>${curtainPanels(true)}`;
}
