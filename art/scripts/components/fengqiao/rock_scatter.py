"""C03: reuse checked rocks in a fixed, irregular shoreline distribution."""
import bpy,sys,random,math
from mathutils import Matrix,Vector
sys.path.insert(0,'D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao')
import common as c,natural_parameters as n
import importlib;importlib.reload(c)
col=c.component('shore_rock_scatter','shore');root=bpy.data.objects['shore_root'];rng=random.Random(c.P['seed']+200)
for i in range(34):
    side=-1 if i<24 else 1;y=rng.uniform(-6,23);u=rng.uniform(.1,2.8);x=n.edge(y,side)+side*u
    proto=bpy.data.objects['src_rock_prototype_'+str(i%3)]
    data=proto.data.copy();scale=rng.uniform(.19,.66) if i%5 else rng.uniform(.72,1.1)
    data.transform(Matrix.Rotation(rng.uniform(0,math.tau),4,'Z')@Matrix.Diagonal((scale,scale*rng.uniform(.7,1.1),scale*rng.uniform(.7,1.2),1)))
    points=[v.co for v in data.vertices]
    center=Vector(((min(p.x for p in points)+max(p.x for p in points))/2,(min(p.y for p in points)+max(p.y for p in points))/2,min(p.z for p in points)))
    data.transform(Matrix.Translation(-center))
    obj=bpy.data.objects.new('src_bank_rock_'+str(i).zfill(2),data);col.objects.link(obj);obj.parent=root
    obj.location=(x,y,n.ground(x,y,side)-.09)
    data.materials.clear();data.materials.append(c.material('pbr_stone__wet' if obj.location.z<.12 else 'pbr_stone__dry'));obj['static']=True
c.verify(col);c.checkpoint('c03-rock-scatter','CAM_riverbank')
