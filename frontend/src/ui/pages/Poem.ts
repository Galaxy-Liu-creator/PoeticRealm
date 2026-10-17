import type { Poem } from '../../content/catalog';
import type { LibraryStore } from '../../stores/LibraryStore';
import { artwork } from '../components/artwork';
import {paperNotice,paperOrnaments} from '../components/PaperPopup';
export function poemPage(poem: Poem, store: LibraryStore): string {
  const saved = store.data.favorites.includes(poem.id);
  const live=poem.id==='fengqiao';
  const views=['CAM_moonset','CAM_riverbank','CAM_temple','CAM_boat'];
  return `<main id="main" class="poem-page poem-${poem.id}" tabindex="-1" style="--scene:url('${artwork.scenes[poem.id]}')">
    ${live?`<div class="poem-scene"><canvas data-scene-canvas aria-label="枫桥夜泊三维场景"></canvas></div><div class="poem-scene-status paper-popup" role="status">${paperNotice('正在展开诗境…','',true)}</div>`:''}
    <div class="poem-shade"></div><section class="poem-reading"><div class="poem-title"><h1>${poem.title}</h1><span>${poem.dynasty} · ${poem.author}</span></div>
    <div class="poem-columns" aria-label="原诗">${poem.lines.map((line,index) => `<p${poem.lines.length<=4?` data-reveal-line="${index}" style="opacity:0"`:''}>${live?`<button class="poem-line-button" data-scene-view="${views[index]}" aria-label="${line}，切换对应景观" tabindex="-1">${line}</button>`:line}</p>`).join('')}</div></section>
    <div class="poem-toolbar"><button class="solid-button ${saved ? 'saved' : ''}" data-favorite="${poem.id}" aria-pressed="${saved}">${saved ? '已收藏' : '收藏本诗'}</button>
    <button class="outline-button" data-notes aria-expanded="false" aria-controls="poem-notes">笺注 · 译文</button><button class="outline-button" data-fullscreen>全屏观景</button></div>
    ${live?'<div class="scene-controls" aria-label="观景操作"><button class="outline-button" data-scene-pause>暂停</button><button class="outline-button" data-scene-sound>开启声音</button><button class="outline-button" data-scene-replay aria-label="重新观看诗境">重看</button><button class="outline-button" data-scene-view="CAM_enter">全景</button><button class="outline-button" data-scene-view="CAM_rower">木舟</button><button class="outline-button" data-scene-retry hidden>重试加载</button></div>':''}
    <aside id="poem-notes" class="notes-panel" hidden>${paperOrnaments()}<button data-notes class="notes-close" aria-label="关闭笺注">×</button><h2>笺注 · 译文</h2><h3>笺注</h3><p${poem.note.length > 120 ? ' class="culture-long"' : ''}>${poem.note}</p><h3>译文</h3><p${poem.translation.length > 120 ? ' class="culture-long"' : ''}>${poem.translation}</p></aside>
    <div class="scene-caption"><span>${poem.place}</span><span>${live?'月落江雾 · 钟声到客船':'静态诗境预览 · 实时场景制作中'}</span></div></main>`;
}
