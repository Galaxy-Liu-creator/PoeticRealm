import { readAsset, slots, requireThat, accessorValues } from './asset-contract.mjs';
import {closedHullTopology} from './oar-clearance.mjs';
import {Matrix4,Vector3,Quaternion} from 'three';
import {checkJiangxueFloat} from './jiangxue-float-contract.mjs';
import {checkJiangxueBank} from './jiangxue-bank-contract.mjs';
export function checkContract(asset) {
  const {gltf,manifest}=asset;
  if(manifest.scene==='jiangxue'&&['models/jiangxue/scene_v03.glb','models/jiangxue/scene_v04.glb','models/jiangxue/scene_v05.glb','models/jiangxue/scene_v06.glb'].includes(manifest.model))requireThat(manifest.boatNavigation!==undefined,'江雪浮舟缺少河道路径');
  if (manifest.boatNavigation !== undefined) {
    const route=manifest.boatNavigation;
    requireThat(route && Array.isArray(route.path) && route.path.length>=3 && route.path.length<=64 &&
      route.path.every((p,i)=>Array.isArray(p) && p.length===2 && p.every(Number.isFinite) &&
        (!i || Math.hypot(p[0]-route.path[i-1][0],p[1]-route.path[i-1][1])>=.001)) &&
      Number.isFinite(route.speed) && route.speed>0 && Number.isFinite(route.brakingDistance) && route.brakingDistance>0,
      '舟航行路径或速度非法');
    const start=gltf.nodes.find(n=>n.name==='boat_guest')?.translation;
    requireThat(start && Math.hypot(start[0]-route.path[0][0],start[2]-route.path[0][1])<=.001,'舟航行起点与制作位置不一致');
  }
  if(manifest.environment!==undefined) {
    const raw=asset.environment?.raw;
    requireThat(raw?.length>=16 && raw.readUInt32LE(0)===0x56555250 && raw.readUInt32LE(4)===1,'环境格式错误');
    const width=raw.readUInt32LE(8),height=raw.readUInt32LE(12),size=height/4;
    requireThat(width<=2048 && height<=2048 && Number.isInteger(Math.log2(size)) && width===3*Math.max(size,112) && raw.length===16+width*height*8,'环境尺寸/数据不完整');
  }
  const names=new Set();
  for(const n of gltf.nodes??[]) {
    requireThat(n.name && !names.has(n.name), '节点无名字或重复：'+n.name);
    requireThat(/^(?:[a-z][a-z0-9_]*|(?:CAM|FOCUS|EMIT|SFX|LIGHT|ANCHOR|PLACE)_[a-z0-9_]+)$/.test(n.name),'非法节点名：'+n.name);
    names.add(n.name);
    if(n.name.startsWith('CAM_')) requireThat(n.camera!==undefined && ['gao','shen','ping'].includes(n.extras?.yuan),'相机缺少 camera/yuan：'+n.name);
    if(n.name.startsWith('LIGHT_')) requireThat(['point','spot'].includes(n.extras?.light),'灯光类型未登记');
  }
  for(const name of manifest.requiredNodes) requireThat(names.has(name),'缺少必需节点：'+name);
  if(manifest.distanceLods!==undefined) {
    requireThat(Array.isArray(manifest.distanceLods) && manifest.distanceLods.length>0 && manifest.distanceLods.length<=16,'近远层级清单非法');
    const used=new Set(), parents=new Map();
    gltf.nodes.forEach((node,i)=>(node.children??[]).forEach(child=>parents.set(child,i)));
    const ancestors=index=>{const result=[];while(parents.has(index)){index=parents.get(index);requireThat(!result.includes(index),'层级根循环');result.push(index);}return result;};
    const local=index=>{const node=gltf.nodes[index];return node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(new Vector3().fromArray(node.translation??[0,0,0]),new Quaternion().fromArray(node.rotation??[0,0,0,1]),new Vector3().fromArray(node.scale??[1,1,1]));};
    const world=index=>ancestors(index).reverse().reduce((matrix,parent)=>matrix.multiply(local(parent)),new Matrix4()).multiply(local(index));
    const meshes=index=>{const node=gltf.nodes[index];return (node.mesh!==undefined?1:0)+(node.children??[]).reduce((count,child)=>count+meshes(child),0);};
    for(const entry of manifest.distanceLods) {
      requireThat(entry && [entry.near,entry.far].every(name=>typeof name==='string' && /^[a-z][a-z0-9_]*$/.test(name) && names.has(name) && manifest.requiredNodes.includes(name) && !used.has(name)) && entry.near!==entry.far && Number.isFinite(entry.distance) && entry.distance>0 && entry.distance<=200,'近远层级节点/距离非法');
      used.add(entry.near);used.add(entry.far);
      const near=gltf.nodes.findIndex(n=>n.name===entry.near),far=gltf.nodes.findIndex(n=>n.name===entry.far);
      requireThat(!ancestors(near).includes(far) && !ancestors(far).includes(near) && meshes(near)>0 && meshes(far)>0,'近远层级不是独立网格根');
      const a=world(near).elements,b=world(far).elements;
      requireThat(a.every((value,i)=>Math.abs(value-b[i])<1e-5),'近远层级世界变换不同');
    }
  }
  if(manifest.distanceLods) {
    const roots=manifest.distanceLods.flatMap(entry=>[entry.near,entry.far]);
    for(const name of roots) {
      const index=gltf.nodes.findIndex(node=>node.name===name);
      const nested=[];
      const visit=child=>{nested.push(gltf.nodes[child].name);for(const descendant of gltf.nodes[child].children??[])visit(descendant);};
      for(const child of gltf.nodes[index].children??[])visit(child);
      requireThat(!roots.some(other=>other!==name && nested.includes(other)),'不同近远层级互相包含');
    }
  }
  for(const texture of gltf.textures??[]) {
    const webp=texture.extensions?.EXT_texture_webp;
    const source=webp?.source??texture.source;
    requireThat(Number.isInteger(source) && gltf.images?.[source],'贴图图像索引无效');
    if(webp) {
      requireThat(gltf.images[source].mimeType==='image/webp' && gltf.extensionsUsed?.includes('EXT_texture_webp'),'WebP扩展或MIME错误');
      if(texture.source===undefined) requireThat(gltf.extensionsRequired?.includes('EXT_texture_webp'),'无回退WebP必须声明required');
    } else requireThat(gltf.images[source].mimeType!=='image/webp','WebP必须通过登记扩展引用');
  }
  let hull;
  if(names.has('boat_hull_closed')) {
    const index=gltf.nodes.findIndex(n=>n.name==='boat_hull_closed');
    requireThat(gltf.nodes.find(n=>n.name==='boat_guest')?.children?.includes(index),'船壳父级错误');
    requireThat(gltf.nodes[index].skin===undefined,'船壳不应绑定人物 skin');
    hull=closedHullTopology(asset);
  }
  if(names.has('ANCHOR_rower_foot_left')) {
    const nodes=gltf.nodes, index=name=>nodes.findIndex(n=>n.name===name);
    const parentPairs=[['rower_rig','boat_guest'],['oar_pivot','boat_guest'],
      ['ANCHOR_oar_tether','oar_pivot'],['ANCHOR_boat_tether','boat_guest'],['ANCHOR_oar_blade','oar_pivot']];
    const joints=new Set((gltf.skins??[]).flatMap(s=>s.joints??[]));
    for(const side of ['left','right']) {
      parentPairs.push(['ANCHOR_rower_palm_'+side,'rower_hand_'+side],['ANCHOR_rower_foot_'+side,'boat_guest'],['ANCHOR_oar_hand_'+side,'oar_pivot']);
      for(const part of ['upper','fore','hand','thigh','shin','foot']) requireThat(joints.has(index('rower_'+part+'_'+side)),'摇橹关节未绑定 skin：'+part+'_'+side);
    }
    for(const [child,parent] of parentPairs) requireThat(index(child)>=0 && nodes[index(parent)]?.children?.includes(index(child)), '摇橹挂点父级错误：'+child+' 应属于 '+parent);
  }
  const propertyNames=new Set(['behavior','amp','freq','phase','reveal','static','yuan','light','color','intensity','range','asset','width','height']);
  for(const n of gltf.nodes??[]) for(const key of Object.keys(n.extras??{})) requireThat(propertyNames.has(key),'未登记属性：'+n.name+'.'+key);
  for(const m of gltf.materials??[]) {
    const base=m.name?.split('__')[0];
    requireThat(slots.has(base),'未登记材质：'+m.name);
    if(['pbr_rock','pbr_stone','pbr_wood','pbr_tile','pbr_cloth','pbr_foliage','pbr_skin','pbr_snow'].includes(base)) requireThat((m.pbrMetallicRoughness?.metallicFactor??1)===0,'非金属材质 metallicFactor 必须为0：'+m.name);
    if(base.startsWith('pbr_') && m.pbrMetallicRoughness?.baseColorTexture) {
      requireThat(m.normalTexture && m.pbrMetallicRoughness.metallicRoughnessTexture,'写实材质缺 Normal/ORM：'+m.name);
      for(const texture of [m.normalTexture,m.pbrMetallicRoughness.baseColorTexture,m.pbrMetallicRoughness.metallicRoughnessTexture,m.occlusionTexture].filter(Boolean)) requireThat((texture.texCoord??0)===0,'小样仅登记 UV0');
    }
  }
  for(const mesh of gltf.meshes??[]) {
    requireThat(mesh.primitives.length<=2,'网格超过两材质批次：'+mesh.name);
    for(const p of mesh.primitives) {
      requireThat(p.attributes?.POSITION!==undefined && p.attributes.NORMAL!==undefined,'缺顶点/法线：'+mesh.name);
      const m=gltf.materials[p.material], base=m?.name?.split('__')[0];
      requireThat(m,'缺材质：'+mesh.name);
      if(base.startsWith('pbr_') && m.pbrMetallicRoughness?.baseColorTexture) requireThat(p.attributes.TEXCOORD_0!==undefined,'缺 UV0：'+mesh.name);
      if(m.normalTexture) requireThat(p.attributes.TANGENT!==undefined,'缺导出切线：'+mesh.name);
      if(['pbr_foliage','pbr_cloth','ink_foliage','ink_cloth'].includes(base)) requireThat(p.attributes.COLOR_0!==undefined,'缺行为遮罩：'+mesh.name);
    }
  }
  if(names.has('rower_rig')) requireThat(gltf.skins?.length,'船夫缺少 skin');
  for(const skin of gltf.skins??[]) {
    requireThat(skin.joints?.length && skin.joints.every(index=>gltf.nodes[index]),'skin 骨骼索引无效');
    const inverse=gltf.accessors[skin.inverseBindMatrices];
    requireThat(inverse?.type==='MAT4' && inverse.componentType===5126 && inverse.count===skin.joints.length,'skin 缺完整 inverseBindMatrices');
  }
  for(const node of gltf.nodes??[]) {
    if(node.skin===undefined) continue;
    const skin=gltf.skins[node.skin];
    requireThat(skin && node.mesh!==undefined,'skin 必须绑定有效网格');
    for(const primitive of gltf.meshes[node.mesh].primitives) {
      requireThat(primitive.attributes.JOINTS_0!==undefined && primitive.attributes.WEIGHTS_0!==undefined,'skin 缺 JOINTS_0/WEIGHTS_0');
      const joints=accessorValues(asset,primitive.attributes.JOINTS_0), weights=accessorValues(asset,primitive.attributes.WEIGHTS_0);
      requireThat(joints.count===4 && weights.count===4 && joints.values.length===weights.values.length,'skin 权重维数错误');
      requireThat(weights.values.length/4===gltf.accessors[primitive.attributes.POSITION].count,'skin 权重/顶点数量不一致');
      requireThat(joints.values.every(index=>Number.isInteger(index) && index>=0 && index<skin.joints.length),'skin joint 超出骨架');
      for(let i=0;i<weights.values.length;i+=4) requireThat(Math.abs(weights.values.slice(i,i+4).reduce((a,b)=>a+b,0)-1)<.001,'skin 权重未归一化');
    }
  }
  const probe=gltf.nodes.find(n=>n.name==='mask_probe');
  requireThat(probe?.mesh!==undefined,'缺少遮罩校准网格');
  const p=gltf.meshes[probe.mesh].primitives[0];
  requireThat(p.attributes.COLOR_0!==undefined,'校准遮罩未导出');
  const colors=accessorValues(asset,p.attributes.COLOR_0);
  const red=colors.values.filter((_,i)=>i%colors.count===0);
  for(const expected of [0,.5,1]) requireThat(red.some(value=>Math.abs(value-expected)<.01),'遮罩往返改变权重：'+expected);
  const floating=manifest.scene==='jiangxue'&&manifest.boatNavigation?checkJiangxueFloat(asset):undefined;
  const bank=manifest.scene==='jiangxue'&&['models/jiangxue/scene_v05.glb','models/jiangxue/scene_v06.glb'].includes(manifest.model)?checkJiangxueBank(asset):undefined;
  return {scope:manifest.scope,nodes:names.size,meshes:gltf.meshes.length,materials:gltf.materials.length,skins:gltf.skins?.length??0,maskCalibration:red,hull,floating,bank};
}
if(process.argv[1]?.endsWith('check-contract.mjs')) {
  try { console.log(JSON.stringify(checkContract(await readAsset(process.argv[2])),null,2)); }
  catch(error) { console.error('[contract] '+error.message); process.exitCode=1; }
}
