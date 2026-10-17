"""C05: original five-lobed thin maple leaves attached to checked twigs."""
import bpy,sys,math,random,json
from mathutils import Matrix,Vector
sys.path.insert(0,'D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao')
import common as c
import importlib;importlib.reload(c)
c.active()
if bpy.context.scene.get('maple_leaf_revision',0)>=3: raise RuntimeError('Maple leaf revision 3 already exists')
old=bpy.data.collections.get('maple_leaves')
if old:
    old.name='maple_leaves_v02'
    for obj in old.objects: obj.name+='_v02'
col=c.component('maple_leaves','nature');root=bpy.data.objects['maple_grove']
bpy.data.collections['maple_branches'].hide_viewport=False
bpy.data.collections['maple_branches'].hide_render=False
leaf=c.solid('pbr_foliage__maple',(.29,.10,.046),.86)
outline=[(0,-.08),(-.18,.05),(-.42,.12),(-.20,.28),(-.36,.45),(-.10,.36),(0,.75),(.10,.36),(.36,.45),(.20,.28),(.42,.12),(.18,.05)]
tips=json.loads(bpy.context.scene['maple_tips'])
for variant in range(3):
    rng=random.Random(c.P['seed']+400+variant);part=c.Part('maple_leaves_'+str(variant),col,root,leaf,surface=True)
    for tip in (t for t in tips if t['variant']==variant):
        for j in range(6):
            angle=tip['angle']+j*math.tau/3+rng.uniform(-.25,.25);tilt=rng.uniform(-.95,.55);scale=rng.uniform(.42,.66)
            rotation=Matrix.Rotation(angle,3,'Z')@Matrix.Rotation(tilt,3,'X')
            anchor=Vector(tip['point'])+Vector((math.cos(angle)*(.10 if j<3 else .22),math.sin(angle)*(.10 if j<3 else .22),-.08 if j<3 else .10))
            vertices=[tuple(anchor+rotation@Vector((u*scale,v*scale,.008*math.sin(v*math.pi)))) for u,v in outline]
            uv=[(u+.5,v) for u,v in outline]
            part.add(vertices,[tuple(range(12))],uv,weight=tip['weight'])
    obj=part.mesh();obj['static']=False;obj['behavior']='sway';obj['amp']=.09;obj['freq']=1.1;obj['phase']=.73
bpy.context.scene['maple_leaf_revision']=3
c.verify(col,open_surfaces=tuple('src_maple_leaves_'+str(i) for i in range(3)))
for variant in range(3):
    total=sum(sum(len(p.vertices)-2 for p in bpy.data.objects['src_'+kind+'_'+str(variant)].data.polygons) for kind in ('maple_branches','maple_leaves'))
    assert total<=3000,('Maple prototype exceeds 3000 triangles',variant,total)
c.checkpoint('c05-maple-leaves-v03','CAM_nature')
