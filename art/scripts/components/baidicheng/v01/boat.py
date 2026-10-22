"""B: extract the checked boat/rower subtree; no canyon or city creation."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
active();col=collection('bd_boat_structure')
with bpy.data.libraries.load(str(ROOT/'art/blender/fengqiao-scene-v02.blend'),link=False) as (a,b):
    b.collections=['glb_scene_v02']
imported=b.collections[0];boat=next(o for o in imported.all_objects if o.name=='boat_guest')
objects={boat,*boat.children_recursive}
objects={o for o in objects if o.type!='CAMERA' and not o.name.startswith('FOCUS_')}
probe=next(o for o in imported.all_objects if o.name=='mask_probe');objects.add(probe)
names={o:o.name for o in objects}
for o in objects:
    col.objects.link(o)
    for c in list(o.users_collection):
        if c!=col:c.objects.unlink(o)
boat.location=(PATH[0][0],PATH[0][1],-.30)
dx=PATH[1][0]-PATH[0][0];dy=PATH[1][1]-PATH[0][1]
boat.rotation_euler=(0,0,math.atan2(dy,dx))
# A dawn boat carries the checked structure and rig, with the decorative night lamp disabled.
removed=[]
for o in list(objects):
    if o.name.startswith('LIGHT_') or o.name.startswith('fire_') or o.name.startswith('lantern_'):
        removed.append(o.name);col.objects.unlink(o);objects.remove(o)
active()['boat_source_names']=json.dumps({o.name:names[o] for o in objects})
bpy.context.view_layer.update()
hull=next(o for o in objects if names[o]=='boat_hull_closed')
topology=checked(hull)
rig=next(o for o in objects if names[o]=='rower_rig')
assert len(rig.data.bones)==53
bottom=min((hull.matrix_world@v.co).z for v in hull.data.vertices)
assert -.6<bottom<-.12,bottom
save_component(col,{'source':'fengqiao-scene-v02.blend/glb_scene_v02','rigBones':len(rig.data.bones),'hull':topology,'hullBottomMeters':bottom,'disabledNightMarkers':removed,'pathStart':PATH[0]},closed=False)
