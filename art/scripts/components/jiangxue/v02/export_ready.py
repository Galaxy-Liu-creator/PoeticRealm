"""Triangulate new static export faces and export only the checked independent revision."""
import sys,json,bmesh
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue/v02')
from common_v02 import *
scene=active();export=bpy.data.collections[EXPORT];assert scene.get('assembled_v02')
for obj in export.all_objects:
    if obj.type=='MESH' and any(len(p.vertices)!=3 for p in obj.data.polygons):
        bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free();obj.data.update()
sys.path.insert(0,ROOT+'/art/scripts')
from validate import validate
report=validate();assert not report.errors,report.errors
with open(OUTPUT+'/validation/blender-contract.json','w',encoding='utf8') as f:json.dump({'errors':report.errors,'warnings':report.warnings},f,ensure_ascii=False,indent=2)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=MAIN,check_existing=False)
from export_glb import export_collection
export_collection(export,OUTPUT+'/raw')
