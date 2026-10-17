import { describe, expect, it } from 'vitest';
import { pageCurl } from './pageCurl';

describe('page return sheet', () => {
  it('starts as the source and finishes beyond the right-hand spine', () => {
    for (const x of [0, 120, 960, 1800, 1920]) {
      expect(pageCurl(x, 1920, 0)).toEqual({ x, z: 0, angle: 0 });
      const end = pageCurl(x, 1920, 1);
      expect(end.x).toBeGreaterThanOrEqual(1920);
      expect(end.z).toBe(0);
      expect(end.angle).toBe(Math.PI);
    }
  });
  it('has a curved fold, a visible back and an unturned part', () => {
    expect(pageCurl(1200, 1920, .5)).toEqual({ x: 1200, z: 0, angle: 0 });
    const samples = Array.from({ length: 65 }, (_, i) => pageCurl(i * 1920 / 64, 1920, .5));
    expect(samples.some(s => s.angle > Math.PI / 2)).toBe(true);
    expect(samples.some(s => s.angle > 0 && s.angle < Math.PI / 2 && s.z > 0)).toBe(true);
    expect(samples.some(s => s.angle === 0 && s.z === 0)).toBe(true);
    expect(new Set(samples.map(s => s.angle)).size).toBeGreaterThan(10);
  });
  it('is continuous across the fold and deterministic when seeking backwards', () => {
    for (const p of [.05, .25, .5, .75, .95]) {
      let previous = pageCurl(0, 1440, p);
      for (let x = 1; x <= 1440; x++) {
        const next = pageCurl(x, 1440, p);
        expect(Math.hypot(next.x - previous.x, next.z - previous.z)).toBeLessThanOrEqual(1.001);
        previous = next;
      }
    }
    const forward = pageCurl(300, 1440, .4);
    pageCurl(300, 1440, .9);
    expect(pageCurl(300, 1440, .4)).toEqual(forward);
  });
});
