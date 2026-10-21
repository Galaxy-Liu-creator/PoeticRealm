"""Independent reopened-source checks for unchanged bank, wet boundaries and new tree."""
import bpy,bmesh,json,hashlib,struct
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from common_v06 import *

def verify(graph):
    wet=[]
    for i in range(14):
        obj=bpy.data.objects[f'shore_rock_v02_{i:02}'];check_mesh(obj)
        bm=bmesh.new();bm.from_mesh(obj.data)
        z=[(obj.matrix_world@v.co).z for e in bm.edges if len(e.link_faces)==2 and e.link_faces[0].material_index!=e.link_faces[1].material_index for v in e.verts]
        bm.free();assert z and max(abs(value-.22) for value in z)<8e-6
        wet.append({'object':obj.name,'boundaryWorldZ':[min(z),max(z)]})
    # The continuous mantle and support remain from v05; verify their actual surfaces again.
    bank,snow=bpy.data.objects['shore_bank_v02'],bpy.data.objects['shore_snow_v02']
    check_mesh(bank);check_mesh(snow);bvh=BVHTree.FromObject(bank,graph)
    transform=bank.matrix_world.inverted()@snow.matrix_world;vertices=[transform@v.co for v in snow.data.vertices];n=len(vertices)//2
    gaps=[];clear=[]
    for v in vertices[n:]:
        hit=bvh.ray_cast(Vector((v.x,v.y,50)),Vector((0,0,-1)))[0];assert hit is not None;gaps.append(v.z-hit.z)
    assert max(abs(g+.006) for g in gaps)<2e-5
    for p in snow.data.polygons:
        ids=tuple(p.vertices)
        if not all(j<n for j in ids):continue
        for probe in (ids,(ids[0],ids[1]),(ids[1],ids[2]),(ids[2],ids[0])):
            v=sum((vertices[j] for j in probe),Vector())/len(probe)
            hit=bvh.ray_cast(Vector((v.x,v.y,50)),Vector((0,0,-1)))[0];assert hit is not None;clear.append(v.z-hit.z)
    assert min(clear)>0
    paths=json.loads(active()['tree_v02_paths']);fine=bpy.data.objects['dead_tree_fine_v02'];root=bpy.data.objects['dead_tree_root'];offset=0;connections=[]
    for k,path in enumerate(paths):
        for j in range(7,len(path['points'])-2,4):
            center=sum((fine.matrix_world@fine.data.vertices[offset+t].co for t in range(7)),Vector())/7
            support=root.matrix_world@Vector(path['points'][j]);gap=(center-support).length;assert gap<5e-6
            connections.append(gap);offset+=11*7+7*6
    assert offset==len(fine.data.vertices)
    roots=bpy.data.objects['dead_tree_roots_v06'];root_gaps=[]
    for i in range(5):
        tip=sum((roots.matrix_world@roots.data.vertices[i*81+72+j].co for j in range(9)),Vector())/9
        q=bank.matrix_world.inverted()@tip;hit=bvh.ray_cast(Vector((q.x,q.y,50)),Vector((0,0,-1)))[0];assert hit is not None
        gap=q.z-hit.z;assert abs(gap+.045)<2e-5;root_gaps.append(gap)
    for name in ('dead_tree_fine_v02','dead_tree_snow_v02','dead_tree_roots_v06'):check_mesh(bpy.data.objects[name])
    terrain=bpy.data.objects['terrain'];assert len(terrain.data.vertices)==145*145
    tb=BVHTree.FromObject(terrain,graph);corridor=[]
    manifest=json.loads((ROOT/'frontend/public/assets/scenes/jiangxue.scene-v06.json').read_text())
    for x,z in manifest['boatNavigation']['path']:
        hit=tb.ray_cast(Vector((x,-z,100)),Vector((0,0,-1)))[0];assert hit and hit.z<-.5;corridor.append(hit.z)
    before=json.loads((ROOT/'output/jiangxue-model-v05/validation/runtime-before.json').read_text())
    excluded={'shore_snow_v02','dead_tree_fine_v02','dead_tree_snow_v02','dead_tree_roots_v06',
              'CAM_enter','CAM_birds','CAM_path','CAM_fog','CAM_boat',*(f'shore_rock_v02_{i:02}' for i in range(14)),*(f'rock_snow_v02_{i:02}' for i in range(14))}
    preserved=[]
    for obj in bpy.data.collections[EXPORT].all_objects:
        if obj.name in excluded:continue
        row={'type':obj.type,'parent':obj.parent.name if obj.parent else None,'basis':[list(r) for r in obj.matrix_basis]}
        if obj.type=='MESH':
            h=hashlib.sha256()
            for v in obj.data.vertices:h.update(struct.pack('<3f',*v.co))
            for p in obj.data.polygons:h.update(struct.pack('<I',p.material_index));h.update(struct.pack('<'+'I'*len(p.vertices),*p.vertices))
            for uv in obj.data.uv_layers:
                for item in uv.data:h.update(struct.pack('<2f',*item.uv))
            row['meshSHA256']=h.hexdigest();row['materials']=[m.name for m in obj.data.materials]
        expected=before[obj.name]
        # Blender's matrix -> Euler -> matrix round trip has float32 noise.
        assert max(abs(a-b) for ra,rb in zip(row['basis'],expected['basis']) for a,b in zip(ra,rb))<1e-6,(obj.name,'transform changed')
        assert {k:v for k,v in row.items() if k!='basis'}=={k:v for k,v in expected.items() if k!='basis'},('Unrelated object changed',obj.name)
        preserved.append(obj.name)
    return {'waterline':wet,'bankSnow':{'bottomSamples':len(gaps),'gapMetres':[min(gaps),max(gaps)],'topInteriorSamples':len(clear),'minTopClearance':min(clear)},
            'tree':{'connections':len(connections),'maxConnectionCenterError':max(connections),'rootTipGaps':root_gaps},'routeBedHeights':corridor,'preservedRuntimeObjects':preserved}
