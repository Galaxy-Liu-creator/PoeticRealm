import { poems, findPoem } from '../../content/catalog';
import type { LibraryStore } from '../../stores/LibraryStore';
import { artwork } from '../components/artwork';
import { escapeHTML as esc } from '../components/html';
import { footer } from '../components/Navigation';
import type { AuthUser } from '../../api/auth';
export function profilePage(store: LibraryStore, user: AuthUser | null = null): string {
  const { profile, favorites, visits, preferences } = store.data;
  const visited = new Set(visits.map((visit) => visit.id)).size;
  const mini = (id: string): string => {
    const poem = findPoem(id)!;
    return `<article class="mini-poem"><a href="#/poems/${id}" class="mini-cover" style="${artwork.covers[id]}" aria-label="查看《${poem.title}》"></a><div><h3>${poem.title}</h3><p>${poem.excerpt}</p><small>唐 · ${poem.author}</small><a class="small-button" href="#/poems/${id}">查看 ›</a></div></article>`;
  };
  return `<div class="landscape-page profile-page"><div class="landscape-background" style="${artwork.homePaper}" aria-hidden="true"></div>
    <section class="profile-hero"><div class="hero-art" style="${artwork.profileHero}" aria-hidden="true"></div><h1>个人中心</h1><p>于山水诗境中，收藏你的足迹</p></section>
    <main id="main" class="profile-layout page-width" tabindex="-1"><div class="profile-left">
    <section class="paper-panel profile-summary"><div class="avatar" ${profile.avatar ? '' : `style="${artwork.avatar}"`}>${profile.avatar ? `<img src="${esc(profile.avatar)}" alt="我的头像">` : ''}</div><h2>${esc(profile.name)}</h2><p class="profile-role">诗境旅人</p><p>${esc(profile.bio)}</p>
    <div class="profile-stats"><div><span>已浏览</span><strong>${visited}<small>首</small></strong></div><div><span>收藏</span><strong>${favorites.length}<small>首</small></strong></div><div><span>足迹</span><strong>${visits.length}<small>次</small></strong></div></div><button class="small-button" data-edit-profile>编辑资料</button></section>
    <section class="paper-panel account-info"><h2 class="panel-title">账号信息</h2><dl><div><dt>昵称</dt><dd>${esc(profile.name)}</dd></div><div><dt>性别</dt><dd>${esc(profile.gender || '未设置')}</dd></div><div><dt>账号</dt><dd>${user ? esc(user.username) + ' · 已登录' : '访客 · 本机资料'}</dd></div></dl>${user ? '<button type="button" class="small-button" data-logout>退出登录</button>' : '<a class="small-button" href="#/account">登录 / 注册 →</a>'}<p class="local-note">${user ? '本机资料按账号保存；云同步尚未开放' : '资料与收藏保存在当前浏览器'}</p></section></div>
    <div class="profile-right"><section class="paper-panel"><div class="panel-heading"><h2 class="panel-title">我的收藏</h2><a href="#/favorites">查看全部 ›</a></div><div class="mini-grid">${favorites.length ? favorites.map(mini).join('') : '<p class="panel-empty">尚未收藏诗词。<a href="#/">去总览看看 →</a></p>'}</div></section>
    <section class="paper-panel"><div class="panel-heading"><h2 class="panel-title">最近浏览</h2><span>本机足迹</span></div><ol class="recent-list">${visits.length ? visits.slice(0, 3).map((visit) => {
      const poem = findPoem(visit.id)!;
      return `<li><a href="#/poems/${visit.id}" class="recent-cover" style="${artwork.covers[visit.id]}" aria-label="查看《${poem.title}》"></a><div><a href="#/poems/${visit.id}">${poem.title}</a><p>唐 · ${poem.author}　|　${poem.excerpt}</p></div><time datetime="${visit.at}">${new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(visit.at))}</time></li>`;
    }).join('') : '<li class="panel-empty">还没有浏览记录。选一首诗，留下第一枚足迹。</li>'}</ol></section>
    <div class="profile-bottom"><section class="paper-panel"><h2 class="panel-title">成就与偏好</h2><div class="achievement"><div class="landscape-medallion" style="${artwork.profileHero}" aria-hidden="true"></div><div><p>已浏览诗境</p><strong>${visited} <small>/ ${poems.length}</small></strong><progress value="${visited}" max="${poems.length}" aria-label="已浏览诗境"></progress></div><div class="interests"><p>兴趣偏好</p><span>${favorites.length ? '你收藏的诗，便是心中山河' : '从喜欢的一首诗开始'}</span></div></div></section>
    <section class="paper-panel"><h2 class="panel-title">系统设置</h2><div class="settings"><label title="尚未接入通知服务">诗境更新通知<input type="checkbox" role="switch" disabled><small>暂未开放</small></label><label title="尚未接入推荐服务">精选诗词推荐<input type="checkbox" role="switch" disabled><small>暂未开放</small></label><label>深色模式<input type="checkbox" role="switch" data-preference="dark" ${preferences.dark ? 'checked' : ''}></label><label>动态效果<input type="checkbox" role="switch" data-preference="motion" ${preferences.motion ? 'checked' : ''}></label></div></section></div></div></main>${footer()}</div>`;
}
