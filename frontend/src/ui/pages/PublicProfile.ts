import { AccountApi, type PublicProfile } from '../../api/account';
import { findPoem } from '../../content/catalog';
import { artwork } from '../components/artwork';
import { escapeHTML as esc } from '../components/html';
import { footer } from '../components/Navigation';

export function publicProfilePage(): string {
  return `<div class="landscape-page public-profile-page"><div class="landscape-background" style="${artwork.homePaper}" aria-hidden="true"></div><main id="main" class="page-width" tabindex="-1"><div data-public-profile><p role="status">正在读取诗友主页…</p></div></main>${footer()}</div>`;
}

export function mountPublicProfile(host: HTMLElement, username: string): void {
  const render = (profile: PublicProfile): void => {
    const poemLink = (id: string): string => { const poem = findPoem(id); return poem ? `<a class="small-button" href="#/poems/${poem.id}">${poem.title} · ${poem.author} →</a>` : ''; };
    host.innerHTML = `<header class="page-heading"><div class="avatar" style="${artwork.avatar}">${profile.avatar ? `<img src="${esc(profile.avatar)}" alt="${esc(profile.name)}的头像">` : ''}</div><div><h1>${esc(profile.name)}</h1><p>${esc(profile.username)}</p><p class="poetic-copy">${esc(profile.bio)}</p></div></header>
      <section><h2 class="section-title">收藏诗词</h2><div class="public-poems">${profile.favorites.length ? profile.favorites.map(poemLink).join('') : '<p>暂无可展示的收藏。</p>'}</div></section>
      <section><h2 class="section-title">阅读足迹</h2><div class="public-poems">${profile.visits.length ? [...new Set(profile.visits.map(visit => visit.id))].map(poemLink).join('') : '<p>暂无可展示的足迹。</p>'}</div></section>`;
  };
  const load = async (): Promise<void> => {
    host.innerHTML = '<p role="status">正在读取诗友主页…</p>';
    try { const result = await new AccountApi().profile(username); if (host.isConnected) render(result); }
    catch (error) {
      if (!host.isConnected) return;
      host.innerHTML = `<section class="empty-state"><h1>暂时无法查看主页</h1><p role="status">${esc(error instanceof Error ? error.message : '读取失败，请重试')}</p><button type="button" class="small-button" data-retry-profile>重试</button> <a href="#/profile" class="small-button">返回个人中心</a></section>`;
      host.querySelector('[data-retry-profile]')!.addEventListener('click', () => void load());
    }
  };
  void load();
}
