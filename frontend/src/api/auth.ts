import { ApiClient } from './http';
import { tabSession } from './TabSession';
export const AGREEMENT_VERSION = '2026-10-02-dev';
export interface AuthUser { id: number; username: string; birthday: string | null; gender: string; createdAt: string }
export interface AuthSession { authenticated: boolean; user: AuthUser | null; token?: string; lease?: string }
export interface RememberedLogin { remembered: boolean; username: string | null }
export interface Registration {
  username: string; password: string; birthday: string | null; gender: string;
  agreement: boolean; agreementVersion: string;
}
export class AuthApi {
  private pendingSession?: Promise<AuthSession>;
  private pendingRemembered?: Promise<RememberedLogin>;
  constructor(private client = new ApiClient()) {}
  session(): Promise<AuthSession> {
    return this.pendingSession ??= this.restoreSession().finally(() => { this.pendingSession = undefined; });
  }
  private async restoreSession(): Promise<AuthSession> {
    const access = tabSession.current;
    if (!access) return { authenticated: false, user: null };
    const result = await this.client.request<AuthSession>('/auth/session');
    if (tabSession.current?.token === access.token) {
      if (result.authenticated && result.lease) {
        tabSession.set({ token: result.token || access.token, lease: result.lease }); tabSession.reloading = false;
      }
      else tabSession.clear(access.token);
    }
    return result;
  }
  remembered(): Promise<RememberedLogin> {
    return this.pendingRemembered ??= this.client.request<RememberedLogin>('/auth/remembered').finally(() => { this.pendingRemembered = undefined; });
  }
  register(data: Registration): Promise<AuthUser> { return this.client.request('/auth/register', 'POST', data); }
  async login(username: string, password: string, remember: boolean): Promise<AuthSession> {
    const result = await this.client.request<AuthSession>('/auth/login', 'POST', { username, password, remember });
    this.client.clearCsrf();
    this.acceptLogin(result);
    return result;
  }
  async loginRemembered(remember: boolean): Promise<AuthSession> {
    const result = await this.client.request<AuthSession>('/auth/login-remembered', 'POST', { remember });
    this.client.clearCsrf(); this.acceptLogin(result); return result;
  }
  private acceptLogin(result: AuthSession): void {
    if (!result.authenticated || !result.user || !result.token || !result.lease) throw new Error('登录响应不正确，请重试');
    tabSession.set({ token: result.token, lease: result.lease });
    tabSession.reloading = false;
  }
  async logout(): Promise<void> {
    await this.client.request('/auth/logout', 'POST');
    this.client.clearCsrf();
    tabSession.clear();
  }
}
