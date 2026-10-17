"""One checked accessory group: closed woven hat, bindings, beard and deck-contact shoes."""
import sys,json,math,random
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue')
from common import *
col=component('jx_hat_accessories',('jx_fisherman_body',));rig=bpy.data.objects['src_fisherman_rig']
spec=json.loads(active()['fisherman_parameters']);cx,cy=spec['centre'];top=spec['headTop']
profile=[(.370,-.070),(.365,-.038),(.27,.025),(.16,.095),(.006,.190),(.007,.175),(.15,.076),(.26,.009),(.356,-.052),(.365,-.080)]
n=96;vertices=[(cx+r*math.cos(math.tau*j/n),cy+r*.97*math.sin(math.tau*j/n),top+z) for r,z in profile for j in range(n)]
faces=[(k*n+j,k*n+(j+1)%n,((k+1)%len(profile))*n+(j+1)%n,((k+1)%len(profile))*n+j) for k in range(len(profile)) for j in range(n)]
hat=mesh('fisherman_hat',vertices,faces,col,bpy.data.materials['pbr_cloth__jx_straw'],rig,dynamic=True)
def bind(obj,joint):
    vg=obj.vertex_groups.new(name=joint);vg.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    mod=obj.modifiers.new('accessory_skin','ARMATURE');mod.object=rig
bind(hat,'fisherman_head')
shape=Shape()
for j in range(80):
    angle=math.tau*j/80
    points=[(cx+r*math.cos(angle),cy+r*.97*math.sin(angle),top+z+.003) for r,z in profile[:5]]
    shape.tube(points,[.0028,.0025,.002,.0015,.0007],sides=4)
for r,z in ((.365,-.042),(.271,.027),(.161,.097)):
    shape.tube([(cx+r*math.cos(math.tau*j/96),cy+r*.97*math.sin(math.tau*j/96),top+z+.004) for j in range(97)],.0025,sides=5)
obj=shape.finish('fisherman_hat_weave',col,bpy.data.materials['pbr_cloth__jx_straw_fibres'],rig,dynamic=True);bind(obj,'fisherman_head')
cord=Shape()
for sign in (-1,1):cord.tube([(cx,cy+sign*.13,top-.065),(cx+.065,cy+sign*.115,top-.20),(cx+.10,cy+sign*.015,top-.285)],[.003,.003,.0025],sides=6)
obj=cord.finish('fisherman_hat_cord',col,solid('pbr_cloth__jx_cord',(.12,.087,.043)),rig,dynamic=True);bind(obj,'fisherman_head')
# Weathered face remains the CC0 anatomical mesh. The sparse grey beard is a separate editable accessory.
beard=Shape();rng=random.Random(P['seed']+91)
head=rig.data.bones['fisherman_head'].head_local
for i in range(32):
    y=rng.uniform(-.053,.053);length=rng.uniform(.026,.060)
    start=(cx+.11,cy+y,top-.265-rng.uniform(0,.018))
    beard.tube([start,(start[0]+.005,start[1]*.97,start[2]-length*.6),(start[0],start[1]*.93,start[2]-length)],[.0015,.001,.0004],sides=4)
obj=beard.finish('fisherman_grey_beard',col,solid('pbr_skin__jx_greyhair',(.22,.235,.225),.96),rig,dynamic=True);bind(obj,'fisherman_head')
for side in ('left','right'):
    ankle=rig.data.bones['fisherman_foot_'+side].head_local;shape=Shape();vs=[];fs=[]
    for z,rx,ry in ((.447,.125,.065),(.465,.13,.066),(.51,.114,.060),(.54,.075,.05)):
        for j in range(32):vs.append((ankle.x+.062+rx*math.cos(math.tau*j/32),ankle.y+ry*math.sin(math.tau*j/32),z))
    fs=[(k*32+j,k*32+(j+1)%32,(k+1)*32+(j+1)%32,(k+1)*32+j) for k in range(3) for j in range(32)]
    fs.extend([tuple(reversed(range(32))),tuple(96+j for j in range(32))])
    obj=mesh('fisherman_shoe_'+side,vs,fs,col,bpy.data.materials['pbr_cloth__jx_trousers'],rig,dynamic=True);bind(obj,'fisherman_foot_'+side)
finish(col,extra={'hatDiameter':.74,'hatThickness':.012,'radialStrands':80,'shoeSoleHeight':.447})
view('CAM_fisherman')
