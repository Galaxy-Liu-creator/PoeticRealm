import { describe, expect, it, vi } from 'vitest';
import { AuthStore } from './AuthStore';
import type { AuthSession } from '../api/auth';
import { ApiError } from '../api/http';
const user = { id: 1, username: '测试旅人', birthday: null, gender: '', createdAt: '2026-10-02T00:00:00Z' };
function api() {
  return { session: vi.fn().mockResolvedValue({ authenticated: false, user: null }),
    login: vi.fn().mockResolvedValue({ authenticated: true, user }),
    logout: vi.fn().mockResolvedValue(undefined), register: vi.fn().mockResolvedValue(user) };
}
describe('server authentication state', () => {
  it('restores a server session and clears identity after successful logout', async () => {
    const backend = api(); backend.session.mockResolvedValue({ authenticated: true, user });
    const store = new AuthStore(backend); await store.restore();
    expect(store.user).toEqual(user);
    await store.logout(); expect(store.user).toBeNull();
  });
  it('does not claim login success after rejected credentials or fabricate an offline identity', async () => {
    const backend = api(); backend.login.mockRejectedValue(new Error('bad credentials'));
    backend.session.mockRejectedValue(new Error('offline'));
    const store = new AuthStore(backend); await store.restore();
    expect(store.available).toBe(false); expect(store.user).toBeNull();
    await expect(store.login('test', 'password1', false)).rejects.toThrow('bad credentials');
    expect(store.user).toBeNull();
  });
  it('ignores an older anonymous restore after a login completes', async () => {
    const backend = api(); let finish!: (session: AuthSession) => void;
    backend.session.mockImplementation(() => new Promise<AuthSession>((resolve) => { finish = resolve; }));
    const store = new AuthStore(backend); const pending = store.restore();
    await store.login('test', 'password1', true);
    finish({ authenticated: false, user: null }); await pending;
    expect(store.user).toEqual(user);
  });
  it('retains the known identity and reports a failed logout', async () => {
    const backend = api(); const store = new AuthStore(backend);
    await store.login('test', 'password1', false);
    backend.logout.mockRejectedValue(new Error('offline'));
    await expect(store.logout()).rejects.toThrow('offline'); expect(store.user).toEqual(user);
  });
  it('prevents overlapping identity requests and skips focus restoration while login is pending', async () => {
    const backend = api(); let finish!: (session: AuthSession) => void;
    backend.login.mockImplementation(() => new Promise<AuthSession>((resolve) => { finish = resolve; }));
    const store = new AuthStore(backend); const pending = store.login('test', 'password1', false);
    await store.restore();
    await expect(store.logout()).rejects.toThrow('账号操作正在进行');
    expect(backend.session).not.toHaveBeenCalled(); expect(backend.logout).not.toHaveBeenCalled();
    finish({ authenticated: true, user }); await pending;
    await store.logout(); expect(store.user).toBeNull();
  });
  it('prevents a new login from racing with a pending logout', async () => {
    const backend = api(); let finish!: () => void;
    const store = new AuthStore(backend); await store.login('test', 'password1', false);
    backend.logout.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const pending = store.logout(); await store.restore();
    await expect(store.login('other', 'password1', false)).rejects.toThrow('账号操作正在进行');
    expect(backend.login).toHaveBeenCalledTimes(1); expect(backend.session).not.toHaveBeenCalled();
    finish(); await pending; expect(store.user).toBeNull();
  });
  it('clears an explicitly expired identity while retaining it during a network failure', async () => {
    const backend = api(); const store = new AuthStore(backend); await store.login('test', 'password1', false);
    backend.session.mockRejectedValue(new ApiError('offline'));
    await store.restore(); expect(store.user).toEqual(user); expect(store.available).toBe(false);
    backend.session.mockRejectedValue(new ApiError('expired', 401, 'SESSION_EXPIRED'));
    await store.restore(); expect(store.user).toBeNull(); expect(store.available).toBe(true);
  });
  it('recovers the initial identity after login fails while an earlier restore is still pending', async () => {
    const backend = api(); let finish!: (session: AuthSession) => void;
    backend.session.mockImplementationOnce(() => new Promise<AuthSession>((resolve) => { finish = resolve; }))
      .mockResolvedValue({ authenticated: true, user });
    backend.login.mockRejectedValue(new Error('bad credentials'));
    const store = new AuthStore(backend); const pending = store.restore();
    await expect(store.login('other', 'wrongpass1', false)).rejects.toThrow('bad credentials');
    expect(store.ready).toBe(true); expect(store.user).toEqual(user);
    finish({ authenticated: false, user: null }); await pending;
    expect(store.user).toEqual(user); expect(backend.session).toHaveBeenCalledTimes(2);
  });
});
