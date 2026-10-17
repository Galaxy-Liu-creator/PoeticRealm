import { Mesh, SkinnedMesh, Texture, type Material, type Object3D, type Skeleton } from 'three';
/** 用于独占的 GLB 实例；共享缓存资源不得调用此释放器。 */
export function disposeObjectResources(root: Object3D): void {
  const geometries = new Set<Mesh['geometry']>(), materials = new Set<Material>(), textures = new Set<Texture>();
  const skeletons = new Set<Skeleton>();
  root.traverse(o => {
    if (!(o instanceof Mesh)) return;
    geometries.add(o.geometry);
    if (o instanceof SkinnedMesh) skeletons.add(o.skeleton);
    for (const material of Array.isArray(o.material) ? o.material : [o.material]) materials.add(material);
    if (o.customDepthMaterial) materials.add(o.customDepthMaterial);
    if (o.customDistanceMaterial) materials.add(o.customDistanceMaterial);
  });
  for (const material of materials) for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
  for (const geometry of geometries) geometry.dispose();
  for (const skeleton of skeletons) skeleton.dispose();
  for (const material of materials) material.dispose();
  const sources = new Set<unknown>();
  for (const texture of textures) { sources.add(texture.source.data); texture.dispose(); }
  for (const source of sources) if (source && typeof (source as ImageBitmap).close === 'function') (source as ImageBitmap).close();
  root.removeFromParent();
}
