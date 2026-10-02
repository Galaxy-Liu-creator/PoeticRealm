import { describe, expect, it } from 'vitest';
import { LibraryStore, normalizeLibrary, STORE_KEY } from './LibraryStore';
describe('local library persistence', () => {
  it('deduplicates favorites and removes invalid ids and malformed visits', () => {
    const data = normalizeLibrary({ version: 1, favorites: ['fengqiao', 'fengqiao', 'unknown', null],
      visits: [{ id: 'jiangxue', at: '2026-10-01T00:00:00Z' }, { id: 'fengqiao', at: 'bad' }, null] });
    expect(data.favorites).toEqual(['fengqiao']);
    expect(data.visits).toEqual([{ id: 'jiangxue', at: '2026-10-01T00:00:00Z' }]);
  });
  it('restores favorites across instances and never stores invalid ids', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); } };
    const store = new LibraryStore(storage);
    expect(store.toggle('unknown')).toBe(false);
    store.toggle('jiangxue');
    const restored = new LibraryStore(storage);
    expect(restored.data.favorites).toEqual(['jiangxue']);
    restored.toggle('jiangxue');
    expect(JSON.parse(values.get(STORE_KEY)!).favorites).toEqual([]);
  });
  it('keeps session state and reports failed persistence', () => {
    const store = new LibraryStore({ getItem: () => null, setItem: () => { throw new Error('quota'); } });
    expect(store.toggle('fengqiao')).toBe(true);
    expect(store.data.favorites).toEqual(['fengqiao']);
    expect(store.warning).toContain('仅在本次会话');
  });
  it('rejects executable avatar URLs and unknown data versions', () => {
    expect(normalizeLibrary({ version: 1, profile: { avatar: 'javascript:alert(1)' } }).profile.avatar).toBe('');
    expect(normalizeLibrary({ version: 2, favorites: ['fengqiao'] }).favorites).toEqual([]);
  });
});
