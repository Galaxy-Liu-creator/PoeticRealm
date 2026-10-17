"""Jiangxue component utilities. No geometry is built by importing this module."""
import bpy, bmesh, json, math, os, sys
from mathutils import Vector, Matrix

ROOT = os.environ.get('POETIC_ASSET_ROOT', 'D:/University-Competition/Math_Media/PoeticRealm')
SCENE = 'jiangxue_modeling_v01'
SOURCE = 'jiangxue_components_v01'
EXPORT = 'glb_scene_v01'
OUTPUT = ROOT + '/output/jiangxue-model-v01'
MAIN = ROOT + '/art/blender/jiangxue-scene-v01.blend'
P = {'seed': 31027, 'water': 0., 'boat': (4., -2., 0.), 'boat_angle': .20,
     'bank': (23., 24., 0.), 'tree': (22., 18., 2.2), 'terrain_size': 600.,
     'fisherman_height': 1.70, 'rod_length': 3.2}

def active():
    if bpy.context.scene.name != SCENE or bpy.data.filepath.replace('\\', '/') != MAIN:
        raise RuntimeError('Only the independent saved Jiangxue v01 may be modified')
    return bpy.context.scene

def component(name, dependencies=()):
    scene = active()
    checks = json.loads(scene.get('component_checks', '{}'))
    for dependency in dependencies:
        if dependency not in checks: raise RuntimeError('Unchecked dependency: ' + dependency)
    if bpy.data.collections.get(name): raise RuntimeError('Component exists; explicitly revise it: ' + name)
    col = bpy.data.collections.new(name)
    bpy.data.collections[SOURCE].children.link(col)
    return col

def root(name, location=(0, 0, 0), dynamic=False):
    obj = bpy.data.objects.get(name)
    if obj is None:
        obj = bpy.data.objects.new(name, None); bpy.data.collections[EXPORT].objects.link(obj)
        obj.location = location; obj['static'] = not dynamic
    return obj

def solid(name, color, roughness=.88):
    if '__' in name:
        role, label = name.split('__', 1); name = role + '__' + label.replace('_', '')
    obj = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    obj.use_nodes = True
    node = next(n for n in obj.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    node.inputs['Base Color'].default_value = (*color, 1)
    node.inputs['Metallic'].default_value = 0
    node.inputs['Roughness'].default_value = roughness
    obj.diffuse_color = (*color, 1)
    return obj

def textured(name, filenames, roughness=.9):
    if '__' in name:
        role, label = name.split('__', 1); name = role + '__' + label.replace('_', '')
    if bpy.data.materials.get(name): return bpy.data.materials[name]
    mat = solid(name, (1, 1, 1), roughness)
    shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    for socket, filename in zip(('Base Color', 'Normal', 'Roughness'), filenames):
        img = bpy.data.images.load(filename, check_existing=True)
        texture = mat.node_tree.nodes.new('ShaderNodeTexImage'); texture.image = img
        if socket != 'Base Color': img.colorspace_settings.name = 'Non-Color'
        if socket == 'Normal':
            node = mat.node_tree.nodes.new('ShaderNodeNormalMap'); node.inputs['Strength'].default_value = .5
            mat.node_tree.links.new(texture.outputs['Color'], node.inputs['Color'])
            mat.node_tree.links.new(node.outputs['Normal'], shader.inputs['Normal'])
        else: mat.node_tree.links.new(texture.outputs['Color'], shader.inputs[socket])
    return mat

def mesh(name, vertices, faces, col, material, parent=None, smooth=True, uvs=None, dynamic=False):
    data = bpy.data.meshes.new(name + '_mesh'); data.from_pydata(vertices, [], faces); data.update()
    center = Vector(((min(v.co.x for v in data.vertices)+max(v.co.x for v in data.vertices))/2,
                     (min(v.co.y for v in data.vertices)+max(v.co.y for v in data.vertices))/2,
                     min(v.co.z for v in data.vertices)))
    for v in data.vertices: v.co -= center
    obj = bpy.data.objects.new('src_' + name, data); col.objects.link(obj)
    obj.location = center; obj.parent = parent; obj['static'] = not dynamic
    data.materials.append(material)
    bm = bmesh.new(); bm.from_mesh(data); bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(data); bm.free(); data.update()
    uv = data.uv_layers.new(name='UVMap')
    for poly in data.polygons:
        poly.use_smooth = smooth
        axes = [a for a in range(3) if a != max(range(3), key=lambda a: abs(poly.normal[a]))]
        for i, li in enumerate(poly.loop_indices):
            v = data.vertices[data.loops[li].vertex_index].co + center
            uv.data[li].uv = uvs[poly.index][i] if uvs else (v[axes[0]]/1.8, v[axes[1]]/1.8)
    if material.name.split('__')[0] in ('pbr_cloth', 'pbr_foliage'):
        mask = data.color_attributes.new(name='mask', type='BYTE_COLOR', domain='CORNER')
        for c in mask.data: c.color = (0, .5, 0, 1)
    return obj

class Shape:
    def __init__(self): self.vertices, self.faces = [], []
    def add(self, vertices, faces):
        offset = len(self.vertices); self.vertices.extend(vertices)
        self.faces.extend(tuple(offset+i for i in f) for f in faces)
    def tube(self, points, radii, sides=10, aspect=1):
        vertices = []
        for i, p in enumerate(points):
            axis = (Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])).normalized()
            guide = Vector((0,0,1)) if abs(axis.z)<.9 else Vector((0,1,0))
            a = axis.cross(guide).normalized(); b = axis.cross(a).normalized()
            radius = radii[i] if isinstance(radii, (list,tuple)) else radii
            for j in range(sides):
                t = math.tau*j/sides
                vertices.append(tuple(Vector(p)+radius*(a*math.cos(t)+b*math.sin(t)*aspect)))
        faces = [(i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j)
                 for i in range(len(points)-1) for j in range(sides)]
        faces += [tuple(reversed(range(sides))), tuple((len(points)-1)*sides+j for j in range(sides))]
        self.add(vertices, faces)
    def box(self, center, size):
        vertices = [(center[0]+x*size[0],center[1]+y*size[1],center[2]+z*size[2])
                    for z in (-.5,.5) for y in (-.5,.5) for x in (-.5,.5)]
        self.add(vertices,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)])
    def finish(self, name, col, material, parent=None, **kwargs):
        return mesh(name, self.vertices, self.faces, col, material, parent, **kwargs)

