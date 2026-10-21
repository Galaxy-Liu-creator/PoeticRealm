"""Final framing repair from browser review; change only three authored cameras."""
import sys,json
from pathlib import Path
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common_v06 import *
scene=active()
poses={'CAM_birds':((3,8,11),(0,180,6),38),
       'CAM_fog':((0,5,4),(4,170,2),46),
       'CAM_boat':((13,-3.5,3.6),(2,-1.9,.9),45)}
for name,(p,t,lens) in poses.items():
    for obj in (bpy.data.objects[name],bpy.data.objects['src_'+name+'_v06']):
        obj.location=p;obj.rotation_euler=(Vector(t)-obj.location).to_track_quat('-Z','Y').to_euler();obj.data.lens=lens
bpy.context.view_layer.update();camera=bpy.data.objects['CAM_boat'];checks=[]
for name in ('boat_hull_closed','fisherman_anatomy','fishing_bamboo'):
    obj=bpy.data.objects[name];points=[world_to_camera_view(scene,camera,obj.matrix_world@Vector(v)) for v in obj.bound_box]
    bounds=[min(p.x for p in points),max(p.x for p in points),min(p.y for p in points),max(p.y for p in points)]
    assert bounds[0]>.04 and bounds[1]<.96 and bounds[2]>.08 and bounds[3]<.92,(name,bounds)
    checks.append({'object':name,'frameBounds':bounds})
col=bpy.data.collections['jx_v06_cameras']
rows=[{'camera':o.name,'position':list(o.location),'rotation':list(o.rotation_euler),'lens':o.data.lens} for o in col.objects]
save_component(col,rows)
path=OUTPUT/'validation/composition-source.json';data=json.loads(path.read_text());data.update(cameras=rows,boatViewSubjects=checks)
report('validation/composition-source.json',data)
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
print(checks)
