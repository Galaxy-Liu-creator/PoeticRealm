import type { Route } from '../../app/Router';
export function navigation(route: Route): string {
  const accountSection = route.page === 'login' || route.page === 'register';
  const link = (page: string, label: string): string =>
    `<a href="#/${page === 'home' ? '' : page}" ${route.page === page ? 'aria-current="page"' : accountSection && page === 'profile' ? 'aria-current="location"' : ''}>${label}</a>`;
  return `<header class="navigation"><div class="brand-group">
    ${route.page !== 'home' ? '<a class="return-link" href="#/" data-back>← <span>返回总览</span></a>' : ''}
    <a class="brand" href="#/">诗境·一卷山河 <span class="seal" aria-hidden="true">诗境</span></a></div>
    <nav aria-label="主导航">${link('home', '诗词总览')}${link('favorites', '我的收藏')}${link('profile', '个人中心')}</nav></header>`;
}
export const footer = (): string => '<footer class="site-footer"><span>© 诗境·一卷山河 · 循诗入境 展卷见山河</span></footer>';
