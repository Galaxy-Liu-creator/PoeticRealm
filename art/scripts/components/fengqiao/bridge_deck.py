"""B09: solid sloping deck, ring-supported spandrels and simple stone rails."""
import bpy,sys,math
sys.path.insert(0,"D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao")
import common as c
import importlib
importlib.reload(c)
col=c.component("bridge_deck_rails","bridge");s=c.P["bridge"];root=bpy.data.objects["bridge_main"]
stone=c.Part("bridge_deck_spandrels",col,root,c.material("pbr_stone__dry"))
rail=c.Part("bridge_railings",col,root,c.material("pbr_stone__dry"))
deck=lambda x:s["deck_top"]-.032*x*x
outer=lambda x:s["spring"]+(s["rise"]+s["ring"])*math.sqrt(max(0,1-(x/(s["half_span"]+s["ring"]))**2))
for i in range(48):
    x0=-8.45+i*16.9/48;x1=x0+16.9/48-.006
    z0,z1=deck(x0),deck(x1);w=s["half_width"]
    verts=[(x0,-w,z0-.24),(x1,-w,z1-.24),(x1,w,z1-.24),(x0,w,z0-.24),
           (x0,-w,z0),(x1,-w,z1),(x1,w,z1),(x0,w,z0)]
    stone.add(verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
    if abs((x0+x1)/2)<s["half_span"]+s["ring"]:
        for sign in (-1,1):
            lo0,lo1=outer(x0)-.045,outer(x1)-.045
            hi0,hi1=z0-.24,z1-.24
            if min(hi0-lo0,hi1-lo1)<-.01: raise RuntimeError("Deck intersects arch crown")
            verts=[(x0,sign*(w-.35),lo0),(x1,sign*(w-.35),lo1),(x1,sign*w,lo1),(x0,sign*w,lo0),
                   (x0,sign*(w-.35),hi0),(x1,sign*(w-.35),hi1),(x1,sign*w,hi1),(x0,sign*w,hi0)]
            stone.add(verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
xs=[-8+i for i in range(17)]
for sign in (-1,1):
    y=sign*1.87
    for x in xs:
        rail.box((x,y,deck(x)+.42),(.19,.21,.83))
        rail.box((x,y,deck(x)+.875),(.25,.27,.075))
    for a,b in zip(xs,xs[1:]):
        for h in (.26,.72):
            rail.tube([(a,y,deck(a)+h),(b,y,deck(b)+h)],.073,6)
stone.mesh(.008);rail.mesh(.009)
c.verify(col)
c.checkpoint("b09-bridge-deck","CAM_bridge")
