import {
  DataTexture,
  FloatType,
  LinearFilter,
  NoColorSpace,
  RedFormat,
  UnsignedByteType,
} from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export interface HeightmapMeta {
  scene: string;
  resolution: number;
  size: [number, number];
  heightRange: [number, number];
  waterLevel: number;
  bakedFrom: string;
  bakedAt: string;
}

export interface HeightmapAsset {
  heightTexture: DataTexture;
  guideTexture: DataTexture;
  meta: HeightmapMeta;
  dispose(): void;
}

/** CONTRACT 10.2：R/G 合成无符号 16 位高度，再映射回米。 */
export function decodeHeight(r: number, g: number, hMin: number, hMax: number): number {
  if (hMax <= hMin) throw new RangeError('heightRange 必须递增');
  const high = Math.min(255, Math.max(0, Math.round(r)));
  const low = Math.min(255, Math.max(0, Math.round(g)));
  return hMin + (((high << 8) | low) / 65535) * (hMax - hMin);
}

function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}

function assertMeta(value: unknown, scene: string): asserts value is HeightmapMeta {
  if (!value || typeof value !== 'object') throw new Error(`${scene} 高度图元数据不是对象`);
  const meta = value as Partial<HeightmapMeta>;
  if (
    meta.scene !== scene ||
    !Number.isInteger(meta.resolution) ||
    !Array.isArray(meta.size) ||
    meta.size.length !== 2 ||
    !Array.isArray(meta.heightRange) ||
    meta.heightRange.length !== 2 ||
    typeof meta.waterLevel !== 'number'
  ) {
    throw new Error(`${scene} 高度图元数据字段不完整`);
  }
}

function textureFromData(
  data: Float32Array | Uint8Array,
  width: number,
  height: number,
  type: typeof FloatType | typeof UnsignedByteType,
): DataTexture {
  const texture = new DataTexture(data, width, height, RedFormat, type);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

async function decodeHeightmap(blob: Blob, meta: HeightmapMeta): Promise<HeightmapAsset> {
  const bitmap = await createImageBitmap(blob, {
    colorSpaceConversion: 'none',
    premultiplyAlpha: 'none',
  });
  try {
    if (bitmap.width !== meta.resolution || bitmap.height !== meta.resolution) {
      throw new Error(
        `${meta.scene} 高度图尺寸 ${bitmap.width}×${bitmap.height} 与元数据 ${meta.resolution} 不一致`,
      );
    }
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('浏览器无法创建 2D Canvas 以解码高度图');
    context.drawImage(bitmap, 0, 0);
    const rgba = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    const count = bitmap.width * bitmap.height;
    const heights = new Float32Array(count);
    const guide = new Uint8Array(count);
    const [hMin, hMax] = meta.heightRange;

    // Canvas 行序从图片顶部开始；DataTexture 的第一行对应 v=0，故显式翻转。
    for (let y = 0; y < bitmap.height; y += 1) {
      const destY = bitmap.height - 1 - y;
      for (let x = 0; x < bitmap.width; x += 1) {
        const source = (y * bitmap.width + x) * 4;
        const dest = destY * bitmap.width + x;
        heights[dest] = decodeHeight(rgba[source], rgba[source + 1], hMin, hMax);
        guide[dest] = rgba[source + 2];
      }
    }

    const heightTexture = textureFromData(heights, bitmap.width, bitmap.height, FloatType);
    const guideTexture = textureFromData(guide, bitmap.width, bitmap.height, UnsignedByteType);
    return {
      heightTexture,
      guideTexture,
      meta,
      dispose: () => {
        heightTexture.dispose();
        guideTexture.dispose();
      },
    };
  } finally {
    bitmap.close();
  }
}

export class Assets {
  private readonly gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  private readonly heightmaps = new Map<string, Promise<HeightmapAsset>>();
  private readonly gltfs = new Map<string, Promise<GLTF>>();

  loadHeightmap(scene: string): Promise<HeightmapAsset> {
    const cached = this.heightmaps.get(scene);
    if (cached) return cached;
    const promise = Promise.all([
      fetch(assetUrl(`assets/terrain/${scene}.height.png`)),
      fetch(assetUrl(`assets/terrain/${scene}.height.json`)),
    ])
      .then(async ([imageResponse, metaResponse]) => {
        if (!imageResponse.ok) throw new Error(`高度图加载失败：${imageResponse.status}`);
        if (!metaResponse.ok) throw new Error(`高度图元数据加载失败：${metaResponse.status}`);
        const meta: unknown = await metaResponse.json();
        assertMeta(meta, scene);
        return decodeHeightmap(await imageResponse.blob(), meta);
      })
      .catch((error: unknown) => {
        this.heightmaps.delete(scene);
        throw error;
      });
    this.heightmaps.set(scene, promise);
    return promise;
  }

  loadGLB(url: string): Promise<GLTF> {
    const resolved = assetUrl(url.replace(/^\//, ''));
    const cached = this.gltfs.get(resolved);
    if (cached) return cached;
    const promise = this.gltfLoader.loadAsync(resolved).catch((error: unknown) => {
      this.gltfs.delete(resolved);
      throw error;
    });
    this.gltfs.set(resolved, promise);
    return promise;
  }
}
