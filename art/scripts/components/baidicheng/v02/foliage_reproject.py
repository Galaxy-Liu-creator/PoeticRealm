"""Only root positions in the already assembled forest, after shoulder refinement."""
import sys
from pathlib import Path
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
active();col=collection('bd_v02_forest_supported');points=[];faces=[]
for name in ['cliff_right_near','cliff_left_near','cliff_left_far','cliff_right_far','city_promontory']:
    o=bpy.data.objects[name];append_geometry(points,faces,([tuple(o.matrix_basis@v.co) for v in o.data.vertices],[tuple(p.vertices) for p in o.data.polygons]))
bvh=BVHTree.FromPolygons([Vector(p) for p in points],faces)
source=json.loads((OUT/'components/foliage-placements.json').read_text());placements=source['placements'];deltas=[]
for p in placements:
    x,y,z=p['position'];hit=bvh.ray_cast(Vector((x,y,350)),Vector((0,0,-1)))[0];assert hit is not None
    deltas.append(hit.z-.05-z);p['supportZ']=hit.z;p['position'][2]=hit.z-.05
for kind,proto,closed in [('bark','src_tree_bark_crown_v02_',True),('leaves','src_tree_leaves_fringe_v02_',False)]:
    old=bpy.data.objects['src_forest_'+kind+'_v02'];vs=[old.matrix_basis@v.co for v in old.data.vertices];offset=0
    for p,dz in zip(placements,deltas):
        count=len(bpy.data.objects[proto+'%02d'%p['variant']].data.vertices)
        for v in vs[offset:offset+count]:v.z+=dz
        offset+=count
    assert offset==len(vs)
    o=mesh('src_forest_'+kind+'_supported_v02',[tuple(v) for v in vs],[tuple(p.vertices) for p in old.data.polygons],col,list(old.data.materials),smooth=True)
    for p,previous in zip(o.data.polygons,old.data.polygons):p.material_index=previous.material_index
    if kind=='leaves':
        mask=o.data.color_attributes.new(name='mask',type='BYTE_COLOR',domain='POINT')
        for item in mask.data:item.color=(0,0,0,1)
    checked(o,closed);target=bpy.data.objects['forest_'+kind];target.data=o.data.copy();target.matrix_basis=o.matrix_basis.copy()
report('components/foliage-placements-supported.json',source)
save_component(col,{'count':len(placements),'rootEmbeddedMeters':.05,'maxHeightAdjustmentMeters':max(abs(d) for d in deltas),'changed':'root translation only'},closed=False)
