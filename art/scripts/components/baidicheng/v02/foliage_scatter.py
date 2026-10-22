"""Place checked prototypes only; no geometry is created from scratch here."""
import sys,random
from pathlib import Path
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
from geology import SPECS
active();col=collection('bd_v02_forest');rng=random.Random(SEED+422)
points=[];faces=[]
for name in ['cliff_right_near','cliff_left_near','cliff_left_far','cliff_right_far','city_promontory']:
    o=bpy.data.objects[name];append_geometry(points,faces,([tuple(o.matrix_basis@v.co) for v in o.data.vertices],[tuple(p.vertices) for p in o.data.polygons]))
bvh=BVHTree.FromPolygons([Vector(p) for p in points],faces)
placements=[]
for which,count in [('right_near',66),('left_near',76),('left_far',43),('right_far',45)]:
    side,y0,y1,height,width,phase,segments=SPECS[which];accepted=0;attempts=0
    while accepted<count:
        attempts+=1;assert attempts<20000
        # Group plants along shoulders; some smaller trees take recessed high ledges.
        y=rng.uniform(y0+8,y1-7);offset=rng.uniform(20,width-4)
        x=bank_x(side,y)+side*offset
        hit,normal,_,_=bvh.ray_cast(Vector((x,y,350)),Vector((0,0,-1)))
        if hit is None or normal.z<.44 or hit.z<29:continue
        if abs(x-CITY[0])<30 and abs(y-CITY[1])<31:continue
        if any((p['position'][0]-x)**2+(p['position'][1]-y)**2<13 for p in placements):continue
        scale=rng.uniform(.9,1.6) if y<-55 else rng.uniform(.7,1.3)
        placements.append({'position':[x,y,hit.z-.05],'supportZ':hit.z,'variant':accepted%3,'scale':scale,'yaw':rng.uniform(0,math.tau),'bank':which})
        accepted+=1
bv=[];bf=[];lv=[];lf=[];slots=[]
for p in placements:
    t=Matrix.Translation(Vector(p['position']))@Matrix.Rotation(p['yaw'],4,'Z')@Matrix.Diagonal((p['scale'],)*3+(1,))
    for kind,vs,fs,name in [('bark',bv,bf,'src_tree_bark_crown_v02_'),('leaves',lv,lf,'src_tree_leaves_fringe_v02_')]:
        proto=bpy.data.objects[name+'%02d'%p['variant']]
        append_geometry(vs,fs,([tuple(t@proto.matrix_basis@v.co) for v in proto.data.vertices],[tuple(f.vertices) for f in proto.data.polygons]))
        if kind=='leaves':slots.extend(poly.material_index for poly in proto.data.polygons)
bark=mesh('src_forest_bark_v02',bv,bf,col,[bpy.data.materials['pbr_wood__bdbark']],smooth=True)
leaves=mesh('src_forest_leaves_v02',lv,lf,col,[bpy.data.materials['pbr_foliage__bdcanopy'],bpy.data.materials['pbr_foliage__bdtips']],smooth=True)
for poly,slot in zip(leaves.data.polygons,slots):poly.material_index=slot
mask=leaves.data.color_attributes.new(name='mask',type='BYTE_COLOR',domain='POINT')
for item in mask.data:item.color=(0,0,0,1)
checked(bark);checked(leaves,False)
for src,name in [(bark,'forest_bark'),(leaves,'forest_leaves')]:
    target=bpy.data.objects[name];target.data=src.data.copy();target.matrix_basis=src.matrix_basis.copy()
report('components/foliage-placements.json',{'seed':SEED+422,'placements':placements})
save_component(col,{'count':len(placements),'rootEmbeddedMeters':.05,'support':'actual v02 published banks','minimumPlanSpacingMeters':13**.5,'assembly':'checked v02 crown/fringe and branch prototypes only'},closed=False)
