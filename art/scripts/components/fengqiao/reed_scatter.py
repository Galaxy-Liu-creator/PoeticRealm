"""C07: duplicate checked reed tufts on the measured wet/dry transition."""
import bpy,sys,math,random
from mathutils import Matrix,Vector
sys.path.insert(0,'D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao')
import common as c,natural_parameters as n
import importlib;importlib.reload(c)
col=c.component('reed_scatter','nature');root=c.get_root('reed_bed',(0,0,0));rng=random.Random(c.P['seed']+600)
for i in range(15):
    y=rng.uniform(-4,21);side=-1 if i<11 else 1;u=rng.uniform(.72,1.24);x=n.edge(y,side)+side*u
    proto=bpy.data.objects['src_reed_prototype_'+str(i%3)];data=proto.data.copy()
    scale=rng.uniform(.75,1.05);data.transform(Matrix.Rotation(rng.uniform(0,math.tau),4,'Z')@Matrix.Diagonal((scale,scale,scale,1)))
    # Source origin is bottom-centred. Keep rotated tufts bottom-centred too.
    points=[v.co for v in data.vertices];center=Vector(((min(p.x for p in points)+max(p.x for p in points))/2,(min(p.y for p in points)+max(p.y for p in points))/2,min(p.z for p in points)))
    data.transform(Matrix.Translation(-center))
    obj=bpy.data.objects.new('src_reed_tuft_'+str(i).zfill(2),data);col.objects.link(obj);obj.parent=root;obj.location=(x,y,n.ground(x,y,side)-.015)
    obj['static']=False;obj['behavior']='sway';obj['amp']=.14;obj['freq']=1.1;obj['phase']=.73
c.verify(col,open_surfaces=tuple(o.name for o in col.objects));c.checkpoint('c07-reed-scatter','CAM_nature')
