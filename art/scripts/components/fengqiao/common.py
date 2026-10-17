"""Shared metres, material/UV helpers and component checks; never builds a scene."""
import bpy
import bmesh
import json
import math
import os
import sys
from mathutils import Vector, Matrix, Euler

ROOT = os.environ.get("POETIC_ASSET_ROOT", "D:/University-Competition/Math_Media/PoeticRealm")
SCENE = "fengqiao_modeling_v01"
EXPORT = "glb_scene_v01"
SOURCE = "fengqiao_components_v01"
P = {
    "temple": {"origin": (9, 34, 0), "width": 16.8, "depth": 9.6,
               "bays": 5, "base_top": 1.5, "column_bottom": 1.68,
               "column_top": 5.85, "column_radius": .28,
               "bracket_top": 7.55, "eave": 2.4, "roof_ridge": 10.25},
    "tower": {"origin": (-5.0, 31, 0), "width": 5.4, "depth": 5.4,
              "base_top": 1.5, "column_bottom": 1.68,
              "column_top": 6.3, "column_radius": .24,
              "bracket_top": 7.35, "eave": 1.5, "roof_ridge": 9.1},
    "bridge": {"origin": (-5, 15, 0), "half_span": 6.2,
               "spring": .55, "rise": 2.35, "ring": .46,
               "half_width": 1.9, "deck_top": 3.66},
    "seed": 74219, "water": 0,
}

def active():
    scene = bpy.context.scene
    if scene.name != SCENE or bpy.data.filepath.replace("\\", "/").split("/")[-1] != "fengqiao-scene-v01.blend":
        raise RuntimeError("Only independent scene-v01 may be changed")
    return scene

def component(name, owner):
    scene = active()
    source = bpy.data.collections.get(SOURCE)
    if source is None:
        source = bpy.data.collections.new(SOURCE)
        scene.collection.children.link(source)
    source.hide_viewport = False
    source.hide_render = False
    for previous in source.children:
        previous.hide_viewport = True
        previous.hide_render = True
    if bpy.data.collections.get(name):
        raise RuntimeError("Component already exists; revise this component explicitly: " + name)
    col = bpy.data.collections.new(name)
    source.children.link(col)
    specs = json.loads(scene.get("component_specs", "{}"))
    specs[name] = {"owner": owner, "parameters": P.get(owner, {}), "seed": P["seed"]}
    scene["component_specs"] = json.dumps(specs)
    return col

def get_root(name, origin):
    existing = bpy.data.objects.get(name)
    if existing:
        return existing
    obj = bpy.data.objects.new(name, None)
    bpy.data.collections[EXPORT].objects.link(obj)
    obj.location = origin
    return obj

def material(name):
    result = bpy.data.materials.get(name)
    if not result:
        raise RuntimeError("Material has not been prepared: " + name)
    return result

def column_grid(spec):
    n = spec.get("bays",1)
    xs = [-spec["width"]/2+spec["width"]*i/n for i in range(n+1)]
    grid = [(x,y) for x in xs for y in (-spec["depth"]/2,spec["depth"]/2)]
    if n>1:
        grid += [(x,y) for x in xs[1:-1] for y in (-spec["depth"]/6,spec["depth"]/6)]
    return grid

