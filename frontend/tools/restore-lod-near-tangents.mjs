// Preserve the released near mesh's derived tangent stream after Blender export.
// No positions, topology, normals, weights, materials or far data are changed.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {readAsset} from './asset-contract.mjs';
import {parseGLB,packGLB} from './optimize-assets.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const [input,output,reportPath]=process.argv.slice(2);
assert(input && output && reportPath,'Usage: restore-lod-near-tangents INPUT OUTPUT REPORT');
const original=await readAsset('public/assets/scenes/fengqiao.scene-v01.json');
assert.equal(sha(original.bytes),'e8f653c10690aaaa0f7a97e387871b439cab4adec351c9a4fc865f597aaddf0e','Released near reference changed');
const inputBytes=await readFile(input),candidate=parseGLB(inputBytes);
function stream(asset,index) {
  const a=asset.gltf.accessors[index],v=asset.gltf.bufferViews[a.bufferView];
  assert(!a.sparse && v.buffer===0);
  const size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type]*{5121:1,5123:2,5125:4,5126:4}[a.componentType];assert(size);
  const stride=v.byteStride??size,start=(v.byteOffset??0)+(a.byteOffset??0),bytes=Buffer.alloc(a.count*size);
  for(let i=0;i<a.count;i++)asset.binary.copy(bytes,i*size,start+i*stride,start+i*stride+size);
  return {bytes,start,stride,size,count:a.count,shape:{type:a.type,componentType:a.componentType,normalized:!!a.normalized,count:a.count}};
}
const oldNode=original.gltf.nodes.find(n=>n.name==='rower_weathered'),newNode=candidate.gltf.nodes.find(n=>n.name==='rower_weathered');
assert(oldNode && newNode);
assert.equal(candidate.gltf.nodes.filter(n=>n.mesh===newNode.mesh).length,1);
const oldMesh=original.gltf.meshes[oldNode.mesh],newMesh=candidate.gltf.meshes[newNode.mesh];
assert.equal(oldMesh.primitives.length,1);assert.equal(newMesh.primitives.length,1);
const oldP=oldMesh.primitives[0],newP=newMesh.primitives[0];
assert.deepEqual(Object.keys(newP.attributes).sort(),Object.keys(oldP.attributes).sort());
for(const name of Object.keys(oldP.attributes).filter(name=>name!=='TANGENT')) {
  const a=stream(original,oldP.attributes[name]),b=stream(candidate,newP.attributes[name]);
  assert.deepEqual(b.shape,a.shape);assert(a.bytes.equals(b.bytes),'Near attribute changed: '+name);
}
assert(stream(original,oldP.indices).bytes.equals(stream(candidate,newP.indices).bytes),'Near topology changed');
const tangent=stream(original,oldP.attributes.TANGENT),target=stream(candidate,newP.attributes.TANGENT);
assert.deepEqual(target.shape,tangent.shape);assert.equal(target.shape.type,'VEC4');assert.equal(target.shape.componentType,5126);
let changedComponents=0,maxDifference=0;
for(let i=0;i<tangent.bytes.length;i+=4){const delta=Math.abs(tangent.bytes.readFloatLE(i)-target.bytes.readFloatLE(i));assert(Number.isFinite(delta));if(delta)changedComponents++;maxDifference=Math.max(maxDifference,delta);}
for(let i=0;i<tangent.count;i++)tangent.bytes.copy(candidate.binary,target.start+i*target.stride,i*tangent.size,(i+1)*tangent.size);
assert(stream(candidate,newP.attributes.TANGENT).bytes.equals(tangent.bytes));
const bytes=packGLB(candidate.gltf,candidate.binary);
await mkdir(dirname(output),{recursive:true});await writeFile(output,bytes,{flag:'wx'});
const report={method:'restore original released near TANGENT bytes; derived Blender export data only',node:newNode.name,referenceSHA256:sha(original.bytes),inputSHA256:sha(inputBytes),outputSHA256:sha(bytes),changedComponents,maxDifference,restoredTangentSHA256:sha(tangent.bytes)};
await writeFile(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
