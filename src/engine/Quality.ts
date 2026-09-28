// 画质分档（设计文档 24.3）。P0 只做初始档位，运行中降档在 P1 以后补。
import type { QualityTier } from './debugParams';

export interface QualitySettings {
  tier: QualityTier;
  pixelRatio: number;
  inkSimSize: number;
  terrainSegments: number;
  kuwahara: 'full' | 'half' | 'off';
}

export function qualitySettings(tier: QualityTier): QualitySettings {
  const dpr = window.devicePixelRatio || 1;
  switch (tier) {
    case 'high':
      return { tier, pixelRatio: Math.min(dpr, 2), inkSimSize: 1024, terrainSegments: 512, kuwahara: 'half' };
    case 'mid':
      return { tier, pixelRatio: Math.min(dpr, 1.5), inkSimSize: 512, terrainSegments: 384, kuwahara: 'half' };
    case 'low':
      return { tier, pixelRatio: 1, inkSimSize: 512, terrainSegments: 256, kuwahara: 'off' };
  }
}

/** 没有 ?q= 时按设备粗分：集显 / 移动端默认 mid。 */
export function detectTier(): QualityTier {
  const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  return mobile ? 'low' : 'high';
}
