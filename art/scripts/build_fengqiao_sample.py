"""枫桥四元素小样：参数化舟构造与石岸，保留原场景。
初次在 MCP 创建 fengqiao_quality_v01、导入 Poly Haven wood_planks/rock_01 后执行。
再制作时可在 Blender --python 中执行；已存图像位于 art/textures/fengqiao-v01。
"""
import bpy, math, random, os, json
import numpy as np
from mathutils import Vector
ROOT = os.environ.get("POETIC_ASSET_ROOT", "D:/University-Competition/Math_Media/PoeticRealm")
TEXTURES = ROOT + "/art/textures/fengqiao-v01"
SCENE_NAME = "fengqiao_quality_v01"
rng = random.Random(220916)
scene = bpy.data.scenes.get(SCENE_NAME)
if scene is None:
    scene = bpy.data.scenes.new(SCENE_NAME)
bpy.context.window.scene = scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1
scene.render.fps = 30
scene["contractVersion"] = "0.2"
col = bpy.data.collections.get("glb_sample_v01")
if col is None:
    col = bpy.data.collections.new("glb_sample_v01")
    scene.collection.children.link(col)
assert not list(col.objects), "保留已有小样；新修订请使用新场景/文件，不隐式清空"
preview = bpy.data.collections.new("sample_preview")
scene.collection.children.link(preview)
os.makedirs(TEXTURES, exist_ok=True)

