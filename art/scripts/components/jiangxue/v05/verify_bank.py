"""Independent checks for the new waterline and bank mantle after reopening."""
import bpy
import bmesh
import hashlib
import json
import struct
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from common_v05 import ROOT, EXPORT, WET_LEVEL, check_mesh


def verify(graph):
    waterline = []
    for i in range(14):
        obj = bpy.data.objects[f'shore_rock_v02_{i:02}']
        previous = bpy.data.objects[f'history_v04_shore_rock_v02_{i:02}']
        check_mesh(obj)
        old_bvh = BVHTree.FromPolygons([v.co for v in previous.data.vertices], [tuple(p.vertices) for p in previous.data.polygons])
        deviation = max(old_bvh.find_nearest(v.co)[3] for v in obj.data.vertices)
        assert deviation < 1e-5
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        z = [(obj.matrix_world @ v.co).z for edge in bm.edges
             if len(edge.link_faces) == 2 and edge.link_faces[0].material_index != edge.link_faces[1].material_index for v in edge.verts]
        bm.free()
        assert z and max(abs(value - WET_LEVEL) for value in z) < 5e-6
        for p in obj.data.polygons:
            values = [(obj.matrix_world @ obj.data.vertices[j].co).z for j in p.vertices]
            assert (max(values) <= WET_LEVEL + 5e-6) if p.material_index == 1 else (min(values) >= WET_LEVEL - 5e-6)
        waterline.append({'object': obj.name, 'boundaryWorldZ': [min(z), max(z)], 'samples': len(z), 'surfaceDeviationMetres': deviation})
    bank, snow = bpy.data.objects['shore_bank_v02'], bpy.data.objects['shore_snow_v02']
    topology = check_mesh(snow)
    bvh = BVHTree.FromObject(bank, graph)
    transform = bank.matrix_world.inverted() @ snow.matrix_world
    vertices = [transform @ v.co for v in snow.data.vertices]
    count = len(vertices) // 2
    gaps, clearances = [], []
    for p in vertices[count:]:
        hit = bvh.ray_cast(Vector((p.x, p.y, 50)), Vector((0, 0, -1)))[0]
        assert hit is not None
        gaps.append(p.z - hit.z)
    assert max(abs(value + .006) for value in gaps) < 2e-5
    for face in snow.data.polygons:
        ids = tuple(face.vertices)
        if not all(j < count for j in ids):
            continue
        for probe in (ids, (ids[0], ids[1]), (ids[1], ids[2]), (ids[2], ids[0])):
            p = sum((vertices[j] for j in probe), Vector()) / len(probe)
            hit = bvh.ray_cast(Vector((p.x, p.y, 50)), Vector((0, 0, -1)))[0]
            assert hit is not None
            clearances.append(p.z - hit.z)
    assert min(clearances) > 0
    thickness = [vertices[j].z - vertices[j + count].z for j in range(count)]
    assert min(thickness) >= .0199 and max(thickness) < .35
    tree = bpy.data.objects['dead_tree_root'].matrix_world.translation
    point = bank.matrix_world.inverted() @ tree
    hit = bvh.ray_cast(Vector((point.x, point.y, 50)), Vector((0, 0, -1)))[0]
    assert hit is not None
    ground = (bank.matrix_world @ hit).z
    core = bpy.data.objects['dead_tree_core_v02']
    base = min((core.matrix_world @ v.co).z for v in core.data.vertices)
    assert base <= ground + .03, ('Tree base floating', base, ground)
    bank_check = {**topology, 'bottomSamples': count, 'bottomGapMetres': [min(gaps), max(gaps)],
                  'topInteriorSamples': len(clearances), 'minimumTopClearanceMetres': min(clearances),
                  'thicknessMetres': [min(thickness), max(thickness)], 'treeBaseWorldZ': base, 'treeGroundWorldZ': ground}
    before = json.loads((ROOT / 'output/jiangxue-model-v05/validation/runtime-before.json').read_text())
    excluded = {'shore_snow_v02', *(f'shore_rock_v02_{i:02}' for i in range(14))}
    preserved = []
    for obj in bpy.data.collections[EXPORT].all_objects:
        if obj.name in excluded:
            continue
        row = {'type': obj.type, 'parent': obj.parent.name if obj.parent else None, 'basis': [list(r) for r in obj.matrix_basis]}
        if obj.type == 'MESH':
            h = hashlib.sha256()
            for v in obj.data.vertices:
                h.update(struct.pack('<3f', *v.co))
            for p in obj.data.polygons:
                h.update(struct.pack('<I', p.material_index))
                h.update(struct.pack('<' + 'I' * len(p.vertices), *p.vertices))
            for uv in obj.data.uv_layers:
                for item in uv.data:
                    h.update(struct.pack('<2f', *item.uv))
            row['meshSHA256'] = h.hexdigest()
            row['materials'] = [m.name for m in obj.data.materials]
        assert row == before[obj.name], ('Unrelated runtime object changed', obj.name)
        preserved.append(obj.name)
    return {'waterline': waterline, 'bankSnow': bank_check, 'preservedRuntimeObjects': preserved}
