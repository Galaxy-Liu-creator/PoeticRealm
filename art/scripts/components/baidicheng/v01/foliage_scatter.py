"""I: place and batch only the independently checked tree prototypes."""
import sys,random
from pathlib import Path
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
assert active().get('bd_foliage_prototypes_checked')
col=collection('bd_foliage_scatter');rng=random.Random(SEED+91)
cliffs=[bpy.data.objects['src_cliff_'+n] for n in ['right_near','left_near','left_far','right_far']]+[bpy.data.objects['src_city_promontory']]
vertices=[];faces=[]
for o in cliffs:append_geometry(vertices,faces,([tuple(o.matrix_world@v.co) for v in o.data.vertices],[tuple(p.vertices) for p in o.data.polygons]))
support=BVHTree.FromPolygons([Vector(v) for v in vertices],faces)
placements=[];tries=0
while len(placements)<180 and tries<9000:
    tries+=1;side=-1 if len(placements)<90 else 1;y=rng.uniform(-62,255);x=bank_x(side,y)+side*rng.uniform(3,38)
    if abs(x-CITY[0])<28 and abs(y-CITY[1])<29:continue
    hit,normal,_,_=support.ray_cast(Vector((x,y,250)),Vector((0,0,-1)))
    if hit is None or normal.z<.38 or hit.z<4:continue
    if any((p['position'][0]-x)**2+(p['position'][1]-y)**2<7 for p in placements):continue
    placements.append({'position':[x,y,hit.z-.05],'supportZ':hit.z,'variant':len(placements)%3,'yaw':rng.uniform(0,math.tau),'scale':rng.uniform(1.0,1.75)})
assert len(placements)==180
bv=[];bf=[];lv=[];lf=[]
for p in placements:
    rotation=Matrix.Rotation(p['yaw'],4,'Z');scale=Matrix.Diagonal((p['scale'],p['scale'],p['scale'],1))
    transform=Matrix.Translation(Vector(p['position']))@rotation@scale
    for kind,vs,fs in [('bark',bv,bf),('leaves',lv,lf)]:
        proto=bpy.data.objects['src_tree_'+kind+'_%02d'%p['variant']]
        append_geometry(vs,fs,([tuple(transform@proto.matrix_world@v.co) for v in proto.data.vertices],[tuple(face.vertices) for face in proto.data.polygons]))
mesh('src_forest_bark',bv,bf,col,[bpy.data.materials['pbr_wood__bdbark']],smooth=True)
o=mesh('src_forest_leaves',lv,lf,col,[bpy.data.materials['pbr_foliage__bdgreen']],smooth=True)
mask=o.data.color_attributes.new(name='mask',type='BYTE_COLOR',domain='POINT')
for item in mask.data:item.color=(0,0,0,1)
report('components/foliage-placements.json',{'seed':SEED+91,'placements':placements})
save_component(col,{'count':len(placements),'prototypes':'bd_foliage_prototypes','rootEmbeddedMeters':.05,'support':'actual checked cliff BVH','buildingClearanceMeters':[28,29]},closed=False)
