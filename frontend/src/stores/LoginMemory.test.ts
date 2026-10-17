import { describe, expect, it } from 'vitest';
import { LoginMemory, LOGIN_MEMORY_DURATION, LOGIN_MEMORY_KEY } from './LoginMemory';

function setup() {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  let now = 1000;
  return { values, memory: new LoginMemory(() => storage, () => now), advance: (ms: number) => { now += ms; } };
}

describe('LoginMemory', () => {
  it('stores only the account name and expires exactly after 30 days', () => {
    const { memory, values, advance } = setup();
    expect(memory.update('  诗境旅人  ', true)).toBe(true);
    expect(JSON.parse(values.get(LOGIN_MEMORY_KEY)!)).toEqual({ version: 1, username: '诗境旅人', expiresAt: 1000 + LOGIN_MEMORY_DURATION });
    advance(LOGIN_MEMORY_DURATION - 1);
    expect(memory.read()?.username).toBe('诗境旅人');
    advance(1);
    expect(memory.read()).toBeNull();
    expect(values.has(LOGIN_MEMORY_KEY)).toBe(false);
  });

  it('remembers a selection before typing and clears it when deselected', () => {
    const { memory, values } = setup();
    memory.update('', true);
    expect(memory.read()?.username).toBe('');
    memory.update('新用户名', true);
    expect(memory.read()?.username).toBe('新用户名');
    memory.update('新用户名', false);
    expect(memory.read()).toBeNull();
    expect(values.size).toBe(0);
  });

  it('removes corrupt or unsupported saved data', () => {
    const { memory, values } = setup();
    for (const raw of ['broken', 'null', JSON.stringify({ version: 2, username: '旅人', expiresAt: 9000 }), JSON.stringify({ version: 1, username: 4, expiresAt: 9000 }), JSON.stringify({ version: 1, username: '旅人', expiresAt: '9000' })]) {
      values.set(LOGIN_MEMORY_KEY, raw);
      expect(memory.read()).toBeNull();
      expect(values.has(LOGIN_MEMORY_KEY)).toBe(false);
    }
  });

  it('handles unavailable browser storage without crashing', () => {
    const memory = new LoginMemory(() => { throw new Error('storage unavailable'); });
    expect(memory.read()).toBeNull();
    expect(memory.update('旅人', true)).toBe(false);
    expect(memory.update('', false)).toBe(false);
  });
});
