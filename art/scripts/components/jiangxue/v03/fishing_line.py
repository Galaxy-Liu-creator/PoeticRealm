"""One affected component: line from the unchanged rod tip to the new water level."""
import sys,math,json
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue/v03')
from common_v03 import *
scene=active();assert scene['boat_pose_v03_checked'];boat=bpy.data.objects['boat_guest'];scene.view_layers[0].update()
old=bpy.data.objects['fishing_line'];material=old.data.materials[0];retire(['fishing_line']);old.name='history_fishing_line_v02'
col=component('jx_v03_fishing_line');tip=boat.matrix_world.inverted()@bpy.data.objects['ANCHOR_fishing_tip'].matrix_world.translation
anchor=bpy.data.objects['ANCHOR_fishing_water'];water=anchor.location.copy();water.z=-boat.location.z-.006;anchor.location=water
shape=Shape();points=[tip.lerp(water,i/24)+Vector((-.025*math.sin(math.pi*i/24),-.035*math.sin(math.pi*i/24),0)) for i in range(25)]
shape.tube(points,.0012,sides=5);shape.finish('fishing_line',col,material,boat,dynamic=True)
scene.view_layers[0].update();endpoint=anchor.matrix_world.translation;assert abs(endpoint.z+.006)<1e-6
spec=json.loads(scene['fishing_parameters']);spec['water']=list(water);scene['fishing_parameters']=json.dumps(spec)
finish(col,extra={'rodTipLocal':list(tip),'waterLocal':list(water),'waterWorld':list(endpoint),'lineRadiusMetres':.0012});view('CAM_fisherman')
