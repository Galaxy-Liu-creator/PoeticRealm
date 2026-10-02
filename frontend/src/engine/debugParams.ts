// URL 调试参数（设计文档 16.5）。纯函数，便于测试；DOM 相关部分在 Debug.ts。

export type QualityTier = 'high' | 'mid' | 'low';

export interface DebugParams {
  scene?: string;
  t?: number;
  q?: QualityTier;
  debug: boolean;
}

const TIERS: readonly QualityTier[] = ['high', 'mid', 'low'];

export function parseDebugParams(search: string): DebugParams {
  const p = new URLSearchParams(search);
  const out: DebugParams = { debug: p.has('debug') && p.get('debug') !== '0' };

  const scene = p.get('scene');
  if (scene && /^[a-z]+$/.test(scene)) out.scene = scene;

  const tRaw = p.get('t');
  if (tRaw) {
    const t = Number(tRaw);
    if (Number.isFinite(t) && t >= 0) out.t = t;
  }

  const q = p.get('q');
  if (q && (TIERS as readonly string[]).includes(q)) out.q = q as QualityTier;

  return out;
}