def finish(col, open_surfaces=(), extra=None):
    scene = active(); bpy.context.view_layer.update(); rows = []
    for obj in col.objects:
        if obj.type != 'MESH': continue
        bm = bmesh.new(); bm.from_mesh(obj.data)
        invalid = sum(not edge.is_manifold for edge in bm.edges)
        if invalid and obj.name not in open_surfaces: raise RuntimeError('Open component: '+obj.name+' '+str(invalid))
        if any(not math.isfinite(c) for v in bm.verts for c in v.co): raise RuntimeError('Non-finite geometry')
        if any(abs(v-1)>1e-6 for v in obj.scale): raise RuntimeError('Unapplied scale')
        bm.free()
        rows.append({'object':obj.name,'vertices':len(obj.data.vertices),
                     'triangles':sum(len(p.vertices)-2 for p in obj.data.polygons),'nonmanifoldEdges':invalid})
    report = {'component':col.name,'scene':scene.name,'objects':rows,'parameters':P,'extra':extra or {}}
    os.makedirs(OUTPUT+'/components',exist_ok=True)
    with open(OUTPUT+'/components/'+col.name+'.json','w',encoding='utf8') as f: json.dump(report,f,ensure_ascii=False,indent=2)
    checks = json.loads(scene.get('component_checks','{}')); checks[col.name] = report
    scene['component_checks'] = json.dumps(checks)
    bpy.data.libraries.write(ROOT+'/art/blender/components/jiangxue/'+col.name+'.blend', {col}, fake_user=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUTPUT+'/checkpoints/'+col.name+'.blend',copy=True,check_existing=False)
    bpy.ops.wm.save_as_mainfile(filepath=MAIN,check_existing=False)
    print(json.dumps(report,ensure_ascii=False))

def view(camera='CAM_enter'):
    scene = active(); scene.camera = bpy.data.objects[camera]
    for area in bpy.context.screen.areas if bpy.context.screen else []:
        if area.type == 'VIEW_3D':
            area.spaces.active.region_3d.view_perspective = 'CAMERA'
            area.spaces.active.shading.type = 'MATERIAL'
            area.spaces.active.region_3d.update()

def publish(col, dynamic=False):
    """Copy checked meshes, or move a checked skin hierarchy from its saved source library."""
    if col.name not in json.loads(active().get('component_checks','{}')): raise RuntimeError('Unchecked component')
    export = bpy.data.collections[EXPORT]
    if dynamic:
        for obj in list(col.objects):
            obj.name = obj.name.removeprefix('src_'); export.objects.link(obj); col.objects.unlink(obj)
    else:
        graph = bpy.context.evaluated_depsgraph_get()
        for src in col.objects:
            if src.type != 'MESH' or src.hide_render: continue
            data = bpy.data.meshes.new_from_object(src.evaluated_get(graph),depsgraph=graph,preserve_all_data_layers=True)
            obj = bpy.data.objects.new(src.name.removeprefix('src_'),data); export.objects.link(obj)
            obj.parent = src.parent; obj.matrix_basis = src.matrix_basis.copy()
            for key in ('static','behavior','amp','freq','phase'):
                if key in src: obj[key] = src[key]
    col.hide_viewport = True; col.hide_render = True