def solid(name, color, roughness=.8, metallic=0):
    result = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    node = next(n for n in result.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    node.inputs["Base Color"].default_value = (*color, 1)
    node.inputs["Roughness"].default_value = roughness
    node.inputs["Metallic"].default_value = metallic
    result.diffuse_color = (*color, 1)
    return result

class Part:
    def __init__(self, name, col, parent, mat, surface=False):
        self.name, self.col, self.parent, self.mat = name, col, parent, mat
        self.vertices, self.faces, self.uvs, self.weights = [], [], [], []
        self.surface = surface

    def add(self, vertices, faces, uvs=None, weight=0, wood=False):
        offset = len(self.vertices)
        self.vertices.extend(vertices)
        long_axis = max(range(3), key=lambda a: max(v[a] for v in vertices)-min(v[a] for v in vertices))
        for f in faces:
            self.faces.append(tuple(offset+i for i in f))
            if uvs is not None:
                self.uvs.append([uvs[i] for i in f])
            else:
                normal = (Vector(vertices[f[1]])-Vector(vertices[f[0]])).cross(Vector(vertices[f[2]])-Vector(vertices[f[0]]))
                axes = [a for a in range(3) if a != max(range(3), key=lambda a: abs(normal[a]))]
                self.uvs.append([(vertices[i][long_axis]/1.5, .035+vertices[i][axes[1]]*.015) if wood
                                 else (vertices[i][axes[0]]/1.6, vertices[i][axes[1]]/1.6) for i in f])
            self.weights.append([weight(i) if callable(weight) else weight for i in f])

    def box(self, center, size, rotation=None):
        r = rotation or Matrix.Identity(3)
        vertices = [tuple(Vector(center)+r@Vector((x*size[0], y*size[1], z*size[2])))
                    for z in (-.5,.5) for y in (-.5,.5) for x in (-.5,.5)]
        self.add(vertices, [(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)], wood=self.mat.name.startswith("pbr_wood"))

    def tube(self, points, radii, sides=8, weight=0):
        vertices, uvs = [], []
        if isinstance(radii, (float,int)):
            radii = [radii]*len(points)
        distance = 0
        for i, p in enumerate(points):
            tangent = (Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])).normalized()
            ref = Vector((0,0,1)) if abs(tangent.z)<.85 else Vector((0,1,0))
            a = tangent.cross(ref).normalized()
            b = tangent.cross(a).normalized()
            if i:
                distance += (Vector(p)-Vector(points[i-1])).length
            for j in range(sides):
                vertices.append(tuple(Vector(p)+radii[i]*(a*math.cos(j*math.tau/sides)+b*math.sin(j*math.tau/sides))))
                uvs.append((distance/1.5,.025+j/sides*.075))
        faces = [(i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j)
                 for i in range(len(points)-1) for j in range(sides)]
        faces += [tuple(reversed(range(sides))),tuple((len(points)-1)*sides+j for j in range(sides))]
        self.add(vertices,faces,uvs,weight)

    def lathe(self, profile, sides=32):
        vertices = [(r*math.cos(j*math.tau/sides),r*math.sin(j*math.tau/sides),z) for r,z in profile for j in range(sides)]
        faces = [(i*sides+j,i*sides+(j+1)%sides,((i+1)%len(profile))*sides+(j+1)%sides,((i+1)%len(profile))*sides+j)
                 for i in range(len(profile)) for j in range(sides)]
        self.add(vertices,faces)

    def mesh(self, bevel=0):
        data = bpy.data.meshes.new(self.name+"_mesh")
        data.from_pydata(self.vertices, [], self.faces)
        data.update()
        center = Vector(((min(v[0] for v in self.vertices)+max(v[0] for v in self.vertices))/2,
                         (min(v[1] for v in self.vertices)+max(v[1] for v in self.vertices))/2,
                         min(v[2] for v in self.vertices)))
        for v in data.vertices:
            v.co -= center
        obj = bpy.data.objects.new("src_"+self.name, data)
        self.col.objects.link(obj)
        obj.parent = self.parent
        obj.location = center
        data.materials.append(self.mat)
        obj["static"] = True
        uv = data.uv_layers.new(name="UVMap")
        color = data.color_attributes.new(name="mask",type="BYTE_COLOR",domain="CORNER")
        for p in data.polygons:
            for k, li in enumerate(p.loop_indices):
                uv.data[li].uv = self.uvs[p.index][k]
                color.data[li].color = (self.weights[p.index][k], .5, 0, 1)
        if bevel:
            mod = obj.modifiers.new("edge_wear","BEVEL")
            mod.width,mod.segments = bevel,1
        obj["static"] = True
        bm = bmesh.new();bm.from_mesh(data)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        bm.to_mesh(data);bm.free();data.update()
        return obj

def verify(col, expected=None, open_surfaces=()):
    active()
    rows = []
    for obj in col.objects:
        if obj.type != "MESH":
            continue
        if any(abs(v-1)>1e-6 for v in obj.scale):
            raise RuntimeError("Unapplied scale: "+obj.name)
        if any(not math.isfinite(c) for v in obj.data.vertices for c in v.co):
            raise RuntimeError("Non-finite vertex")
        if not obj.data.uv_layers or not obj.data.materials:
            raise RuntimeError("Missing material or UV")
        bm = bmesh.new();bm.from_mesh(obj.data)
        nonmanifold = sum(not e.is_manifold for e in bm.edges)
        bm.free()
        if nonmanifold and obj.name not in open_surfaces:
            raise RuntimeError("Component not closed: "+obj.name+" "+str(nonmanifold))
        rows.append({"object":obj.name,"vertices":len(obj.data.vertices),"triangles":sum(len(p.vertices)-2 for p in obj.data.polygons),"nonmanifoldEdges":nonmanifold})
    if expected:
        expected()
    report = {"component":col.name,"scene":bpy.context.scene.name,"waterLevel":0,"objects":rows,"checks":"finite geometry, unit scale, material, UV and closed solids; explicitly registered thin leaf surfaces may be open"}
    path = ROOT+"/output/fengqiao-scene-v01/components/"+col.name+".json"
    os.makedirs(os.path.dirname(path),exist_ok=True)
    with open(path,"w",encoding="utf8") as f:
        json.dump(report,f,ensure_ascii=False,indent=2)
    print(json.dumps(report,ensure_ascii=False))

