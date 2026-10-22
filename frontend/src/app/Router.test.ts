import { describe, expect, it } from 'vitest';
import { parseRoute } from './Router';
describe('UI deep links', () => {
  it('supports default, account, and each valid poem route', () => {
    expect(parseRoute('')).toEqual({ page: 'home', path: '/' });
    expect(parseRoute('#/register').page).toBe('register');
    expect(parseRoute('#/poems/baidicheng')).toEqual({ page: 'poem', path: '/poems/baidicheng', id: 'baidicheng' });
  });
  it('rejects unknown ids and malformed paths instead of loading an empty scene', () => {
    for (const path of ['#/poems/unknown', '#/poems/%', '#/login/other', '#/other', '#/profiles/%', '#/profiles/a%2Fb', '#/profiles/abc', '#/profile/edit/other']) {
      expect(parseRoute(path).page).toBe('missing');
    }
  });
  it('resolves the former editor to the unified center and encoded public account names', () => {
    expect(parseRoute('#/profile/edit')).toEqual(parseRoute('#/profile'));
    expect(parseRoute('#/profiles/%E5%B1%B1%E6%B2%B3%E5%A2%A8%E5%AE%A2')).toEqual({ page:'public-profile', path:'/profiles/%E5%B1%B1%E6%B2%B3%E5%A2%A8%E5%AE%A2', username:'山河墨客' });
  });
});
