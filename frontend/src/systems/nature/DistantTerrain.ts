import { Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import type { HeightmapAsset } from '../../engine/Assets';

/** Reuse the authored height field only beyond the detailed bank components. */
export function distantTerrain(asset: HeightmapAsset) {
  const {meta,heightTexture}=asset;
  const heights=heightTexture.image.data as Float32Array;
  const geometry=new PlaneGeometry(meta.size[0],meta.size[1],96,96);geometry.rotateX(-Math.PI/2);
  const position=geometry.getAttribute('position');
  const n=meta.resolution;
  for(let i=0;i<position.count;i++) {
    const x=position.getX(i),z=position.getZ(i),r=Math.hypot(x,z);
    const ix=Math.max(0,Math.min(n-1,Math.round((x/meta.size[0]+.5)*(n-1))));
    const iy=Math.max(0,Math.min(n-1,Math.round((.5-z/meta.size[1])*(n-1))));
    const blend=Math.max(0,Math.min(1,(r-180)/140));
    // Compress only this distant silhouette, leaving the published height data intact.
    const height=meta.waterLevel-3+(Math.max(meta.waterLevel-3,heights[iy*n+ix])-(meta.waterLevel-3))*.28;
    position.setY(i,meta.waterLevel-3+(height-(meta.waterLevel-3))*blend*blend*(3-2*blend));
  }
  geometry.computeVertexNormals();
  const material=new MeshStandardMaterial({color:0x22333a,roughness:1,metalness:0});
  const mesh=new Mesh(geometry,material);mesh.name='night_distant_terrain';mesh.receiveShadow=false;mesh.castShadow=false;
  return {mesh,dispose:()=>{mesh.removeFromParent();geometry.dispose();material.dispose();}};
}
