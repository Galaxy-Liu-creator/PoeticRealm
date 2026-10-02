// 带种子的随机数。画面里一切"随机"都从这里来，保证同一时刻的画面可复现。
// 禁止在动画中使用 Math.random()（CLAUDE.md）。

/** mulberry32：32 位状态，足够快，分布足够好。返回 [0, 1) 的生成器。 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 字符串哈希。用于由物体名得出稳定的种子或相位（CONTRACT 5.1 `phase`）。 */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
