export class ApiError extends Error {
  constructor(message: string, readonly status = 0, readonly code = 'NETWORK_ERROR') { super(message); }
}

export class ApiClient {
  private csrf?: { headerName: string; token: string };
  private pendingCsrf?: Promise<void>;
  constructor(private fetcher: typeof fetch = globalThis.fetch.bind(globalThis)) {}
  clearCsrf(): void { this.csrf = undefined; }
  private async loadCsrf(): Promise<void> {
    if (this.csrf) return;
    this.pendingCsrf ??= this.send<{ headerName: string; token: string }>('/auth/csrf', 'GET').then((token) => {
      if (!token.token || token.headerName !== 'X-CSRF-TOKEN') throw new ApiError('页面验证响应不正确');
      this.csrf = token;
    }).finally(() => { this.pendingCsrf = undefined; });
    await this.pendingCsrf;
  }
  async request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    if (method !== 'GET') await this.loadCsrf();
    try { return await this.send<T>(path, method, body); }
    catch (error) {
      // A CSRF rejection occurs before the endpoint executes. Retry it once with a fresh token.
      if (method !== 'GET' && error instanceof ApiError && error.status === 403 && error.code === 'CSRF_INVALID') {
        this.clearCsrf(); await this.loadCsrf();
        return this.send<T>(path, method, body);
      }
      throw error;
    }
  }
  private async send<T>(path: string, method: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await this.fetcher('/api/v1' + path, {
        method, credentials: 'include', cache: 'no-store', signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(method !== 'GET' && this.csrf ? { [this.csrf.headerName]: this.csrf.token } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      if (response.status === 204) return undefined as T;
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = response.status >= 500 ? '账号服务暂时不可用，请稍后重试。' : payload?.message || '请求未能完成，请重试';
        throw new ApiError(message, response.status, payload?.code || 'REQUEST_FAILED');
      }
      if (payload === null) throw new ApiError('账号服务响应不正确，请稍后重试。');
      return payload as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(controller.signal.aborted ? '请求超时，请检查网络后重试。' : '无法连接账号服务，请检查网络后重试。');
    } finally { clearTimeout(timeout); }
  }
}
