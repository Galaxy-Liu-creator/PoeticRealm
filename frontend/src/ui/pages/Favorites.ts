import { poems } from '../../content/catalog';
import { orderedPoems } from '../../content/orderedPoems';
import type { LibraryStore } from '../../stores/LibraryStore';
import { artwork } from '../components/artwork';
import { poemCard } from '../components/PoemCard';
import { footer } from '../components/Navigation';
import { paginate, pagination } from '../components/Pagination';
export function favoritesPage(store: LibraryStore, page = 1, pageSize = 12): string {
  const selected = orderedPoems(poems.filter((poem) => store.data.favorites.includes(poem.id)), store.data);
  const collection = paginate(selected, page, pageSize);
  return `<div class="landscape-page catalog-page"><div class="landscape-background" style="${artwork.homePaper}" aria-hidden="true"></div>
    <main id="main" class="favorites-page page-width" tabindex="-1"><div class="page-heading"><h1>我的收藏</h1><span class="heading-ornament" aria-hidden="true">﹏</span><p>一卷中烟霞，朝夕可对</p></div>
    <p class="collection-count">已收藏 ${selected.length} 首诗</p>
    ${selected.length ? `<div class="poem-grid favorites-grid">${collection.items.map((poem) => poemCard(poem, true, true)).join('')}</div>${pagination(collection)}` :
      '<section class="empty-state"><h2>一卷诗集，待你收藏</h2><p>遇见喜欢的诗，轻点书签，留在这里。</p><a class="enter-button" href="#/">去总览选一首诗 →</a></section>'}</main>${footer()}</div>`;
}
