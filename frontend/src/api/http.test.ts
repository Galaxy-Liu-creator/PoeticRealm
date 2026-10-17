import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './http';
describe('authentication transport', () => {
  it('binds the native browser fetch to its global receiver', async () => {
    vi.stubGlobal('fetch', function (this: unknown) {
      if (this !== globalThis) throw new TypeError('Illegal invocation');
      return Promise.resolve(Response.json({ authenticated: false, user: null }));
    });
    try {
      await expect(new ApiClient().request('/auth/session')).resolves.toEqual({ authenticated: false, user: null });
    } finally { vi.unstubAllGlobals(); }
  });
  it('sends cookies and a server-issued CSRF token for mutations', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ headerName: 'X-CSRF-TOKEN', token: 'fresh' }))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    await new ApiClient(fetcher).request('/auth/login', 'POST', { username: '旅人', password: 'password1' });
    expect(fetcher.mock.calls[1]![1]).toMatchObject({ credentials: 'include', cache: 'no-store', headers: { 'X-CSRF-TOKEN': 'fresh' } });
  });
  it('renews CSRF once after rejection without retrying invalid passwords', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ headerName: 'X-CSRF-TOKEN', token: 'old' }))
      .mockResolvedValueOnce(Response.json({ code: 'CSRF_INVALID' }, { status: 403 }))
      .mockResolvedValueOnce(Response.json({ headerName: 'X-CSRF-TOKEN', token: 'new' }))
      .mockResolvedValueOnce(Response.json({ code: 'INVALID_CREDENTIALS', message: 'bad password' }, { status: 401 }));
    await expect(new ApiClient(fetcher).request('/auth/login', 'POST', {})).rejects.toThrow('bad password');
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(fetcher.mock.calls[3]![1]).toMatchObject({ headers: { 'X-CSRF-TOKEN': 'new' } });
  });
  it('handles successful empty logout responses', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ headerName: 'X-CSRF-TOKEN', token: 'fresh' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(new ApiClient(fetcher).request('/auth/logout', 'POST')).resolves.toBeUndefined();
  });
});
