"""Placement of checked prototypes only; no new prototype geometry."""
import sys,random,math
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue/v02')
from common_v02 import *
col=component('jx_v02_rock_cluster',('jx_v02_rock_detail',));rng=random.Random(P['seed'])
parent=bpy.data.objects['shore_root'];wet=textured('pbr_rock__jxwetv02',[ROOT+'/art/textures/fengqiao-v01/'+f for f in ('rock_01_Diffuse_wet.jpg','rock_01_nor_gl.png','rock_01_Rough_wet.png')])
ys=(-18,-11,-3,5,13,23,31,45,54,69,87,108,137,155);rows=[]
for i,y in enumerate(ys):
    proto=bpy.data.objects['src_rock_proto_v02_'+str(i%3)]
    obj=proto.copy();obj.data=proto.data.copy();obj.name='src_shore_rock_v02_'+str(i).zfill(2);col.objects.link(obj)
    sx=rng.uniform(.65,1.26);sy=rng.uniform(.72,1.38);sz=rng.uniform(.75,1.36)
    angle=rng.uniform(-.45,.45);c=math.cos(angle);s=math.sin(angle)
    for v in obj.data.vertices:
        x=v.co.x*sx;yy=v.co.y*sy;v.co=(x*c-yy*s,x*s+yy*c,v.co.z*sz)
    center=Vector(((min(v.co.x for v in obj.data.vertices)+max(v.co.x for v in obj.data.vertices))/2,
                   (min(v.co.y for v in obj.data.vertices)+max(v.co.y for v in obj.data.vertices))/2,
                   min(v.co.z for v in obj.data.vertices)))
    for v in obj.data.vertices:v.co-=center
    obj.location=(edge(y)+rng.uniform(-1.6,.2),y,-.6+rng.uniform(-.10,.22));obj.parent=parent
    obj.data.materials.append(wet);obj['static']=True
    for p in obj.data.polygons:p.material_index=int(p.center.z+obj.location.z<.7)
    obj.data.update();rows.append({'object':obj.name,'location':list(obj.location),'prototype':i%3})
bpy.data.collections['jx_v02_rock_detail'].hide_viewport=True;bpy.data.collections['jx_v02_rock_detail'].hide_render=True
finish(col,extra={'rocks':rows,'wetBandHeight':.7,'placedFromCheckedPrototypes':True})
retire(('shore_bank','shore_snow','shore_boulders_v02','rock_snow_caps_v03'))
bpy.ops.wm.save_as_mainfile(filepath=MAIN,check_existing=False)
view('CAM_enter')
