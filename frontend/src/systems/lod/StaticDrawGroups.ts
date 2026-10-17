import { BufferGeometry, Group, Mesh, type Material, type Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { DistanceLod } from './DistanceLods';

/** Bounded static draw cache. Authored nodes and dynamic systems keep their ownership. */
export class StaticDrawGroups extends Group {
  private readonly levels: {near:Object3D;far:Object3D}[];
  private readonly originals = new Map<Mesh, boolean>();
  private readonly variants: Group[] = [];
  private readonly geometries = new Set<BufferGeometry>();
  private readonly transformed = new Map<Mesh, BufferGeometry>();
  private readonly levelMeshes: {near:Mesh[];far:Mesh[]}[] = [];
  private readonly fixed: Mesh[] = [];
  private readonly prepared = new Set<number>();
  private enabled = true;
  private activeVariant = 0;
  constructor(root: Object3D, definitions: DistanceLod[]) {
    super(); this.name = 'fengqiao_static_draw';
    this.levels = definitions.filter(d => ['temple_main','bell_tower','bridge_main'].includes(d.near))
      .map(d => ({near:root.getObjectByName(d.near)!,far:root.getObjectByName(d.far)!}));
    root.updateWorldMatrix(true,true);
    const collect = (node: Object3D): Mesh[] => {
      const meshes:Mesh[]=[];
      node.traverse(object => {
        if (!(object instanceof Mesh) || Array.isArray(object.material) || object.userData.behavior || !object.userData.static) return;
        meshes.push(object); this.originals.set(object,object.visible);
        if (!this.transformed.has(object)) this.transformed.set(object,object.geometry.clone().applyMatrix4(object.matrixWorld));
      }); return meshes;
    };
    try {
      this.levelMeshes.push(...this.levels.map(level=>({near:collect(level.near),far:collect(level.far)})));
      const shore=root.getObjectByName('shore_root'); if(shore)this.fixed.push(...collect(shore));
      for(let variant=0;variant<1<<this.levelMeshes.length;variant++) {
        const group=new Group(); group.visible=false; this.add(group); this.variants.push(group);
      }
      this.update();
    } catch(error) { this.dispose(); throw error; }
  }
  private prepare(variant:number):void {
    if(this.prepared.has(variant))return;
    const group=this.variants[variant];
    const buckets=new Map<string,{objects:Mesh[];material:Material}>();
    const selected=[...this.fixed,...this.levelMeshes.flatMap((level,index)=>variant&(1<<index)?level.far:level.near)];
    for(const object of selected) {
      const material=object.material as Material;
      const layout=Object.entries(object.geometry.attributes).map(([name,a])=>`${name}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`).sort().join(',');
      const key=`${material.uuid}:${object.castShadow}:${object.receiveShadow}:${layout}`;
      const bucket=buckets.get(key)??{objects:[],material};
      bucket.objects.push(object);buckets.set(key,bucket);
    }
    for(const {objects,material} of buckets.values()) {
      const geometry=mergeGeometries(objects.map(object=>this.transformed.get(object)!));
      if(!geometry) throw new Error('静态绘制合并属性不兼容');
      this.geometries.add(geometry);
      const mesh=new Mesh(geometry,material); mesh.castShadow=objects[0].castShadow; mesh.receiveShadow=objects[0].receiveShadow;
      // Source depth programs are warmed during initialization. Later
      // combinations share those same static material/layout variants.
      mesh.customDepthMaterial=objects[0].customDepthMaterial;
      group.add(mesh);
    }
    this.prepared.add(variant);
  }
  setEnabled(enabled:boolean):void { this.enabled=enabled;this.update(); }
  update():void {
    this.activeVariant=this.levels.reduce((key,level,index)=>key|(level.far.visible?1<<index:0),0);
    if(this.enabled)this.prepare(this.activeVariant);
    for(const [mesh,visible] of this.originals) mesh.visible=this.enabled?false:visible;
    this.visible=this.enabled;
    this.variants.forEach((variant,index)=>{variant.visible=index===this.activeVariant;});
  }
  details() { return {enabled:this.enabled,variant:this.activeVariant,variants:this.variants.length,preparedVariants:this.prepared.size,geometries:this.geometries.size,sourceMeshes:this.originals.size}; }
  override dispose():void {
    super.dispose();
    this.removeFromParent();
    for(const geometry of this.geometries) geometry.dispose();this.geometries.clear();
    for(const geometry of this.transformed.values())geometry.dispose();this.transformed.clear();
    for(const [mesh,visible] of this.originals)mesh.visible=visible;this.originals.clear();
    this.clear();this.variants.length=0;
    this.prepared.clear();this.levelMeshes.length=0;this.fixed.length=0;
  }
}
