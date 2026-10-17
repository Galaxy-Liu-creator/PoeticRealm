import { Mesh, MeshStandardMaterial, type Object3D } from 'three';
const slots = new Set(['pbr_rock','pbr_stone','pbr_wood','pbr_tile','pbr_foliage','pbr_cloth','pbr_metal','pbr_skin','pbr_snow','glow']);
/** v0.2：保留 GLTFLoader 的 PBR 输入，把 COLOR_0 权重与表面颜色分开。 */
export function applyPbrMaterials(root: Object3D): void {
  root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    if (object.name === 'mask_probe') object.visible = false;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      const role = material.name.split('__')[0];
      if (!slots.has(role)) throw new Error('小样未登记材质：' + material.name);
      if (!(material instanceof MeshStandardMaterial)) throw new Error('资产未提供 PBR 材质：' + material.name);
      if (material.map && (!material.normalMap || !material.roughnessMap)) throw new Error('PBR 缺少法线或粗糙度：' + material.name);
      if (object.geometry.getAttribute('color')) object.geometry.setAttribute('behaviorMask', object.geometry.getAttribute('color'));
      material.vertexColors = false;
      material.needsUpdate = true;
    }
    object.castShadow = object.name !== 'mask_probe' && object.name !== 'fishfire_flame';
    object.receiveShadow = true;
  });
}
