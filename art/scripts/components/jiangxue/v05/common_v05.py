"""Revision-local utilities. Importing does not create or edit geometry."""
from pathlib import Path
import bpy
import bmesh
import json
import math

ROOT = Path(__file__).resolve().parents[5]
MAIN = ROOT / 'art/blender/jiangxue-scene-v05.blend'
OUTPUT = ROOT / 'output/jiangxue-model-v05'
LIBRARY = ROOT / 'art/blender/components/jiangxue-v05'
SCENE = 'jiangxue_modeling_v05'
EXPORT = 'glb_scene_v05'
SOURCE = 'jiangxue_components_v05'
WET_LEVEL = .22


def active():
    assert bpy.context.scene.name == SCENE
    assert Path(bpy.data.filepath).resolve() == MAIN
    return bpy.context.scene


def report(name, value):
    path = OUTPUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf8')


def check_mesh(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    result = {'object': obj.name, 'vertices': len(bm.verts),
              'triangles': sum(len(f.verts) - 2 for f in bm.faces),
              'nonmanifoldEdges': sum(not e.is_manifold for e in bm.edges),
              'volume': bm.calc_volume(signed=True)}
    assert all(math.isfinite(c) for v in bm.verts for c in v.co)
    bm.free()
    assert result['nonmanifoldEdges'] == 0 and result['volume'] > 0, result
    assert len(obj.data.uv_layers) and 1 <= len(obj.data.materials) <= 2
    assert all(abs(s - 1) < 1e-6 for s in obj.scale)
    return result


def new_collection(name):
    active()
    assert name not in bpy.data.collections
    col = bpy.data.collections.new(name)
    bpy.data.collections[SOURCE].children.link(col)
    return col


def save_component(col, checks):
    scene = active()
    rows = [check_mesh(obj) for obj in col.objects if obj.type == 'MESH']
    report('components/' + col.name + '.json', {'component': col.name, 'meshes': rows, 'checks': checks})
    scene[col.name + '_checked'] = True
    LIBRARY.mkdir(parents=True, exist_ok=True)
    bpy.data.libraries.write(str(LIBRARY / (col.name + '.blend')), {col}, fake_user=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / 'checkpoints' / (col.name + '.blend')), copy=True, check_existing=False)
    bpy.ops.wm.save_as_mainfile(filepath=str(MAIN), check_existing=False)
    return rows
