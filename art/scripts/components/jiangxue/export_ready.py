"""Correct evaluated static origins and material labels without changing world geometry."""
import sys,json,bmesh
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue')
from common import *
scene=active();export=bpy.data.collections[EXPORT]
for obj in export.all_objects:
    if obj.type!='MESH':continue
    for material in obj.data.materials:
        if '__jx_' in material.name:
            role,label=material.name.split('__',1);material.name=role+'__'+label.replace('_','')
    if obj.name in ('shore_boulders_v02','rock_snow_caps_v03'):
        center=Vector(((min(v.co.x for v in obj.data.vertices)+max(v.co.x for v in obj.data.vertices))/2,
                       (min(v.co.y for v in obj.data.vertices)+max(v.co.y for v in obj.data.vertices))/2,
                       min(v.co.z for v in obj.data.vertices)))
        for vertex in obj.data.vertices:vertex.co-=center
        obj.location+=center;obj.data.update()
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free();obj.data.update()
sys.path.insert(0,ROOT+'/art/scripts')
from validate import validate
report=validate()
with open(OUTPUT+'/validation/blender-contract.json','w',encoding='utf8') as f:json.dump({'errors':report.errors,'warnings':report.warnings},f,ensure_ascii=False,indent=2)
print(json.dumps({'errors':report.errors,'warnings':report.warnings}))
if report.errors:raise RuntimeError('Export contract failed')
bpy.ops.wm.save_as_mainfile(filepath=MAIN,check_existing=False)
from export_glb import export_collection
export_collection(export,OUTPUT+'/raw')
