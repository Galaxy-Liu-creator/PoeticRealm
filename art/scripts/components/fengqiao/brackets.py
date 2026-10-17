"""B03: layered square dou, curved arms and outward bearing blocks only."""
import bpy,sys,math
from mathutils import Matrix,Vector
sys.path.insert(0,"D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao")
import common as c
import importlib
importlib.reload(c)
col=c.component("architecture_brackets","temple")

def arm(part,x,y,z,length,width,height,rotation):
    # Lower contour rolls up at both ends; the upper bearing face stays level.
    profile=[(-length/2,.11),(-length*.38,0),(-length*.17,-height*.55),
             (length*.17,-height*.55),(length*.38,0),(length/2,.11)]
    profile += [(length/2,height*.45),(-length/2,height*.45)]
    verts=[tuple(Vector((x,y,z))+rotation@Vector((px,sy*width/2,pz))) for sy in (-1,1) for px,pz in profile]
    n=len(profile)
    faces=[tuple(reversed(range(n))),tuple(n+i for i in range(n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    part.add(verts,faces,wood=True)

for owner,root_name in [("temple","temple_main"),("tower","bell_tower")]:
    s=c.P[owner];part=c.Part(owner+"_dougong",col,bpy.data.objects[root_name],c.material("pbr_wood__aged"))
    for x,y in c.column_grid(s):
        perimeter=abs(abs(y)-s["depth"]/2)<.01
        start=s["column_top"]+.10*(abs(x)/(s["width"]/2))**2
        part.box((x,y,start+.12),(.53,.53,.24))
        steps=4 if owner=="temple" else 3
        increment=(s["bracket_top"]-start-.25)/steps
        for k in range(steps):
            z=start+.28+k*increment
            extension=.28+k*.35
            arm(part,x,y,z,1.0+k*.36,.20,.28,Matrix.Identity(3))
            direction=1 if y>0 else -1
            offset=direction*extension if perimeter else 0
            arm(part,x,y+offset,z+.12,1.02+k*.46,.23,.28,Matrix.Rotation(math.pi/2,3,"Z"))
            for sign in (-1,1):
                part.box((x+sign*(.32+k*.14),y+offset,z+increment-.05),(.25,.27,.17))
            if perimeter:
                part.box((x,y+direction*(extension+.35),z+increment-.05),(.30,.34,.17))
        # An explicit upper bearing connects the final arm to the eave purlin.
        part.box((x,y+(1 if y>0 else -1)*1.52 if perimeter else y,s["bracket_top"]-.08),(.36,.45,.18))
    part.mesh(.008)
c.verify(col)
c.checkpoint("b03-brackets","CAM_temple")
