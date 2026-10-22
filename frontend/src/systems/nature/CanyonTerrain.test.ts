import {describe,it,expect} from 'vitest';
import {Box3,DataTexture,FloatType,Mesh,MeshStandardMaterial,PerspectiveCamera,RedFormat,Vector3} from 'three';
import type {HeightmapAsset} from '../../engine/Assets';
import {canyonTerrain} from './CanyonTerrain';

function fixture(){
  const n=8,data=new Float32Array(n*n);for(let y=0;y<n;y++)for(let x=0;x<n;x++)data[y*n+x]=x*2+y*3;
  const texture=new DataTexture(data,n,n,RedFormat,FloatType);
  const asset={heightTexture:texture,guideTexture:texture,meta:{scene:'baidicheng-v03',resolution:n,size:[1000,1000],heightRange:[0,35],waterLevel:0,bakedFrom:'test',bakedAt:'test'},dispose:()=>texture.dispose()} as HeightmapAsset;
  const material=new MeshStandardMaterial({map:texture,normalMap:texture,roughnessMap:texture});
  return {asset,material,texture};
}
describe('tiered metric canyon terrain',()=>{
  it('samples the same metric field on both grids and builds finite normal-map tangents',()=>{
    const f=fixture(),terrain=canyonTerrain(f.asset,true,f.material,true);const meshes=terrain.mesh.children as Mesh[];
    for(const mesh of meshes){const g=mesh.geometry,p=g.getAttribute('position');for(let i=0;i<p.count;i++){const expected=(p.getX(i)/1000+.5)*14+(.5-p.getZ(i)/1000)*21;expect(Math.abs(p.getY(i)-expected)).toBeLessThan(.0001);}expect(Array.from(g.getAttribute('tangent').array).every(Number.isFinite)).toBe(true);}
    expect(terrain.details().nearTriangles).toBe(32768);expect(terrain.details().farTriangles).toBe(8192);terrain.dispose();f.material.dispose();f.asset.dispose();
  });
  it('switches once at the main-camera threshold and returns without history',()=>{
    const f=fixture(),terrain=canyonTerrain(f.asset,true,f.material,true),camera=new PerspectiveCamera();const center=new Box3().setFromObject(terrain.mesh.children[0]).getCenter(new Vector3());
    for(const [distance,level] of [[279.99,'near'],[280.01,'far'],[279.99,'near']] as const){camera.position.copy(center).add(new Vector3(distance,0,0));terrain.update(camera);expect(terrain.details().level).toBe(level);expect(terrain.mesh.children.filter(m=>m.visible)).toHaveLength(1);}
    terrain.setMode('far');terrain.update(camera);expect(terrain.details().level).toBe('far');terrain.setMode('near');camera.position.set(1000,1000,1000);terrain.update(camera);expect(terrain.details().level).toBe('near');terrain.dispose();f.material.dispose();f.asset.dispose();
  });
  it('owns two geometries and one cloned material, sharing textures with the asset owner',()=>{
    const f=fixture(),terrain=canyonTerrain(f.asset,true,f.material,true);let geometries=0,materials=0,textures=0;f.texture.addEventListener('dispose',()=>textures++);
    for(const child of terrain.mesh.children as Mesh[]){child.geometry.addEventListener('dispose',()=>geometries++);}
    ((terrain.mesh.children[0] as Mesh).material as MeshStandardMaterial).addEventListener('dispose',()=>materials++);
    terrain.dispose();expect([geometries,materials,textures]).toEqual([2,1,0]);f.material.dispose();f.asset.dispose();expect(textures).toBe(1);
  });
});
