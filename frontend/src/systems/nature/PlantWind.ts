import { Mesh, type Material, type Object3D } from 'three';
import { plantWindHeader, plantWindNormal, plantWindPosition } from '../../shaders/plantWind.glsl';

interface WindEntry {
  object: Mesh; original: Material | Material[]; surfaces: Material[];
  amp: {value:number}; freq: {value:number}; phase: {value:number}; height: {value:number};
}

/** Stateless seeded wind. Roots with a zero mask remain fixed in every pass. */
export class PlantWind {
  private readonly time = { value: 0 };
  private readonly entries = new Map<Mesh, WindEntry>();
  private readonly depthPrograms = new Set<Material>();
  private surfaceCompiles = 0;
  private depthCompiles = 0;
  private enabled = true;

  constructor(root: Object3D) {
    root.traverse(object => {
      if (!(object instanceof Mesh) || object.userData.behavior !== 'sway') return;
      const mask = object.geometry.getAttribute('behaviorMask');
      if (!mask) throw new Error('植物缺少行为遮罩：' + object.name);
      object.geometry.computeBoundingBox(); object.geometry.computeBoundingSphere();
      const bounds = object.geometry.boundingBox!;
      const amplitude = Number(object.userData.amp), frequency = Number(object.userData.freq), phase = Number(object.userData.phase);
      if (![amplitude, frequency, phase].every(Number.isFinite) || amplitude < 0 || amplitude > .2 || frequency <= 0) throw new Error('植物风参数非法：' + object.name);
      const original = object.material;
      const surfaces = (Array.isArray(original) ? original : [original]).map(surface => {
        const clone = surface.clone();
        clone.onBeforeCompile = surface.onBeforeCompile;
        clone.customProgramCacheKey = surface.customProgramCacheKey;
        return clone;
      });
      const entry: WindEntry = {object, original, surfaces, amp:{value:amplitude}, freq:{value:frequency}, phase:{value:phase}, height:{value:Math.max(1,bounds.max.y-bounds.min.y)}};
      this.entries.set(object,entry);
      for (const surface of surfaces) this.patch(surface,entry,false);
      object.material = Array.isArray(original) ? surfaces : surfaces[0];
      bounds.expandByScalar(amplitude * 1.5); object.geometry.boundingSphere!.radius += amplitude * 1.5;
    });
  }

  private patch(material: Material, entry: WindEntry, depth: boolean): void {
    const previous = material.onBeforeCompile;
    const previousKey = material.customProgramCacheKey.bind(material);
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material,shader,renderer);
      if (!shader.vertexShader.includes('#include <begin_vertex>')) throw new Error('锁定 Three.js 的植物顶点入口不存在');
      shader.uniforms.plantWindTime = this.time;
      shader.uniforms.plantWindAmp = entry.amp;
      shader.uniforms.plantWindFreq = entry.freq;
      shader.uniforms.plantWindPhase = entry.phase;
      shader.uniforms.plantWindHeight = entry.height;
      const position = depth ? 'vec2 plantWindBend = poeticPlantWind(position, behaviorMask);\n' + plantWindPosition : plantWindPosition;
      shader.vertexShader = plantWindHeader + shader.vertexShader.replace('#include <begin_vertex>',position);
      if (!depth) shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>',plantWindNormal);
      if (depth) this.depthCompiles++; else this.surfaceCompiles++;
    };
    material.customProgramCacheKey = () => previousKey() + '|fengqiao-mask-wind-v01';
    material.needsUpdate = true;
  }

  key(object: Mesh): string {
    const entry = this.entries.get(object);
    return entry ? `wind-${object.userData.amp}-${entry.freq.value}-${entry.phase.value}-${entry.height.value}` : 'still';
  }

  attachDepth(object: Mesh, material: Material): void {
    const entry = this.entries.get(object);
    if (!entry || this.depthPrograms.has(material)) return;
    this.patch(material,entry,true); this.depthPrograms.add(material);
  }

  update(t: number): void { this.time.value = t; }
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    for (const entry of this.entries.values()) entry.amp.value = enabled ? Number(entry.object.userData.amp) : 0;
  }

  details() {
    let rootVertices = 0;
    for (const {object} of this.entries.values()) {
      const mask = object.geometry.getAttribute('behaviorMask');
      for (let i=0;i<mask.count;i++) if (mask.getX(i) === 0) rootVertices++;
    }
    return {meshes:this.entries.size, rootVertices, time:this.time.value, enabled:this.enabled, surfaceCompiles:this.surfaceCompiles, depthCompiles:this.depthCompiles};
  }

  dispose(): void {
    for (const entry of this.entries.values()) {
      entry.object.material = entry.original;
      for (const surface of entry.surfaces) surface.dispose();
    }
    this.entries.clear(); this.depthPrograms.clear();
  }
}
