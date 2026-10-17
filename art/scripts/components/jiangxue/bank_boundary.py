"""Affected component group only: hide bank cut boundaries below water and inside distant terrain."""
import sys,json,bmesh
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue')
from common import *
scene=active()
if scene.get('bank_boundary_refined'):raise RuntimeError('Bank boundary already refined')
for name in ('src_shore_bank','src_shore_snow','shore_bank','shore_snow'):
    obj=bpy.data.objects[name]
    for v in obj.data.vertices:
        p=v.co+obj.location
        front=max(0,min(1,(p.y+21)/7));front=front*front*(3-2*front)
        if p.z> -1.99:p.z=-1.5+(p.z+1.5)*front
        p.x+=2.8*max(0,p.x-2)**1.15
        if p.y>20:p.y=20+(p.y-20)*28
        v.co=p-obj.location
    center=Vector(((min(v.co.x for v in obj.data.vertices)+max(v.co.x for v in obj.data.vertices))/2,
                   (min(v.co.y for v in obj.data.vertices)+max(v.co.y for v in obj.data.vertices))/2,
                   min(v.co.z for v in obj.data.vertices)))
    for v in obj.data.vertices:v.co-=center
    obj.location+=center
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    assert all(e.is_manifold for e in bm.edges);bm.to_mesh(obj.data);bm.free();obj.data.update()
    uv=obj.data.uv_layers.active
    for poly in obj.data.polygons:
        axes=[a for a in range(3) if a!=max(range(3),key=lambda a:abs(poly.normal[a]))]
        for index in poly.loop_indices:
            p=obj.data.vertices[obj.data.loops[index].vertex_index].co+obj.location
            uv.data[index].uv=(p[axes[0]]/1.8,p[axes[1]]/1.8)
scene['bank_boundary_refined']=True
finish(bpy.data.collections['jx_shore_rock'],extra={'boundary':'front submerged, back extended inside distant terrain; inspected rock cluster untouched'})
finish(bpy.data.collections['jx_shore_snow'],extra={'boundary':'snow follows the same substrate transform'})
view('CAM_enter')
