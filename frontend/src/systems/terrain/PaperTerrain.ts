import {
  Color,
  DoubleSide,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  type Texture,
  Vector2,
} from 'three';
import type { HeightmapAsset } from '../../engine/Assets';
import fragmentShader from '../../shaders/materials/terrainGrow.frag.glsl';
import vertexShader from '../../shaders/materials/terrainGrow.vert.glsl';

export class PaperTerrain {
  readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly asset: HeightmapAsset;

  constructor(asset: HeightmapAsset, segments: number) {
    this.asset = asset;
    const { meta } = asset;
    const geometry = new PlaneGeometry(meta.size[0], meta.size[1], segments, segments);
    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: DoubleSide,
      uniforms: {
        uHeightMap: { value: asset.heightTexture },
        uInkMask: { value: asset.guideTexture },
        uTerrainSize: { value: new Vector2(...meta.size) },
        uTexel: { value: new Vector2(1 / meta.resolution, 1 / meta.resolution) },
        uHeightRange: { value: new Vector2(...meta.heightRange) },
        uWaterLevel: { value: meta.waterLevel },
        uGrow: { value: 0 },
        uMaskChannel: { value: 0 },
        uColorize: { value: 0.72 },
        uPaperColor: { value: new Color(0xf2ecdf) },
        uInkColor: { value: new Color(0x282b2d) },
        uLowColor: { value: new Color(0x53666a) },
        uHighColor: { value: new Color(0x2d3b3e) },
        uWaterColor: { value: new Color(0x657b80) },
      },
    });
    this.mesh = new Mesh(geometry, material);
    // PlaneGeometry 的 +Y 经旋转后对应 three.js 的 -Z，与 CONTRACT 10.2 一致。
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.name = 'paper_terrain';
  }

  get grow(): number {
    return this.mesh.material.uniforms.uGrow.value as number;
  }

  set grow(value: number) {
    this.mesh.material.uniforms.uGrow.value = Math.min(1, Math.max(0, value));
  }

  get colorize(): number {
    return this.mesh.material.uniforms.uColorize.value as number;
  }

  set colorize(value: number) {
    this.mesh.material.uniforms.uColorize.value = Math.min(1, Math.max(0, value));
  }

  useInkMask(texture: Texture): void {
    this.mesh.material.uniforms.uInkMask.value = texture;
    this.mesh.material.uniforms.uMaskChannel.value = 1;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.asset.dispose();
  }
}
