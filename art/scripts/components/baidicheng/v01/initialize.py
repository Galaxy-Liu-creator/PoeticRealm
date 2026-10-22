"""A: create only the independent layout, cameras, markers and preview path."""
import sys,math,json
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
assert not MAIN.exists(),'Existing revision must be continued, not initialized again'
assert bpy.app.background,'Initialize in an isolated background process; preserve the live Blender checkpoint'
scene=bpy.data.scenes.new(SCENE)
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
scene.render.resolution_x=1920;scene.render.resolution_y=1080;scene.render.resolution_percentage=100;scene.render.fps=30
scene.render.engine=bpy.context.scene.render.engine
scene['contractVersion']='0.2';scene['modeling_seed']=SEED
for name in [EXPORT,SOURCE,'baidicheng_preview_v01']:
    c=bpy.data.collections.new(name);scene.collection.children.link(c)
export=bpy.data.collections[EXPORT]
def marker(name,position):
    o=bpy.data.objects.new(name,None);export.objects.link(o);o.location=position;o.empty_display_type='PLAIN_AXES';return o
shots={
 'enter':((27,-66,15),(-7,79,31),'shen'),
 'city':((2,29,7),(49,124,72),'gao'),
 'follow':((21,-41,6),(8,-17,1.5),'ping'),
 'gorge':((-12,45,16),(-1,165,40),'shen'),
 'exit':((22,194,20),(11,340,33),'ping'),
 'boat':((17,-33,3.5),(10,-27,1),'ping'),
 'rower':((13,-31,2.4),(10,-30,1.4),'ping'),
}
for name,(pos,target,yuan) in shots.items():
    cam=bpy.data.cameras.new('bd_camera_'+name);cam.type='PERSP';cam.sensor_fit='VERTICAL';cam.sensor_height=24;cam.lens=29 if name in ['boat','rower'] else 24
    obj=bpy.data.objects.new('CAM_'+name,cam);export.objects.link(obj);obj.location=pos;obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler();obj['yuan']=yuan
    marker('FOCUS_'+name,target)
marker('SFX_ape_left',(-60,60,34));marker('SFX_ape_right',(63,150,48))
marker('ANCHOR_seg_in',(10,-75,0));marker('ANCHOR_seg_out',(26,270,0))
curve=bpy.data.curves.new('bd_navigation_curve','CURVE');curve.dimensions='3D';spline=curve.splines.new('POLY');spline.points.add(len(PATH)-1)
for p,(x,y) in zip(spline.points,PATH):p.co=(x,y,0,1)
path=bpy.data.objects.new('navigation_source_v01',curve);bpy.data.collections['baidicheng_preview_v01'].objects.link(path)
scene.camera=bpy.data.objects['CAM_enter']
scene['boat_navigation_json']=json.dumps({'path':[[x,-y] for x,y in PATH],'speed':2.8,'brakingDistance':12.})
MAIN.parent.mkdir(parents=True,exist_ok=True)
bpy.context.window.scene=scene
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
report('components/layout.json',{'scene':SCENE,'shots':shots,'boatNavigation':{'path':[[x,-y] for x,y in PATH],'speed':2.8,'brakingDistance':12},'waterLevel':0})
print('Independent layout saved:',MAIN)
