import { describe, it, expect, vi, afterEach } from 'vitest';
import { AuthApi, type AuthSession } from './auth';
import { ApiClient } from './http';
import { tabSession } from './TabSession';
const saved = { token: 't'.repeat(43), lease: 'l'.repeat(43) };
afterEach(() => { tabSession.clear(); });
describe('authentication restore races', () => {
  it('coalesces simultaneous focus and heartbeat restores before rotating the lease', async () => {
    tabSession.current = saved;
    let resolve!: (value: AuthSession) => void;
    const request = vi.fn(() => new Promise<AuthSession>(done => { resolve = done; }));
    const api = new AuthApi({ request } as unknown as ApiClient);
    const first = api.session(), second = api.session();
    expect(first).toBe(second); expect(request).toHaveBeenCalledTimes(1);
    resolve({ authenticated: true, user: null, token: saved.token, lease: 'n'.repeat(43) });
    await first; expect(tabSession.current?.lease).toBe('n'.repeat(43));
  });
  it('never clears a newer login when a delayed old restore fails', async () => {
    tabSession.current = saved;
    let resolve!: (value: AuthSession) => void;
    const api = new AuthApi({ request: () => new Promise<AuthSession>(done => { resolve = done; }) } as unknown as ApiClient);
    const restoring = api.session();
    tabSession.current = { token: 'x'.repeat(43), lease: 'y'.repeat(43) };
    resolve({ authenticated: false, user: null }); await restoring;
    expect(tabSession.current?.token).toBe('x'.repeat(43));
  });
});
