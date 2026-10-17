"""v04: close the physical hull and carry the working oar over the side gunwale.
Run in the saved v03 scene; retain its skin bind pose and all historical files.
"""
import bpy, bmesh, math, json, os, sys, importlib
from mathutils import Vector
ROOT = os.environ.get('POETIC_ASSET_ROOT', 'D:/University-Competition/Math_Media/PoeticRealm')
scene = bpy.context.scene
assert scene.name == 'fengqiao_quality_v03', 'Start from saved v03'
col = bpy.data.collections['glb_sample_v03']
boat = bpy.data.objects['boat_guest']
oar = bpy.data.objects['oar_pivot']
wood = bpy.data.materials['pbr_wood__aged']
reed = bpy.data.materials['pbr_cloth__reed']
old_pivot = oar.location.copy()
contact_points = {name: old_pivot + bpy.data.objects[name].location for name in
                  ('ANCHOR_oar_hand_left', 'ANCHOR_oar_hand_right', 'ANCHOR_oar_tether')}
scene.name = 'fengqiao_quality_v04'; col.name = 'glb_sample_v04'
created = []

def mesh(label, points, faces, material=wood, parent=boat):
    data = bpy.data.meshes.new(label + '_mesh')
    data.from_pydata(points, [], faces); data.update()
    obj = bpy.data.objects.new(label, data); col.objects.link(obj)
    obj.parent = parent; obj['static'] = False; data.materials.append(material)
    created.append(obj)
    return obj

def triangulate(obj):
    bm = bmesh.new(); bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    bm.to_mesh(obj.data); bm.free(); obj.data.update()

def finish(obj):
    triangulate(obj)
    uv = obj.data.uv_layers.new(name='UVMap')
    for poly in obj.data.polygons:
        axes = [k for k in range(3) if k != max(range(3), key=lambda j: abs(poly.normal[j]))]
        for li in poly.loop_indices:
            p = obj.data.vertices[obj.data.loops[li].vertex_index].co
            uv.data[li].uv = (p[axes[0]] / 1.5, .018 + .072 * p[axes[1]] / 1.5)
    mask = obj.data.color_attributes.new(name='mask', type='BYTE_COLOR', domain='CORNER')
    for item in mask.data: item.color = (0, .5, 0, 1)
    points = [v.co for v in obj.data.vertices]
    center = Vector(((min(v.x for v in points)+max(v.x for v in points))/2,
                     (min(v.y for v in points)+max(v.y for v in points))/2, min(v.z for v in points)))
    for vertex in obj.data.vertices: vertex.co -= center
    obj.location = center

# Continuous substrate behind the existing planks: sides, bottom and both transoms.
# Solidify closes the material volume around the open passenger cavity, including its rim.
profile = [(-1,1.02),(-.92,.70),(-.68,.28),(-.35,.08),(0,.03),(.35,.08),(.68,.28),(.92,.70),(1,1.02)]
stations = 33
points = []
for i in range(stations):
    x = -3.226 + 6.562 * i / (stations-1)
    width = .91 * max(.04, 1-(x/3.50)**2)**.48
    for y,z in profile:
        points.append((x, y*width*.972, z+.25*(abs(x)/3.4)**3+.017))
faces = [(i*9+j, i*9+j+1, (i+1)*9+j+1, (i+1)*9+j)
         for i in range(stations-1) for j in range(8)]
faces += [tuple(reversed(range(9))), tuple((stations-1)*9+j for j in range(9))]
hull = mesh('boat_hull_closed', points, faces)
bm = bmesh.new(); bm.from_mesh(hull.data)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); bm.to_mesh(hull.data); bm.free()
bpy.ops.object.select_all(action='DESELECT'); hull.select_set(True); bpy.context.view_layer.objects.active = hull
thickness = hull.modifiers.new('continuous_plank_thickness', 'SOLIDIFY')
thickness.thickness = .042; thickness.offset = -1; thickness.use_even_offset = True
bpy.ops.object.modifier_apply(modifier=thickness.name)
finish(hull)
bm = bmesh.new(); bm.from_mesh(hull.data)
bad_edges = sum(not e.is_manifold for e in bm.edges)
assert bad_edges == 0, 'Hull material volume has open/nonmanifold edges: ' + str(bad_edges)
bm.free()

