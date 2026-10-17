import { describe, it, expect } from 'vitest';
import { TabSession } from './TabSession';
const credential = { token: 'a'.repeat(43), lease: 'b'.repeat(43) };
function storage(value: string | null): Storage {
  return { length: 1, key: () => 'key', clear: () => { value = null; }, getItem: () => value, removeItem: () => { value = null; }, setItem: (_key: string, v: string) => { value = v; } } satisfies Storage;
}
describe('tab access lifecycle', () => {
  it('restores a reload but discards even cloned storage on a fresh navigation', () => {
    const session = new TabSession(), saved = storage(JSON.stringify(credential));
    session.initialize(true, saved); expect(session.current).toEqual(credential);
    session.initialize(false, saved); expect(session.current).toBeNull(); expect(saved.getItem('key')).toBeNull();
  });
  it('rejects corrupted credentials and prevents a late failure from clearing a newer login', () => {
    const session = new TabSession(); session.initialize(true, storage('{"token":"invalid"}')); expect(session.current).toBeNull();
    session.current = credential; session.clear('c'.repeat(43)); expect(session.current).toEqual(credential);
    session.clear(credential.token); expect(session.current).toBeNull();
  });
});
