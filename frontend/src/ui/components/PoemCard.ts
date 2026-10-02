import type { Poem } from '../../content/catalog';
import { artwork } from './artwork';
export function poemCard(poem: Poem, saved: boolean, favoritePage = false): string {
  return `<article class="poem-card" data-poem="${poem.id}">
    <a class="card-cover" style="${artwork.covers[poem.id]}" href="#/poems/${poem.id}" aria-label="进入《${poem.title}》"></a>
    <button class="bookmark ${saved ? 'saved' : ''}" data-favorite="${poem.id}" aria-pressed="${saved}" aria-label="${saved ? '取消收藏' : '收藏'}《${poem.title}》"><span>${saved ? '已收藏' : '收藏'}</span><i aria-hidden="true"></i></button>
    <div class="card-content"><div class="card-heading"><h3>${poem.title}</h3><span>${poem.dynasty} · ${poem.author}</span></div>
    <p class="excerpt">${poem.excerpt}</p><div class="card-actions">
    ${favoritePage ? `<button class="cancel-favorite" data-favorite="${poem.id}" aria-label="取消收藏《${poem.title}》">▱ 取消收藏</button>` : '<span class="card-ornament" aria-hidden="true">﹏</span>'}
    <a class="enter-button" href="#/poems/${poem.id}">入境 <span aria-hidden="true">→</span></a></div></div></article>`;
}
