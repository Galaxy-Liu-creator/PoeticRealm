"""B06: plaster enclosure, board doors, straight mullions and short courtyard walls."""
import bpy,sys,math
from mathutils import Matrix
sys.path.insert(0,"D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao")
import common as c
import importlib
importlib.reload(c)
col=c.component("temple_enclosure","temple");s=c.P["temple"];root=bpy.data.objects["temple_main"]
wall=c.Part("temple_walls",col,root,c.solid("pbr_stone__lime",(.47,.46,.42),.92))
wood=c.Part("temple_doors_windows",col,root,c.material("pbr_wood__aged"))
hw,hd=s["width"]/2,s["depth"]/2
wall.box((0,hd,3.55),(s["width"],.28,3.72))
for sign in (-1,1):
    wall.box((sign*hw,0,2.3),(.28,s["depth"],1.24))
    wall.box((sign*hw,0,5.15),(.28,s["depth"],1.34))
    for y in (-hd,0,hd): wall.box((sign*hw,y,3.5),(.28,.75,3.62))
    for y in (-2.4,2.4):
        wood.box((sign*hw,y,3.70),(.20,3.6,.12))
        wood.box((sign*hw,y,4.50),(.20,3.6,.12))
        for j in range(15): wood.box((sign*hw,y-1.65+j*.235,4.1),(.11,.045,.84))
bay=s["width"]/s["bays"]
for i in range(s["bays"]):
    x=-hw+(i+.5)*bay
    wood.box((x,-hd,5.45),(bay-.15,.18,.48))
    if i in (0,s["bays"]-1):
        wall.box((x,-hd,2.4),(bay-.2,.26,1.42))
        wood.box((x,-hd,3.13),(bay-.18,.17,.15))
        wood.box((x,-hd,4.90),(bay-.18,.17,.15))
        for j in range(13): wood.box((x-bay*.43+j*bay*.86/12,-hd,4.01),(.065,.16,1.7))
    else:
        for sign in (-1,1):
            center=x+sign*bay*.23
            wood.box((center,-hd+.025,3.34),(bay*.445,.09,3.32),Matrix.Rotation(sign*.055,3,"Z"))
            for j in range(6):
                wood.box((center+(-.5+j/5)*bay*.405,-hd-.031,3.34),(.025,.025,3.24))
            for z in (2.30,3.85): wood.box((center,-hd-.03,z),(bay*.42,.065,.12))
        wood.box((x,-hd-.08,3.35),(.035,.09,.5))
for sign in (-1,1):
    wall.box((sign*10.7,-4.9,2.15),(.30,10,2.10))
    wall.box((sign*7.7,-10,2.15),(6,.30,2.1))
coping=c.Part("courtyard_wall_coping",col,root,c.material("pbr_tile__charcoal"))
for sign in (-1,1):
    coping.box((sign*10.7,-4.9,3.28),(.48,10.3,.15))
    coping.box((sign*7.7,-10,3.28),(6.15,.48,.15))
wall.mesh(.012);wood.mesh(.008);coping.mesh(.015)
c.verify(col)
c.checkpoint("b06-enclosure","CAM_temple")
