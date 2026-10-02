import { describe, expect, it } from 'vitest';
import { parseDebugParams } from './debugParams';

describe('parseDebugParams', () => {
  it('空查询', () => {
    expect(parseDebugParams('')).toEqual({ debug: false });
  });

  it('完整参数', () => {
    expect(parseDebugParams('?scene=fengqiao&t=42.5&q=low&debug')).toEqual({
      scene: 'fengqiao',
      t: 42.5,
      q: 'low',
      debug: true,
    });
  });

  it('非法的 t 被忽略', () => {
    expect(parseDebugParams('?t=abc').t).toBeUndefined();
    expect(parseDebugParams('?t=-1').t).toBeUndefined();
    expect(parseDebugParams('?t=').t).toBeUndefined();
    expect(parseDebugParams('?t=Infinity').t).toBeUndefined();
  });

  it('非法的画质档位被忽略', () => {
    expect(parseDebugParams('?q=ultra').q).toBeUndefined();
  });

  it('场景名只接受小写字母', () => {
    expect(parseDebugParams('?scene=<script>').scene).toBeUndefined();
    expect(parseDebugParams('?scene=jiangxue').scene).toBe('jiangxue');
  });

  it('debug=0 视为关闭', () => {
    expect(parseDebugParams('?debug=0').debug).toBe(false);
    expect(parseDebugParams('?debug=1').debug).toBe(true);
  });
});
