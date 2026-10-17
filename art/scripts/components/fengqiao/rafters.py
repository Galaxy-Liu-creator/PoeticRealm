"""B04: purlins, forked ridge supports, repeated curved rafters and fascia."""
import bpy,sys,math
sys.path.insert(0,"D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao")
import common as c
import importlib
importlib.reload(c)
col=c.component("architecture_rafters","temple")
for owner,root_name in [("temple","temple_main"),("tower","bell_tower")]:
    s=c.P[owner];part=c.Part(owner+"_roof_frame",col,bpy.data.objects[root_name],c.material("pbr_wood__aged"))
    hw=s["width"]/2+s["eave"];hd=s["depth"]/2+s["eave"]
    ridge=max(.8,(s["width"]-s["depth"])/2)
    ez=s["bracket_top"];rz=s["roof_ridge"]-.16
    for y in (-hd+.25,-hd+.88,-s["depth"]/2,-s["depth"]/4,s["depth"]/4,s["depth"]/2,hd-.88,hd-.25):
        f=abs(y)/hd;z=ez+(rz-ez)*(1-f)**1.3-.12
        span=hw*f+ridge*(1-f)-.12
        part.tube([(-span,y,z),(span,y,z)],.11,8)
    part.tube([(-ridge-.4,0,rz-.12),(ridge+.4,0,rz-.12)],.17,10)
    # Tie beams transfer fork loads to the checked column/bracket grid.
    for sign in (-1,1):
        part.box((0,sign*s['depth']/6,ez+.12),(s['width']+.25,.34,.30))
        part.box((sign*ridge,0,ez+.12),(.34,s['depth']+.25,.30))
    for x,y in c.column_grid(s):
        t=1-abs(y)/hd;top=ez+(rz-ez)*t**1.3-.12
        if top>ez+.15: part.box((x,y,(ez+top)/2),(.22,.22,top-ez+.08))
    for x in (-ridge,ridge):
        for sign in (-1,1):
            part.tube([(x,sign*s["depth"]/6,ez+.3),(x,0,rz-.14)],[.14,.10],8)
    count=round(2*hw/.35)
    for i in range(count+1):
        x=-hw+2*hw*i/count
        for sign in (-1,1):
            points=[]
            for j in range(5):
                t=j/4
                y=sign*hd*(1-t);px=x*(1-t)+max(-ridge,min(ridge,x))*t
                z=ez+(rz-ez)*t**1.3+.32*(1-t)**4*(abs(x)/hw)**6-.10
                points.append((px,y,z))
            part.tube(points,.052,6)
    for sign in (-1,1):
        for y in [-hd+i*2*hd/20 for i in range(21)]:
            x=sign*hw
            points=[]
            for j in range(5):
                t=j/4
                points.append((sign*(hw*(1-t)+ridge*t),y*(1-t),ez+(rz-ez)*t**1.3+.32*(1-t)**4*(abs(y)/hd)**6-.10))
            part.tube(points,.05,6)
    for sign in (-1,1):
        points=[(-hw+2*hw*i/24,sign*hd,ez+.32*(abs(-1+2*i/24))**6-.10) for i in range(25)]
        part.tube(points,.12,8)
    part.mesh()
c.verify(col)
c.checkpoint("b04-rafters","CAM_temple")
