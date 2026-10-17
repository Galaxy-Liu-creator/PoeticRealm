export const LOGIN_MEMORY_KEY = 'poetic-realm.login-memory.v1';
export const LOGIN_MEMORY_DURATION = 30 * 24 * 60 * 60 * 1000;
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export interface RememberedLogin { username: string; expiresAt: number }

/** Remembers the login form only; authentication sessions belong to the future auth service. */
export class LoginMemory {
  constructor(private storage: () => StoragePort = () => localStorage, private now: () => number = Date.now) {}

  read(): RememberedLogin | null {
    try {
      const storage = this.storage();
      const raw = storage.getItem(LOGIN_MEMORY_KEY);
      if (!raw) return null;
      let value: unknown;
      try { value = JSON.parse(raw); }
      catch { storage.removeItem(LOGIN_MEMORY_KEY); return null; }
      const record = value as Record<string, unknown> | null;
      if (!record || record.version !== 1 || typeof record.username !== 'string' || record.username.length > 64 ||
          typeof record.expiresAt !== 'number' || !Number.isFinite(record.expiresAt) || record.expiresAt <= this.now()) {
        storage.removeItem(LOGIN_MEMORY_KEY);
        return null;
      }
      return { username: record.username, expiresAt: record.expiresAt };
    } catch { return null; }
  }

  update(username: string, remember: boolean): boolean {
    try {
      const storage = this.storage();
      if (remember) {
        storage.setItem(LOGIN_MEMORY_KEY, JSON.stringify({ version: 1, username: username.trim().slice(0, 64), expiresAt: this.now() + LOGIN_MEMORY_DURATION }));
      } else {
        storage.removeItem(LOGIN_MEMORY_KEY);
      }
      return true;
    } catch { return false; }
  }
}