def checkpoint(tag, camera=None):
    scene = active()
    bpy.context.view_layer.update()
    if camera:
        scene.camera = bpy.data.objects[camera]
    for area in (bpy.context.screen.areas if bpy.context.screen else []):
        if area.type == "VIEW_3D":
            area.spaces.active.region_3d.view_perspective = "CAMERA"
            if 'prototypes' in tag:
                visible=[o for col in bpy.data.collections[SOURCE].children if not col.hide_viewport for o in col.objects if o.type=='MESH']
                points=[o.matrix_world@Vector(v) for o in visible for v in o.bound_box]
                if points:
                    lower=Vector(tuple(min(p[i] for p in points) for i in range(3)));upper=Vector(tuple(max(p[i] for p in points) for i in range(3)))
                    region=area.spaces.active.region_3d;region.view_perspective='PERSP'
                    region.view_location=(lower+upper)/2;region.view_distance=max(4,(upper-lower).length*1.3)
                    region.view_rotation=Euler((math.radians(64),0,math.radians(25))).to_quaternion()
    for area in (bpy.context.screen.areas if bpy.context.screen else []):
        if area.type == 'VIEW_3D': area.spaces.active.region_3d.update()
    path = ROOT+"/output/fengqiao-scene-v01/checkpoints/"+tag+".blend"
    os.makedirs(os.path.dirname(path),exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=path,copy=True,check_existing=False)
    bpy.ops.wm.save_as_mainfile(filepath=ROOT+"/art/blender/fengqiao-scene-v01.blend",check_existing=False)

def publish(collection_names):
    """Copy and join only checked components; no new geometry is generated here."""
    active()
    export = bpy.data.collections[EXPORT]
    bpy.data.collections[SOURCE].hide_viewport = False
    for name in collection_names: bpy.data.collections[name].hide_viewport = False
    bpy.context.view_layer.update()
    buckets = {}
    graph = bpy.context.evaluated_depsgraph_get()
    for name in collection_names:
        col = bpy.data.collections.get(name)
        if not col:
            raise RuntimeError("Missing checked component: "+name)
        for src in col.objects:
            if src.type != "MESH":
                continue
            data = bpy.data.meshes.new_from_object(src.evaluated_get(graph),depsgraph=graph,preserve_all_data_layers=True)
            obj = bpy.data.objects.new(src.name.removeprefix("src_"),data)
            export.objects.link(obj)
            obj.parent = src.parent
            obj.matrix_parent_inverse = src.matrix_parent_inverse.copy()
            obj.matrix_basis = src.matrix_basis.copy()
            obj["static"] = True
            if src.get('behavior')=='sway':
                obj['static']=False
                for key in ('behavior','amp','freq','phase'): obj[key]=src[key]
            buckets.setdefault((obj.parent.name,obj.data.materials[0].name),[]).append(obj)
    for (parent,mat),objects in buckets.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects)>1:
            bpy.ops.object.join()
        obj = objects[0]
        obj.name = parent+"_"+mat.replace("pbr_","").replace("__","_")
        vertices = [v.co for v in obj.data.vertices]
        center = Vector(((min(v.x for v in vertices)+max(v.x for v in vertices))/2,
                         (min(v.y for v in vertices)+max(v.y for v in vertices))/2,min(v.z for v in vertices)))
        for v in obj.data.vertices:
            v.co -= center
        obj.location += obj.rotation_euler.to_matrix()@center
        bm = bmesh.new();bm.from_mesh(obj.data)
        bmesh.ops.triangulate(bm,faces=list(bm.faces))
        bm.to_mesh(obj.data);bm.free();obj.data.update()
        # Only cloth/foliage require behavior colors. Static architecture must
        # not carry unused per-corner streams that multiply tile vertices.
        base=mat.split('__')[0]
        if base not in ('pbr_foliage','pbr_cloth','ink_foliage','ink_cloth') and obj.get('behavior')!='sway':
            for attribute in list(obj.data.color_attributes): obj.data.color_attributes.remove(attribute)
        if not any(n.type=='TEX_IMAGE' for n in obj.data.materials[0].node_tree.nodes):
            for uv in list(obj.data.uv_layers): obj.data.uv_layers.remove(uv)
    bpy.data.collections[SOURCE].hide_viewport = True
    bpy.data.collections[SOURCE].hide_render = True
    bpy.context.view_layer.update()
    return [o.name for o in export.objects]