# Side-mounted support above the port gunwale; the blade works beside the boat.
# Preserve boat-local hand and rope contact points; the anatomical bind pose remains valid.
pivot = Vector((-2.80, -.61, 1.38))
axis = Vector((-.10, -1, -.95)).normalized()
oar.location = pivot
for name, point in contact_points.items(): bpy.data.objects[name].location = point-pivot
bpy.data.objects['ANCHOR_oar_blade'].location = axis*2.23
for name in ('rowing_oar_shaft','rowing_oar_handle','rowing_oar_blade','rowing_oar_binding','rowing_oar_pin'):
    obj = bpy.data.objects[name]; bpy.data.objects.remove(obj, do_unlink=True)

def tube(label, centers, radii, material=wood, parent=oar, sides=24, blade=False):
    verts = []
    for i, center in enumerate(centers):
        tangent = (centers[min(i+1,len(centers)-1)]-centers[max(0,i-1)]).normalized()
        reference = Vector((0,1,0)) if abs(tangent.z) > .9 else Vector((0,0,1))
        transverse = tangent.cross(reference).normalized()
        normal = tangent.cross(transverse).normalized()
        rx,ry = radii[i]
        for j in range(sides):
            a = j*math.tau/sides
            verts.append(tuple(center+transverse*rx*math.cos(a)+normal*ry*math.sin(a)))
    fs = [(k*sides+j,k*sides+(j+1)%sides,(k+1)*sides+(j+1)%sides,(k+1)*sides+j)
          for k in range(len(centers)-1) for j in range(sides)]
    fs += [tuple(reversed(range(sides))),tuple((len(centers)-1)*sides+j for j in range(sides))]
    obj = mesh(label, verts, fs, material, parent)
    for poly in obj.data.polygons: poly.use_smooth = True
    finish(obj); return obj

tube('rowing_oar_shaft', [axis*d for d in (0,.4,.8,1.2,1.6)], [(r,r) for r in (.034,.034,.035,.035,.040)])
tube('rowing_oar_blade', [axis*d for d in (1.42,1.6,1.86,2.16,2.4,2.47)],
     [(.043,.025),(.084,.021),(.117,.017),(.114,.015),(.084,.012),(.016,.008)])
left = contact_points['ANCHOR_oar_hand_left']-pivot
right = contact_points['ANCHOR_oar_hand_right']-pivot
grip_direction = (right-left).normalized()
centers = [Vector(), left*.28+Vector((0,.01,.065)), left*.62+Vector((0,0,.025)), left, right, right+grip_direction*.13]
tube('rowing_oar_handle', centers, [(r,r) for r in (.037,.037,.033,.029,.027,.024)])
binding_center = centers[1]
binding_direction = (centers[2]-centers[0]).normalized()
tube('rowing_oar_binding', [binding_center+binding_direction*d for d in (-.045,-.03,-.015,0,.015,.03,.045)],
     [(.040,.040)]*7, reed)
post = [Vector((pivot.x,pivot.y,z)) for z in (1.16,1.25,1.34,1.385)]
tube('rowing_oar_pin', post, [(.050,.050),(.048,.048),(.042,.042),(.017,.017)], parent=boat)

# Side view includes the sealed stern, gunwale support and full outboard shaft.
cam = bpy.data.objects['CAM_rower']
cam.location = boat.location+Vector((-4.5,-4.7,2.7))
target = boat.location+Vector((-2.4,-.25,1.05))
cam.rotation_euler = (target-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens = 34
bpy.context.view_layer.update()
sys.path.insert(0, ROOT+'/art/scripts')
import contract, validate, export_glb
for module in (contract, validate, export_glb): importlib.reload(module)
report = validate.validate(); assert not report.errors, report.errors
os.makedirs(ROOT+'/output/fengqiao-boat-v04', exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/art/blender/fengqiao-sample-v04.blend')
path = export_glb.export_collection(col, ROOT+'/frontend/public/assets/models/fengqiao')
result = {'scene':scene.name,'source':bpy.data.filepath,'model':path,'errors':report.errors,'warnings':report.warnings,
          'objects':len(col.objects),'bones':len(bpy.data.objects['rower_rig'].data.bones),
          'triangles':sum(len(o.data.polygons) for o in col.objects if o.type=='MESH'),
          'hullNonmanifoldEdges':bad_edges,'pivot':list(pivot),'shaftAxis':list(axis),
          'method':'closed transoms and thick continuous hull; port-side support above gunwale; original hand bind contacts retained'}
with open(ROOT+'/output/fengqiao-boat-v04/blender-validation.json','w',encoding='utf8') as f: json.dump(result,f,ensure_ascii=False,indent=2)
print(json.dumps(result, ensure_ascii=False))