def pbr(source, name, wet=False, crop_reed=False):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    shader = next(n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    shader.inputs["Metallic"].default_value = 0
    imported = bpy.data.materials.get(source)
    images = {}
    for channel in ("Diffuse", "Rough", "nor_gl"):
        source_image = next((n.image for n in imported.node_tree.nodes
                             if n.type == "TEX_IMAGE" and n.image and n.image.name.endswith(channel)), None) if imported else None
        filename = TEXTURES + "/" + source + "_" + channel + ".png"
        if source_image is None:
            source_image = bpy.data.images.load(filename, check_existing=False)
        source_image.colorspace_settings.name = "sRGB" if channel == "Diffuse" else "Non-Color"
        # A copy inherits stale packed bytes. Build an independent 8-bit image from pixels.
        pixels = np.empty(len(source_image.pixels), dtype=np.float32)
        source_image.pixels.foreach_get(pixels)
        width, height = source_image.size
        if crop_reed and imported:
            # Extract straw only, excluding the decorative bands of the source mat.
            pixels = pixels.reshape((height,width,4))[160:928,512:1280,:].copy().ravel()
            width = height = 768
        image = bpy.data.images.new(source + "_" + channel + "_sample", width=width, height=height, alpha=False, float_buffer=False)
        image.colorspace_settings.name = "sRGB" if channel == "Diffuse" else "Non-Color"
        image.pixels.foreach_set(pixels)
        image.scale(512 if crop_reed else 1024, 512 if crop_reed else 1024)
        image.filepath_raw = filename
        image.file_format = "PNG"
        image.save()
        if wet and channel in ("Diffuse", "Rough"):
            if image.packed_file:
                image.unpack(method="REMOVE")
            image.name = source + "_" + channel + "_wet"
            pixels = np.empty(len(image.pixels), dtype=np.float32)
            image.pixels.foreach_get(pixels)
            pixels = pixels.reshape((-1, 4))
            if channel == "Rough":
                pixels[:, :3] = np.clip(pixels[:, :3] * .34, .13, .30)
            else:
                pixels[:, :3] *= .58
            image.pixels.foreach_set(pixels.ravel())
            image.filepath_raw = TEXTURES + "/" + source + "_" + channel + "_wet.png"
            image.file_format = "PNG"
            image.save()
        if channel == "Diffuse":
            # Retain PNG source; publish photographic BaseColor as JPEG. Data maps stay lossless.
            if source == "wood_planks":
                pixels = np.empty(len(image.pixels), dtype=np.float32)
                image.pixels.foreach_get(pixels)
                pixels = pixels.reshape((-1,4))
                pixels[:,:3] = np.clip(pixels[:,:3]*1.8,0,1)
                image.pixels.foreach_set(pixels.ravel())
            image.filepath_raw = image.filepath_raw[:-4] + ".jpg"
            image.file_format = "JPEG"
            image.save()
        image.pack()
        tex = material.node_tree.nodes.new("ShaderNodeTexImage")
        tex.image = image
        images[channel] = tex
    material.node_tree.links.new(images["Diffuse"].outputs["Color"], shader.inputs["Base Color"])
    material.node_tree.links.new(images["Rough"].outputs["Color"], shader.inputs["Roughness"])
    normal = material.node_tree.nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = .7
    material.node_tree.links.new(images["nor_gl"].outputs["Color"], normal.inputs["Color"])
    material.node_tree.links.new(normal.outputs["Normal"], shader.inputs["Normal"])
    return material

def solid(name, color, rough=.65, metal=0, emission=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    s = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    s.inputs["Base Color"].default_value = (*color, 1)
    s.inputs["Roughness"].default_value = rough
    s.inputs["Metallic"].default_value = metal
    if emission:
        s.inputs["Emission Color"].default_value = (*color, 1)
        s.inputs["Emission Strength"].default_value = emission
    return m

wood = pbr("wood_planks", "pbr_wood__aged")
stone = pbr("rock_01", "pbr_stone__dry")
wetstone = pbr("rock_01", "pbr_stone__wet", True)
iron = solid("pbr_metal__iron", (.075,.067,.05), .42,.75)
reed = pbr("tatami_mat", "pbr_cloth__reed", crop_reed=True)
firemat = solid("glow__fire", (1,.29,.045), .35,0,4)

def mesh(name, vertices, faces, material, parent=None, collection=None, wood_uv=False):
    data = bpy.data.meshes.new(name + "_mesh")
    data.from_pydata(vertices, [], faces)
    data.update()
    center = Vector(((min(v[0] for v in vertices)+max(v[0] for v in vertices))/2,
                     (min(v[1] for v in vertices)+max(v[1] for v in vertices))/2,
                     min(v[2] for v in vertices)))
    for v in data.vertices:
        v.co -= center
    obj = bpy.data.objects.new(name,data)
    (collection or col).objects.link(obj)
    obj.parent = parent
    obj.location = center
    data.materials.append(material)
    obj["static"] = parent is None
    uv = data.uv_layers.new(name="UVMap")
    long_axis = max(range(3), key=lambda i:max(v[i] for v in vertices)-min(v[i] for v in vertices))
    cross_axis = max((i for i in range(3) if i != long_axis), key=lambda i:max(v[i] for v in vertices)-min(v[i] for v in vertices))
    cross_min = min(v[cross_axis] for v in vertices)
    cross_span = max(v[cross_axis] for v in vertices) - cross_min
    for poly in data.polygons:
        normal = poly.normal
        axis = max(range(3),key=lambda i:abs(normal[i]))
        axes = [i for i in range(3) if i!=axis]
        for li in poly.loop_indices:
            v = data.vertices[data.loops[li].vertex_index].co + center
            # A narrow strip avoids photographed plank seams; grain runs lengthwise.
            uv.data[li].uv = (v[long_axis]/1.5, .018+.072*(v[cross_axis]-cross_min)/max(cross_span,1e-6)) if wood_uv else (v[axes[0]]/1.5,v[axes[1]]/1.5)
    weights = data.color_attributes.new(name="mask", type="BYTE_COLOR",domain="CORNER")
    for item in weights.data:
        item.color = (0,.5,0,1)
    return obj

def bevel(obj,width=.018,segments=2):
    mod = obj.modifiers.new("edge_wear","BEVEL")
    mod.width = width
    mod.segments = segments

def box(name,center,size,material,parent=None,weather=False):
    verts=[]
    for z in (-.5,.5):
        for y in (-.5,.5):
            for x in (-.5,.5):
                p=[center[0]+x*size[0],center[1]+y*size[1],center[2]+z*size[2]]
                if weather:
                    p=[v+rng.uniform(-.055,.055) for v in p]
                verts.append(tuple(p))
    faces=[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)]
    o=mesh(name,verts,faces,material,parent,wood_uv=material==wood)
    bevel(o,.055 if weather else .012,2)
    return o

def empty(name,position,parent=None,props=None):
    o=bpy.data.objects.new(name,None)
    col.objects.link(o)
    o.parent=parent
    o.location=position
    for k,v in (props or {}).items(): o[k]=v
    return o

def tube(name,points,radius,material,parent=None,sides=8):
    vertices=[]
    for i,p in enumerate(points):
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        tangent.normalize()
        ref=Vector((0,0,1)) if abs(tangent.z)<.9 else Vector((0,1,0))
        a=tangent.cross(ref).normalized()
        b=tangent.cross(a).normalized()
        for j in range(sides):
            vertices.append(tuple(Vector(p)+radius*(a*math.cos(j*math.tau/sides)+b*math.sin(j*math.tau/sides))))
    faces=[]
    for i in range(len(points)-1):
        for j in range(sides):
            faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    faces.extend([tuple(reversed(range(sides))),tuple((len(points)-1)*sides+j for j in range(sides))])
    return mesh(name,vertices,faces,material,parent,wood_uv=material==wood)

boat=empty("boat_guest",(.4,.8,-.30),props={"behavior":"bob","amp":.025,"freq":.23,"phase":.19,"static":False})
stations=25
profile=[(-1,1.02),(-.92,.70),(-.68,.28),(-.35,.08),(0,.03),(.35,.08),(.68,.28),(.92,.70),(1,1.02)]
def section(x,j):
    width=.91 * max(.04,1-(x/3.50)**2)**.48
    return (x,profile[j][0]*width,profile[j][1]+.25*(abs(x)/3.4)**3)
for band in range(8):
    verts=[]
    for i in range(stations):
        x=-3.22+6.55*i/(stations-1)
        a,b=section(x,band),section(x,band+1)
        verts.extend([(a[0],a[1]*.997,a[2]+.003),(b[0],b[1]*.997,b[2]-.003)])
    faces=[(2*i,2*i+1,2*i+3,2*i+2) for i in range(stations-1)]
    panel=mesh("hull_plank_%02d"%band,verts,faces,wood,boat,wood_uv=True)
    solidify=panel.modifiers.new("plank_thickness","SOLIDIFY")
    solidify.thickness=.044
    bevel(panel,.007,2)
for side in (-1,1):
    points=[section(-3.22+6.55*i/24,0 if side<0 else 8) for i in range(25)]
    tube("gunwale_port" if side<0 else "gunwale_starboard",points,.049,wood,boat)
for end,x in enumerate((-3.22,3.33)):
    tube("stem_%02d"%end,[section(x,j) for j in range(9)],.038,wood,boat)
for i,x in enumerate((-2.4,-1.5,-.6,.3,1.2,2.1)):
    tube("frame_rib_%02d"%i,[(v[0],v[1]*.94,v[2]+.048) for v in [section(x,j) for j in range(9)]],.037,wood,boat)
for i,x in enumerate((-1.8,.25,1.6)):
    width=abs(section(x,8)[1])*1.85
    box("thwart_%02d"%i,(x,0,.88),(.26,width,.065),wood,boat)
for i,y in enumerate((-.37,-.18,.01,.20,.39)):
    box("floorboard_%02d"%i,(-.25,y,.35),(4.65,.165,.046),wood,boat)
# Bent reed hoops and a shell of narrow longitudinal woven strips.
for i,x in enumerate((-1.95,-.82,.35)):
    points=[(x,.78*math.cos(a),1.02+.95*math.sin(a)) for a in np.linspace(0,math.pi,19)]
    tube("canopy_hoop_%02d"%i,points,.035,wood,boat)
for i in range(24):
    a0=math.pi*(i+.04)/24
    a1=math.pi*(i+.96)/24
    points=[(-2.10,.80*math.cos(a0),1.02+.98*math.sin(a0)),
            (.50,.80*math.cos(a0),1.02+.98*math.sin(a0)),
            (.50,.80*math.cos(a1),1.02+.98*math.sin(a1)),
            (-2.10,.80*math.cos(a1),1.02+.98*math.sin(a1))]
    panel=mesh("reed_canopy_%02d"%i,points,[(0,1,2,3)],reed,boat)
    for poly in panel.data.polygons:
        for li in poly.loop_indices:
            point = panel.data.vertices[panel.data.loops[li].vertex_index].co + panel.location
            angle = math.atan2((point.z-1.02)/.98, point.y/.80)
            panel.data.uv_layers.active.data[li].uv = ((point.x+2.10)/.675, angle*.98/.675)
    mod=panel.modifiers.new("reed_shell","SOLIDIFY"); mod.thickness=.012
# Oil fire basket, handle, mooring eye, paddle and rope.
for i,z in enumerate((.94,1.02,1.10)):
    tube("brazier_ring_%02d"%i,[(2.2+.12*math.cos(a),.12*math.sin(a),z) for a in np.linspace(0,math.tau,17)],.012,iron,boat)
for i in range(8):
    a=i*math.tau/8
    tube("brazier_bar_%02d"%i,[(2.2+.12*math.cos(a),.12*math.sin(a),.94),(2.2+.12*math.cos(a),.12*math.sin(a),1.12)],.009,iron,boat)
box("fire_pedestal",(2.2,0,.80),(.25,.23,.045),wood,boat)
tube("paddle_shaft",[(-2.8,-.96,1.05),(1.4,-.96,1.12)],.029,wood,boat)
box("paddle_blade",(-2.85,-.96,1.05),(.60,.20,.045),wood,boat)
tube("mooring_rope",[(2.8,-.30,.97),(2.2,-.85,.90),(1,-1.2,.59),(-.4,-1.42,.35),(-1.60,-1.35,.57)],.023,reed,boat)
flameverts=[]
for z,r in ((1.03,.065),(1.13,.085),(1.26,.035),(1.38,.002)):
    for i in range(9):
        a=i*math.tau/9
        flameverts.append((2.2+r*math.cos(a)+.015*math.sin(z*16),r*math.sin(a),z))
flame=mesh("fishfire_flame",flameverts,[(9*k+i,9*k+(i+1)%9,9*(k+1)+(i+1)%9,9*(k+1)+i) for k in range(3) for i in range(9)],firemat,boat)
flame["static"]=False
flame["behavior"]="flicker"; flame["amp"]=.15; flame["freq"]=1.7; flame["phase"]=.31
empty("LIGHT_fishfire_01",(2.2,0,1.20),boat,{"light":"point","color":"#ffaf62","intensity":22.0,"range":8.0})
empty("SFX_boat",(0,0,.6),boat)
empty("FOCUS_boat",(.5,.8,.6))
# Shore with submerged footing and varied dressed blocks.
footing_vertices = [(x,y,z) for z in (-.82,0) for y in (-3.3,7.7) for x in (-7.55,-1.95)]
footing_vertices = [(x,y,(.29*(-1.95-x)/5.6 if z == 0 else z)) for x,y,z in footing_vertices]
footing = mesh("shore_footing",footing_vertices,[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)],wetstone)
bevel(footing,.055,2)
for row in range(7):
    for column in range(4):
        x=-6.6+column*1.05 + (.35 if row%2 else 0)
        y=-2.7+row*1.40
        z=.58 if column<2 else (.35 if column==2 else .16)
        box("shore_block_%02d_%02d"%(row,column),(x,y,z),(rng.uniform(.96,1.13),rng.uniform(1.20,1.41),rng.uniform(.50,.63)),stone if column<2 else wetstone,weather=True)
