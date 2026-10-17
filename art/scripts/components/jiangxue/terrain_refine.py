"""Revise only the checked terrain component: move mountain mass into the far field."""
import sys,math,json
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue')
from common import *
scene=active();obj=bpy.data.objects['terrain']
if scene.get('terrain_refined'):raise RuntimeError('Terrain already refined')
for v in obj.data.vertices:
    radius=math.hypot(v.co.x,v.co.y)
    old=max(0,min(1,(radius-43)/40));new=max(0,min(1,(radius-125)/95))
    blend=new*new*(3-2*new)
    v.co.z=-2.5+(v.co.z+2.5)/max(old,1e-6)*blend*.58
obj.data.update();scene['terrain_refined']=True
scene['terrain_component']={'size':600.,'samples':145,'source':'terrain.py + terrain_refine.py; standard RGB8 bake','mountainStartRadius':125.,'mountainFullRadius':220.,'heightFactor':.58}
with open(OUTPUT+'/components/jx_terrain_v02.json','w',encoding='utf8') as f:json.dump(dict(scene['terrain_component']),f,indent=2)
bpy.ops.wm.save_as_mainfile(filepath=OUTPUT+'/checkpoints/jx_terrain_v02.blend',copy=True,check_existing=False)
bpy.ops.wm.save_as_mainfile(filepath=MAIN,check_existing=False)
view('CAM_enter')
