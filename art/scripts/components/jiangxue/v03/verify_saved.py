"""Independent reopened-source contact, draft, heading and preview/export checks."""
import bpy,sys,json,math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts');from validate import validate
bpy.context.window.scene=bpy.data.scenes['jiangxue_modeling_v03'];scene=bpy.context.scene;scene.view_layers[0].update();graph=bpy.context.evaluated_depsgraph_get()
report=validate();rig=bpy.data.objects['fisherman_rig'];assert len(rig.data.bones)==53
deck=bpy.data.objects['boat_wood_aged'];bv=BVHTree.FromObject(deck,graph);inv=deck.matrix_world.inverted();feet=[]
for side in ('left','right'):
    shoe=bpy.data.objects['fisherman_shoe_'+side];ev=shoe.evaluated_get(graph);coords=[shoe.matrix_world@v.co for v in ev.data.vertices];sole=min(v.z for v in coords)
    p=Vector((sum(v.x for v in coords)/len(coords),sum(v.y for v in coords)/len(coords),sole+.15));hit=bv.ray_cast(inv@p,inv.to_3x3()@Vector((0,0,-1)));assert hit[0] is not None
    z=(deck.matrix_world@hit[0]).z;assert abs(sole-z)<.002;assert sole>.05;feet.append({'side':side,'sole':sole,'deck':z,'gapMetres':sole-z})
rod=bpy.data.objects['fishing_bamboo'];rb=BVHTree.FromObject(rod,graph);ri=rod.matrix_world.inverted();body=bpy.data.objects['fisherman_anatomy'];ev=body.evaluated_get(graph);hands=[]
for side in ('left','right'):
    group=body.vertex_groups['fisherman_hand_'+side];ids=[v.index for v in body.data.vertices if any(g.group==group.index and g.weight>.1 for g in v.groups)]
    closest=min(rb.find_nearest(ri@(body.matrix_world@ev.data.vertices[i].co))[3] for i in ids);assert closest<.04;hands.append({'side':side,'closestSurfaceMetres':closest})
boat=bpy.data.objects['boat_guest'];hull=bpy.data.objects['boat_hull_closed'];heights=[(hull.matrix_world@v.co).z for v in hull.data.vertices];assert min(heights)<-.15 and max(heights)>.6
manifest=json.load(open(ROOT+'/frontend/public/assets/scenes/jiangxue.scene-v03.json',encoding='utf8'));p=manifest['boatNavigation']['path'];direction=Vector((p[1][0]-p[0][0],-(p[1][1]-p[0][1]),0)).normalized();forward=(boat.matrix_world.to_3x3()@Vector((1,0,0))).normalized();assert forward.dot(direction)>.99999
endpoint=bpy.data.objects['ANCHOR_fishing_water'].matrix_world.translation;assert abs(endpoint.z+.006)<1e-6
preview=bpy.data.objects['preview_river_v03'];assert preview.name not in bpy.data.collections['glb_scene_v03'].all_objects;assert all(abs(v.co.z)<1e-8 for v in preview.data.vertices)
result={'errors':report.errors,'warnings':report.warnings,'rigBones':53,'feet':feet,'hands':hands,'hullWorldZ':[min(heights),max(heights)],'actualDraftMetres':-min(heights),'headingAlignment':forward.dot(direction),'lineEndpoint':list(endpoint),'previewWaterLevel':preview.location.z,'previewExported':False,'passed':not report.errors}
with open(ROOT+'/output/jiangxue-model-v03/validation/reopened-source.json','w',encoding='utf8') as f:json.dump(result,f,indent=2)
print(json.dumps(result));assert not report.errors
