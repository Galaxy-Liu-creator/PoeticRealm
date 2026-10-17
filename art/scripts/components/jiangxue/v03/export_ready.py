"""Export only this checked revision; preview water stays outside glb_scene_v03."""
import sys,json,bmesh
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue/v03')
from common_v03 import *
scene=active();assert scene['assembled_v03'];export=bpy.data.collections[EXPORT]
assert 'preview_river_v03' not in export.all_objects
for obj in export.all_objects:
    if obj.type=='MESH' and any(len(p.vertices)!=3 for p in obj.data.polygons):
        bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free();obj.data.update()
sys.path.insert(0,ROOT+'/art/scripts');from validate import validate
report=validate();assert not report.errors,report.errors
with open(OUTPUT+'/validation/blender-contract.json','w',encoding='utf8') as f:json.dump({'errors':report.errors,'warnings':report.warnings},f,indent=2)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=MAIN,check_existing=False)
from export_glb import export_collection
export_collection(export,OUTPUT+'/raw')
