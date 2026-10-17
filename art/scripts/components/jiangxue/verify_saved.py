"""Independent reopened-source checks; no model mutations."""
import bpy,sys,json,math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts')
from validate import validate
bpy.context.window.scene=bpy.data.scenes['jiangxue_modeling_v01']
report=validate();scene=bpy.context.scene;graph=bpy.context.evaluated_depsgraph_get();scene.view_layers[0].update()
rig=bpy.data.objects['fisherman_rig'];assert len(rig.data.bones)==53
deck=bpy.data.objects['boat_wood_aged'];bv=BVHTree.FromObject(deck,graph);inv=deck.matrix_world.inverted();feet=[]
for side in ('left','right'):
    shoe=bpy.data.objects['fisherman_shoe_'+side];ev=shoe.evaluated_get(graph)
    coords=[shoe.matrix_world@v.co for v in ev.data.vertices];sole=min(v.z for v in coords)
    p=Vector((sum(v.x for v in coords)/len(coords),sum(v.y for v in coords)/len(coords),sole+.15));hit=bv.ray_cast(inv@p,inv.to_3x3()@Vector((0,0,-1)))
    assert hit[0] is not None;z=(deck.matrix_world@hit[0]).z;assert abs(sole-z)<.002
    feet.append({'side':side,'soleMetres':sole,'deckMetres':z,'gapMetres':sole-z})
rod=bpy.data.objects['fishing_bamboo'];rodBvh=BVHTree.FromObject(rod,graph);rodInv=rod.matrix_world.inverted()
anatomy=bpy.data.objects['fisherman_anatomy'];ev=anatomy.evaluated_get(graph);hands=[]
for side in ('left','right'):
    group=anatomy.vertex_groups.get('fisherman_hand_'+side);assert group
    ids=[v.index for v in anatomy.data.vertices if any(g.group==group.index and g.weight>.1 for g in v.groups)]
    distances=[]
    for i in ids:
        point=rodInv@(anatomy.matrix_world@ev.data.vertices[i].co);hit=rodBvh.find_nearest(point)
        if hit[0] is not None:distances.append(hit[3])
    closest=min(distances);assert closest<.04;hands.append({'side':side,'closestSurfaceMetres':closest})
result={'errors':report.errors,'warnings':report.warnings,'rigBones':len(rig.data.bones),'feet':feet,'hands':hands,'terrain':dict(scene['terrain_component']),'passed':not report.errors}
with open(ROOT+'/output/jiangxue-model-v01/validation/reopened-source.json','w',encoding='utf8') as f:json.dump(result,f,ensure_ascii=False,indent=2)
print(json.dumps(result));assert not report.errors
