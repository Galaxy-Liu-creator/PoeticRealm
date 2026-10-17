"""C03a: two closed stone approaches connect the deck to the dry bank."""
import bpy,sys
sys.path.insert(0,'D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao')
import common as c,natural_parameters as n
import importlib;importlib.reload(c)
col=c.component('bridge_bank_approaches','shore');root=bpy.data.objects['shore_root']
part=c.Part('bridge_bank_approaches',col,root,c.material('pbr_stone__dry'))
for sign in (-1,1):
    for i in range(6):
        u0=i/6;u1=(i+1)/6;x0=-5+sign*(8.45+1.85*u0);x1=-5+sign*(8.45+1.85*u1)
        z0=1.375*(1-u0)+1.28*u0;z1=1.375*(1-u1)+1.28*u1
        vertices=[(x,y,z) for x,z in ((x0,z0),(x1,z1)) for y in (13.3,16.7)]
        vertices += [(x,y,min(n.ground(x,y,sign),1.15)-.10) for x,z in ((x0,z0),(x1,z1)) for y in (13.3,16.7)]
        part.add(vertices,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)])
part.mesh(.005);c.verify(col);c.checkpoint('c03a-bridge-approaches','CAM_bridge')
