import {Matrix4,Quaternion,Vector3} from 'three';
import {accessorValues,requireThat} from './asset-contract.mjs';

export function checkJiangxueBank(asset){
  const {gltf}=asset,nodes=gltf.nodes,parents=new Map();
  nodes.forEach((node,i)=>(node.children??[]).forEach(child=>parents.set(child,i)));
  const world=i=>{const n=nodes[i],m=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3().fromArray(n.translation??[0,0,0]),new Quaternion().fromArray(n.rotation??[0,0,0,1]),new Vector3().fromArray(n.scale??[1,1,1]));return parents.has(i)?world(parents.get(i)).multiply(m):m;};
  const checks=[];
  for(let i=0;i<14;i++){
    const name=`shore_rock_v02_${String(i).padStart(2,'0')}`,index=nodes.findIndex(n=>n.name===name);
    requireThat(index>=0,'缺少岩岸节点：'+name);
    const matrix=world(index),primitives=gltf.meshes[nodes[index].mesh].primitives,roles=new Set();
    const bounds=[];
    for(const p of primitives){
      const material=gltf.materials[p.material].name,wet=material==='pbr_rock__jxwetv02';
      requireThat(wet||material==='pbr_rock__jxbank','岩块干湿材质错误：'+name);
      const positions=accessorValues(asset,p.attributes.POSITION).values,indices=new Set(accessorValues(asset,p.indices).values);
      const heights=[...indices].map(j=>new Vector3(...positions.slice(j*3,j*3+3)).applyMatrix4(matrix).y);
      const low=Math.min(...heights),high=Math.max(...heights);roles.add(wet?'wet':'dry');
      requireThat(wet?high<=.22002:low>=.21998,'岩块干湿分界偏离0.22m水线：'+name);
      bounds.push({material,worldY:[low,high]});
    }
    requireThat(roles.size===2,'岩块干湿材质缺失：'+name);checks.push({node:name,primitives:bounds});
  }
  return {wetLevelMetres:.22,rocks:checks};
}
