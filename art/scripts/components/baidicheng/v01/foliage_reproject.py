"""Reproject checked forest prototypes onto revised shoulders, adding a finite foreground group."""
import sys,random
from pathlib import Path
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
active();col=collection('bd_foliage_shoulders');rng=random.Random(SEED+211)
vs=[];fs=[]
for name in ['cliff_right_near','cliff_left_near','cliff_left_far','cliff_right_far','city_promontory']:
    o=bpy.data.objects[name];append_geometry(vs,fs,([tuple(o.matrix_world@v.co) for v in o.data.vertices],[tuple(p.vertices) for p in o.data.polygons]))
bvh=BVHTree.FromPolygons([Vector(v) for v in vs],fs)
placements=json.loads((OUT/'components/foliage-placements.json').read_text())['placements']
for p in placements:
    x,y,_=p['position'];hit=bvh.ray_cast(Vector((x,y,300)),Vector((0,0,-1)))[0];assert hit is not None
    p['position'][2]=hit.z-.05;p['supportZ']=hit.z
for side in [-1,1]:
    added=0
    while added<30:
        y=rng.uniform(-162,-62);x=bank_x(side,y)+side*rng.uniform(6,39)
        hit,normal,_,_=bvh.ray_cast(Vector((x,y,300)),Vector((0,0,-1)))
        if hit is None or normal.z<.38:continue
        if any((p['position'][0]-x)**2+(p['position'][1]-y)**2<10 for p in placements):continue
        placements.append({'position':[x,y,hit.z-.05],'supportZ':hit.z,'variant':added%3,'yaw':rng.uniform(0,math.tau),'scale':rng.uniform(1.5,2.5)});added+=1
bv=[];bf=[];lv=[];lf=[]
for p in placements:
    transform=Matrix.Translation(Vector(p['position']))@Matrix.Rotation(p['yaw'],4,'Z')@Matrix.Diagonal((p['scale'],p['scale'],p['scale'],1))
    for kind,vertices,faces in [('bark',bv,bf),('leaves',lv,lf)]:
        proto=bpy.data.objects['src_tree_'+kind+'_%02d'%p['variant']]
        append_geometry(vertices,faces,([tuple(transform@proto.matrix_world@v.co) for v in proto.data.vertices],[tuple(f.vertices) for f in proto.data.polygons]))
bark=mesh('src_forest_bark_shoulders',bv,bf,col,[bpy.data.materials['pbr_wood__bdbark']],smooth=True)
leaves=mesh('src_forest_leaves_shoulders',lv,lf,col,[bpy.data.materials['pbr_foliage__bdgreen']],smooth=True)
mask=leaves.data.color_attributes.new(name='mask',type='BYTE_COLOR',domain='POINT')
for item in mask.data:item.color=(0,0,0,1)
for src,name in [(bark,'forest_bark'),(leaves,'forest_leaves')]:
    target=bpy.data.objects[name];target.data=src.data.copy();target.matrix_basis=src.matrix_basis.copy()
report('components/foliage-placements-v02.json',{'seed':SEED+211,'placements':placements})
save_component(col,{'count':len(placements),'reprojected':180,'addedForeground':60,'rootEmbeddedMeters':.05,'support':'actual revised shoulder geometry'},closed=False)
