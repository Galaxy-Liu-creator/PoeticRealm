import { ApiClient } from './http';
import { tabSession, AUTH_EXPIRED } from './TabSession';
import type { AuthUser } from './auth';
import type { LibraryData } from '../stores/LibraryStore';
export interface Device { id: string; agent: string; signedInAt: string; lastSeenAt: string; current: boolean }
export interface PublicProfile { username: string; name: string; bio: string; avatar: string; favorites: string[]; visits: { id: string; at: string }[] }
export class AccountApi {
  constructor(private client = new ApiClient()) {}
  settings(): Promise<{ library: LibraryData | null }> { return this.client.request('/account/settings'); }
  save(library: LibraryData): Promise<{ library: LibraryData }> { return this.client.request('/account/settings', 'PUT', library); }
  devices(): Promise<Device[]> { return this.client.request('/account/devices'); }
  profile(username: string): Promise<PublicProfile> { return this.client.request('/profiles/' + encodeURIComponent(username)); }
  search(query: string): Promise<PublicProfile[]> { return this.client.request('/profiles?query=' + encodeURIComponent(query)); }
  remember(remember: boolean): Promise<void> { return this.client.request('/account/remember', 'POST', { remember }); }
  revokeOthers(remember: boolean): Promise<void> { return this.client.request('/account/devices/revoke-others', 'POST', { remember }); }
  export(): Promise<{ exportedAt: string; account: AuthUser; library: LibraryData }> { return this.client.request('/account/export'); }
  clearHistory(): Promise<void> { return this.client.request('/account/history', 'DELETE'); }
  async password(currentPassword: string, password: string): Promise<void> {
    const token = tabSession.current?.token;
    await this.client.request('/account/password', 'POST', { currentPassword, password }); this.expire(token);
  }
  async delete(password: string, confirmation: string): Promise<void> {
    const token = tabSession.current?.token;
    await this.client.request('/account', 'DELETE', { password, confirmation }); this.expire(token);
  }
  private expire(token?: string): void { if (token && tabSession.current?.token === token) { tabSession.clear(token); window.dispatchEvent(new Event(AUTH_EXPIRED)); } }
}
