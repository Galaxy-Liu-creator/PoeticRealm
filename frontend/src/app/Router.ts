import { findPoem } from '../content/catalog';
export type Route = { page: 'home' | 'favorites' | 'profile' | 'account' | 'login' | 'register' | 'missing'; path: string }
  | { page: 'public-profile'; path: string; username: string }
  | { page: 'poem'; path: string; id: string };
export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  if (path === '/') return { page: 'home', path };
  if (path === '/profile/edit') return { page: 'profile', path: '/profile' };
  const profile = /^\/profiles\/([^/]+)$/.exec(path);
  if (profile) {
    try {
      const username = decodeURIComponent(profile[1]!);
      if (/^[\p{L}\p{N}_]{4,16}$/u.test(username)) return { page: 'public-profile', path, username };
    } catch { /* Malformed URL is handled by the missing page. */ }
  }
  const pages = ['favorites', 'profile', 'account', 'login', 'register'] as const;
  const page = pages.find((value) => path === '/' + value);
  if (page) return { page, path };
  const match = /^\/poems\/([a-z]+)$/.exec(path);
  if (match && findPoem(match[1]!)) return { page: 'poem', path, id: match[1]! };
  return { page: 'missing', path };
}
