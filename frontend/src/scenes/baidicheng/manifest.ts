import { assertBoatNavigation, type BoatNavigation } from '../../systems/boats/BoatCruise';
import { assertDistanceLods, type DistanceLod } from '../../systems/lod/DistanceLods';

export const baidichengNodes = ['CAM_enter','CAM_city','CAM_follow','CAM_gorge','CAM_exit','FOCUS_city','FOCUS_boat','SFX_ape_left','SFX_ape_right','ANCHOR_seg_in','ANCHOR_seg_out','boat_guest','boat_hull_closed','rower_rig','mask_probe'];
export const baidichengForestNodes=['forest_bark','forest_leaves',...['bark','leaves'].flatMap(kind=>['right_near','left_near','left_far','right_far'].map(bank=>`forest_${kind}_${bank}`))];
export const baidichengLodNames=['cliff_right_near','cliff_left_near','cliff_left_far','cliff_right_far',...['bark','leaves'].flatMap(kind=>['right_near','left_near'].map(bank=>`forest_${kind}_${bank}`)),'city_detail'];
export const baidichengV3Nodes=[...baidichengLodNames.flatMap(near=>[near,near+'_lod',...(near==='city_detail'?[]:[near+'_lod_mesh'])]),...['support','joinery','roof'].flatMap(kind=>[`city_${kind}_detail`,`city_${kind}_coarse`])];
export interface BaidichengManifest {
  contractVersion:'0.2'; scene:'baidicheng'; scope:'quality-sample';
  model:'models/baidicheng/scene_v01.glb'|'models/baidicheng/scene_v02.glb'|'models/baidicheng/scene_v03.glb'; terrain:'baidicheng-v01'|'baidicheng-v02'|'baidicheng-v03'; waterLevel:0;
  requiredNodes:string[]; boatNavigation:BoatNavigation; distanceLods?:DistanceLod[];
}
export function assertBaidichengManifest(value:unknown):asserts value is BaidichengManifest {
  const m=value as Partial<BaidichengManifest>|null;
  const paired=['01','02','03'].some(r=>m?.model===`models/baidicheng/scene_v${r}.glb`&&m.terrain===`baidicheng-v${r}`);
  if(!m||m.contractVersion!=='0.2'||m.scene!=='baidicheng'||m.scope!=='quality-sample'||!paired||m.waterLevel!==0||!Array.isArray(m.requiredNodes)||m.requiredNodes.some(n=>typeof n!=='string')||new Set(m.requiredNodes).size!==m.requiredNodes.length||baidichengNodes.some(n=>!m.requiredNodes!.includes(n)))throw new Error('白帝城候选清单版本、范围或节点非法');
  assertBoatNavigation(m.boatNavigation);
  if(m.terrain!=='baidicheng-v01'&&baidichengForestNodes.some(n=>!m.requiredNodes!.includes(n)))throw new Error('白帝城缺少分岸森林节点');
  if(m.terrain==='baidicheng-v03'){
    if(baidichengV3Nodes.some(n=>!m.requiredNodes!.includes(n)))throw new Error('白帝城v03缺少城楼或远景节点');
    assertDistanceLods(m.distanceLods,m.requiredNodes);
    if(m.distanceLods.length!==baidichengLodNames.length||baidichengLodNames.some(near=>!m.distanceLods!.some(d=>d.near===near&&d.far===near+'_lod')))throw new Error('白帝城v03近远层级不完整');
  }else if(m.distanceLods!==undefined)throw new Error('此白帝城修订未登记距离层级');
}
