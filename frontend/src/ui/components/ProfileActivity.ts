import { poems, findPoem } from '../../content/catalog';
import type { LibraryData } from '../../stores/LibraryStore';
import type { AuthUser } from '../../api/auth';
import { artwork } from './artwork';
import { escapeHTML as esc } from './html';
import { profileIcon as icon } from './profileIcons';

const empty = (title: string, copy: string): string => `<div class="realm-empty">${icon('book')}<h3>${title}</h3><p>${copy}</p><a class="editor-button primary" href="#/">去诗词总览</a></div>`;
const date = (value: string): string => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value));
const time = (value: string): string => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
const poemRow = (id: string): string => {
  const poem = findPoem(id);
  return poem ? `<article class="realm-poem-row"><a class="realm-row-cover" href="#/poems/${id}" style="${artwork.covers[id]}" aria-label="进入《${poem.title}》"></a><div><h3><a href="#/poems/${id}">${poem.title}</a></h3><p>${poem.dynasty} · ${poem.author}</p></div><a class="realm-text-link" href="#/poems/${id}" aria-label="进入《${poem.title}》">入境 ${icon('chevron')}</a></article>` : '';
};
const visitRow = (visit: LibraryData['visits'][number], full = false): string => {
  const poem = findPoem(visit.id);
  return poem ? `<li class="realm-visit"><a class="realm-visit-cover" href="#/poems/${visit.id}" style="${artwork.covers[visit.id]}" aria-label="重访《${poem.title}》"></a><div><h3><a href="#/poems/${visit.id}">${poem.title}</a></h3><p>${poem.dynasty} · ${poem.author}</p></div><time datetime="${esc(visit.at)}">${full ? time(visit.at) : date(visit.at)}</time><a class="realm-text-link" href="#/poems/${visit.id}" aria-label="重访《${poem.title}》">重访 ${icon('chevron')}</a></li>` : '';
};

export function profileOverview(data: LibraryData, user: AuthUser): string {
  const { profile, favorites, visits } = data;
  const visited = new Set(visits.map(visit => visit.id)).size;
  return `<div class="realm-welcome"><div class="avatar" style="${profile.avatar ? `background-image:url('${esc(profile.avatar)}');background-size:cover;background-position:center` : artwork.avatar}"></div><div class="realm-welcome-copy"><h2>${esc(profile.name)}</h2><p>${esc(profile.bio || '行于诗境，藏一卷山河。')}</p><span>${esc(user.username)} · 已登录</span></div><button type="button" class="editor-button" data-center-tab="basic">个人资料 ${icon('chevron')}</button></div>
    <dl class="realm-stats"><div><dt>已浏览诗境</dt><dd>${visited}<small> / ${poems.length} 首</small></dd></div><div><dt>我的收藏</dt><dd><button type="button" data-center-tab="favorites">${favorites.length}<small> 首 ${icon('chevron')}</small></button></dd></div><div><dt>阅读足迹</dt><dd><button type="button" data-center-tab="visits">${visits.length}<small> 次 ${icon('chevron')}</small></button></dd></div><div class="realm-progress"><dt>山河行卷</dt><dd><progress value="${visited}" max="${poems.length}" aria-label="已浏览 ${visited} 首，共 ${poems.length} 首"></progress><span>${visited ? '走过的诗境，都在这一卷里' : '从一首喜欢的诗，启程'}</span></dd></div></dl>
    <div class="realm-overview-columns"><div class="realm-overview-section"><div class="realm-section-heading"><h2>我的收藏</h2><button type="button" class="realm-text-link" data-center-tab="favorites">查看全部 ${icon('chevron')}</button></div>${favorites.length ? favorites.slice(0, 3).map(poemRow).join('') : empty('留一首诗在心间', '在诗词总览收藏喜欢的诗，随时回来重读。')}</div>
    <div class="realm-overview-section"><div class="realm-section-heading"><h2>最近浏览</h2><button type="button" class="realm-text-link" data-center-tab="visits">全部足迹 ${icon('chevron')}</button></div>${visits.length ? `<ol class="realm-visits">${visits.slice(0, 3).map(visit => visitRow(visit)).join('')}</ol>` : empty('山水正候你来', data.privacy.saveHistory ? '走进一首诗，让山河记下你的足迹。' : '浏览记录保存已关闭，可在隐私设置中开启。')}</div></div>
    <div class="realm-account-strip"><span>${icon('shield')}资料与收藏按账号保存</span><button type="button" class="realm-text-link" data-center-tab="privacy">管理公开范围 ${icon('chevron')}</button><button type="button" class="realm-text-link" data-center-tab="preferences">调整阅读偏好 ${icon('chevron')}</button></div>`;
}

export function profileFavorites(data: LibraryData): string {
  return `<div class="realm-section-heading realm-library-heading"><div><h2>收藏的诗，心中的山河</h2><p>共 ${data.favorites.length} 首 · 随时展开，重游诗境</p></div><a class="realm-text-link" href="#/">继续寻诗 ${icon('chevron')}</a></div>${data.favorites.length ? `<div class="realm-favorites">${data.favorites.map(id => {
    const poem = findPoem(id);
    return poem ? `<article class="realm-poem-card"><a class="realm-card-cover" href="#/poems/${id}" style="${artwork.covers[id]}" aria-label="进入《${poem.title}》"><span class="realm-cover-verse">${esc(poem.excerpt).replace(/，/g, '，<br>')}</span></a><div class="realm-card-copy"><h3><a href="#/poems/${id}">${poem.title}</a></h3><p>${poem.dynasty} · ${poem.author}</p><div><a class="realm-text-link" href="#/poems/${id}">进入诗境 ${icon('chevron')}</a><button type="button" class="realm-remove-favorite" data-center-favorite="${id}" aria-label="取消收藏《${poem.title}》">${icon('star')}取消收藏</button></div></div></article>` : '';
  }).join('')}</div>` : empty('留一首诗在心间', '收藏喜欢的诗，让每一次重逢都有归处。')}`;
}

export function profileVisits(data: LibraryData): string {
  const groups = new Map<string, LibraryData['visits']>();
  for (const visit of data.visits) {
    const label = date(visit.at);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(visit);
  }
  return `<div class="realm-section-heading realm-library-heading"><div><h2>循诗而行，来路有迹</h2><p>共 ${data.visits.length} 次浏览 · 保留最近 50 次足迹${data.privacy.saveHistory ? '' : ' · 记录保存已关闭'}</p></div><button type="button" class="editor-button" data-center-clear ${data.visits.length ? '' : 'disabled'}>${icon('trash')}清空足迹</button></div>${data.visits.length ? [...groups].map(([label, visits]) => `<div class="realm-history-group"><h3>${label}<small>${visits.length} 次浏览</small></h3><ol class="realm-visits">${visits.map(visit => visitRow(visit, true)).join('')}</ol></div>`).join('') : empty('山水正候你来', data.privacy.saveHistory ? '走进一首诗，便会在这里留下足迹。' : '浏览记录保存已关闭，可在隐私设置中开启。')}`;
}
