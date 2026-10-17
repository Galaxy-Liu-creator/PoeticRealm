import { Box3, Mesh, Vector3, type Camera, type Object3D } from 'three';

export interface DistanceLod { near: string; far: string; distance: number; }
export function assertDistanceLods(value: unknown, requiredNodes: string[]): asserts value is DistanceLod[] {
  if (!Array.isArray(value) || !value.length || value.length > 16) throw new Error('近远层级清单非法');
  const names = new Set<string>();
  for (const entry of value) {
    if (!entry || ![entry.near, entry.far].every(name => typeof name === 'string' && /^[a-z][a-z0-9_]*$/.test(name) && requiredNodes.includes(name) && !names.has(name)) ||
        entry.near === entry.far || !Number.isFinite(entry.distance) || entry.distance <= 0 || entry.distance > 200) throw new Error('近远层级节点或距离非法');
    names.add(entry.near); names.add(entry.far);
  }
}
const contains = (parent: Object3D, object: Object3D): boolean => {
  for (let node: Object3D | null = object; node; node = node.parent) if (node === parent) return true;
  return false;
};
export function assertLodRoots(root: Object3D, definitions: DistanceLod[]): void {
  root.updateWorldMatrix(true, true);
  const roots: Object3D[] = [];
  for (const definition of definitions) {
    const near = root.getObjectByName(definition.near), far = root.getObjectByName(definition.far);
    if (!near || !far || contains(near, far) || contains(far, near)) throw new Error('近远层级缺少独立根：' + definition.near);
    roots.push(near,far);
    if (near.matrixWorld.elements.some((value, index) => Math.abs(value - far.matrixWorld.elements[index]) > 1e-5)) throw new Error('近远层级世界变换不一致：' + definition.near);
    for (const level of [near, far]) {
      let meshes = 0;
      level.traverse(object => { if (object instanceof Mesh) meshes++; });
      if (!meshes) throw new Error('近远层级为空：' + level.name);
    }
  }
  for (const parent of roots) for (const child of roots) if (parent !== child && contains(parent,child)) throw new Error('不同近远层级互相包含');
}

/** Choose once with the main camera. Reflection and shadow renders reuse visibility. */
export class DistanceLods {
  private readonly cameraPoint = new Vector3();
  private mode: 'auto' | 'near' | 'far' = 'auto';
  private readonly entries;
  constructor(root: Object3D, definitions: DistanceLod[]) {
    assertLodRoots(root, definitions);
    this.entries = definitions.map(definition => {
      const near = root.getObjectByName(definition.near)!, far = root.getObjectByName(definition.far)!;
      const bounds = new Box3();
      near.traverse(object => { if (object instanceof Mesh) bounds.union(new Box3().setFromObject(object)); });
      return { definition, near, far, center: bounds.getCenter(new Vector3()), distance: 0, level: 'near',
        nearVisible: near.visible, farVisible: far.visible };
    });
  }
  update(camera: Camera): void {
    camera.getWorldPosition(this.cameraPoint);
    for (const entry of this.entries) {
      entry.distance = this.cameraPoint.distanceTo(entry.center);
      const near = this.mode === 'near' || (this.mode === 'auto' && entry.distance < entry.definition.distance);
      entry.near.visible = near; entry.far.visible = !near; entry.level = near ? 'near' : 'far';
    }
  }
  setMode(mode: 'auto' | 'near' | 'far'): void { this.mode = mode; }
  details() { return this.entries.map(entry => ({...entry.definition, center: entry.center.toArray(), cameraDistance: entry.distance, level: entry.level, nearVisible: entry.near.visible, farVisible: entry.far.visible})); }
  dispose(): void { for (const entry of this.entries) { entry.near.visible = entry.nearVisible; entry.far.visible = entry.farVisible; } }
}
