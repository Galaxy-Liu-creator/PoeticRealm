"""Split the existing closed rock surface at a continuous wet boundary.

No displacement: upper faces, cap support and UVs retain their original surface.
Run --prototype and inspect before --remaining; publishing is separate.
"""
import sys
from pathlib import Path
import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common_v05 import active, WET_LEVEL, new_collection, save_component


def make(index, col):
    old = bpy.data.objects[f'shore_rock_v02_{index:02}']
    obj = old.copy()
    obj.data = old.data.copy()
    obj.name = f'src_shore_rock_v05_{index:02}'
    col.objects.link(obj)
    # Parent-relative basis is authoritative even when source collections hide.
    root_z = old.parent.matrix_world.translation.z
    assert max(abs(angle) for angle in old.rotation_euler) < 1e-6
    level = WET_LEVEL - root_z - old.location.z
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    original_vertices = [v.co.copy() for v in bm.verts]
    original = BVHTree.FromPolygons([v.co for v in old.data.vertices], [tuple(p.vertices) for p in old.data.polygons])
    bmesh.ops.bisect_plane(bm, geom=[*bm.verts, *bm.edges, *bm.faces], dist=1e-6,
                          plane_co=Vector((0, 0, level)), plane_no=Vector((0, 0, 1)),
                          clear_inner=False, clear_outer=False)
    for face in bm.faces:
        face.material_index = int(face.calc_center_median().z < level)
        face.smooth = True
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    seam = [v.co.z + root_z + obj.location.z for edge in bm.edges
            if len(edge.link_faces) == 2 and edge.link_faces[0].material_index != edge.link_faces[1].material_index
            for v in edge.verts]
    bm.free()
    assert seam and max(abs(z - WET_LEVEL) for z in seam) < 5e-6
    deviation = max(original.find_nearest(v.co)[3] for v in obj.data.vertices)
    assert deviation < 1e-5, deviation
    assert all(min((v.co - p).length for v in obj.data.vertices) < 1e-6 for p in original_vertices)
    return {'rock': obj.name, 'wetLevelMetres': WET_LEVEL, 'seamSamples': len(seam),
            'boundaryWorldZ': [min(seam), max(seam)], 'surfaceDeviationMetres': deviation,
            'existingVerticesPreserved': len(original_vertices), 'uvInterpolation': 'bmesh bisect on original faces'}


if __name__ == '__main__':
    scene = active()
    prototype = '--prototype' in sys.argv
    assert prototype or '--remaining' in sys.argv
    if not prototype:
        assert scene.get('jx_v05_waterline_prototype_checked') and scene.get('waterline_prototype_visual_checked')
    col = new_collection('jx_v05_waterline_prototype' if prototype else 'jx_v05_waterline_remaining')
    rows = [make(i, col) for i in ([0] if prototype else range(1, 14))]
    print({'meshes': save_component(col, rows), 'checkedRocks': len(rows)})
