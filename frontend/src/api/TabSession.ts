const KEY = 'poetic-realm.tab-session.v1';
export const AUTH_EXPIRED = 'poetic-auth-expired';
export interface TabCredential { token: string; lease: string }
const valid = (value: unknown): value is TabCredential => !!value && typeof value === 'object'
  && ['token', 'lease'].every(key => /^[A-Za-z0-9_-]{43}$/.test(String((value as Record<string, unknown>)[key])));

export class TabSession {
  current: TabCredential | null = null;
  reloading = false;
  initialize(reload: boolean, storage?: Storage): void {
    this.current = null;
    try {
      if (reload) { const saved: unknown = JSON.parse(storage?.getItem(KEY) ?? 'null'); if (valid(saved)) this.current = saved; }
      else storage?.removeItem(KEY);
    } catch { try { storage?.removeItem(KEY); } catch { /* Storage may be disabled. */ } }
    this.reloading = reload && !!this.current;
  }
  set(credential: TabCredential): void {
    if (!valid(credential)) throw new Error('登录令牌响应不正确');
    this.current = credential;
    try { sessionStorage.setItem(KEY, JSON.stringify(credential)); } catch { /* In-memory login remains usable. */ }
  }
  clear(expected = this.current?.token): void {
    if (expected && this.current?.token !== expected) return;
    this.current = null;
    this.reloading = false;
    try { sessionStorage.removeItem(KEY); } catch { /* Storage may be disabled. */ }
  }
  release(): void {
    if (!this.current) return;
    navigator.sendBeacon('/api/v1/auth/release', new Blob([JSON.stringify(this.current)], { type: 'application/json' }));
  }
}
export const tabSession = new TabSession();
export function initializeTabSession(): void {
  let storage: Storage | undefined;
  try { storage = sessionStorage; } catch { /* No persistence available. */ }
  tabSession.initialize(performance.getEntriesByType('navigation').some(entry => (entry as PerformanceNavigationTiming).type === 'reload'), storage);
}
