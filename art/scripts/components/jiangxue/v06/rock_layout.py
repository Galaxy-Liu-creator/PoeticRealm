"""One checked rock/snow pair or the remaining bounded rock group."""
import sys, math
from pathlib import Path
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common_v06 import *

# sx, sy, sz, inland displacement, along-bank displacement; positive scales only.
LAYOUT=[(1.10,.78,.55,1.0,-1),(.67,.65,.72,2.9,-2.3),(.82,1.,.55,.8,.5),
        (.90,.80,.90,3.2,-1.5),(.65,.80,.60,.6,-4.5),(1.15,.70,.65,2.8,-4),
        (.76,.82,.85,2.,-2),(.85,.90,.55,.5,5),(.68,.70,.72,2.3,-1),
        (.90,1.1,.60,1.3,2),(.75,.90,.70,2.5,-1),(1.05,.70,.62,.5,3),
        (.65,.85,.78,2.,-1),(.90,.80,.60,1.8,4)]

def build(indices,name):
    col=new_collection(name);checks=[]
    for i in indices:
        rock=bpy.data.objects[f'shore_rock_v02_{i:02}'];snow=bpy.data.objects[f'rock_snow_v02_{i:02}']
        sx,sy,sz,dx,dy=LAYOUT[i];angle=(-.32,.18,.41,-.17)[i%4]
        pivot=rock.matrix_world.translation.copy();pivot.z=.22
        transform=Matrix.Translation((dx,dy,0))@Matrix.Translation(pivot)@Matrix.Rotation(angle,4,'Z')@Matrix.Diagonal((sx,sy,sz,1))@Matrix.Translation(-pivot)
        pair=[]
        for old,kind in ((rock,'rock'),(snow,'snow')):
            obj=old.copy();obj.data=old.data.copy();obj.name=f'src_{kind}_v06_{i:02}';col.objects.link(obj)
            world=old.matrix_world.copy();local=world.inverted()
            for v in obj.data.vertices:v.co=local@(transform@(world@v.co))
            obj.data.update();normalize_origin(obj);check_mesh(obj);pair.append(obj)
        graph=bpy.context.evaluated_depsgraph_get();bpy.context.view_layer.update()
        rock,snow=pair;bv=BVHTree.FromObject(rock,graph);matrix=rock.matrix_world.inverted()@snow.matrix_world
        verts=[matrix@v.co for v in snow.data.vertices];n=len(verts)//2;gaps=[]
        for v in verts[n:]:
            hit=bv.ray_cast(Vector((v.x,v.y,50)),Vector((0,0,-1)))[0];assert hit is not None
            gaps.append(v.z-hit.z)
        assert max(abs(g+.006*sz) for g in gaps)<3e-5
        checks.append({'pair':i,'scales':[sx,sy,sz],'offset':[dx,dy],'rotationRadians':angle,'bottomGap':[min(gaps),max(gaps)],'expectedEmbed':.006*sz})
    print(save_component(col,checks))

if __name__=='__main__':build(range(14),'jx_v06_rock_layout')
