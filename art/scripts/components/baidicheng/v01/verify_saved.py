"""Independent saved-source audit; no source modifications."""
import sys
from pathlib import Path
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
sys.path.insert(0,str(ROOT/'art/scripts'))
from validate import validate
scene=active();result=validate();assert not result.errors
col=bpy.data.collections[EXPORT];closed=[];bands=[]
for o in col.all_objects:
    if o.type!='MESH' or o.find_armature() or o.name in ['forest_leaves','mask_probe']:continue
    closed.append(checked(o))
    if o.name.startswith('cliff_') or o.name=='city_promontory':
        for p in o.data.polygons:
            heights=[(o.matrix_world@o.data.vertices[i].co).z for i in p.vertices]
            assert not(min(heights)<.22-1e-4 and max(heights)>.22+1e-4)
            assert p.material_index==int(max(heights)<=.22+1e-4),(o.name,p.index)
        bands.append(o.name)
assert len(bpy.data.objects['rower_rig'].data.bones)==53
hull=bpy.data.objects['boat_hull_closed'];bottom=min((hull.matrix_world@v.co).z for v in hull.data.vertices);assert -.35<bottom<-.20
points=[];faces=[]
for name in bands:
    o=bpy.data.objects[name];append_geometry(points,faces,([tuple(o.matrix_world@v.co) for v in o.data.vertices],[tuple(p.vertices) for p in o.data.polygons]))
bvh=BVHTree.FromPolygons([Vector(p) for p in points],faces)
placements=json.loads((OUT/'components/foliage-placements-v02.json').read_text())['placements'];max_gap=0
for p in placements:
    x,y,z=p['position'];hit=bvh.ray_cast(Vector((x,y,300)),Vector((0,0,-1)))[0];assert hit is not None
    gap=abs(hit.z-z-.05);max_gap=max(max_gap,gap);assert gap<1e-3
report('validation/reopened-source.json',{'passed':True,'errors':result.errors,'warnings':result.warnings,'closedMeshes':closed,'waterlineNodes':bands,'hullBottomMeters':bottom,'rigBones':53,'treeRoots':len(placements),'maxRootSupportErrorMeters':max_gap,'source':str(MAIN)})
print('Reopened source verified:',len(closed),'closed meshes,',len(placements),'supported tree roots')
