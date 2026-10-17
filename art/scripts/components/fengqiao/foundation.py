"""B01: temple/tower stone plinths, six treads and column footings only."""
import bpy,sys
sys.path.insert(0,"D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao")
import common as c
import importlib
importlib.reload(c)
col=c.component("architecture_foundation","temple")
bpy.data.collections["layout_blocks"].hide_viewport=True
for owner,root_name in [("temple","temple_main"),("tower","bell_tower")]:
    s=c.P[owner];root=bpy.data.objects[root_name]
    stone=c.Part(owner+"_plinth",col,root,c.material("pbr_stone__dry"))
    w,d=s["width"]+1.6,s["depth"]+1.6
    stone.box((0,0,1.07),(w,d,.62))
    stone.box((0,0,1.44),(w+.24,d+.24,.12))
    # Individual facing joints and projecting top course are actual geometry.
    count=max(4,round(w/1.2))
    for side in (-1,1):
        for i in range(count):
            x=-w/2+(i+.5)*w/count
            stone.box((x,side*(d/2+.025),1.10),(w/count-.018,.10,.54))
    stair_width=4.8 if owner=="temple" else 2.4
    for i in range(6):
        z=.78+i*.12
        stone.box((0,-d/2-.30*(6-i),z-.055),(stair_width,.33,.11))
    for x,y in c.column_grid(s):
        stone.tube([(x,y,1.50),(x,y,1.57),(x,y,1.68)],[.44,.44,.36],16)
    stone.mesh(.014)
c.verify(col)
c.checkpoint("b01-foundation","CAM_temple")
