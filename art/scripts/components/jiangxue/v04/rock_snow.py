"""One component family: rounded, surface-sampled snow volumes over existing rocks.

Run --prototype first, inspect it, then --remaining. Assembly is a separate step.
The old caps and all supporting rocks remain intact until assembly.
"""
import sys
from pathlib import Path
import bpy
import bmesh
import math
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common_v04 import active, SOURCE, save_component

SIDES = 80
RINGS = (.12, .24, .36, .48, .60, .72, .82, .90, .96, 1.)
EMBED = .006


def lift_triangle_interiors(mesh, bvh, count, transform=None):
    """Keep exported triangles above substrate ridges, including split diagonals."""
    transform = transform or Matrix.Identity(4)
    vertices = [transform @ v.co for v in mesh.vertices]
    triangles = [tuple(p.vertices) for p in mesh.polygons if all(i < count for i in p.vertices)]
    for _ in range(8):
        lifts = [0.] * count
        for face in triangles:
            for ids in (face, (face[0], face[1]), (face[1], face[2]), (face[2], face[0])):
                q = sum((vertices[i] for i in ids), Vector()) / len(ids)
                p = bvh.ray_cast(Vector((q.x, q.y, 50)), Vector((0, 0, -1)))[0]
                assert p is not None
                correction = p.z + .008 - q.z
                if correction > 1e-6:
                    for i in ids:
                        lifts[i] = max(lifts[i], correction)
        if max(lifts) == 0:
            break
        for i, amount in enumerate(lifts):
            vertices[i].z += amount
    inverse = transform.inverted()
    for i in range(count):
        mesh.vertices[i].co = inverse @ vertices[i]
    mesh.update()


