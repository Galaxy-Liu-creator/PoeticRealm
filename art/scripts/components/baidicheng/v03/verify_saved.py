"""Independent saved-source audit; no source modifications."""
import sys
from pathlib import Path
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
sys.path.insert(0,str(ROOT/'art/scripts'))
from validate import validate
scene=active();result=validate();assert not result.errors
def world(o):
    return world(o.parent)@o.matrix_parent_inverse@o.matrix_basis if o.parent else o.matrix_basis.copy()
col=bpy.data.collections[EXPORT];closed=[];bands=[]
for o in col.all_objects:
    if o.type!='MESH' or o.find_armature() or o.name.startswith('forest_leaves') or o.name=='mask_probe':continue
    closed.append(checked(o))
    if o.name.startswith('cliff_') or o.name=='city_promontory':
        for p in o.data.polygons:
            heights=[(world(o)@o.data.vertices[i].co).z for i in p.vertices]
            assert not(min(heights)<.22-1e-4 and max(heights)>.22+1e-4)
            assert p.material_index==int(max(heights)<=.22+1e-4),(o.name,p.index)
        bands.append(o.name)
assert len(bpy.data.objects['rower_rig'].data.bones)==53
hull=bpy.data.objects['boat_hull_closed'];bottom=min((hull.matrix_world@v.co).z for v in hull.data.vertices);assert -.35<bottom<-.20
placements=json.loads((OUT/'placements.json').read_text())['placements'];support_checks={}
for level in ['near','far']:
    names=[n for n in bands if not n.endswith('_lod_mesh')] if level=='near' else [n for n in bands if n.endswith('_lod_mesh') or n=='city_promontory']
    points=[];faces=[]
    for name in names:
        o=bpy.data.objects[name];append_geometry(points,faces,([tuple(world(o)@v.co) for v in o.data.vertices],[tuple(p.vertices) for p in o.data.polygons]))
    bvh=BVHTree.FromPolygons([Vector(p) for p in points],faces);maximum=0
    for p in placements:
        x,y,z=p['position'];hit=bvh.ray_cast(Vector((x,y,350)),Vector((0,0,-1)))[0];assert hit is not None
        gap=abs(hit.z-z-.05);maximum=max(maximum,gap);assert gap<1e-3,(level,p,gap)
    support_checks[level]=maximum
max_gap=max(support_checks.values())
lods=json.loads(scene['distance_lods_json']);assert len(lods)==9
for entry in lods:
    a=world(bpy.data.objects[entry['near']]);b=world(bpy.data.objects[entry['far']]);assert all(abs(a[r][c]-b[r][c])<1e-5 for r in range(4) for c in range(4))
# Read the final rib source back independently and verify every seated station.
from mathutils.kdtree import KDTree
rib=bpy.data.objects['src_city_roof_ribs_seated_v03'];published=bpy.data.objects['city_roof_detail'];kd=KDTree(len(published.data.vertices))
for i,v in enumerate(published.data.vertices):kd.insert(world(published)@v.co,i)
kd.balance();cursor=0;roof_contacts=[]
for bi,(x,y,w,d,h) in enumerate(BUILDINGS+[(0,-23,7,4,5.5)]):
    roof=bpy.data.objects['city_roof_%02d'%bi];roof.data.calc_loop_triangles()
    bvh=BVHTree.FromPolygons([world(roof)@v.co for v in roof.data.vertices],[tuple(t.vertices) for t in roof.data.loop_triangles],all_triangles=True)
    count=(max(6,round(w/1.1))+1)*(2 if bi in [0,3,6] else 1)
    for k in range(count):
        for station in range(3):
            point=world(rib)@rib.data.vertices[cursor+k*12+station*4+3].co
            hit=bvh.ray_cast(Vector((point.x,point.y,300)),Vector((0,0,-1)))[0];assert hit is not None
            error=abs(point.z-hit.z+.02);assert error<2e-5,(bi,k,station,error)
            assert kd.find(point)[2]<2e-5;roof_contacts.append(error)
    cursor+=count*12+16
assert cursor==len(rib.data.vertices)
roof_seating={'stations':len(roof_contacts),'insetMeters':.02,'maxErrorMeters':max(roof_contacts),'publishedCoordinatesMatched':True}
report('validation/reopened-source.json',{'passed':True,'errors':result.errors,'warnings':result.warnings,'closedMeshes':closed,'waterlineNodes':bands,'hullBottomMeters':bottom,'roofRibSeating':roof_seating,'rigBones':53,'lods':lods,'supportLevels':support_checks,'treeRoots':len(placements),'maxRootSupportErrorMeters':max_gap,'source':str(MAIN)})
print('Reopened source verified:',len(closed),'closed meshes,',len(placements),'supported tree roots')
