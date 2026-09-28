import { describe, expect, it } from 'vitest';
import { createRng, hashString } from './random';

describe('createRng', () => {
  it('同一种子得到相同序列', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 100 }, a);
    const seqB = Array.from({ length: 100 }, b);
    expect(seqA).toEqual(seqB);
  });

  it('不同种子得到不同序列', () => {
    const a = Array.from({ length: 10 }, createRng(1));
    const b = Array.from({ length: 10 }, createRng(2));
    expect(a).not.toEqual(b);
  });

  it('取值落在 [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 10_000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('大致均匀', () => {
    const rng = createRng(123);
    const bins = new Array(10).fill(0);
    for (let i = 0; i < 100_000; i++) bins[Math.floor(rng() * 10)]++;
    for (const n of bins) expect(Math.abs(n - 10_000)).toBeLessThan(500);
  });
});

describe('hashString', () => {
  it('稳定且区分名字', () => {
    expect(hashString('lantern_01')).toBe(hashString('lantern_01'));
    expect(hashString('lantern_01')).not.toBe(hashString('lantern_02'));
  });

  it('返回 32 位无符号整数', () => {
    const h = hashString('CAM_boat');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });
});
