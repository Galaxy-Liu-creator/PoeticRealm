"""Triangulate candidate export meshes for reliable glTF tangents; retain editable sources."""
import sys,shutil
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
active();col=bpy.data.collections[EXPORT];rows=[]
for o in col.all_objects:
    if o.type!='MESH' or not any(len(p.vertices)>4 for p in o.data.polygons):continue
    bm=bmesh.new();bm.from_mesh(o.data);before=sum(len(f.verts)-2 for f in bm.faces)
    bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4]);bm.to_mesh(o.data);bm.free();o.data.update()
    after=sum(len(p.vertices)-2 for p in o.data.polygons);assert before==after,(o.name,before,after)
    rows.append({'node':o.name,'triangles':after})
boat=bpy.data.objects['boat_guest']
for o in [boat,*boat.children_recursive]:o['static']=False
report('components/export-preparation.json',{'triangulatedNgons':rows,'editableSourceComponentsRetained':True,'dynamicBoatNodes':len(boat.children_recursive)+1})
raw=OUT/'raw/scene_v01.glb';previous=OUT/'attempts/first-export-before-triangulation.glb'
if raw.exists():
    assert not previous.exists();shutil.copy2(raw,previous)
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
