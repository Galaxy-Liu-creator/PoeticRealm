import {poemBackgrounds} from '../../content/poemBackgrounds';
import {escapeHTML} from './html';

const paths = [
  '<rect x="8" y="5" width="18" height="24" rx="1"/><path d="M8 8H5v20h18M12 11h10M12 16h10M12 21h7"/>',
  '<path d="m6 26 7-18 6 13 5-10 6 15ZM10 18l3-3 3 3M20 22l4-4 3 4"/>',
  '<path d="M5 23c6 7 16 7 22 0M16 25V7M16 21C6 22 5 15 6 11c6 0 10 4 10 10ZM16 21c10 1 11-6 10-10-6 0-10 4-10 10ZM12 10l4-5 4 5"/>',
];
const icon = (path: string): string => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
const roller = (position: string): string => `<span class="poem-scroll-roller poem-scroll-roller-${position}" aria-hidden="true"><i></i><i></i></span>`;

export function poemBackground(id: string): string {
  const background=poemBackgrounds[id];
  if(!background)return '';
  return `<aside class="poem-scroll" data-poem-scroll hidden aria-labelledby="poem-background-title" style="--scroll-progress:0">
    <div class="poem-scroll-paper">
      <h2 id="poem-background-title"><button type="button" data-scroll-toggle aria-expanded="false" aria-controls="poem-background-body">
        ${icon(paths[1]!)}<span>诗作背景</span><span class="poem-scroll-read-hint">可滚动</span><span class="poem-scroll-action">展卷</span>${icon('<path d="m19 10-6 6 6 6"/>')}
      </button></h2>
      <div id="poem-background-body" class="poem-scroll-body" inert aria-hidden="true">
        ${['创作背景','诗意解读','情感意境'].map((title,index)=>`<section class="poem-scroll-section"><span class="poem-scroll-icon">${icon(paths[index]!)}</span><div><h3>${title}</h3><p>${escapeHTML(background.sections[index]!)}</p></div></section>`).join('')}
        <div class="poem-scroll-colophon"><span class="poem-scroll-seal" aria-hidden="true">诗境</span><a href="${background.source}" target="_blank" rel="noopener noreferrer">赏读参考<span class="sr-only">（新窗口打开古诗文网）</span>${icon('<path d="M10 22 23 9M12 9h11v11"/>')}</a></div>
      </div>
    </div><button type="button" class="poem-scroll-open" data-scroll-toggle aria-expanded="false" aria-controls="poem-background-body" aria-label="展开诗作背景，回到全景" hidden><span>诗作背景</span>${icon('<path d="m13 10 6 6-6 6"/>')}<small>展卷</small></button>${roller('left')}${roller('right')}
  </aside>`;
}
