"""Three independently editable broadleaf crowns and their supporting branch frames."""
import sys,random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
col=collection('bd_v02_foliage_prototypes');rng=random.Random(SEED+400)
wood=bpy.data.materials['pbr_wood__bdbark']
leaf=bpy.data.materials['pbr_foliage__bdgreen'].copy();leaf.name='pbr_foliage__bdcanopy'
light=leaf.copy();light.name='pbr_foliage__bdtips'
for m,c in [(leaf,(.082,.19,.075)),(light,(.16,.265,.10))]:
    bsdf=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bsdf.inputs['Base Color'].default_value=(*c,1);m.diffuse_color=(*c,1)

def clump(center,radii,phase):
    """Twenty triangles enclose a lobed foliage mass, with irregular silhouette."""
    c=Vector(center);rx,ry,rz=radii;n=6
    v=[tuple(c+Vector((0,0,-rz))),tuple(c+Vector((.12*rx,-.08*ry,rz)))]
    for j,z in enumerate([-.28,.35]):
        for i in range(n):
            a=math.tau*i/n+phase;factor=1+rng.uniform(-.17,.17)
            v.append(tuple(c+Vector((rx*math.cos(a)*factor,ry*math.sin(a)*factor,rz*(z+rng.uniform(-.13,.13))))))
    f=[]
    for i in range(n):
        k=(i+1)%n;f.extend([(0,2+k,2+i),(2+i,2+k,8+k,8+i),(1,8+i,8+k)])
    return v,f

for variant in range(3):
    h=5.5+variant*.95;v=[];f=[];lv=[];lf=[];slots=[]
    bend=Vector((.20+variant*.1,-.20,h*.75))
    append_geometry(v,f,cylinder_data((0,0,0),bend,.18+variant*.025,.045,6))
    for k in range(5):
        a=k*2.399+variant*.5;z=h*(.41+.07*k);end=Vector((math.cos(a)*h*.28,math.sin(a)*h*.27,z+h*.13))
        append_geometry(v,f,cylinder_data((.12,-.1,z),end,.065,.018,5))
        # Two unequal crown lobes on every load-bearing branch.
        for j in range(2):
            center=end+Vector((rng.uniform(-.5,.5),rng.uniform(-.5,.5),j*.58))
            size=h*(.17+.04*rng.random())
            part=clump(center,(size,size*.86,size*.72),a+j*.4)
            slots.extend([int((k+j+variant)%4==0)]*len(part[1]));append_geometry(lv,lf,part)
    # Central apical crown closes the previous bare-trunk gap.
    part=clump((.12,-.1,h*.88),(h*.24,h*.23,h*.20),variant)
    slots.extend([0]*len(part[1]));append_geometry(lv,lf,part)
    bark=mesh('src_tree_bark_crown_v02_%02d'%variant,v,f,col,[wood],smooth=True)
    crown=mesh('src_tree_leaves_crown_v02_%02d'%variant,lv,lf,col,[leaf,light],smooth=True)
    for p,slot in zip(crown.data.polygons,slots):p.material_index=slot
    mask=crown.data.color_attributes.new(name='mask',type='BYTE_COLOR',domain='POINT')
    for item in mask.data:item.color=(0,0,0,1)
    # A single common tree coordinate system preserves the branch/crown connection.
    crown['prototype_root_z']=0.
save_component(col,{'variants':3,'heightMeters':[5.5,6.45,7.4],'closedLobesPerCrown':11,'leafMask':'static zero wind weight','coordinates':'shared authored root at [0,0,0], use matrix_basis for hidden sources'},closed=True)
