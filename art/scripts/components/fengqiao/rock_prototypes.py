"""C02: three individually checked irregular rock prototypes."""
import bpy,sys,math,random
sys.path.insert(0,'D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao')
import common as c
import importlib;importlib.reload(c)
col=c.component('rock_prototypes','shore')
root=bpy.data.objects.new('rock_prototype_root',None);col.objects.link(root);root.location=(24,0,0)
for variant in range(3):
    rng=random.Random(c.P['seed']+100+variant);part=c.Part('rock_prototype_'+str(variant),col,root,c.material('pbr_stone__dry'))
    vertices=[];sides=9
    for z,r in [(0,.72),(.18,1),(.54,.83),(.83,.37)]:
        for j in range(sides):
            a=j*math.tau/sides;rr=r*rng.uniform(.82,1.14)
            vertices.append((rr*math.cos(a)*(1.1+variant*.13),rr*math.sin(a)*(.72-variant*.07),z*rng.uniform(.92,1.08)))
    faces=[tuple(reversed(range(sides))),tuple(3*sides+i for i in range(sides))]
    faces += [(i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j) for i in range(3) for j in range(sides)]
    part.add(vertices,faces);obj=part.mesh();obj.location.x+=variant*3
c.verify(col);c.checkpoint('c02-rock-prototypes','CAM_nature')
