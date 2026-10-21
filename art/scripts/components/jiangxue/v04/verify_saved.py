"""Read-only checks after independently reopening the saved v04 source."""
import sys
from pathlib import Path
import bpy
import json
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common_v04 import active, ROOT, EXPORT, mesh_check, write_report
sys.path.insert(0, str(ROOT / 'art/scripts'))
from validate import validate

scene = active()
scene.view_layers[0].update()
graph = bpy.context.evaluated_depsgraph_get()
report = validate()
assert not report.errors, report.errors
assert len(bpy.data.objects['fisherman_rig'].data.bones) == 53
export = bpy.data.collections[EXPORT]
assert all(not o.name.startswith(('src_', 'history_', 'preview_')) for o in export.all_objects)
contacts = []
for i in range(14):
    rock = bpy.data.objects[f'shore_rock_v02_{i:02}']
    snow = bpy.data.objects[f'rock_snow_v02_{i:02}']
    topology = mesh_check(snow)
    bv = BVHTree.FromObject(rock, graph)
    transform = rock.matrix_world.inverted() @ snow.matrix_world
    vertices = [transform @ v.co for v in snow.data.vertices]
    count = len(vertices) // 2
    thickness = [vertices[j].z - vertices[j + count].z for j in range(count)]
    assert min(thickness) > .015 and max(thickness) < .35, (snow.name, min(thickness), max(thickness))
    gaps = []
    for v in vertices[count:]:
        hit = bv.ray_cast(Vector((v.x, v.y, 50)), Vector((0, 0, -1)))[0]
        assert hit is not None
        gaps.append(v.z - hit.z)
    assert max(abs(v + .006) for v in gaps) < 2e-5
    clearances = []
    for p in snow.data.polygons:
        if not all(j < count for j in p.vertices):
            continue
        indices = list(p.vertices)
        probes = [indices, *[(indices[j], indices[(j + 1) % 3]) for j in range(3)]]
        for ids in probes:
            q = sum((vertices[j] for j in ids), Vector()) / len(ids)
            hit = bv.ray_cast(Vector((q.x, q.y, 50)), Vector((0, 0, -1)))[0]
            assert hit is not None
            clearances.append(q.z - hit.z)
    assert min(clearances) > 0, (snow.name, min(clearances))
    contacts.append({**topology, 'bottomSamples': count, 'bottomGapMetres': [min(gaps), max(gaps)],
                     'thicknessMetres': [min(thickness), max(thickness)],
                     'topInteriorSamples': len(clearances), 'minimumTopClearanceMetres': min(clearances)})

deck = bpy.data.objects['boat_wood_aged']
bv = BVHTree.FromObject(deck, graph)
inv = deck.matrix_world.inverted()
feet = []
for side in ('left', 'right'):
    shoe = bpy.data.objects['fisherman_shoe_' + side]
    ev = shoe.evaluated_get(graph)
    coords = [shoe.matrix_world @ v.co for v in ev.data.vertices]
    sole = min(v.z for v in coords)
    p = Vector((sum(v.x for v in coords) / len(coords), sum(v.y for v in coords) / len(coords), sole + .15))
    hit = bv.ray_cast(inv @ p, inv.to_3x3() @ Vector((0, 0, -1)))[0]
    assert hit is not None
    z = (deck.matrix_world @ hit).z
    assert abs(sole - z) < .002 and sole > .05
    feet.append({'side': side, 'sole': sole, 'deck': z, 'gapMetres': sole - z})
rod = bpy.data.objects['fishing_bamboo']
rb = BVHTree.FromObject(rod, graph)
ri = rod.matrix_world.inverted()
body = bpy.data.objects['fisherman_anatomy']
ev = body.evaluated_get(graph)
hands = []
for side in ('left', 'right'):
    group = body.vertex_groups['fisherman_hand_' + side]
    ids = [v.index for v in body.data.vertices if any(g.group == group.index and g.weight > .1 for g in v.groups)]
    distance = min(rb.find_nearest(ri @ (body.matrix_world @ ev.data.vertices[j].co))[3] for j in ids)
    assert distance < .04
    hands.append({'side': side, 'closestSurfaceMetres': distance})
boat = bpy.data.objects['boat_guest']
hull = bpy.data.objects['boat_hull_closed']
heights = [(hull.matrix_world @ v.co).z for v in hull.data.vertices]
assert min(heights) < -.15 and max(heights) > .6
manifest = json.loads((ROOT / 'frontend/public/assets/scenes/jiangxue.scene-v04.json').read_text())
path = manifest['boatNavigation']['path']
direction = Vector((path[1][0] - path[0][0], -(path[1][1] - path[0][1]), 0)).normalized()
forward = (boat.matrix_world.to_3x3() @ Vector((1, 0, 0))).normalized()
assert forward.dot(direction) > .99999
endpoint = bpy.data.objects['ANCHOR_fishing_water'].matrix_world.translation
assert abs(endpoint.z + .006) < 1e-6
result = {'errors': report.errors, 'warnings': report.warnings, 'snow': contacts, 'feet': feet,
          'hands': hands, 'hullWorldZ': [min(heights), max(heights)], 'actualDraftMetres': -min(heights),
          'headingAlignment': forward.dot(direction), 'lineEndpoint': list(endpoint), 'rigBones': 53, 'passed': True}
write_report('validation/reopened-source.json', result)
print(json.dumps({'passed': True, 'snowCaps': len(contacts), 'bottomSamples': sum(c['bottomSamples'] for c in contacts),
                  'minimumTopClearanceMetres': min(c['minimumTopClearanceMetres'] for c in contacts),
                  'feet': feet, 'hands': hands, 'actualDraftMetres': -min(heights)}))
