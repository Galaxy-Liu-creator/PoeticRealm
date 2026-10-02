import type { Poem } from '../../content/catalog';
import type { LibraryStore } from '../../stores/LibraryStore';
import { artwork } from '../components/artwork';
export function poemPage(poem: Poem, store: LibraryStore): string {
  const saved = store.data.favorites.includes(poem.id);
  return `<main id="main" class="poem-page poem-${poem.id}" tabindex="-1" style="--scene:url('${artwork.scenes[poem.id]}')">
    <div class="poem-shade"></div><section class="poem-reading"><div class="poem-title"><h1>${poem.title}</h1><span>${poem.dynasty} · ${poem.author}</span></div>
    <div class="poem-columns" aria-label="原诗">${poem.lines.map((line) => `<p>${line}</p>`).join('')}</div></section>
    <div class="poem-toolbar"><button class="solid-button ${saved ? 'saved' : ''}" data-favorite="${poem.id}" aria-pressed="${saved}">${saved ? '已收藏' : '收藏本诗'}</button>
    <button class="outline-button" data-notes aria-expanded="false" aria-controls="poem-notes">笺注 · 译文</button><button class="outline-button" data-fullscreen>全屏观景</button></div>
    <aside id="poem-notes" class="notes-panel" hidden><button data-notes class="notes-close" aria-label="关闭笺注">×</button><h2>笺注 · 译文</h2><h3>笺注</h3><p>${poem.note}</p><h3>译文</h3><p>${poem.translation}</p></aside>
    <div class="scene-caption"><span>${poem.place}</span><span>静态诗境预览 · 实时场景制作中</span></div></main>`;
}
