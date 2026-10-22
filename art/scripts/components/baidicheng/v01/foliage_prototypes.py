"""H: small editable tree/leaf prototypes only; placement is a separate component."""
import sys,random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
col=collection('bd_foliage_prototypes');rng=random.Random(SEED)
wood=material('pbr_wood__bdbark',(.13,.105,.069),.97)
leaf=material('pbr_foliage__bdgreen',(.095,.20,.086),.88)
for variant in range(3):
    h=3.2+variant*.8;v=[];f=[];lv=[];lf=[]
    append_geometry(v,f,cylinder_data((0,0,0),(.13,-.1,h*.86),.15,.035,6))
    for k in range(6):
        a=k*2.399+variant;z=h*(.35+.075*k);end=(math.cos(a)*h*.39,math.sin(a)*h*.35,z+h*.18)
        append_geometry(v,f,cylinder_data((.05,0,z),end,.055,.012,5))
        # Multiple bent leaf sprays make an open irregular crown rather than a closed ball.
        for j in range(7):
            angle=a+j*.91;center=Vector(end)+Vector((rng.uniform(-.65,.65),rng.uniform(-.65,.65),rng.uniform(-.12,.62)))
            size=.38+rng.random()*.30
            u=Vector((math.cos(angle),math.sin(angle),.13));w=Vector((-math.sin(angle),math.cos(angle),.25))
            points=[tuple(center-size*u),tuple(center+size*.55*w),tuple(center+Vector((0,0,.13))),tuple(center+size*u),tuple(center-size*.55*w)]
            append_geometry(lv,lf,(points,[(0,1,2),(1,3,2),(3,4,2),(4,0,2)]))
    mesh('src_tree_bark_%02d'%variant,v,f,col,[wood],smooth=True)
    o=mesh('src_tree_leaves_%02d'%variant,lv,lf,col,[leaf],smooth=True)
    mask=o.data.color_attributes.new(name='mask',type='BYTE_COLOR',domain='POINT')
    for item in mask.data:item.color=(0,0,0,1)
save_component(col,{'variants':3,'seed':SEED,'heightMeters':[3.2,4.0,4.8],'leafMask':'static zero wind weight, exact shared prototype geometry'},closed=False)
