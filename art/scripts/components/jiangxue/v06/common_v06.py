"""Revision-local tools. Importing does not build or alter geometry."""
from pathlib import Path
import bpy, bmesh, json, math

ROOT = Path(__file__).resolve().parents[5]
MAIN = ROOT / 'art/blender/jiangxue-scene-v06.blend'
OUTPUT = ROOT / 'output/jiangxue-model-v06'
LIBRARY = ROOT / 'art/blender/components/jiangxue-v06'
SCENE = 'jiangxue_modeling_v06'
EXPORT = 'glb_scene_v06'
SOURCE = 'jiangxue_components_v06'

def active():
    assert bpy.context.scene.name == SCENE
    assert Path(bpy.data.filepath).resolve() == MAIN
    return bpy.context.scene

def report(name, data):
    path = OUTPUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

def check_mesh(obj, closed=True):
    bm=bmesh.new();bm.from_mesh(obj.data)
    result={'object':obj.name,'vertices':len(bm.verts),'triangles':sum(len(f.verts)-2 for f in bm.faces),
            'nonmanifoldEdges':sum(not e.is_manifold for e in bm.edges),'volume':bm.calc_volume(signed=True)}
    assert all(math.isfinite(c) for v in bm.verts for c in v.co)
    bm.free()
    if closed: assert result['nonmanifoldEdges']==0 and result['volume']>0,result
    if closed: assert obj.data.uv_layers and 1<=len(obj.data.materials)<=2
    assert all(abs(s-1)<1e-6 for s in obj.scale)
    return result

def new_collection(name):
    active();assert name not in bpy.data.collections
    col=bpy.data.collections.new(name);bpy.data.collections[SOURCE].children.link(col)
    return col

def normalize_origin(obj):
    """Bottom-centre origin without moving the world-space surface."""
    from mathutils import Vector, Matrix
    vertices=obj.data.vertices
    center=Vector(((min(v.co.x for v in vertices)+max(v.co.x for v in vertices))/2,
                   (min(v.co.y for v in vertices)+max(v.co.y for v in vertices))/2,
                   min(v.co.z for v in vertices)))
    for v in vertices:v.co-=center
    obj.matrix_basis=obj.matrix_basis@Matrix.Translation(center)
    obj.data.update()

def save_component(col, checks):
    rows=[check_mesh(o) for o in col.objects if o.type=='MESH']
    report('components/'+col.name+'.json',{'component':col.name,'meshes':rows,'checks':checks})
    active()[col.name+'_checked']=True
    LIBRARY.mkdir(parents=True,exist_ok=True)
    bpy.data.libraries.write(str(LIBRARY/(col.name+'.blend')),{col},fake_user=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT/'checkpoints'/(col.name+'.blend')),copy=True,check_existing=False)
    bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
    return rows
