"""Read-only, reopened v02 checks including contact against exported rock geometry."""
import bpy,sys,json,math,bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts')
from validate import validate
bpy.context.window.scene=bpy.data.scenes['jiangxue_modeling_v02']
scene=bpy.context.scene;scene.view_layers[0].update();graph=bpy.context.evaluated_depsgraph_get()
report=validate();rig=bpy.data.objects['fisherman_rig'];assert len(rig.data.bones)==53
deck=bpy.data.objects['boat_wood_aged'];bv=BVHTree.FromObject(deck,graph);inv=deck.matrix_world.inverted();feet=[]
for side in ('left','right'):
    shoe=bpy.data.objects['fisherman_shoe_'+side];ev=shoe.evaluated_get(graph)
    coords=[shoe.matrix_world@v.co for v in ev.data.vertices];sole=min(v.z for v in coords)
    p=Vector((sum(v.x for v in coords)/len(coords),sum(v.y for v in coords)/len(coords),sole+.15));hit=bv.ray_cast(inv@p,inv.to_3x3()@Vector((0,0,-1)))
    assert hit[0] is not None;z=(deck.matrix_world@hit[0]).z;assert abs(sole-z)<.002
    feet.append({'side':side,'gapMetres':sole-z})
rod=bpy.data.objects['fishing_bamboo'];rodBvh=BVHTree.FromObject(rod,graph);rodInv=rod.matrix_world.inverted();anatomy=bpy.data.objects['fisherman_anatomy'];ev=anatomy.evaluated_get(graph);hands=[]
for side in ('left','right'):
    group=anatomy.vertex_groups.get('fisherman_hand_'+side);assert group
    ids=[v.index for v in anatomy.data.vertices if any(g.group==group.index and g.weight>.1 for g in v.groups)]
    distances=[rodBvh.find_nearest(rodInv@(anatomy.matrix_world@ev.data.vertices[i].co))[3] for i in ids]
    closest=min(distances);assert closest<.04;hands.append({'side':side,'closestSurfaceMetres':closest})
nature=[];contacts=[]
for obj in bpy.data.collections['glb_scene_v02'].all_objects:
    if obj.type!='MESH' or not any(obj.name.startswith(p) for p in ('shore_bank_v02','shore_snow_v02','shore_rock_v02','rock_snow_v02','dead_tree_')):continue
    bm=bmesh.new();bm.from_mesh(obj.data);open_edges=sum(not e.is_manifold for e in bm.edges);bm.free();assert open_edges==0,obj.name
    assert all(math.isfinite(n) for v in obj.data.vertices for n in v.co),obj.name
    nature.append({'name':obj.name,'nonManifoldEdges':open_edges,'triangles':len(obj.data.polygons)})
    if obj.name.startswith('rock_snow_v02'):
        rock=bpy.data.objects['shore_rock_v02_'+obj.name.rsplit('_',1)[-1]];rb=BVHTree.FromObject(rock,graph);ri=rock.matrix_world.inverted();count=len(obj.data.vertices)//2;gaps=[]
        for vertex in list(obj.data.vertices)[count:]:
            p=obj.matrix_world@vertex.co;hit=rb.ray_cast(ri@Vector((p.x,p.y,p.z+20)),ri.to_3x3()@Vector((0,0,-1)))
            assert hit[0] is not None,obj.name;gap=p.z-(rock.matrix_world@hit[0]).z;gaps.append(gap);assert abs(gap+.006)<.001,(obj.name,gap)
        contacts.append({'snow':obj.name,'samples':count,'gapMetres':[min(gaps),max(gaps)]})
bank=bpy.data.objects['shore_bank_v02'];bb=BVHTree.FromObject(bank,graph);bi=bank.matrix_world.inverted();tree=bpy.data.objects['dead_tree_root'];p=tree.matrix_world.translation;hit=bb.ray_cast(bi@Vector((p.x,p.y,50)),bi.to_3x3()@Vector((0,0,-1)));assert hit[0] is not None
treeGap=p.z-(bank.matrix_world@hit[0]).z;assert -.06<treeGap<.01,treeGap
result={'errors':report.errors,'warnings':report.warnings,'rigBones':len(rig.data.bones),'feet':feet,'hands':hands,'nature':nature,'rockSnowContact':contacts,'treeRootGapMetres':treeGap,'terrain':json.loads(scene['terrain_component']),'passed':not report.errors}
with open(ROOT+'/output/jiangxue-model-v02/validation/reopened-source.json','w',encoding='utf8') as f:json.dump(result,f,ensure_ascii=False,indent=2)
print(json.dumps(result));assert not report.errors
