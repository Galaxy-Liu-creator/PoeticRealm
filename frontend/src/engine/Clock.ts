// 全局时钟：整个作品唯一的时间来源（设计文档 16.4）。
// 画面只依赖 time，所以可以暂停、跳转、逐帧推进。

export class Clock {
  /** 单帧最大推进量（秒）：切回标签页或卡顿时不一步跳很远。 */
  static readonly MAX_DT = 0.1;

  time = 0;
  playing = true;
  private jumped = false;

  /** 主循环每帧调用，传入真实经过的秒数；返回本帧推进的秒数。 */
  tick(realDt: number): number {
    if (!this.playing) return 0;
    const dt = Math.min(Math.max(realDt, 0), Clock.MAX_DT);
    this.time += dt;
    return dt;
  }

  /** 逐帧推进，暂停时也有效（录制、测试用）。 */
  step(dt: number): number {
    this.time += dt;
    return dt;
  }

  seek(t: number): void {
    this.time = Math.max(0, t);
    this.jumped = true;
  }

  /** 读取并清除"刚发生过跳转"标记。不能写成 f(t) 的系统（InkSim）据此从 0 快进。 */
  consumeJump(): boolean {
    const j = this.jumped;
    this.jumped = false;
    return j;
  }

  play(): void {
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  toggle(): void {
    this.playing = !this.playing;
  }
}
