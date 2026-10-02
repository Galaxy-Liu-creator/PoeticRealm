import { describe, expect, it } from 'vitest';
import { INK_STEP, stepsForTime } from './InkSim';

describe('stepsForTime', () => {
  it('把时间映射到固定步长', () => {
    expect(stepsForTime(0)).toBe(0);
    expect(stepsForTime(INK_STEP)).toBe(1);
    expect(stepsForTime(12)).toBe(360);
  });

  it('忽略负值与非有限值', () => {
    expect(stepsForTime(-1)).toBe(0);
    expect(stepsForTime(Number.NaN)).toBe(0);
    expect(stepsForTime(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
