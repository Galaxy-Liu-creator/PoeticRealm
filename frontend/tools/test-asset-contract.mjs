import assert from 'node:assert/strict';
import {readAsset,imageDimensions} from './asset-contract.mjs';
import {checkContract} from './check-contract.mjs';
import {checkBudget} from './check-budget.mjs';
import {createOarClearance} from './oar-clearance.mjs';
const asset=await readAsset(process.argv[2]);
checkContract(asset);checkBudget(asset);
const bad=()=>({...asset,gltf:structuredClone(asset.gltf),manifest:structuredClone(asset.manifest),environment:{packed:Buffer.from(asset.environment.packed),raw:Buffer.from(asset.environment.raw)}});
let fixture=bad();fixture.manifest.requiredNodes.push('CAM_missing');assert.throws(()=>checkContract(fixture),/缺少/);
fixture=bad();delete fixture.gltf.materials.find(m=>m.normalTexture).normalTexture;assert.throws(()=>checkContract(fixture),/Normal/);
fixture=bad();delete fixture.gltf.meshes.find(m=>fixture.gltf.materials[m.primitives[0].material].pbrMetallicRoughness?.baseColorTexture).primitives[0].attributes.TEXCOORD_0;assert.throws(()=>checkContract(fixture),/UV0/);
fixture=bad();fixture.gltf.meshes[fixture.gltf.nodes.find(n=>n.name==='mask_probe').mesh].primitives[0].attributes.COLOR_0=undefined;assert.throws(()=>checkContract(fixture),/遮罩/);
fixture=bad();fixture.bytes=Buffer.alloc(15_000_001);assert.throws(()=>checkBudget(fixture),/15MB/);
fixture=bad();delete fixture.gltf.meshes.find(m=>m.primitives[0].attributes.TANGENT!==undefined).primitives[0].attributes.TANGENT;assert.throws(()=>checkContract(fixture),/切线/);
fixture=bad();fixture.gltf.materials.find(m=>m.normalTexture).pbrMetallicRoughness.metallicRoughnessTexture.texCoord=1;assert.throws(()=>checkContract(fixture),/UV0/);
fixture=bad();fixture.gltf.materials.find(m=>m.name.startsWith('pbr_wood')).pbrMetallicRoughness.metallicFactor=.5;assert.throws(()=>checkContract(fixture),/非金属/);
fixture=bad();delete fixture.gltf.skins;assert.throws(()=>checkContract(fixture),/skin/);
fixture=bad();delete fixture.gltf.meshes[fixture.gltf.nodes.find(n=>n.skin!==undefined).mesh].primitives[0].attributes.JOINTS_0;assert.throws(()=>checkContract(fixture),/JOINTS/);
for(const name of ['ANCHOR_rower_palm_left','ANCHOR_rower_foot_right','ANCHOR_oar_tether']) {
  fixture=bad();const child=fixture.gltf.nodes.findIndex(n=>n.name===name);
  for(const n of fixture.gltf.nodes) if(n.children) n.children=n.children.filter(i=>i!==child);
  assert.throws(()=>checkContract(fixture),/父级错误/);
}
fixture=bad();const shin=fixture.gltf.nodes.findIndex(n=>n.name==='rower_shin_left');
for(const skin of fixture.gltf.skins) skin.joints=skin.joints.filter(i=>i!==shin);
assert.throws(()=>checkContract(fixture),/摇橹关节/);
fixture=bad();const hullIndex=fixture.gltf.nodes.findIndex(n=>n.name==='boat_hull_closed');
fixture.gltf.nodes.find(n=>n.name==='boat_guest').children=fixture.gltf.nodes.find(n=>n.name==='boat_guest').children.filter(i=>i!==hullIndex);
assert.throws(()=>checkContract(fixture),/船壳父级/);
fixture=bad();const hull=fixture.gltf.nodes.find(n=>n.name==='boat_hull_closed');
fixture.gltf.accessors[fixture.gltf.meshes[hull.mesh].primitives[0].indices].count-=3;
assert.throws(()=>checkContract(fixture),/封闭性/);
const collision=createOarClearance(asset).check({oarPosition:[0,.65,0],oarRotation:[0,0,0,1]});
assert(collision.intersections>0,'故意插入船壳的桨未被碰撞检测发现');
fixture=bad();fixture.environment.raw.writeUInt32LE(383,8);assert.throws(()=>checkContract(fixture),/环境尺寸/);
fixture=bad();fixture.environment.raw.writeUInt32LE(2,4);assert.throws(()=>checkContract(fixture),/环境格式/);
const webpTexture=asset.gltf.textures.find(t=>t.extensions?.EXT_texture_webp);
if(webpTexture) {
  fixture=bad();delete fixture.gltf.extensionsRequired;assert.throws(()=>checkContract(fixture),/required/);
  fixture=bad();const texture=fixture.gltf.textures.find(t=>t.extensions?.EXT_texture_webp);texture.extensions.EXT_texture_webp.source=999;assert.throws(()=>checkContract(fixture),/索引/);
  const view=asset.gltf.bufferViews[asset.gltf.images[webpTexture.extensions.EXT_texture_webp.source].bufferView];
  const invalid=Buffer.from(asset.binary.subarray(view.byteOffset,view.byteOffset+view.byteLength));invalid.writeUInt32LE(1,4);
  assert.throws(()=>imageDimensions(invalid),/长度/);
}
if(asset.manifest.boatNavigation) {
  for(const mutate of [r=>r.speed=-1,r=>r.brakingDistance=0,r=>r.path[1]=r.path[0],r=>r.path[0]=[100,100]]) {
    fixture=bad();mutate(fixture.manifest.boatNavigation);assert.throws(()=>checkContract(fixture),/舟航行/);
  }
}
if(asset.manifest.distanceLods) {
  for(const mutate of [f=>f.manifest.distanceLods[0].distance=0,
    f=>f.manifest.distanceLods[0].far='missing',
    f=>f.manifest.distanceLods.push(f.manifest.distanceLods[0]),
    f=>f.gltf.nodes.find(n=>n.name===f.manifest.distanceLods[0].far).translation=[100,0,0],
    f=>f.gltf.nodes.find(n=>n.name===f.manifest.distanceLods[0].far).children=[],
    f=>f.gltf.nodes.find(n=>n.name===f.manifest.distanceLods[0].near).children.push(f.gltf.nodes.findIndex(n=>n.name===f.manifest.distanceLods[0].far))]) {
    fixture=bad();mutate(fixture);assert.throws(()=>checkContract(fixture),/近远层级/);
  }
}
console.log('PASS: 真资产、18个既有破坏性夹具'+(webpTexture?'、WebP扩展夹具':'')+(asset.manifest.boatNavigation?'、4个航行夹具':'')+(asset.manifest.distanceLods?'、6个近远层级夹具':'')+'及桨穿壳阳性夹具');
