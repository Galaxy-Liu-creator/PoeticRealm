"""Only scene parameters, registered cameras/markers, preview lighting and mask calibration."""
import bpy, sys, os, json, math
from mathutils import Vector
ROOT = 'D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue')
from common import *
if bpy.data.scenes.get(SCENE) or os.path.exists(MAIN): raise RuntimeError('Jiangxue v01 already exists; resume instead')
scene = bpy.data.scenes.new(SCENE); bpy.context.window.scene = scene
scene.unit_settings.system = 'METRIC'; scene.unit_settings.scale_length = 1.; scene.render.fps = 30
scene.render.resolution_x=1920;scene.render.resolution_y=1080;scene.render.resolution_percentage=100
scene['component_parameters']=json.dumps(P);scene['component_checks']='{}'
for name in (EXPORT,SOURCE,'jiangxue_preview'):
    scene.collection.children.link(bpy.data.collections.new(name))
boat = root('boat_guest',P['boat'],True);boat.rotation_euler.z=P['boat_angle']
root('shore_root',P['bank']);root('dead_tree_root',P['tree'])
export=bpy.data.collections[EXPORT]
def marker(name,point,parent=None):
    obj=bpy.data.objects.new(name,None);export.objects.link(obj);obj.location=point;obj.parent=parent;return obj
marker('FOCUS_boat',(0,0,.7),boat);marker('FOCUS_fisherman',(-1.7,0,1.35),boat)
marker('SFX_line',(0,0,0),boat);marker('PLACE_boat_01',P['boat'])['asset']='boat'
shots={
 'CAM_enter':((17,-26,8.0),(2,19,1.2),43),
 'CAM_birds':((8,-18,7.3),(-5,67,15),44),
 'CAM_path':((12,-10,6.5),(25,28,2.5),42),
 'CAM_fog':((14,-18,4.8),(3,4,1.2),45),
 'CAM_boat':((6,-11,3.2),(2.2,-1.8,1.05),45),
 'CAM_fisherman':((6,-6.8,2.7),(2.3,-2.3,1.45),52),
 'CAM_nature':((11,0,8),(25,23,4),40),
}
for name,(pos,target,lens) in shots.items():
    data=bpy.data.cameras.new(name+'_camera');data.sensor_fit='VERTICAL';data.lens=lens
    cam=bpy.data.objects.new(name,data);export.objects.link(cam);cam.location=pos
    cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam['yuan']='ping'
world=bpy.data.worlds.new('jiangxue_preview_world');world.use_nodes=True
background=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND')
background.inputs['Color'].default_value=(.21,.29,.34,1);background.inputs['Strength'].default_value=.7;scene.world=world
light=bpy.data.lights.new('jiangxue_preview_sun','SUN');light.energy=2.;light.angle=.25
sun=bpy.data.objects.new('preview_sun',light);bpy.data.collections['jiangxue_preview'].objects.link(sun)
sun.rotation_euler=(math.radians(25),math.radians(-25),math.radians(-20))
probe=mesh('mask_probe',[(x,y,0) for y in (0,.04) for x in (0,.04,.08)],[(0,1,4,3),(1,2,5,4)],export,solid('pbr_cloth__calibration',(.4,.4,.4)),smooth=False)
probe.name='mask_probe';probe.location=(-30,-20,-4)
attr=probe.data.color_attributes['mask']
for p in probe.data.polygons:
    for li in p.loop_indices: attr.data[li].color=(probe.data.vertices[probe.data.loops[li].vertex_index].co.x/.08+.5,.5,0,1)
bpy.ops.wm.save_as_mainfile(filepath=MAIN,check_existing=False)
view();print(json.dumps({'scene':scene.name,'source':MAIN,'cameraNames':list(shots),'originalScenePreserved':bpy.data.scenes.get('Scene') is not None}))
