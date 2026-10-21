"""Portable helpers for the isolated rock-snow revision; no geometry on import."""
from pathlib import Path
import bpy
import bmesh
import json
import math

ROOT = Path(__file__).resolve().parents[5]
MAIN = ROOT / 'art/blender/jiangxue-scene-v04.blend'
OUTPUT = ROOT / 'output/jiangxue-model-v04'
LIBRARY = ROOT / 'art/blender/components/jiangxue-v04'
SCENE = 'jiangxue_modeling_v04'
EXPORT = 'glb_scene_v04'
SOURCE = 'jiangxue_components_v04'


def active():
    assert bpy.context.scene.name == SCENE, 'Select the independent v04 scene'
    assert Path(bpy.data.filepath).resolve() == MAIN, 'Save as v04 before editing'
    return bpy.context.scene


def write_report(name, data):
    path = OUTPUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf8')


def mesh_check(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    result = {
        'object': obj.name,
        'vertices': len(bm.verts),
        'triangles': sum(len(f.verts) - 2 for f in bm.faces),
        'nonmanifoldEdges': sum(not e.is_manifold for e in bm.edges),
        'volume': bm.calc_volume(signed=True),
        'finite': all(math.isfinite(c) for v in bm.verts for c in v.co),
    }
    bm.free()
    assert result['nonmanifoldEdges'] == 0 and result['finite'], result
    assert result['volume'] > 0, result
    assert len(obj.data.uv_layers) and len(obj.data.materials) == 1
    assert all(abs(s - 1) < 1e-6 for s in obj.scale)
    return result


def save_component(collection, rows):
    scene = active()
    checks = [mesh_check(obj) for obj in collection.objects if obj.type == 'MESH']
    report = {'component': collection.name, 'scene': SCENE, 'meshes': checks, 'contacts': rows}
    write_report('components/' + collection.name + '.json', report)
    scene[collection.name + '_checked'] = True
    LIBRARY.mkdir(parents=True, exist_ok=True)
    bpy.data.libraries.write(str(LIBRARY / (collection.name + '.blend')), {collection}, fake_user=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / 'checkpoints' / (collection.name + '.blend')), copy=True, check_existing=False)
    bpy.ops.wm.save_as_mainfile(filepath=str(MAIN), check_existing=False)
    return report
