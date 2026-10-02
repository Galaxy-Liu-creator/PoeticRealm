import { describe, expect, it } from 'vitest';
import { Clock } from './Clock';

describe('Clock', () => {
  it('播放时按真实 dt 推进', () => {
    const c = new Clock();
    expect(c.tick(0.016)).toBeCloseTo(0.016);
    expect(c.time).toBeCloseTo(0.016);
  });

  it('暂停时 tick 不推进，返回 0', () => {
    const c = new Clock();
    c.pause();
    expect(c.tick(0.5)).toBe(0);
    expect(c.time).toBe(0);
    c.play();
    c.tick(0.05);
    expect(c.time).toBeCloseTo(0.05);
  });

  it('单帧 dt 有上限，切回标签页不会一步跳很远', () => {
    const c = new Clock();
    c.tick(5);
    expect(c.time).toBeCloseTo(Clock.MAX_DT);
  });

  it('seek 直接跳到指定时刻，负数钳到 0，并记录跳转', () => {
    const c = new Clock();
    c.seek(42);
    expect(c.time).toBe(42);
    expect(c.consumeJump()).toBe(true);
    expect(c.consumeJump()).toBe(false);
    c.seek(-3);
    expect(c.time).toBe(0);
  });

  it('step 在暂停时也能推进（逐帧录制用）', () => {
    const c = new Clock();
    c.pause();
    for (let i = 0; i < 60; i++) c.step(1 / 60);
    expect(c.time).toBeCloseTo(1);
    expect(c.playing).toBe(false);
  });

  it('toggle 切换播放状态', () => {
    const c = new Clock();
    c.toggle();
    expect(c.playing).toBe(false);
    c.toggle();
    expect(c.playing).toBe(true);
  });
});
