"""C04: three branch silhouettes. Leaf attachment tips are retained for C05."""
import bpy,sys,math,random,json
from mathutils import Vector
sys.path.insert(0,'D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao')
import common as c,natural_parameters as n
import importlib;importlib.reload(c)
c.active()
if bpy.context.scene.get('maple_branch_revision',0)>=3: raise RuntimeError('Maple branch revision 3 already exists')
old=bpy.data.collections.get('maple_branches')
if old:
    old.name='maple_branches_v02'
    for obj in old.objects: obj.name+='_v02'
for obj in bpy.data.collections[c.EXPORT].objects:
    if obj.parent and obj.parent.name=='maple_grove': obj.hide_set(True);obj.hide_render=True
col=c.component('maple_branches','nature');root=c.get_root('maple_grove',(0,0,0));tips=[]
for variant,(x,y,height,branches) in enumerate([(-7.2,1.5,6.2,11),(-10.2,8.4,5.7,9),(-18.5,18.1,5.2,7)]):
    rng=random.Random(c.P['seed']+300+variant);z=n.ground(x,y,-1)-.015
    assert z>.6,'Tree root must be on the dry bank'
    base=Vector((x,y,z));part=c.Part('maple_branches_'+str(variant),col,root,c.material('pbr_wood__aged'))
    def twig(points,radii,sides):
        part.tube([tuple(base+Vector(p)) for p in points],radii,sides,weight=lambda i:min(1,max(0,points[i//sides][2]/height)**2))
    trunk=[(0,0,0),(.05,-.02,1.5),(.16,.07,3.1),(.06,.17,4.7),(.25,.12,height)]
    twig(trunk,[.27,.24,.17,.11,.035],8)
    for j in range(3):
        a=j*math.tau/3+.3;twig([(math.cos(a)*.65,math.sin(a)*.65,0),(0,0,.65)],[.075,.14],4)
    for j in range(branches):
        a=j*2.399+rng.uniform(-.32,.32);h=2.5+j/(branches-1)*2.1+rng.uniform(-.2,.2);reach=rng.uniform(1.45,2.35)
        start=(.12,.09,h);end=(math.cos(a)*reach,math.sin(a)*reach,h+rng.uniform(.5,1.0))
        twig([start,((start[0]+end[0])*.55,(start[1]+end[1])*.55,h+.4),end],[.105,.059,.018],5)
        for k in range(3):
            angle=a+(k-1)*.65;tip=(end[0]+math.cos(angle)*.48,end[1]+math.sin(angle)*.48,end[2]+rng.uniform(.12,.5))
            twig([end,((end[0]+tip[0])/2,(end[1]+tip[1])/2,tip[2]-.12),tip],[.018,.01,.0025],3)
            tips.append({'variant':variant,'point':tuple(base+Vector(tip)),'angle':angle,'weight':min(1,(tip[2]/height)**2)})
    for k in range(2):
        angle=.8+k*math.pi;tip=(.25+math.cos(angle)*.42,.12+math.sin(angle)*.42,height+.04)
        twig([trunk[-2],(.25,.12,height-.22),tip],[.045,.023,.0025],3)
        tips.append({'variant':variant,'point':tuple(base+Vector(tip)),'angle':angle,'weight':1})
    obj=part.mesh();obj['static']=False;obj['behavior']='sway';obj['amp']=.09;obj['freq']=1.1;obj['phase']=.73
bpy.context.scene['maple_tips']=json.dumps(tips)
bpy.context.scene['maple_branch_revision']=3
c.verify(col);c.checkpoint('c04-maple-branches-v03','CAM_nature')