for i in range(10):
    x=-1.8-rng.random()*1.0
    y=-2.5+i*.85
    box("waterline_rock_%02d"%i,(x,y,-.17),(rng.uniform(.40,.73),rng.uniform(.50,.81),rng.uniform(.40,.65)),wetstone,weather=True)

def merge_static_materials():
    # Joining retains actual gaps/bevels and reduces batches. Never join boat and shore.
    buckets={}
    for o in list(col.objects):
        if o.type=="MESH" and o.name!="mask_probe" and o.name!="fishfire_flame":
            buckets.setdefault((o.parent.name if o.parent else "shore",o.data.materials[0].name),[]).append(o)
    for (parent,material),objects in buckets.items():
        bpy.ops.object.select_all(action="DESELECT")
        for o in objects:
            o.select_set(True)
            bpy.context.view_layer.objects.active=o
            for mod in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join()
        o=objects[0]
        o.name=("boat" if parent=="boat_guest" else "shore")+"_"+material.replace("pbr_","").replace("__","_")
        # Recenter joined geometry without moving it, respecting the bottom-centre convention.
        vs=[v.co.copy() for v in o.data.vertices]
        c=Vector(((min(v.x for v in vs)+max(v.x for v in vs))/2,(min(v.y for v in vs)+max(v.y for v in vs))/2,min(v.z for v in vs)))
        for v in o.data.vertices:v.co-=c
        o.location+=o.rotation_euler.to_matrix()@c
        if material.startswith("pbr_wood"):
            for p in o.data.polygons: p.use_smooth = True
            adjacent = [[] for e in o.data.edges]
            for p in o.data.polygons:
                for li in p.loop_indices: adjacent[o.data.loops[li].edge_index].append(p.index)
            for e in o.data.edges:
                faces = adjacent[e.index]
                if hasattr(e,"use_edge_sharp"):
                    e.use_edge_sharp = len(faces)==2 and o.data.polygons[faces[0]].normal.dot(o.data.polygons[faces[1]].normal) < math.cos(math.radians(50))
            o.data.update()
