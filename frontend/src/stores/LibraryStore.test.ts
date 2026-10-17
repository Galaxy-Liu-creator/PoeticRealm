import { describe, expect, it } from 'vitest';
import { LibraryStore, normalizeLibrary, STORE_KEY } from './LibraryStore';
describe('local library persistence', () => {
  it('upgrades old preferences with private defaults without losing favorites', () => {
    const data = normalizeLibrary({version:1,favorites:['fengqiao'],preferences:{dark:true,motion:false}});
    expect(data.favorites).toEqual(['fengqiao']); expect(data.preferences.dark).toBe(true);
    expect(data.preferences.transitions).toBe(true); expect(data.privacy.profileVisibility).toBe('private');
    expect(data.privacy.searchable).toBe(false); expect(data.privacy.personalization).toBe(false);
  });
  it('does not restore or record reading history when consent is disabled', () => {
    const data = normalizeLibrary({version:1,visits:[{id:'fengqiao',at:'2026-10-06T00:00:00Z'}],privacy:{saveHistory:false}});
    expect(data.visits).toEqual([]);
    const store = new LibraryStore({getItem:()=>null,setItem:()=>{}}); store.data=data; store.visit('jiangxue');
    expect(store.data.visits).toEqual([]);
  });
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
  it('keeps guest and different account libraries separate without importing guest data', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); } };
    const guest = new LibraryStore(storage); guest.toggle('fengqiao');
    const first = new LibraryStore(storage, STORE_KEY + '.account.1', { name: '第一位旅人' });
    expect(first.data.favorites).toEqual([]); expect(first.data.profile.name).toBe('第一位旅人');
    first.toggle('jiangxue');
    expect(new LibraryStore(storage, STORE_KEY + '.account.2').data.favorites).toEqual([]);
    expect(new LibraryStore(storage, STORE_KEY + '.account.1').data.favorites).toEqual(['jiangxue']);
    expect(new LibraryStore(storage).data.favorites).toEqual(['fengqiao']);
  });
});
