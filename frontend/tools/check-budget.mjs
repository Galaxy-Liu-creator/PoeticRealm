import { readAsset, imageDimensions, requireThat } from './asset-contract.mjs';
export function checkBudget(asset) {
  const {gltf,binary,bytes}=asset;
  let triangles=0, primitives=0,decodedBytes=0;
  for(const n of gltf.nodes??[]) if(n.mesh!==undefined) for(const p of gltf.meshes[n.mesh].primitives) {
    requireThat((p.mode??4)===4,'预算器只支持三角形');
    triangles+=(gltf.accessors[p.indices??p.attributes.POSITION].count)/3; primitives++;
  }
  const images=(gltf.images??[]).map(image=>{
    requireThat(image.bufferView!==undefined,'小样贴图必须嵌入 GLB');
    const v=gltf.bufferViews[image.bufferView], data=binary.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength);
    const [width,height]=imageDimensions(data);
    requireThat(width<=2048 && height<=2048,'贴图超过2K：'+image.name);
    decodedBytes+=Math.ceil(width*height*4*4/3);
    return {name:image.name,width,height,bytes:v.byteLength};
  });
  requireThat(bytes.length<=15_000_000,'GLB 超过15MB：'+JSON.stringify({bytes:bytes.length,images}));
  const environmentBytes=asset.environment?.packed.length??0;
  const terrainBytes=(asset.terrain?.png.length??0)+(asset.terrain?.metaBytes.length??0);
  if(asset.terrain) decodedBytes+=asset.terrain.meta.resolution**2*5;
  decodedBytes+=(asset.environment?.raw.length??16)-16;
  requireThat(bytes.length+environmentBytes<=15_000_000,'小样 GLB 与环境分发总量超过15MB');
  requireThat(triangles<=200000,'小样超过200k三角面工作预算');
  requireThat(decodedBytes<=256*1024*1024,'贴图解码加 mipmap 超过256MiB工作预算');
  return {distributedBytes:bytes.length+environmentBytes+terrainBytes,modelBytes:bytes.length,environmentBytes,terrainBytes,audioFileBytes:0,triangles,mainPassPrimitives:primitives,estimatedTextureBytesWithMipmaps:decodedBytes,images,note:asset.manifest.scene==='baidicheng'?'完整分发包含高度图与元数据；正式白帝城入口使用程序风/水及两岸猿声，无外部音频文件；实际多 pass 与 fps 由浏览器测量':'完整分发包含高度图与元数据；当前声音程序合成，无外部音频文件；不替代真实浏览器多 pass 和 fps 验证'};
}
if(process.argv[1]?.endsWith('check-budget.mjs')) {
  try { console.log(JSON.stringify(checkBudget(await readAsset(process.argv[2])),null,2)); }
  catch(error) { console.error('[budget] '+error.message); process.exitCode=1; }
}
