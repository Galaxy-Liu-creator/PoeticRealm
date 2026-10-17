import assert from 'node:assert/strict';
import {readAsset} from './asset-contract.mjs';
import {checkContract} from './check-contract.mjs';
import {checkBudget} from './check-budget.mjs';
const revision=process.argv.find(a=>a.startsWith('--revision='))?.split('=')[1]??'03';
assert.match(revision,/^(01|02|03)$/);
const asset=await readAsset(new URL(`../public/assets/scenes/jiangxue.scene-v${revision}.json`,import.meta.url));
checkContract(asset);checkBudget(asset);
const bad=()=>({...asset,gltf:structuredClone(asset.gltf),manifest:structuredClone(asset.manifest)});
let fixture=bad();fixture.manifest.requiredNodes.push('CAM_missing');assert.throws(()=>checkContract(fixture),/缺少/);
fixture=bad();delete fixture.gltf.materials.find(m=>m.name.startsWith('pbr_snow')).normalTexture;assert.throws(()=>checkContract(fixture),/Normal/);
fixture=bad();fixture.gltf.materials.find(m=>m.name.startsWith('pbr_snow')).pbrMetallicRoughness.metallicFactor=.5;assert.throws(()=>checkContract(fixture),/非金属/);
fixture=bad();const hull=fixture.gltf.nodes.find(n=>n.name==='boat_hull_closed');fixture.gltf.accessors[fixture.gltf.meshes[hull.mesh].primitives[0].indices].count-=3;assert.throws(()=>checkContract(fixture),/封闭性/);
fixture=bad();fixture.bytes=Buffer.alloc(15_000_001);assert.throws(()=>checkBudget(fixture),/15MB/);
if(revision==='03'){
  fixture=bad();delete fixture.manifest.boatNavigation;assert.throws(()=>checkContract(fixture),/缺少河道/);
  fixture=bad();fixture.gltf.nodes.find(n=>n.name==='boat_guest').translation[1]=0;assert.throws(()=>checkContract(fixture),/吃水/);
  fixture=bad();const path=fixture.manifest.boatNavigation.path;path[1]=[2*path[0][0]-path[1][0],2*path[0][1]-path[1][1]];assert.throws(()=>checkContract(fixture),/舟首/);
  fixture=bad();fixture.gltf.nodes.find(n=>n.name==='ANCHOR_fishing_water').translation[1]-=.3;assert.throws(()=>checkContract(fixture),/水端/);
}
console.log('PASS Jiangxue real asset + missing node, snow normal/metalness, open hull, over-budget rejection');