def build_cap(index, collection):
    rock = bpy.data.objects[f'shore_rock_v02_{index:02}']
    name = f'src_rock_snow_v04_{index:02}'
    assert bpy.data.objects.get(name) is None, 'Explicitly revise existing components'
    data = rock.data
    bvh = BVHTree.FromPolygons([v.co for v in data.vertices], [tuple(p.vertices) for p in data.polygons])
    xs = [v.co.x for v in data.vertices]
    ys = [v.co.y for v in data.vertices]
    rx, ry = (max(xs) - min(xs)) / 2, (max(ys) - min(ys)) / 2
    cx, cy = (min(xs) + max(xs)) / 2 - .06 * rx, (min(ys) + max(ys)) / 2 + .04 * ry
    zmax = max(v.co.z for v in data.vertices) + 2
    phase = .71 + index * 2.399963229728653

    def hit(x, y):
        return bvh.ray_cast(Vector((x, y, zmax)), Vector((0, 0, -1)))

    def supported(a, radius):
        point, normal, _, _ = hit(cx + rx * radius * math.cos(a), cy + ry * radius * math.sin(a))
        return point is not None and normal.z >= .62

    radii = []
    for j in range(SIDES):
        a = math.tau * j / SIDES
        desired = .81 + .065 * math.sin(2 * a + phase) + .026 * math.sin(5 * a - phase)
        # Find the first supporting ledge continuously instead of 9% radius jumps.
        low = .02
        assert supported(a, low), 'Rock centre has no upward support'
        while low + .01 < desired and supported(a, low + .01):
            low += .01
        high = min(desired, low + .01)
        if supported(a, high):
            low = high
        if low != high:
            for _ in range(12):
                middle = (low + high) / 2
                if supported(a, middle):
                    low = middle
                else:
                    high = middle
        radii.append(low - .015)
    # A conservative circular envelope removes isolated dents without extending
    # beyond an inspected ledge. The boundary keeps low-frequency asymmetry.
    envelope = [min(radii[(j + k) % SIDES] + .006 * abs(k) for k in range(-8, 9)) for j in range(SIDES)]
    for _ in range(4):
        envelope = [(envelope[(j - 1) % SIDES] + 2 * envelope[j] + envelope[(j + 1) % SIDES]) / 4 for j in range(SIDES)]
    envelope = [min(radii[j], r) * .98 for j, r in enumerate(envelope)]
    for j, radius in enumerate(envelope):
        assert supported(math.tau * j / SIDES, radius), 'Rounded boundary left support'

    points = [(cx, cy, 0.)]
    for t in RINGS:
        for j, radius in enumerate(envelope):
            a = math.tau * j / SIDES
            points.append((cx + rx * radius * t * math.cos(a), cy + ry * radius * t * math.sin(a), t))
    surface, top, bottom = [], [], []
    depths = []
    for x, y, t in points:
        p = hit(x, y)[0]
        assert p is not None
        # A rounded crown rolls into a small rim, rather than a flat cut sheet.
        depth = .016 + (.13 + .024 * math.sin(phase + x * .7 + y * .3)) * math.sqrt(max(0., 1 - t * t))
        surface.append(p.z)
        top.append([x, y, p.z + depth])
        bottom.append((x, y, p.z - EMBED))
        depths.append(depth + EMBED)
    faces = [(0, 1 + j, 1 + (j + 1) % SIDES) for j in range(SIDES)]
    for ring in range(len(RINGS) - 1):
        a, b = 1 + ring * SIDES, 1 + (ring + 1) * SIDES
        faces.extend((a + j, b + j, b + (j + 1) % SIDES, a + (j + 1) % SIDES) for j in range(SIDES))
    # Check interpolated top patches too: the substrate is deliberately faceted.
    # Lift affected vertices only when a midpoint would intersect a rock ridge.
    top_faces = list(faces)
    for _ in range(3):
        lifts = [0.] * len(top)
        for face in top_faces:
            probes = [tuple(face), *[(face[k], face[(k + 1) % len(face)]) for k in range(len(face))]]
            for ids in probes:
                q = sum((Vector(top[i]) for i in ids), Vector()) / len(ids)
                p = hit(q.x, q.y)[0]
                assert p is not None
                correction = p.z + .008 - q.z
                if correction > 0:
                    for i in ids:
                        lifts[i] = max(lifts[i], correction)
        for i, amount in enumerate(lifts):
            top[i][2] += amount
    count = len(top)
    faces += [tuple(i + count for i in reversed(f)) for f in top_faces]
    start = 1 + (len(RINGS) - 1) * SIDES
    faces.extend((start + j, start + j + count, start + (j + 1) % SIDES + count, start + (j + 1) % SIDES) for j in range(SIDES))
    mesh = bpy.data.meshes.new(name + '_mesh')
    mesh.from_pydata(top + bottom, [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    lift_triangle_interiors(mesh, bvh, count)
    uv = mesh.uv_layers.new(name='UVMap')
    for polygon in mesh.polygons:
        polygon.use_smooth = True
        for li in polygon.loop_indices:
            p = mesh.vertices[mesh.loops[li].vertex_index].co
            uv.data[li].uv = (p.x / 1.8, p.y / 1.8)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.parent = rock.parent
    origin = Vector(((min(v.co.x for v in mesh.vertices) + max(v.co.x for v in mesh.vertices)) / 2,
                     (min(v.co.y for v in mesh.vertices) + max(v.co.y for v in mesh.vertices)) / 2,
                     min(v.co.z for v in mesh.vertices)))
    for vertex in mesh.vertices:
        vertex.co -= origin
    obj.matrix_local = rock.matrix_local @ Matrix.Translation(origin)
    mesh.update()
    obj['static'] = True
    mesh.materials.append(bpy.data.materials['pbr_snow__driftv02'])
    row = {'rock': rock.name, 'snow': name, 'bottomSamples': count,
           'bottomContactMetres': -EMBED, 'boundaryUpwardNormalMinimum': .62,
           'thicknessMetres': [min(mesh.vertices[i].co.z - mesh.vertices[i+count].co.z for i in range(count)), max(mesh.vertices[i].co.z - mesh.vertices[i+count].co.z for i in range(count))],
           'sides': SIDES, 'rings': len(RINGS), 'seed': 31029}
    return obj, row


if __name__ == '__main__':
    scene = active()
    prototype = '--prototype' in sys.argv
    assert prototype or '--remaining' in sys.argv
    if not prototype:
        assert scene.get('jx_v04_snow_prototype_checked')
        assert scene.get('snow_prototype_visual_checked'), 'Inspect the prototype before repeats'
    name = 'jx_v04_snow_prototype' if prototype else 'jx_v04_snow_remaining'
    assert bpy.data.collections.get(name) is None
    collection = bpy.data.collections.new(name)
    bpy.data.collections[SOURCE].children.link(collection)
    rows = [build_cap(i, collection)[1] for i in ([0] if prototype else range(1, 14))]
    report = save_component(collection, rows)
    print(report)