merge_static_materials()
probe=mesh("mask_probe",[(0,0,-20),(1,0,-20),(0,1,-20)],[(0,1,2)],reed)
for i,item in enumerate(probe.data.color_attributes["mask"].data):item.color=(i*.5,.5,0,1)
# Explicit triangulation makes exported tangents reproducible, including canopy n-gons.
import bmesh
for obj in col.objects:
    if obj.type == "MESH":
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.triangulate(bm, faces=list(bm.faces))
        bm.to_mesh(obj.data)
        bm.free()
        obj.data.update()
def camera(name,position,target,fov=.68):
    data=bpy.data.cameras.new(name+"_data")
    data.sensor_fit="VERTICAL"
    data.lens=data.sensor_height/(2*math.tan(fov/2))
    obj=bpy.data.objects.new(name,data);col.objects.link(obj)
    obj.location=position
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()
    obj["yuan"]="ping"
    return obj
scene.camera=camera("CAM_enter",(10,-11,6.1),(-.5,1.2,.5),.67)
camera("CAM_riverbank",(4.8,-5.3,2.45),(-.7,.5,.48),.73)
camera("CAM_boat",(6.8,-5.0,2.8),(.25,.7,.68),.78)
# These are Blender-only preview components, never exported.
water=solid("preview_water",(.018,.046,.067),.17,.35)
mesh("preview_river",[(-30,-30,0),(30,-30,0),(30,45,0),(-30,45,0)],[(0,1,2,3)],water,collection=preview)
world=bpy.data.worlds.new("sample_night")
world.use_nodes=True
background=next(n for n in world.node_tree.nodes if n.type=="BACKGROUND")
background.inputs["Color"].default_value=(.055,.085,.14,1)
background.inputs["Strength"].default_value=.35
scene.world=world
for name,position,energy,color,size in [
    ("preview_moon",(1,-4,10),1700,(.58,.73,1),5),
    ("preview_sky",(-5,7,9),1100,(.32,.47,.75),7)]:
    light=bpy.data.lights.new(name,"AREA");light.energy=energy;light.color=color;light.shape="DISK";light.size=size
    obj=bpy.data.objects.new(name,light);preview.objects.link(obj);obj.location=position
    obj.rotation_euler=(Vector((0,1,0))-obj.location).to_track_quat("-Z","Y").to_euler()
light=bpy.data.lights.new("preview_fire","POINT");light.energy=55;light.color=(1,.37,.095);light.shadow_soft_size=.12
obj=bpy.data.objects.new("preview_fire",light);preview.objects.link(obj);obj.parent=boat;obj.location=(2.2,0,1.20)
scene.render.resolution_x=1920;scene.render.resolution_y=1080;scene.render.resolution_percentage=100
for area in (bpy.context.screen.areas if bpy.context.screen else []):
    if area.type=="VIEW_3D":
        area.spaces.active.region_3d.view_perspective="CAMERA"
        area.spaces.active.shading.type="RENDERED"
scene.render.filepath=ROOT+"/output/fengqiao-sample/blender-preview.png"
os.makedirs(ROOT+"/output/fengqiao-sample",exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=ROOT+"/art/blender/fengqiao-sample-v01.blend")
print(json.dumps({"scene":scene.name,"objects":len(scene.objects),"triangles":sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in col.objects if o.type=="MESH"),"source":bpy.data.filepath}))

