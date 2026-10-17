import {Box3,Matrix4,Quaternion,Ray,Triangle,Vector3} from 'three';
import {accessorValues,requireThat} from './asset-contract.mjs';

// Replay delivered GLB triangles in the boat frame. Boat bob cancels for both surfaces.
function geometry(asset,names,pose) {
  const nodes=asset.gltf.nodes, parent=new Map();
  nodes.forEach((n,i)=>(n.children??[]).forEach(child=>parent.set(child,i)));
  const boat=nodes.findIndex(n=>n.name==='boat_guest'), matrices=new Map();
  function transform(i) {
    if(i===boat) return new Matrix4();
    if(matrices.has(i)) return matrices.get(i);
    const n=nodes[i];let local;
    if(n.name==='oar_pivot' && pose) local=new Matrix4().compose(new Vector3(...pose.oarPosition),new Quaternion(...pose.oarRotation),new Vector3(...(n.scale??[1,1,1])));
    else local=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3(...(n.translation??[0,0,0])),new Quaternion(...(n.rotation??[0,0,0,1])),new Vector3(...(n.scale??[1,1,1])));
    requireThat(parent.has(i),'几何检查节点不属于船：'+n.name);
    const result=transform(parent.get(i)).clone().multiply(local);matrices.set(i,result);return result;
  }
  const result=[];
  for(const name of names) {
    const i=nodes.findIndex(n=>n.name===name);requireThat(i>=0 && nodes[i].mesh!==undefined,'缺碰撞网格：'+name);
    for(const p of asset.gltf.meshes[nodes[i].mesh].primitives) {
      requireThat((p.mode??4)===4,'碰撞检查只支持三角形');
      const positions=accessorValues(asset,p.attributes.POSITION).values;
      const points=Array.from({length:positions.length/3},(_,k)=>new Vector3(...positions.slice(k*3,k*3+3)).applyMatrix4(transform(i)));
      const indices=p.indices!==undefined?accessorValues(asset,p.indices).values:points.map((_,k)=>k);
      for(let k=0;k<indices.length;k+=3) {
        const tri=new Triangle(...indices.slice(k,k+3).map(j=>points[j]));
        result.push({name,tri,box:new Box3().setFromPoints([tri.a,tri.b,tri.c])});
      }
    }
  }
  return result;
}

export function closedHullTopology(asset) {
  const node=asset.gltf.nodes.find(n=>n.name==='boat_hull_closed');requireThat(node?.mesh!==undefined,'船壳没有实体网格');
  const edges=new Map();let triangles=0;
  const key=p=>p.map(v=>Math.round(v*1e5)).join(',');
  for(const p of asset.gltf.meshes[node.mesh].primitives) {
    const positions=accessorValues(asset,p.attributes.POSITION).values;
    const vertices=Array.from({length:positions.length/3},(_,i)=>key(positions.slice(i*3,i*3+3)));
    const indices=accessorValues(asset,p.indices).values;
    for(let i=0;i<indices.length;i+=3) {
      const v=indices.slice(i,i+3).map(j=>vertices[j]);requireThat(new Set(v).size===3,'船壳存在退化三角形');triangles++;
      for(let j=0;j<3;j++) { const e=[v[j],v[(j+1)%3]].sort().join('|');edges.set(e,(edges.get(e)??0)+1); }
    }
  }
  const nonmanifoldEdges=[...edges.values()].filter(n=>n!==2).length;
  requireThat(nonmanifoldEdges===0,'船壳封闭性失败，开放或非流形边：'+nonmanifoldEdges);
  return {triangles,nonmanifoldEdges,weldTolerance:1e-5};
}

export function createOarClearance(asset) {
  const hullNames=['boat_hull_closed','boat_wood_aged'];
  const movingNames=['rowing_oar_shaft','rowing_oar_handle','rowing_oar_blade'];
  const hull=geometry(asset,hullNames),cell=.25,grid=new Map();
  function cells(box,visit) {
    const lo=box.min.clone().multiplyScalar(1/cell).floor(),hi=box.max.clone().multiplyScalar(1/cell).floor();
    for(let x=lo.x;x<=hi.x;x++)for(let y=lo.y;y<=hi.y;y++)for(let z=lo.z;z<=hi.z;z++)visit(`${x},${y},${z}`);
  }
  hull.forEach((item,i)=>cells(item.box,key=>{if(!grid.has(key))grid.set(key,[]);grid.get(key).push(i);}));
  const ray=new Ray(),hit=new Vector3(),direction=new Vector3();
  function edgesHit(a,b) {
    const points=[a.a,a.b,a.c];
    for(let i=0;i<3;i++) {
      direction.subVectors(points[(i+1)%3],points[i]);const length=direction.length();
      if(length<1e-9)continue;
      ray.set(points[i],direction.multiplyScalar(1/length));
      if(ray.intersectTriangle(b.a,b.b,b.c,false,hit) && hit.distanceTo(points[i])<=length+1e-7)return true;
    }
    return false;
  }
  return {
    hullTriangles:hull.length,hullNames,movingNames,
    check(pose) {
      const moving=geometry(asset,movingNames,pose),examples=[];let intersections=0,candidatePairs=0;
      for(const item of moving) {
        const candidates=new Set();cells(item.box,key=>(grid.get(key)??[]).forEach(i=>candidates.add(i)));
        for(const i of candidates) {
          const other=hull[i];if(!item.box.intersectsBox(other.box))continue;candidatePairs++;
          if(edgesHit(item.tri,other.tri)||edgesHit(other.tri,item.tri)) {
            intersections++;if(examples.length<6)examples.push({moving:item.name,hull:other.name});
          }
        }
      }
      return {intersections,candidatePairs,examples};
    }
  };
}
