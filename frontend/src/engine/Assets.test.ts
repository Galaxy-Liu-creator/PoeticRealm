import { describe, expect, it } from 'vitest';
import { assertSampleManifest, decodeHeight, fullFengqiaoNodes } from './Assets';

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

describe('full Fengqiao manifest',()=>{
  const valid=()=>({contractVersion:'0.2',scene:'fengqiao',scope:'full-scene',terrain:'fengqiao',model:'models/fengqiao/scene_v02.glb',waterLevel:0,requiredNodes:[...fullFengqiaoNodes]});
  it('accepts the full scene and retains the earlier sample contract',()=>{
    expect(()=>assertSampleManifest(valid())).not.toThrow();
    expect(()=>assertSampleManifest({...valid(),scope:'quality-sample',terrain:undefined,requiredNodes:['boat_guest']})).not.toThrow();
  });
  it('rejects absent formal camera or sound markers and terrain path traversal',()=>{
    for(const missing of ['CAM_moonset','EMIT_bell','SFX_boat'])expect(()=>assertSampleManifest({...valid(),requiredNodes:fullFengqiaoNodes.filter(n=>n!==missing)})).toThrow();
    for(const terrain of [undefined,'../fengqiao','Fengqiao','fengqiao.png'])expect(()=>assertSampleManifest({...valid(),terrain})).toThrow();
  });
});
