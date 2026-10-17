/** Lossless image and optional Meshopt v0 compression; decoded geometry bytes stay exact. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {PNG} from 'pngjs';
import {imageDimensions} from './asset-contract.mjs';
import {MeshoptEncoder} from 'meshoptimizer';
import {decodeExactViews} from './meshopt-exact.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const align=n=>(n+3)&~3;
export function parseGLB(bytes) {
  assert(bytes.length>=28 && bytes.readUInt32LE(0)===0x46546c67 && bytes.readUInt32LE(4)===2 && bytes.readUInt32LE(8)===bytes.length,'Invalid GLB');
  const n=bytes.readUInt32LE(12);
  assert(bytes.readUInt32LE(16)===0x4e4f534a && bytes.readUInt32LE(24+n)===0x004e4942,'Invalid GLB chunks');
  return {gltf:JSON.parse(bytes.subarray(20,20+n).toString('utf8')),binary:bytes.subarray(28+n)};
}
export function packGLB(gltf,binary) {
  const raw=Buffer.from(JSON.stringify(gltf)),json=Buffer.alloc(align(raw.length),0x20);raw.copy(json);
  const bin=Buffer.alloc(align(binary.length));binary.copy(bin);
  const out=Buffer.alloc(28+json.length+bin.length);
  out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);
  out.writeUInt32LE(json.length,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20);
  out.writeUInt32LE(bin.length,20+json.length);out.writeUInt32LE(0x004e4942,24+json.length);bin.copy(out,28+json.length);
  return out;
}
export async function optimizeExact(bytes,{webp=true,meshopt=false}={}) {
  const original=parseGLB(bytes),gltf=structuredClone(original.gltf);
  assert(gltf.buffers.length===1 && !gltf.buffers[0].uri,'Only embedded single-buffer GLB is supported');
  const imageViews=new Map(gltf.images.map((image,index)=>[image.bufferView,index]));
  const replacements=new Map(),images=[];
  for(let index=0;index<gltf.images.length;index++) {
    const image=gltf.images[index],view=gltf.bufferViews[image.bufferView];
    const input=original.binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
    let output=input,mime=image.mimeType,exact=true;
    if(mime==='image/png') {
      assert(input[24]===8,'16-bit PNG must keep its original bit depth');
      const decoded=PNG.sync.read(input),raw=decoded.data;
      const encoder=()=>sharp(raw,{raw:{width:decoded.width,height:decoded.height,channels:4}});
      const png=await encoder().png({compressionLevel:9,adaptiveFiltering:true,palette:false}).toBuffer();
      assert(PNG.sync.read(png).data.equals(raw),'PNG pixel mismatch');
      if(png.length<output.length) output=png;
      if(webp) {
        const candidate=await encoder().webp({lossless:true,nearLossless:false,exact:true,effort:6}).toBuffer();
        const check=await sharp(candidate).ensureAlpha().raw().toBuffer();
        assert(check.equals(raw),'WebP pixel mismatch');
        assert.deepEqual(imageDimensions(candidate),[decoded.width,decoded.height]);
        if(candidate.length<output.length) {output=candidate;mime='image/webp';}
      }
      images.push({name:image.name,index,input:input.length,output:output.length,mime,width:decoded.width,height:decoded.height,rgbaSHA256:hash(raw),exact});
    } else images.push({name:image.name,index,input:input.length,output:input.length,mime,unchangedSHA256:hash(input),exact});
    image.mimeType=mime;replacements.set(image.bufferView,output);
  }
  await MeshoptEncoder.ready;
  let offset=0,decodedOffset=0;
  const compressedViews=[];
  const chunks=[],nonImageHashes=[];
  for(let i=0;i<gltf.bufferViews.length;i++) {
    const before=original.gltf.bufferViews[i],view=gltf.bufferViews[i];
    assert(before.buffer===0 && !before.extensions?.EXT_meshopt_compression,'Compressed input is not supported');
    const raw=original.binary.subarray(before.byteOffset??0,(before.byteOffset??0)+before.byteLength);
    let data=replacements.get(i)??raw;
    if(!imageViews.has(i)) nonImageHashes.push({bufferView:i,bytes:raw.length,sha256:hash(raw)});
    const accessors=original.gltf.accessors.filter(a=>a.bufferView===i);
    const a=accessors[0],components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a?.type],componentBytes={5121:1,5123:2,5125:4,5126:4}[a?.componentType];
    const stride=before.byteStride??components*componentBytes;
    const indices=original.gltf.meshes.some(m=>m.primitives.some(p=>p.indices!==undefined && original.gltf.accessors[p.indices].bufferView===i));
    if(meshopt && !imageViews.has(i) && accessors.length===1 && !a.sparse && !a.byteOffset && stride*a.count===raw.length && (indices ? [2,4].includes(stride) : stride%4===0 && stride<=256)) {
      const mode=indices?'INDICES':'ATTRIBUTES';
      // v0 is supported by r186's bundled EXT decoder. No filters or quantization.
      const candidate=Buffer.from(MeshoptEncoder.encodeGltfBuffer(raw,a.count,stride,mode,0));
      if(candidate.length<raw.length) {
        data=candidate;view.buffer=1;view.byteOffset=decodedOffset;view.byteLength=raw.length;decodedOffset+=align(raw.length);
        view.extensions={...view.extensions,EXT_meshopt_compression:{buffer:0,byteOffset:offset,byteLength:data.length,byteStride:stride,count:a.count,mode,filter:'NONE'}};
        compressedViews.push({bufferView:i,input:raw.length,output:data.length,mode});
      }
    }
    if(view.buffer===0) {view.byteOffset=offset;view.byteLength=data.length;}
    const chunk=Buffer.alloc(align(data.length));data.copy(chunk);chunks.push(chunk);offset+=chunk.length;
  }
  const binary=Buffer.concat(chunks);gltf.buffers[0].byteLength=binary.length;
  if(compressedViews.length) {
    gltf.buffers.push({byteLength:decodedOffset,extensions:{EXT_meshopt_compression:{fallback:true}}});
    for(const key of ['extensionsUsed','extensionsRequired']) gltf[key]=[...new Set([...(gltf[key]??[]),'EXT_meshopt_compression'])];
  }
  let changedWebp=false;
  for(const texture of gltf.textures??[]) if(gltf.images[texture.source]?.mimeType==='image/webp') {
    texture.extensions={...texture.extensions,EXT_texture_webp:{source:texture.source}};delete texture.source;changedWebp=true;
  }
  if(changedWebp) for(const key of ['extensionsUsed','extensionsRequired']) gltf[key]=[...new Set([...(gltf[key]??[]),'EXT_texture_webp'])];
  const output=packGLB(gltf,binary),packed=parseGLB(output),roundtrip=await decodeExactViews(packed.gltf,packed.binary);
  for(const entry of nonImageHashes) {
    const view=roundtrip.gltf.bufferViews[entry.bufferView];
    assert.equal(hash(roundtrip.binary.subarray(view.byteOffset,view.byteOffset+view.byteLength)),entry.sha256);
  }
  for(const key of ['nodes','meshes','materials','accessors','skins','cameras','scenes','samplers']) assert.deepEqual(roundtrip.gltf[key],original.gltf[key],key+' changed');
  return {bytes:output,report:{method:compressedViews.length?'lossless-images-and-meshopt-v0':'lossless-image-only',inputBytes:bytes.length,outputBytes:output.length,inputSHA256:hash(bytes),outputSHA256:hash(output),images,nonImageHashes,compressedViews,semanticDataExact:true}};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const [input,output,reportPath]=process.argv.slice(2).filter(a=>!['--png-only','--meshopt'].includes(a));
    assert(input&&output,'Usage: node tools/optimize-assets.mjs INPUT.glb OUTPUT.glb [REPORT.json] [--png-only] [--meshopt]');
    assert(resolve(input)!==resolve(output),'Historical source must not be overwritten');
    const result=await optimizeExact(await readFile(input),{webp:!process.argv.includes('--png-only'),meshopt:process.argv.includes('--meshopt')});
    await mkdir(dirname(resolve(output)),{recursive:true});await writeFile(output,result.bytes,{flag:'wx'});
    if(reportPath) {await mkdir(dirname(resolve(reportPath)),{recursive:true});await writeFile(reportPath,JSON.stringify(result.report,null,2)+'\n',{flag:'wx'});}
    console.log(JSON.stringify({inputBytes:result.report.inputBytes,outputBytes:result.report.outputBytes,images:result.report.images,semanticDataExact:true}));
  } catch(error) {console.error(error);process.exitCode=1;}
}
