"""Repair the unchecked crown candidate; retain the failed geometry in a hidden history collection."""
import sys,bpy
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue')
from common import *
col=bpy.data.collections['jx_rock_snow_v02']
assert col.name not in json.loads(active().get('component_checks','{}'))
failed=bpy.data.objects['src_rock_snow_caps_v02']
bpy.ops.wm.save_as_mainfile(filepath=OUTPUT+'/checkpoints/jx_snow_caps_failed.blend',copy=True,check_existing=False)
failed.name='history_snow_caps_failed';bpy.data.collections['jiangxue_preview'].objects.link(failed);col.objects.unlink(failed)
failed.hide_render=True;failed.hide_set(True)
rocks=bpy.data.objects['src_shore_boulders_v02'];vertices=[];faces=[];mapping={}
assert len(rocks.data.polygons)==14*180
for poly in rocks.data.polygons:
    local_index=poly.index%180
    if not (local_index<54 or 144<=local_index<162):continue
    face=[]
    for index in poly.vertices:
        if index not in mapping:
            p=rocks.data.vertices[index].co+rocks.location
            mapping[index]=len(vertices);vertices.append(tuple(p+Vector((0,0,.105))))
        face.append(mapping[index])
    faces.append(tuple(face))
cap=mesh('rock_snow_caps_v03',vertices,faces,col,bpy.data.materials['pbr_snow__fresh'],rocks.parent)
bpy.ops.object.select_all(action='DESELECT');cap.select_set(True);bpy.context.view_layer.objects.active=cap
mod=cap.modifiers.new('snow_volume','SOLIDIFY');mod.thickness=.09;mod.offset=-1
bpy.ops.object.modifier_apply(modifier=mod.name)
finish(col,extra={'rockCount':14,'snowSurface':'connected ring crown with closed 90mm volume',
                 'failedCandidate':'checkpoints/jx_snow_caps_failed.blend; original 8 nonmanifold edges rejected'})
view('CAM_nature')
