import { ApiClient } from './http';
export const AGREEMENT_VERSION = '2026-10-02-dev';
export interface AuthUser { id: number; username: string; birthday: string | null; gender: string; createdAt: string }
export interface AuthSession { authenticated: boolean; user: AuthUser | null }
export interface Registration {
  username: string; password: string; birthday: string | null; gender: string;
  agreement: boolean; agreementVersion: string;
}
export class AuthApi {
  constructor(private client = new ApiClient()) {}
  session(): Promise<AuthSession> { return this.client.request('/auth/session'); }
  register(data: Registration): Promise<AuthUser> { return this.client.request('/auth/register', 'POST', data); }
  async login(username: string, password: string, remember: boolean): Promise<AuthSession> {
    const result = await this.client.request<AuthSession>('/auth/login', 'POST', { username, password, remember });
    this.client.clearCsrf();
    return result;
  }
  async logout(): Promise<void> {
    await this.client.request('/auth/logout', 'POST');
    this.client.clearCsrf();
  }
}
