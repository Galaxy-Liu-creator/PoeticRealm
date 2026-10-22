import { readFile } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {gunzipSync} from 'node:zlib';
import {decodeExactViews} from './meshopt-exact.mjs';
export const assetRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../public/assets');
export const defaultManifest = resolve(assetRoot, 'scenes/fengqiao.sample.json');
export const slots = new Set(['ink_rock','ink_wood','ink_tile','ink_stone','ink_foliage','ink_cloth','water','paper','snow','glow','pbr_rock','pbr_stone','pbr_wood','pbr_tile','pbr_foliage','pbr_cloth','pbr_metal','pbr_skin','pbr_snow']);
export const requireThat = (value, message) => { if (!value) throw new Error(message); };
export async function readAsset(manifestPath = defaultManifest) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  requireThat(manifest.contractVersion === '0.2', '不支持的资产契约版本');
  requireThat(['fengqiao','jiangxue','baidicheng'].includes(manifest.scene) && ['quality-sample','full-scene'].includes(manifest.scope), '未实现此验收范围');
  if(manifest.scene==='baidicheng') {
    const paired=['01','02','03'].some(revision=>manifest.model===`models/baidicheng/scene_v${revision}.glb`&&manifest.terrain===`baidicheng-v${revision}`);
    requireThat(manifest.scope==='quality-sample' && paired && manifest.waterLevel===0,'白帝城候选清单版本或范围非法');
    const required=['CAM_enter','CAM_city','CAM_follow','CAM_gorge','CAM_exit','FOCUS_city','FOCUS_boat','SFX_ape_left','SFX_ape_right','ANCHOR_seg_in','ANCHOR_seg_out','boat_guest','boat_hull_closed','rower_rig','mask_probe'];
    if(manifest.terrain!=='baidicheng-v01')required.push('forest_bark','forest_leaves',...['bark','leaves'].flatMap(kind=>['right_near','left_near','left_far','right_far'].map(bank=>`forest_${kind}_${bank}`)));
    if(manifest.terrain==='baidicheng-v03'){
      const nearNames=['cliff_right_near','cliff_left_near','cliff_left_far','cliff_right_far',...['bark','leaves'].flatMap(kind=>['right_near','left_near'].map(bank=>`forest_${kind}_${bank}`)),'city_detail'];
      required.push(...nearNames.flatMap(n=>[n,n+'_lod',...(n==='city_detail'?[]:[n+'_lod_mesh'])]),...['support','joinery','roof'].flatMap(kind=>[`city_${kind}_detail`,`city_${kind}_coarse`]));
      requireThat(Array.isArray(manifest.distanceLods)&&manifest.distanceLods.length===nearNames.length&&nearNames.every(n=>manifest.distanceLods.some(d=>d?.near===n&&d.far===n+'_lod')),'白帝城v03近远层级不完整');
    }else requireThat(manifest.distanceLods===undefined,'此白帝城修订未登记距离层级');
    requireThat(Array.isArray(manifest.requiredNodes) && required.every(n=>manifest.requiredNodes.includes(n)) && manifest.boatNavigation!==undefined,'白帝城候选缺少正式节点或航线');
  }
  requireThat(typeof manifest.model === 'string' && !manifest.model.startsWith('/') && !manifest.model.includes('\\'), '模型路径必须相对 assets');
  const modelPath = resolve(assetRoot, manifest.model);
  requireThat(modelPath.startsWith(assetRoot + sep), '模型路径越出 assets');
  requireThat(Array.isArray(manifest.requiredNodes) && manifest.requiredNodes.length > 0 && new Set(manifest.requiredNodes).size === manifest.requiredNodes.length, '必需节点清单非法');
  requireThat(Number.isFinite(manifest.waterLevel), '水位非法');
  const bytes = await readFile(modelPath);
  requireThat(bytes.length >= 20 && bytes.readUInt32LE(0) === 0x46546c67 && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length, '无效 GLB 2.0');
  const length = bytes.readUInt32LE(12);
  requireThat(bytes.readUInt32LE(16) === 0x4e4f534a && 20 + length <= bytes.length, 'GLB JSON chunk 错误');
  const encodedGltf = JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'));
  const binOffset = 20 + length + 8;
  const decoded = await decodeExactViews(encodedGltf,bytes.subarray(binOffset));
  const {gltf,binary}=decoded;
  let environment;
  if(manifest.environment!==undefined) {
    requireThat(typeof manifest.environment==='string' && /^environments\/[a-z0-9_/-]+\.rgba16f\.gz$/.test(manifest.environment),'环境路径非法');
    const path=resolve(assetRoot,manifest.environment);requireThat(path.startsWith(assetRoot+sep),'环境路径越界');
    const packed=await readFile(path);environment={packed,raw:gunzipSync(packed)};
  }
  let terrain;
  if(manifest.scope==='full-scene') {
    const nodes=manifest.scene==='jiangxue'
      ? ['CAM_enter','CAM_birds','CAM_path','CAM_fog','CAM_boat','FOCUS_boat','FOCUS_fisherman','SFX_line','PLACE_boat_01']
      : ['CAM_enter','CAM_moonset','CAM_riverbank','CAM_temple','CAM_boat','FOCUS_moonset','FOCUS_temple','FOCUS_bell','FOCUS_boat','SFX_bell','SFX_crow','SFX_boat','EMIT_bell','LIGHT_fishfire_01','boat_guest','boat_hull_closed'];
    requireThat(nodes.every(n=>manifest.requiredNodes.includes(n)),'完整场景缺少正式节点');
  }
  if(manifest.scope==='full-scene' || manifest.terrain!==undefined) {
    requireThat(typeof manifest.terrain==='string' && /^[a-z][a-z0-9-]*$/.test(manifest.terrain),'场景缺少或非法高度图');
    const png=await readFile(resolve(assetRoot,'terrain/'+manifest.terrain+'.height.png'));
    const metaBytes=await readFile(resolve(assetRoot,'terrain/'+manifest.terrain+'.height.json'));
    const meta=JSON.parse(metaBytes);
    requireThat(png.readUInt32BE(0)===0x89504e47 && png[24]===8 && png[25]===2,'高度图必须为RGB8 PNG，不能有alpha');
    requireThat(meta.scene===manifest.terrain && meta.resolution===1024 && imageDimensions(png).every(n=>n===1024),'高度图范围或尺寸错误');
    requireThat(Array.isArray(meta.size) && meta.size.length===2 && meta.size.every(n=>Number.isFinite(n)&&n>0) && Array.isArray(meta.heightRange) && meta.heightRange.length===2 && meta.heightRange.every(Number.isFinite) && meta.heightRange[1]>meta.heightRange[0] && meta.waterLevel===manifest.waterLevel,'高度图米制元数据错误');
    terrain={png,metaBytes,meta};
  }
  return {manifest, gltf, binary, bytes, modelPath,environment,encodedGltf,terrain};
}
export function accessorValues(asset, index) {
  const a=asset.gltf.accessors[index], v=asset.gltf.bufferViews[a.bufferView];
  requireThat(!a.sparse && v.buffer === 0, '校准遮罩必须为完整本地 accessor');
  const count = {SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
  const component = {5121:[1,'readUInt8',255],5123:[2,'readUInt16LE',65535],5126:[4,'readFloatLE',1]}[a.componentType];
  requireThat(count && component, '不支持的校准 accessor 格式');
  const [size,reader,divisor]=component, stride=v.byteStride ?? count*size, values=[];
  for(let i=0;i<a.count;i++) for(let j=0;j<count;j++) {
    const offset=(v.byteOffset??0)+(a.byteOffset??0)+i*stride+j*size;
    values.push(asset.binary[reader](offset)/(a.normalized ? divisor : 1));
  }
  return {values,count};
}
export function imageDimensions(data) {
  if(data.length>24 && data.readUInt32BE(0)===0x89504e47) return [data.readUInt32BE(16),data.readUInt32BE(20)];
  if(data.length>=25 && data.toString('ascii',0,4)==='RIFF' && data.toString('ascii',8,12)==='WEBP') {
    requireThat(data.readUInt32LE(4)+8===data.length,'WebP长度错误');
    for(let offset=12;offset+8<=data.length;) {
      const kind=data.toString('ascii',offset,offset+4),length=data.readUInt32LE(offset+4),start=offset+8;
      requireThat(start+length<=data.length,'WebP块不完整');
      if(kind==='VP8L') {
        requireThat(length>=5 && data[start]===0x2f,'无损WebP头错误');
        const bits=data.readUInt32LE(start+1);
        requireThat((bits>>>29)===0,'无损WebP版本错误');
        return [(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1];
      }
      requireThat(!['VP8 ','ANIM','ANMF','ICCP','EXIF'].includes(kind),'仅登记静态无损WebP，无色彩转换元数据');
      offset=start+length+(length&1);
    }
    throw new Error('WebP缺少无损图像块');
  }
  if(data[0]===255 && data[1]===216) {
    let i=2;
    while(i<data.length-9) {
      if(data[i++]!==255) continue;
      const marker=data[i++], length=data.readUInt16BE(i);
      if([0xc0,0xc1,0xc2].includes(marker)) return [data.readUInt16BE(i+5),data.readUInt16BE(i+3)];
      i+=length;
    }
  }
  throw new Error('预算器仅允许嵌入 PNG/JPEG/无损WebP；不得跳过未知格式尺寸');
}
