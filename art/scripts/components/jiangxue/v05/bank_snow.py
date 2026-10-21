"""A bank-snow component sampled from the actual retained rock bank.

Build --prototype over a short strip, inspect it, then build --full.
The supporting bank, tree, rock cluster and existing mantle stay untouched.
"""
import sys
from pathlib import Path
import bpy
import bmesh
import math
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from common_v05 import active, new_collection, save_component
sys.path.insert(0, str(HERE.parent / 'v04'))
from rock_snow import lift_triangle_interiors

EMBED = .006


def edge(y):
    return -6.5 + 2.7 * math.sin(y * .064) + 1.15 * math.sin(y * .21) + .34 * math.sin(y * .51)


def build(col, prototype):
    bank = bpy.data.objects['shore_bank_v02']
    # Work entirely in shore_root space; hidden source matrix_world is stale.
    basis = bank.matrix_parent_inverse @ bank.matrix_basis
    bvh = BVHTree.FromPolygons([basis @ v.co for v in bank.data.vertices], [tuple(p.vertices) for p in bank.data.polygons])

    def support(x, y):
        return bvh.ray_cast(Vector((x, y, 50)), Vector((0, 0, -1)))

    rows, columns = (17, 20) if prototype else (153, 52)
    # Stay 1mm inside the bank's terminal edges, where coplanar BVH rays tie.
    y0, length, maximum_d = (-22., 24., 10.) if prototype else (-39.999, 229.998, 94.5)
    top, bottom, fronts = [], [], []
    for j in range(rows):
        y = y0 + length * j / (rows - 1)
        start = 3.85 + .35 * math.sin(y * .09) + .13 * math.sin(y * .31)
        # Keep the snow lip on a supporting shoulder, exposing steeper rock.
        for _ in range(30):
            hit, normal, _, _ = support(edge(y) + start, y)
            assert hit is not None, ('No shoulder support', y, start)
            if normal.z >= .55:
                break
            start += .035
        else:
            raise RuntimeError('No upward shoulder at y=' + str(y))
        fronts.append({'y': y, 'offsetFromWaterEdge': start, 'normalZ': normal.z})
        for i in range(columns):
            distance = (maximum_d - start) * (i / (columns - 1)) ** 2.2
            x = edge(y) + start + distance
            hit = support(x, y)[0]
            assert hit is not None, ('No mantle support', x, y)
            u = min(1., distance / .65)
            roll = math.sqrt(max(0., 1. - (1. - u) ** 2))
            crown = .075 + .11 * (.5 + .5 * math.sin(y * .071 + x * .18)) + .013 * math.sin(x * 1.9 + y * .4)
            depth = .014 + crown * roll
            top.append((x, y, hit.z + depth))
            bottom.append((x, y, hit.z - EMBED))
    count = len(top)
    faces = [(j * columns + i, j * columns + i + 1, (j + 1) * columns + i + 1, (j + 1) * columns + i)
             for j in range(rows - 1) for i in range(columns - 1)]
    faces += [tuple(k + count for k in reversed(face)) for face in list(faces)]
    perimeter = [*range(columns), *(j * columns + columns - 1 for j in range(1, rows)),
                 *((rows - 1) * columns + i for i in range(columns - 2, -1, -1)),
                 *(j * columns for j in range(rows - 2, 0, -1))]
    for j, index in enumerate(perimeter):
        nxt = perimeter[(j + 1) % len(perimeter)]
        faces.append((index, nxt, nxt + count, index + count))
    name = 'src_shore_snow_v05_prototype' if prototype else 'src_shore_snow_v05'
    assert name not in bpy.data.objects
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
    depths = [mesh.vertices[i].co.z - mesh.vertices[i + count].co.z for i in range(count)]
    assert min(depths) >= .0199 and max(depths) < .35, (min(depths), max(depths))
    uv = mesh.uv_layers.new(name='UVMap')
    for polygon in mesh.polygons:
        polygon.use_smooth = True
        axes = [a for a in range(3) if a != max(range(3), key=lambda a: abs(polygon.normal[a]))]
        for li in polygon.loop_indices:
            p = mesh.vertices[mesh.loops[li].vertex_index].co
            uv.data[li].uv = (p[axes[0]] / 1.8, p[axes[1]] / 1.8)
    origin = Vector(((min(v.co.x for v in mesh.vertices) + max(v.co.x for v in mesh.vertices)) / 2,
                     (min(v.co.y for v in mesh.vertices) + max(v.co.y for v in mesh.vertices)) / 2,
                     min(v.co.z for v in mesh.vertices)))
    for v in mesh.vertices:
        v.co -= origin
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    col.objects.link(obj)
    obj.parent = bank.parent
    obj.matrix_basis = Matrix.Translation(origin)
    obj['static'] = True
    mesh.materials.append(bpy.data.materials['pbr_snow__driftv02'])
    return {'object': obj.name, 'rows': rows, 'columns': columns, 'bottomSamples': count,
            'bottomContactMetres': -EMBED, 'thicknessMetres': [min(depths), max(depths)],
            'front': fronts, 'support': 'actual shore_bank_v02 mesh, parent-local BVH',
            'roundedLipWidthMetres': .65}


if __name__ == '__main__':
    scene = active()
    prototype = '--prototype' in sys.argv
    assert prototype or '--full' in sys.argv
    if not prototype:
        assert scene.get('jx_v05_bank_snow_prototype_checked') and scene.get('bank_snow_prototype_visual_checked')
    col = new_collection('jx_v05_bank_snow_prototype' if prototype else 'jx_v05_bank_snow')
    checks = build(col, prototype)
    print({'meshes': save_component(col, checks), 'thicknessMetres': checks['thicknessMetres']})
