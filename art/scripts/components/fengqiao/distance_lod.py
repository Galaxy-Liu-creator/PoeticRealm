"""One checked far component per invocation; never rebuilds near geometry."""
import bpy, bmesh, json, os
from mathutils import Vector

ROOT = 'D:/University-Competition/Math_Media/PoeticRealm'
OUT = ROOT + '/output/fengqiao-scene-v02'
# Fixed revisions: each entry is a small, independently reviewed component.
SPECS = {
    'temple-roof': ('temple_main', 'temple_far', [('tile_charcoal', .18)], 'CAM_temple'),
    'bell-roof': ('bell_tower', 'bell_far', [('tile_charcoal', .18)], 'CAM_bell'),
    'temple-frame': ('temple_main', 'temple_far', [('wood_aged', .28)], 'CAM_temple'),
    'bell-frame': ('bell_tower', 'bell_far', [('wood_aged', .32)], 'CAM_bell'),
    'temple-shell': ('temple_main', 'temple_far', [('stone_dry', .65), ('stone_lime', 1)], 'CAM_temple'),
    'bell-shell': ('bell_tower', 'bell_far', [('stone_dry', .65), ('metal_bellbronze', .28), ('metal_iron', 1)], 'CAM_bell'),
    'bridge': ('bridge_main', 'bridge_far', [('stone_dry', .60), ('stone_wet', 1)], 'CAM_bridge'),
    'maple-branches': ('maple_grove', 'maple_far', [('wood_aged', .65)], 'CAM_nature'),
    'maple-leaves': ('maple_grove', 'maple_far', [('foliage_maple', .60)], 'CAM_nature'),
    'reeds': ('reed_bed', 'reed_far', [('foliage_reed', .60)], 'CAM_nature'),
}

def active():
    if os.path.basename(bpy.data.filepath) != 'fengqiao-scene-v02.blend' or bpy.context.scene.name != 'fengqiao_modeling_v01':
        raise RuntimeError('Only the independent scene-v02 may be changed')
    return bpy.context.scene

def initialize():
    if os.path.basename(bpy.data.filepath) != 'fengqiao-scene-v01.blend' or bpy.data.is_dirty:
        raise RuntimeError('Start from the saved, unmodified current scene-v01')
    target = ROOT + '/art/blender/fengqiao-scene-v02.blend'
    if os.path.exists(target): raise RuntimeError('Preserve existing scene-v02; do not overwrite')
    bpy.data.collections['glb_scene_v01'].name = 'glb_scene_v02'
    bpy.ops.wm.save_as_mainfile(filepath=target, check_existing=False)

def bounds(obj):
    points = [obj.matrix_world @ Vector(v) for v in obj.bound_box]
    return [[min(p[i] for p in points) for i in range(3)], [max(p[i] for p in points) for i in range(3)]]

def normalize_origin(obj):
    vertices = [v.co for v in obj.data.vertices]
    center = Vector(((min(v.x for v in vertices)+max(v.x for v in vertices))/2,
                     (min(v.y for v in vertices)+max(v.y for v in vertices))/2,min(v.z for v in vertices)))
    for vertex in obj.data.vertices: vertex.co -= center
    obj.location += obj.rotation_euler.to_matrix() @ center
    obj.data.update()

