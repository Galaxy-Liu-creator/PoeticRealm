import {Matrix4,Quaternion,Vector3,CatmullRomCurve3} from 'three';
import {accessorValues,requireThat} from './asset-contract.mjs';
export function checkBaidicheng(asset){
 const {gltf,manifest}=asset,parent=new Map();gltf.nodes.forEach((n,i)=>(n.children??[]).forEach(c=>parent.set(c,i)));const cache=new Map();
 const world=i=>{if(cache.has(i))return cache.get(i);const n=gltf.nodes[i],m=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3(...(n.translation??[0,0,0])),new Quaternion(...(n.rotation??[0,0,0,1])),new Vector3(...(n.scale??[1,1,1])));if(parent.has(i))m.premultiply(world(parent.get(i)));cache.set(i,m);return m;};
 const lines=[],bands=[],epsilon=.0003;
 const names=['cliff_right_near','cliff_left_near','cliff_left_far','cliff_right_far','city_promontory',...(manifest.terrain==='baidicheng-v03'?['cliff_right_near_lod_mesh','cliff_left_near_lod_mesh','cliff_left_far_lod_mesh','cliff_right_far_lod_mesh']:[])];
 for(const name of names){
  const i=gltf.nodes.findIndex(n=>n.name===name);requireThat(i>=0&&gltf.nodes[i].mesh!==undefined,'白帝城缺少岩壁：'+name);let triangles=0;
  for(const p of gltf.meshes[gltf.nodes[i].mesh].primitives){
   const wet=gltf.materials[p.material].name==='pbr_rock__bdwet';requireThat(wet||gltf.materials[p.material].name==='pbr_rock__bdwall','白帝城岩壁材质错误');
   const values=accessorValues(asset,p.attributes.POSITION).values,points=Array.from({length:values.length/3},(_,k)=>new Vector3(...values.slice(k*3,k*3+3)).applyMatrix4(world(i))),indices=accessorValues(asset,p.indices).values;
   for(let k=0;k<indices.length;k+=3){const vs=indices.slice(k,k+3).map(j=>points[j]),heights=vs.map(v=>v.y);requireThat(wet?Math.max(...heights)<=.22+epsilon:Math.min(...heights)>=.22-epsilon,'白帝城干湿水线不连续：'+name);triangles++;
    for(let edge=0;edge<3;edge++){const a=vs[edge],b=vs[(edge+1)%3];if(Math.abs(a.y)<epsilon&&Math.abs(b.y)<epsilon&&a.distanceTo(b)>.001)lines.push([[a.x,a.z],[b.x,b.z]]);}
   }
  }bands.push({name,triangles});
 }
 requireThat(lines.length>0,'白帝城没有实际水岸轮廓');const route=new CatmullRomCurve3(manifest.boatNavigation.path.map(([x,z])=>new Vector3(x,0,z)),false,'centripetal');route.arcLengthDivisions=512;
 let minimum=Infinity;
 for(let i=0;i<=256;i++){const p=route.getPointAt(i/256);for(const [a,b] of lines){const dx=b[0]-a[0],dz=b[1]-a[1],den=dx*dx+dz*dz;if(den<1e-12)continue;const t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.z-a[1])*dz)/den));minimum=Math.min(minimum,Math.hypot(p.x-a[0]-t*dx,p.z-a[1]-t*dz));}}
 requireThat(minimum>4,'白帝城航线过近或穿过岩岸：'+minimum);
 return {bands,routeSamples:257,minimumHorizontalShoreDistanceMeters:minimum};
}
