"""Placement only: immerse the existing hull and align its +X bow with the river."""
import sys,json,math,importlib
from mathutils.bvhtree import BVHTree
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue/v03')
import common_v03;importlib.reload(common_v03)
from common_v03 import *
scene=active();assert not scene.get('boat_pose_v03_checked');boat=bpy.data.objects['boat_guest'];scene.view_layers[0].update();old=boat.matrix_world.copy()
points=course();delta=Vector(points[1])-Vector(points[0]);angle=math.atan2(delta.y,delta.x)
boat.location=points[0];boat.rotation_euler.z=angle;scene.view_layers[0].update();change=boat.matrix_world@old.inverted()
for name in ('CAM_boat','CAM_fisherman'):
    camera=bpy.data.objects[name];camera.matrix_world=change@camera.matrix_world
place=bpy.data.objects['PLACE_boat_01'];place.location=boat.location;place.rotation_euler.z=angle
scene.view_layers[0].update();hull=bpy.data.objects['boat_hull_closed'];z=[(hull.matrix_world@v.co).z for v in hull.data.vertices]
assert min(z)<-.15 and max(z)>.6,(min(z),max(z))
obstacles=[o for o in bpy.data.collections[EXPORT].all_objects if o.name.startswith(('shore_bank_v02','shore_rock_v02'))]
trees=[]
for obj in obstacles:
    verts=[obj.matrix_world@v.co for v in obj.data.vertices];trees.append(BVHTree.FromPolygons(verts,[tuple(p.vertices) for p in obj.data.polygons]))
clearance=999
for k in range(101):
    y=-2+56*k/100;x=2+center(y)-center(-2);d=Vector((.063*math.cos(y*.009)+.095*math.cos(y*.019),1,0)).normalized();side=Vector((-d.y,d.x,0))
    for a,b in ((0,0),(3.33,1),(-3.22,1),(3.33,-1),(-3.22,-1)):
        p=Vector((x,y,0))+d*a+side*b
        for tree in trees:
            hit=tree.ray_cast(p+Vector((0,0,50)),Vector((0,0,-1)))
            assert hit[0] is None or hit[0].z<-.6,('River route reaches land',y,hit[0])
            nearest=tree.find_nearest(p)
            if nearest[0] is not None:clearance=min(clearance,nearest[3])
assert clearance>1.5,clearance
nav={'path':[[x,-y] for x,y,z in points],'speed':P['flow_speed'],'brakingDistance':2.5}
manifest=json.load(open(ROOT+'/frontend/public/assets/scenes/jiangxue.scene-v02.json',encoding='utf8'));manifest['model']='models/jiangxue/scene_v03.glb';manifest['boatNavigation']=nav
with open(ROOT+'/frontend/public/assets/scenes/jiangxue.scene-v03.json','w',encoding='utf8') as f:json.dump(manifest,f,ensure_ascii=False,indent=2)
result={'origin':list(boat.location),'headingRadians':angle,'localBowAxis':'+X','waterLevel':0,'hullWorldZ':[min(z),max(z)],'actualDraftMetres':-min(z),'minimumObstacleClearanceMetres':clearance,'routeSamples':505,'navigation':nav}
scene['boat_pose_v03_checked']=True;scene['boat_navigation_v03']=json.dumps(nav)
with open(OUTPUT+'/components/boat_pose.json','w',encoding='utf8') as f:json.dump(result,f,indent=2)
bpy.ops.wm.save_as_mainfile(filepath=OUTPUT+'/checkpoints/boat_pose.blend',copy=True,check_existing=False)
bpy.ops.wm.save_as_mainfile(filepath=MAIN,check_existing=False);view('CAM_enter');print(json.dumps(result))