def build(tag):
    scene = active()
    near_name, far_name, pieces, camera = SPECS[tag]
    col_name = 'lod_' + tag.replace('-', '_')
    if bpy.data.collections.get(col_name): raise RuntimeError('Far component already exists: ' + col_name)
    export = bpy.data.collections['glb_scene_v02']
    col = bpy.data.collections.new(col_name)
    scene.collection.children.link(col)
    near = bpy.data.objects[near_name]
    far = bpy.data.objects.get(far_name)
    if far is None:
        far = bpy.data.objects.new(far_name, None)
        export.objects.link(far)
        far.parent = near.parent
        far.matrix_parent_inverse = near.matrix_parent_inverse.copy()
        far.matrix_basis = near.matrix_basis.copy()
        far['static'] = True
    rows = []
    for suffix, ratio in pieces:
        source = bpy.data.objects[near_name + '_' + suffix]
        source.hide_set(False)
        obj = source.copy(); obj.data = source.data.copy()
        obj.name = far_name + '_' + suffix
        col.objects.link(obj)
        obj.parent = far
        obj.matrix_parent_inverse = source.matrix_parent_inverse.copy()
        obj.matrix_basis = source.matrix_basis.copy()
        obj.hide_set(False); obj.hide_render = False
        before = sum(len(p.vertices)-2 for p in source.data.polygons)
        if ratio < 1:
            mod = obj.modifiers.new('far_detail_reduction', 'DECIMATE')
            mod.decimate_type = 'COLLAPSE'
            mod.ratio = ratio; mod.use_collapse_triangulate = True
            bpy.context.view_layer.update()
            graph = bpy.context.evaluated_depsgraph_get()
            old = obj.data
            data = bpy.data.meshes.new_from_object(obj.evaluated_get(graph), depsgraph=graph, preserve_all_data_layers=True)
            obj.modifiers.clear(); obj.data = data
            bpy.data.meshes.remove(old)
        bm = bmesh.new(); bm.from_mesh(obj.data)
        bmesh.ops.triangulate(bm, faces=list(bm.faces))
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        nonmanifold = sum(not edge.is_manifold for edge in bm.edges)
        bm.to_mesh(obj.data); bm.free(); obj.data.update()
        if nonmanifold and not suffix.startswith('foliage_'): raise RuntimeError('Far solid is not closed: ' + obj.name)
        if source.get('behavior') == 'sway' and not obj.data.color_attributes:
            raise RuntimeError('Far wind weights lost')
        if any(n.type == 'TEX_IMAGE' for m in obj.data.materials for n in m.node_tree.nodes) and not obj.data.uv_layers:
            raise RuntimeError('Far UV lost')
        if not len(obj.data.polygons): raise RuntimeError('Empty far mesh')
        normalize_origin(obj)
        bpy.context.view_layer.update()
        near_bounds, far_bounds = bounds(source), bounds(obj)
        error = max(abs(near_bounds[a][i]-far_bounds[a][i]) for a in range(2) for i in range(3))
        if error > .25: raise RuntimeError('Far silhouette bounds moved over 250 mm: ' + obj.name)
        rows.append({'source': source.name, 'far': obj.name, 'nearTriangles': before,
                     'farTriangles': len(obj.data.polygons), 'ratio': ratio,
                     'nonmanifoldEdges': nonmanifold, 'boundErrorMetres': error,
                     'nearBounds': near_bounds, 'farBounds': far_bounds})
    # The working collection stays visible for independent review; assembly is separate.
    for obj in near.children_recursive: obj.hide_set(True)
    for obj in far.children_recursive: obj.hide_set(False)
    scene.camera = bpy.data.objects[camera]
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.region_3d.view_perspective = 'CAMERA'
            area.spaces.active.region_3d.update()
    os.makedirs(OUT + '/components', exist_ok=True)
    with open(OUT + '/components/' + tag + '.json', 'w', encoding='utf8') as stream:
        json.dump({'component': tag, 'rows': rows, 'review': 'native viewport and scene info required before assembly'}, stream, indent=2)
    os.makedirs(OUT + '/checkpoints', exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT + '/checkpoints/' + tag + '.blend', copy=True, check_existing=False)
    bpy.ops.wm.save_as_mainfile(filepath=ROOT + '/art/blender/fengqiao-scene-v02.blend', check_existing=False)
    print(json.dumps(rows))

def assemble():
    active()
    export = bpy.data.collections['glb_scene_v02']
    for tag in SPECS:
        col = bpy.data.collections.get('lod_' + tag.replace('-', '_'))
        if col is None: raise RuntimeError('Missing checked far component: ' + tag)
        for obj in list(col.objects):
            export.objects.link(obj)
            col.objects.unlink(obj)
    for near_name, far_name, _, _ in SPECS.values():
        for obj in bpy.data.objects[near_name].children_recursive: obj.hide_set(False)
        for obj in bpy.data.objects[far_name].children_recursive: obj.hide_set(True)
    bpy.context.scene.camera = bpy.data.objects['CAM_enter']
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D': area.spaces.active.region_3d.update()
    bpy.ops.wm.save_as_mainfile(filepath=ROOT + '/art/blender/fengqiao-scene-v02.blend', check_existing=False)

if __name__ == '__main__':
    action = globals().get('COMPONENT')
    if action == 'initialize': initialize()
    elif action == 'assemble': assemble()
    elif action in SPECS: build(action)
    else: raise RuntimeError('Specify exactly one COMPONENT')
