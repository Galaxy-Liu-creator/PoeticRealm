import { poems } from '../../content/catalog';
import { orderedPoems } from '../../content/orderedPoems';
import type { LibraryStore } from '../../stores/LibraryStore';
import { artwork } from '../components/artwork';
import { poemCard } from '../components/PoemCard';
import { footer } from '../components/Navigation';
import { paginate, pagination } from '../components/Pagination';
export function homePage(store: LibraryStore, page = 1, pageSize = 12): string {
  const collection = paginate(orderedPoems(poems, store.data, true), page, pageSize);
  return `<div class="landscape-page home-page catalog-page"><div class="landscape-background" style="${artwork.homePaper}" aria-hidden="true"></div>
    <section class="home-hero"><div class="hero-art" style="${artwork.hero}" aria-hidden="true"></div><div class="hero-copy">
    <h1>诗境·一卷山河 <span class="seal" aria-hidden="true">诗境</span></h1><p>循诗入境，展卷见山河</p></div></section>
    <main id="main" class="overview page-width" tabindex="-1"><h2 class="section-title">诗词总览 <span aria-hidden="true">﹏</span></h2>
    <div class="poem-grid">${collection.items.map((poem) => poemCard(poem, store.data.favorites.includes(poem.id))).join('')}</div>${pagination(collection)}</main>${footer()}</div>`;
}
