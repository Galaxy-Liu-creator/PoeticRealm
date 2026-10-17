import {CubeUVReflectionMapping,DataTexture,HalfFloatType,LinearFilter,LinearSRGBColorSpace,RGBAFormat} from 'three';

/** Exact half-float PMREM texels, baked offline; no filtering or color conversion during decoding. */
export async function loadNightEnvironment(path: string, signal: AbortSignal): Promise<DataTexture> {
  const response = await fetch(`${import.meta.env.BASE_URL}assets/${path}`, {signal});
  if (!response.ok || !response.body) throw new Error('夜景环境加载失败：' + response.status);
  // Vite serves .gz with Content-Encoding; other static servers may serve the gzip bytes.
  let raw = await response.arrayBuffer();
  if (raw.byteLength < 4 || new DataView(raw).getUint32(0,true) !== 0x56555250) {
    raw = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }
  if (signal.aborted) throw new DOMException('环境准备取消', 'AbortError');
  const header = new DataView(raw);
  if (raw.byteLength < 16 || header.getUint32(0,true) !== 0x56555250 || header.getUint32(4,true) !== 1) throw new Error('夜景环境格式不支持');
  const width = header.getUint32(8,true), height = header.getUint32(12,true), size = height / 4;
  if (width > 2048 || height > 2048 || !Number.isInteger(Math.log2(size)) || width !== 3 * Math.max(size,112) || raw.byteLength !== 16 + width * height * 8) throw new Error('夜景环境尺寸/数据不完整');
  const texture = new DataTexture(new Uint16Array(raw,16), width, height, RGBAFormat, HalfFloatType);
  texture.name = 'FengqiaoNight.PMREM'; texture.mapping = CubeUVReflectionMapping;
  texture.colorSpace = LinearSRGBColorSpace; texture.minFilter = texture.magFilter = LinearFilter;
  texture.generateMipmaps = false; texture.needsUpdate = true;
  return texture;
}
