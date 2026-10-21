"""Final Blender-authored camera component; no scene geometry is generated."""
import sys
from pathlib import Path
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common_v06 import *
scene=active();col=new_collection('jx_v06_cameras')
poses={'CAM_enter':((-15,-29,8),(6,22,1.4),42),
       'CAM_birds':((3,8,11),(0,180,6),38),
       'CAM_path':((3,-14,7),(26,48,2.5),43),
       'CAM_fog':((0,5,4),(4,170,2),46),
       'CAM_boat':((13,-3.5,3.6),(2,-1.9,.9),45)}
checks=[]
for name in ('CAM_enter','CAM_birds','CAM_path','CAM_fog','CAM_boat','CAM_fisherman','CAM_nature','CAM_rocks'):
    old=bpy.data.objects[name];obj=old.copy();obj.data=old.data.copy();obj.name='src_'+name+'_v06';col.objects.link(obj)
    if name in poses:
        p,t,lens=poses[name];obj.location=p;obj.rotation_euler=(Vector(t)-obj.location).to_track_quat('-Z','Y').to_euler();obj.data.lens=lens
    assert not obj.constraints
    checks.append({'camera':name,'position':list(obj.location),'rotation':list(obj.rotation_euler),'lens':obj.data.lens})
save_component(col,checks)
for row in checks:
    old=bpy.data.objects[row['camera']];src=bpy.data.objects['src_'+row['camera']+'_v06']
    if row['camera'] in poses:
        old.matrix_basis=src.matrix_basis.copy();old.data.lens=src.data.lens
col.hide_viewport=True;col.hide_render=True
scene.camera=bpy.data.objects['CAM_enter'];bpy.context.view_layer.update()
subjects=[]
for name in ('boat_hull_closed','fisherman_anatomy','fishing_bamboo'):
    obj=bpy.data.objects[name]
    points=[world_to_camera_view(scene,scene.camera,obj.matrix_world@Vector(p)) for p in obj.bound_box]
    bounds=[min(p.x for p in points),max(p.x for p in points),min(p.y for p in points),max(p.y for p in points)]
    assert bounds[0]>.05 and bounds[1]<.95 and bounds[2]>.1 and bounds[3]<.9,(name,bounds)
    subjects.append({'object':name,'frameBounds':bounds})
report('validation/composition-source.json',{'cameras':checks,'mainSubjects':subjects,'leftPoetryRegion':[0,.36,.34,.86]})
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
print(subjects)
