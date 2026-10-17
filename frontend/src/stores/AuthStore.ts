import { AuthApi, type AuthUser, type Registration } from '../api/auth';
import { ApiError } from '../api/http';

export class AuthStore {
  user: AuthUser | null = null;
  ready = false;
  available = false;
  error = '';
  onChange?: () => void;
  private revision = 0;
  private changingIdentity = false;
  constructor(private api: Pick<AuthApi, 'session' | 'register' | 'login' | 'logout'> & Partial<Pick<AuthApi, 'remembered' | 'loginRemembered'>> = new AuthApi()) {}
  remembered() { return this.api.remembered?.() ?? Promise.resolve({ remembered: false, username: null }); }
  expire(): void { ++this.revision; this.user = null; this.ready = true; this.onChange?.(); }
  async restore(): Promise<void> {
    if (this.changingIdentity) return;
    const revision = ++this.revision;
    try {
      const session = await this.api.session();
      if (revision !== this.revision) return;
      this.user = session.authenticated ? session.user : null;
      this.available = true; this.error = '';
    } catch (error) {
      if (revision !== this.revision) return;
      if (error instanceof ApiError && error.status === 401) this.user = null;
      this.available = error instanceof ApiError && error.status === 401;
      this.error = error instanceof Error ? error.message : '账号服务暂时不可用';
    }
    this.ready = true; this.onChange?.();
  }
  register(data: Registration): Promise<AuthUser> { return this.api.register(data); }
  async login(username: string, password: string, remember: boolean): Promise<void> {
    this.beginIdentityChange();
    ++this.revision;
    try {
      const result = await this.api.login(username, password, remember);
      if (!result.authenticated || !result.user) throw new ApiError('登录未完成，请重试');
      this.user = result.user; this.ready = true; this.available = true; this.error = '';
      this.onChange?.();
    } finally { await this.finishIdentityChange(); }
  }
  async logout(): Promise<void> {
    this.beginIdentityChange();
    ++this.revision;
    try {
      await this.api.logout();
      this.user = null; this.ready = true; this.available = true; this.error = '';
      this.onChange?.();
    } finally { await this.finishIdentityChange(); }
  }
  async loginRemembered(remember: boolean): Promise<void> {
    this.beginIdentityChange(); ++this.revision;
    try {
      const result = await this.api.loginRemembered?.(remember);
      if (!result?.authenticated || !result.user) throw new ApiError('记住的凭据已失效，请重新输入账号密码');
      this.user = result.user; this.ready = true; this.available = true; this.error = ''; this.onChange?.();
    } finally { await this.finishIdentityChange(); }
  }
  private beginIdentityChange(): void {
    if (this.changingIdentity) throw new ApiError('账号操作正在进行，请稍后重试');
    this.changingIdentity = true;
  }
  private async finishIdentityChange(): Promise<void> {
    this.changingIdentity = false;
    if (!this.ready) await this.restore();
  }
}
