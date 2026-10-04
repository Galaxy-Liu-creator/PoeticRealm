import { findPoem } from '../content/catalog';
export const STORE_KEY = 'poetic-realm.library.v1';
export interface LibraryData {
  version: 1;
  favorites: string[];
  visits: { id: string; at: string }[];
  profile: { name: string; gender: string; bio: string; avatar: string };
  preferences: { dark: boolean; motion: boolean };
}
const initial = (): LibraryData => ({
  version: 1, favorites: [], visits: [],
  profile: { name: '山河客', gender: '', bio: '行于诗境，藏一卷山河。', avatar: '' },
  preferences: { dark: false, motion: true },
});
export function normalizeLibrary(value: unknown): LibraryData {
  const data = initial();
  if (!value || typeof value !== 'object') return data;
  const raw = value as Partial<LibraryData>;
  if (raw.version !== 1) return data;
  if (Array.isArray(raw.favorites)) data.favorites = [...new Set(raw.favorites.filter((id) => typeof id === 'string' && findPoem(id)))];
  if (Array.isArray(raw.visits)) data.visits = raw.visits.filter((v) =>
    v && typeof v.id === 'string' && findPoem(v.id) && typeof v.at === 'string' && Number.isFinite(Date.parse(v.at))
  ).slice(0, 50);
  if (raw.profile && typeof raw.profile === 'object') {
    for (const key of ['name', 'gender', 'bio'] as const) {
      if (typeof raw.profile[key] === 'string') data.profile[key] = raw.profile[key].slice(0, key === 'bio' ? 80 : 24);
    }
    if (!data.profile.name.trim()) data.profile.name = '山河客';
    if (typeof raw.profile.avatar === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(raw.profile.avatar)
      && raw.profile.avatar.length < 500_000) data.profile.avatar = raw.profile.avatar;
  }
  if (raw.preferences && typeof raw.preferences === 'object') {
    data.preferences.dark = raw.preferences.dark === true;
    data.preferences.motion = raw.preferences.motion !== false;
  }
  return data;
}
export class LibraryStore {
  data = initial();
  warning = '';
  constructor(private storage?: Pick<Storage, 'getItem' | 'setItem'>,
              readonly key = STORE_KEY, profile?: Partial<LibraryData['profile']>) {
    if (profile) this.data.profile = { ...this.data.profile, ...profile };
    try {
      this.storage ??= window.localStorage;
      const saved = this.storage.getItem(this.key);
      if (saved) this.data = normalizeLibrary(JSON.parse(saved));
    } catch {
      this.warning = '无法读取本机资料，当前更改仅在本次会话中保留。';
      this.storage = undefined;
    }
  }
  save(): boolean {
    try {
      if (!this.storage) throw new Error('Storage unavailable');
      this.storage.setItem(this.key, JSON.stringify(this.data));
      this.warning = '';
      return true;
    } catch {
      this.warning = '无法保存到当前浏览器；更改仅在本次会话中保留，刷新可能丢失。';
      return false;
    }
  }
  toggle(id: string): boolean {
    if (!findPoem(id)) return false;
    const active = this.data.favorites.includes(id);
    this.data.favorites = active ? this.data.favorites.filter((value) => value !== id) : [...this.data.favorites, id];
    this.save();
    return !active;
  }
  visit(id: string): void {
    if (!findPoem(id)) return;
    // Wall time is metadata only, never an animation clock.
    this.data.visits.unshift({ id, at: new Date().toISOString() });
    this.data.visits = this.data.visits.slice(0, 50);
    this.save();
  }
}
