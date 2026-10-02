import { describe, expect, it } from 'vitest';
import { decodeHeight } from './Assets';

describe('decodeHeight', () => {
  it('把 0x0000 解码为最小高度', () => {
    expect(decodeHeight(0, 0, -4, 180)).toBe(-4);
  });

  it('把 0xffff 解码为最大高度', () => {
    expect(decodeHeight(255, 255, -4, 180)).toBe(180);
  });

  it('按完整 16 位范围解码中间值', () => {
    const expected = -4 + (32768 / 65535) * 184;
    expect(decodeHeight(128, 0, -4, 180)).toBeCloseTo(expected, 10);
  });

  it('拒绝倒置或零宽度的高度范围', () => {
    expect(() => decodeHeight(0, 0, 1, 1)).toThrow(RangeError);
    expect(() => decodeHeight(0, 0, 2, 1)).toThrow(RangeError);
  });
});
