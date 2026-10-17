// Verify delivered near geometry against the preserved scene-v01 asset.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {readAsset} from './asset-contract.mjs';

const [before,after]=await Promise.all([
  readAsset('public/assets/scenes/fengqiao.scene-v01.json'),
  readAsset('public/assets/scenes/fengqiao.scene-v02.json'),
]);
const sha=value=>createHash('sha256').update(value).digest('hex');
const caches=new WeakMap();
function accessor(asset,index) {
  let cache=caches.get(asset);if(!cache){cache=new Map();caches.set(asset,cache);}
  if(cache.has(index))return cache.get(index);
  const a=asset.gltf.accessors[index],v=asset.gltf.bufferViews[a.bufferView];
  assert(!a.sparse && v.buffer===0);
  const elements={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type];
  const bytes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}[a.componentType];
  assert(elements && bytes);
  const size=elements*bytes,stride=v.byteStride??size,packed=Buffer.alloc(a.count*size);
  for(let i=0;i<a.count;i++){
    const start=(v.byteOffset??0)+(a.byteOffset??0)+i*stride;
    asset.binary.copy(packed,i*size,start,start+size);
  }
  const result={type:a.type,componentType:a.componentType,count:a.count,normalized:!!a.normalized,sha256:sha(packed)};
  cache.set(index,result);return result;
}
function image(asset,index) {
  const source=asset.gltf.images[index],v=asset.gltf.bufferViews[source.bufferView];
  return {name:source.name,mimeType:source.mimeType,sha256:sha(asset.binary.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength))};
}
function texture(asset,index) {
  const t=asset.gltf.textures[index],source=t.extensions?.EXT_texture_webp?.source??t.source;
  return {source:image(asset,source),sampler:asset.gltf.samplers?.[t.sampler]};
}
function material(asset,index) {
  const normalize=value=>{
    if(Array.isArray(value))return value.map(normalize);
    if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,key==='index'&&typeof v==='number'?texture(asset,v):normalize(v)]));
    return value;
  };
  return normalize(asset.gltf.materials[index]);
}
function primitive(asset,p) {
  return {mode:p.mode??4,attributes:Object.fromEntries(Object.entries(p.attributes).map(([name,i])=>[name,accessor(asset,i)])),indices:p.indices===undefined?null:accessor(asset,p.indices),material:material(asset,p.material)};
}
function node(asset,n) {
  const jointName=i=>asset.gltf.nodes[i].name;
  const skin=n.skin===undefined?undefined:asset.gltf.skins[n.skin];
  return {
    translation:n.translation??[0,0,0],rotation:n.rotation??[0,0,0,1],scale:n.scale??[1,1,1],matrix:n.matrix,extras:n.extras,
    children:(n.children??[]).map(jointName).sort(),camera:n.camera===undefined?undefined:asset.gltf.cameras[n.camera],
    skin:skin?{joints:skin.joints.map(jointName),skeleton:skin.skeleton===undefined?undefined:jointName(skin.skeleton),bind:accessor(asset,skin.inverseBindMatrices)}:undefined,
    primitives:n.mesh===undefined?undefined:asset.gltf.meshes[n.mesh].primitives.map(p=>primitive(asset,p)),
  };
}
const byName=new Map(after.gltf.nodes.map(n=>[n.name,n]));
function changes(a,b,path='') {
  if(isDeepStrictEqual(a,b))return [];
  if(a && b && typeof a==='object' && typeof b==='object')return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(key=>changes(a[key],b[key],path+'.'+key));
  return [{path,before:b,after:a}];
}
const differences=[];
let nodes=0,meshes=0,skins=0;
for(const original of before.gltf.nodes) {
  // Only the export collection name and its added far children differ.
  if(original.name==='glb_scene_v01')continue;
  const candidate=byName.get(original.name);assert(candidate,'Near node missing: '+original.name);
  const differencesForNode=changes(node(after,candidate),node(before,original));
  if(differencesForNode.length)differences.push({node:original.name,differences:differencesForNode});
  nodes++;meshes+=original.mesh===undefined?0:1;skins+=original.skin===undefined?0:1;
}
console.log(JSON.stringify({status:differences.length?'failed':'pass',scope:'original named near nodes, packed accessor bytes, transforms, cameras, materials, embedded texture payloads and skin bindings',nodes,meshNodes:meshes,skinNodes:skins,beforeSHA256:sha(before.bytes),afterSHA256:sha(after.bytes),differences},null,2));
process.exitCode=differences.length?1:0;
