import assert from 'node:assert/strict';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

/** Decode the registered lossless subset before running the existing geometry gates. */
export async function decodeExactViews(source, binary) {
  const gltf=structuredClone(source),chunks=[];
  let offset=0;
  await MeshoptDecoder.ready;
  const declared=source.extensionsRequired?.includes('EXT_meshopt_compression');
  for(const view of gltf.bufferViews??[]) {
    const ext=view.extensions?.EXT_meshopt_compression;
    let data;
    if(ext) {
      assert(declared && source.extensionsUsed?.includes('EXT_meshopt_compression'),'Meshopt must be declared used/required');
      assert(['ATTRIBUTES','INDICES'].includes(ext.mode) && (ext.filter??'NONE')==='NONE','Only exact meshopt modes without filters are registered');
      assert(ext.buffer===0 && Number.isInteger(ext.count) && ext.count>0 && Number.isInteger(ext.byteStride),'Meshopt layout invalid');
      assert(ext.mode==='ATTRIBUTES' ? ext.byteStride%4===0 && ext.byteStride>=4 && ext.byteStride<=256 : [2,4].includes(ext.byteStride),'Meshopt stride invalid');
      assert(view.byteLength===ext.count*ext.byteStride && view.byteLength<=128*1024*1024,'Meshopt decoded size invalid');
      assert(view.buffer===1 && source.buffers[1]?.extensions?.EXT_meshopt_compression?.fallback===true && (view.byteOffset??0)+view.byteLength<=source.buffers[1].byteLength,'Meshopt placeholder invalid');
      assert(Number.isInteger(ext.byteLength) && ext.byteLength>0 && Number.isInteger(ext.byteOffset??0) && (ext.byteOffset??0)>=0 && (ext.byteOffset??0)+ext.byteLength<=binary.length,'Meshopt compressed range invalid');
      if(view.byteStride!==undefined) assert(view.byteStride===ext.byteStride,'Meshopt parent stride mismatch');
      data=Buffer.alloc(view.byteLength);
      MeshoptDecoder.decodeGltfBuffer(data,ext.count,ext.byteStride,binary.subarray(ext.byteOffset??0,(ext.byteOffset??0)+ext.byteLength),ext.mode,'NONE');
      delete view.extensions.EXT_meshopt_compression;
      if(!Object.keys(view.extensions).length) delete view.extensions;
    } else {
      assert(view.buffer===0 && (view.byteOffset??0)+view.byteLength<=binary.length,'Embedded buffer range invalid');
      data=binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
    }
    view.buffer=0;view.byteOffset=offset;
    const chunk=Buffer.alloc((data.length+3)&~3);data.copy(chunk);chunks.push(chunk);offset+=chunk.length;
    assert(offset<=128*1024*1024,'Decoded asset exceeds verification limit');
  }
  gltf.buffers=[{byteLength:offset}];
  return {gltf,binary:Buffer.concat(chunks)};
}
