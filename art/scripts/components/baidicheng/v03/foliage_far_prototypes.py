"""Only the three low-detail tree prototypes, preserving the original root system."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
col=collection('bd_v03_tree_far_prototypes');mats=[bpy.data.materials['pbr_foliage__bdcanopy'],bpy.data.materials['pbr_foliage__bdtips']]
for variant in range(3):
    h=5.5+variant*.95;v=[];f=[];lv=[];lf=[];slots=[]
    append_geometry(v,f,cylinder_data((0,0,0),(.2,-.15,h*.80),.19+variant*.025,.035,6))
    for sign in [-1,1]:append_geometry(v,f,cylinder_data((.1,-.1,h*.48),(sign*h*.25,0,h*.72),.055,.01,4))
    for k,(x,y,z) in enumerate([(0,0,.89),(-.24,0,.69),(.22,.05,.75),(.01,-.23,.76),(.01,.21,.82)]):
        center=Vector((x*h,y*h,z*h));rx=h*(.25 if k==0 else .23);ry=rx*.92;rz=rx*.76
        points=[tuple(center+Vector(p)) for p in [(rx,0,0),(0,ry,0),(-rx,0,0),(0,-ry,0),(0,0,rz),(0,0,-rz)]]
        faces=[(i,(i+1)%4,4) for i in range(4)]+[((i+1)%4,i,5) for i in range(4)]
        append_geometry(lv,lf,(points,faces));slots.extend([int(k==0)]*8)
    bark=mesh('src_tree_bark_far_v03_%02d'%variant,v,f,col,[bpy.data.materials['pbr_wood__bdbark']],smooth=True)
    leaves=mesh('src_tree_leaves_far_v03_%02d'%variant,lv,lf,col,mats,smooth=True)
    for p,i in zip(leaves.data.polygons,slots):p.material_index=i
    mask=leaves.data.color_attributes.new(name='mask',type='BYTE_COLOR',domain='POINT')
    for p in mask.data:p.color=(0,0,0,1)
save_component(col,{'variants':3,'trianglesPerTree':84,'crownLobes':5,'baseHeightsMeters':[5.5,6.45,7.4],'root':'same [0,0,0] authored coordinate system as v02'},closed=True)
