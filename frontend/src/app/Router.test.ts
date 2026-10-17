import { describe, expect, it } from 'vitest';
import { parseRoute } from './Router';
describe('UI deep links', () => {
  it('supports default, account, and each valid poem route', () => {
    expect(parseRoute('')).toEqual({ page: 'home', path: '/' });
    expect(parseRoute('#/register').page).toBe('register');
    expect(parseRoute('#/poems/baidicheng')).toEqual({ page: 'poem', path: '/poems/baidicheng', id: 'baidicheng' });
  });
  it('rejects unknown ids and malformed paths instead of loading an empty scene', () => {
    for (const path of ['#/poems/unknown', '#/poems/%', '#/login/other', '#/other']) {
      expect(parseRoute(path).page).toBe('missing');
    }
  });
});
