"""Refine only the checked crown prototypes with small perimeter leaf sprays."""
import sys,random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
col=collection('bd_v02_foliage_fringe');rng=random.Random(SEED+415)
for variant in range(3):
    old=bpy.data.objects['src_tree_leaves_crown_v02_%02d'%variant]
    vertices=[tuple(old.matrix_basis@v.co) for v in old.data.vertices];faces=[tuple(p.vertices) for p in old.data.polygons];slots=[p.material_index for p in old.data.polygons]
    h=5.5+variant*.95
    for k in range(30):
        a=k*2.399+variant*.5;z=h*(.57+.4*rng.random())
        radius=h*(.25+.12*rng.random());c=Vector((math.cos(a)*radius,math.sin(a)*radius,z))
        u=Vector((-math.sin(a),math.cos(a),.1));w=Vector((math.cos(a)*.45,math.sin(a)*.45,.6))
        size=rng.uniform(.16,.31)
        append_geometry(vertices,faces,([tuple(c-size*u),tuple(c+size*.7*w),tuple(c+size*u),tuple(c-size*.7*w)],[(0,1,2),(2,3,0)]));slots.extend([k%2]*2)
    o=mesh('src_tree_leaves_fringe_v02_%02d'%variant,vertices,faces,col,list(old.data.materials),smooth=True)
    for p,slot in zip(o.data.polygons,slots):p.material_index=slot
    mask=o.data.color_attributes.new(name='mask',type='BYTE_COLOR',domain='POINT')
    for item in mask.data:item.color=(0,0,0,1)
save_component(col,{'variants':3,'perimeterSpraysPerTree':30,'sprayHalfLengthMeters':[.16,.31],'leafMask':'static zero wind weight'},closed=False)
