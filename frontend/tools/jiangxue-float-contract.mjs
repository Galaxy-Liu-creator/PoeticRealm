import {Matrix4,Quaternion,Vector3} from 'three';
import {accessorValues,requireThat} from './asset-contract.mjs';
export function checkJiangxueFloat(asset){
  const {gltf,manifest}=asset,nodes=gltf.nodes,parents=new Map();nodes.forEach((n,i)=>(n.children??[]).forEach(c=>parents.set(c,i)));
  const local=i=>{const n=nodes[i];return n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3().fromArray(n.translation??[0,0,0]),new Quaternion().fromArray(n.rotation??[0,0,0,1]),new Vector3().fromArray(n.scale??[1,1,1]));};
  const world=i=>parents.has(i)?world(parents.get(i)).multiply(local(i)):local(i);
  const index=name=>{const i=nodes.findIndex(n=>n.name===name);requireThat(i>=0,'浮舟缺少节点：'+name);return i;};
  const boat=world(index('boat_guest')),route=manifest.boatNavigation;
  const direction=new Vector3(route.path[1][0]-route.path[0][0],0,route.path[1][1]-route.path[0][1]).normalize();
  const forward=new Vector3(1,0,0).transformDirection(boat);const alignment=forward.dot(direction);
  requireThat(alignment>.99999,'江雪舟首与河道方向不一致');
  const bounds=name=>{const i=index(name),matrix=world(i),values=[];
    for(const p of gltf.meshes[nodes[i].mesh].primitives){const a=accessorValues(asset,p.attributes.POSITION);for(let j=0;j<a.values.length;j+=a.count)values.push(new Vector3(...a.values.slice(j,j+3)).applyMatrix4(matrix).y);}
    return [Math.min(...values),Math.max(...values)];};
  const hull=bounds('boat_hull_closed'),water=manifest.waterLevel;
  requireThat(hull[0]<water-.15&&hull[1]>water+.6,'江雪浮舟吃水错误');
  const endpoint=new Vector3().setFromMatrixPosition(world(index('ANCHOR_fishing_water'))),line=bounds('fishing_line');
  requireThat(Math.abs(endpoint.y-water+.006)<.002&&Math.abs(line[0]-water+.006)<.003,'江雪钓线水端未贴合河面');
  requireThat(!nodes.some(n=>n.name?.startsWith('preview_river')),'Blender预览水面不得导出');
  return {alignment,hullWorldY:hull,actualDraftMetres:water-hull[0],lineEndpoint: endpoint.toArray()};
}
