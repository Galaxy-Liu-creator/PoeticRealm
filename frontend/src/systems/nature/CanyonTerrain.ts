import { Box3, BufferAttribute, Color, Group, Mesh, MeshStandardMaterial, PlaneGeometry, Vector3, type Camera } from 'three';
import type { HeightmapAsset } from '../../engine/Assets';

/** Render the authored metric field directly; local clearing is baked in Blender. */
export function canyonTerrain(asset:HeightmapAsset,refined=false,surface?:MeshStandardMaterial,tiered=false) {
  const {meta,heightTexture}=asset;const data=heightTexture.image.data as Float32Array;
  const segments=tiered?128:refined?200:160;
  const build=(segments:number)=>{
  const geometry=new PlaneGeometry(meta.size[0],meta.size[1],segments,segments);geometry.rotateX(-Math.PI/2);
  const position=geometry.getAttribute('position'),colors=new Float32Array(position.count*3);
  const low=refined?new Color().setRGB(.72,.84,.68):new Color(0x344e3c),high=refined?new Color().setRGB(.88,.90,.84):new Color(0x687b78),color=new Color();
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),z=position.getZ(i),ix=Math.max(0,Math.min(meta.resolution-1,Math.round((x/meta.size[0]+.5)*(meta.resolution-1)))),iy=Math.max(0,Math.min(meta.resolution-1,Math.round((.5-z/meta.size[1])*(meta.resolution-1))));
    const fx=(x/meta.size[0]+.5)*(meta.resolution-1),fy=(.5-z/meta.size[1])*(meta.resolution-1);
    const x0=Math.max(0,Math.min(meta.resolution-1,Math.floor(fx))),y0=Math.max(0,Math.min(meta.resolution-1,Math.floor(fy))),x1=Math.min(meta.resolution-1,x0+1),y1=Math.min(meta.resolution-1,y0+1),tx=fx-x0,ty=fy-y0;
    const h=tiered?(1-ty)*(data[y0*meta.resolution+x0]*(1-tx)+data[y0*meta.resolution+x1]*tx)+ty*(data[y1*meta.resolution+x0]*(1-tx)+data[y1*meta.resolution+x1]*tx):data[iy*meta.resolution+ix];position.setY(i,h);color.copy(low).lerp(high,Math.min(1,Math.max(0,(h-15)/160)));
    if(refined)color.multiplyScalar(.88+.12*Math.sin(x*.09+z*.05)*Math.sin(z*.12-x*.07));
    colors.set([color.r,color.g,color.b],i*3);
  }
  geometry.setAttribute('color',new BufferAttribute(colors,3));geometry.computeVertexNormals();
  if(refined){const uv=geometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,position.getX(i)/22,position.getZ(i)/22);geometry.computeTangents();}
  return geometry;
  };
  const geometry=build(segments);
  // The cloned surface shares existing root textures; the root owns their release.
  const material=refined&&surface?surface.clone():new MeshStandardMaterial({roughness:1,metalness:0});material.vertexColors=true;
  const near=new Mesh(geometry,material);near.name='canyon_distant_terrain_near';near.receiveShadow=true;
  const farGeometry=tiered?build(64):undefined,far=farGeometry?new Mesh(farGeometry,material):undefined;
  const mesh=tiered?new Group():near;mesh.name='canyon_distant_terrain';
  if(far){far.name='canyon_distant_terrain_far';far.receiveShadow=true;mesh.add(near,far);far.visible=false;}
  const center=new Box3().setFromObject(near).getCenter(new Vector3()),cameraPoint=new Vector3();let mode:'auto'|'near'|'far'='auto',level='near',distance=0;
  return {mesh,update:(camera:Camera)=>{if(!far)return;camera.getWorldPosition(cameraPoint);distance=cameraPoint.distanceTo(center);const useNear=mode==='near'||mode==='auto'&&distance<280;near.visible=useNear;far.visible=!useNear;level=useNear?'near':'far';},
    setMode:(value:'auto'|'near'|'far')=>{mode=value;},details:()=>({enabled:tiered,mode,level,distance,threshold:280,nearTriangles:geometry.index!.count/3,farTriangles:farGeometry?farGeometry.index!.count/3:0}),
    dispose:()=>{mesh.removeFromParent();geometry.dispose();farGeometry?.dispose();material.dispose();}};
}
