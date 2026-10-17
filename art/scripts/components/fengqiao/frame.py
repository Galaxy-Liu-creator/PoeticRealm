"""B02: tapered columns, segmented lintels and bearing cross-beams only."""
import bpy,sys
sys.path.insert(0,"D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao")
import common as c
import importlib
importlib.reload(c)
col=c.component("architecture_frame","temple")
for owner,root_name in [("temple","temple_main"),("tower","bell_tower")]:
    s=c.P[owner];root=bpy.data.objects[root_name]
    part=c.Part(owner+"_columns_beams",col,root,c.material("pbr_wood__aged"))
    bottom,top,r=s["column_bottom"],s["column_top"],s["column_radius"]
    for x,y in c.column_grid(s):
        lift=.10*(abs(x)/(s["width"]/2))**2
        inward=(-x*.008,-y*.008)
        points=[(x,y,bottom),(x+inward[0]*.30,y+inward[1]*.30,bottom+1.1),
                (x+inward[0]*.72,y+inward[1]*.72,top-.45),
                (x+inward[0],y+inward[1],top+lift)]
        part.tube(points,[r,r*1.035,r*.95,r*.88],12)
    n=s.get("bays",1);xs=[-s["width"]/2+s["width"]*i/n for i in range(n+1)]
    for y in (-s["depth"]/2,s["depth"]/2):
        for a,b in zip(xs,xs[1:]):
            part.box(((a+b)/2,y,top-.14),(b-a+.16,.32,.36))
    for x in xs:
        part.box((x,0,top+.13),(.34,s["depth"]+.24,.34))
    # Interior bearing lines remain separate from the eave lintels.
    if owner=="temple":
        for y in (-s["depth"]/6,s["depth"]/6):
            part.box((0,y,top+.25),(s["width"]-.4,.34,.38))
    part.mesh(.012)
c.verify(col)
c.checkpoint("b02-frame","CAM_temple")
