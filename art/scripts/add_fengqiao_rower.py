"""从四元素 v01 源增加坐姿划桨船夫，另存 v02，保留 v01 文件。
Blender MCP 执行，或 blender -b art/blender/fengqiao-sample-v01.blend --python 本文件。
人体与布衣为原创环截面建模；真实 armature/skin 交给前端确定性 IK。
"""
import bpy, bmesh, math, os, sys, json
from mathutils import Vector

ROOT = os.environ.get("POETIC_ASSET_ROOT", "D:/University-Competition/Math_Media/PoeticRealm")
scene = bpy.context.scene
assert scene.name == "fengqiao_quality_v01", "只从已知 v01 开始；不隐式删除已有修订"
assert bpy.data.objects.get("rower_rig") is None, "已有人物，禁止重复追加"
col = bpy.data.collections["glb_sample_v01"]
boat = bpy.data.objects["boat_guest"]
scene.name = "fengqiao_quality_v02"
col.name = "glb_sample_v02"

# v01 的闲置桨已经合入木舟，精确移除它的两个连通分量，其他木作保留。
wood_object = bpy.data.objects["boat_wood_aged"]
bm = bmesh.new(); bm.from_mesh(wood_object.data)
unseen = set(bm.verts); remove = []
while unseen:
    stack = [unseen.pop()]; island = []
    while stack:
        vertex = stack.pop(); island.append(vertex)
        for edge in vertex.link_edges:
            other = edge.other_vert(vertex)
            if other in unseen: unseen.remove(other); stack.append(other)
    points = [v.co + wood_object.location for v in island]
    lo = [min(v[i] for v in points) for i in range(3)]
    hi = [max(v[i] for v in points) for i in range(3)]
    is_shaft = hi[0]-lo[0] > 4 and -.999 < (lo[1]+hi[1])/2 < -.92 and hi[2] < 1.2
    is_blade = hi[0] < -2.45 and -.99 < (lo[1]+hi[1])/2 < -.92 and lo[2] > .98 and hi[2] < 1.2
    if is_shaft or is_blade: remove.append(island)
assert len(remove) == 2, f"旧桨分量识别异常：{len(remove)}"
bmesh.ops.delete(bm, geom=[v for island in remove for v in island], context="VERTS")
bm.to_mesh(wood_object.data); bm.free(); wood_object.data.update()

def recenter(obj):
    vs = obj.data.vertices
    c = Vector(((min(v.co.x for v in vs)+max(v.co.x for v in vs))/2,
                (min(v.co.y for v in vs)+max(v.co.y for v in vs))/2, min(v.co.z for v in vs)))
    for v in vs: v.co -= c
    obj.location += obj.rotation_euler.to_matrix() @ c
    obj.data.update()
recenter(wood_object)

def solid(name, color, rough):
    m = bpy.data.materials.new(name); m.use_nodes = True
    s = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    s.inputs["Base Color"].default_value = (*color, 1)
    s.inputs["Metallic"].default_value = 0
    s.inputs["Roughness"].default_value = rough
    return m
coat = solid("pbr_cloth__indigo", (.055,.105,.135), .92)
linen = solid("pbr_cloth__linen", (.15,.125,.085), .90)
trousers = solid("pbr_cloth__charcoal", (.035,.032,.026), .94)
skin = solid("pbr_skin__boatman", (.34,.19,.105), .66)
features = solid("pbr_skin__hair", (.025,.016,.01), .88)
reed = bpy.data.materials["pbr_cloth__reed"]
wood = bpy.data.materials["pbr_wood__aged"]

DX = .44
def P(x,y,z): return Vector((x+DX,y,z))
hip = P(1.16,-.18,.94)
neck = P(1.035,-.34,1.61)
shoulders = {"left":P(1.035,-.55,1.49), "right":P(1.035,-.115,1.49)}
pivot = P(1.1,-.85,1.03)
shaft_axis = Vector((.61,-.56,-.35)).normalized()
grips = {"left":pivot-shaft_axis*.76, "right":pivot-shaft_axis*.43}

def elbow_at(a, target, preference, l1=.325, l2=.325):
    direction = target-a; d = direction.length; direction.normalize()
    along = (l1*l1-l2*l2+d*d)/(2*d)
    bend = Vector(preference); bend -= direction*bend.dot(direction); bend.normalize()
    return a+direction*along+bend*math.sqrt(max(0,l1*l1-along*along))
elbows = {"left":elbow_at(shoulders["left"],grips["left"],(-.1,-1,-.5)),
          "right":elbow_at(shoulders["right"],grips["right"],(1,0,-.5))}

armature = bpy.data.armatures.new("rower_skeleton")
rig = bpy.data.objects.new("rower_rig",armature); col.objects.link(rig); rig.parent=boat; rig["static"]=False
bpy.context.view_layer.update()
bpy.ops.object.select_all(action="DESELECT"); rig.select_set(True); bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode="EDIT")
bone_defs = {}
def bone(name, head, tail, parent=None):
    b=armature.edit_bones.new(name); b.head=head; b.tail=tail
    if parent: b.parent=armature.edit_bones[parent]
    bone_defs[name]=(Vector(head),Vector(tail))
bone("rower_root",hip,hip+Vector((0,0,.1)))
bone("rower_spine",hip,neck,"rower_root")
bone("rower_head",neck,neck+Vector((0,0,.36)),"rower_spine")
for side in ("left","right"):
    bone("rower_upper_"+side, shoulders[side], elbows[side], "rower_spine")
    bone("rower_fore_"+side, elbows[side], grips[side], "rower_upper_"+side)
    bone("rower_hand_"+side, grips[side], grips[side]+shaft_axis*.11, "rower_fore_"+side)
    y = -.18+(-.17 if side=="left" else .17)
    h=P(1.16,y,.94); knee=P(1.49,y,.65); ankle=P(1.62,y,.41)
    bone("rower_thigh_"+side,h,knee,"rower_root")
    bone("rower_shin_"+side,knee,ankle,"rower_thigh_"+side)
    bone("rower_foot_"+side,ankle,ankle+Vector((.14,0,0)),"rower_shin_"+side)
bpy.ops.object.mode_set(mode="OBJECT")

objects=[]
def mesh(name, vertices, faces, material, weights=None, parent=None):
    data=bpy.data.meshes.new(name+"_mesh"); data.from_pydata(vertices,[],faces); data.update()
    obj=bpy.data.objects.new(name,data); col.objects.link(obj); obj.parent=parent or (rig if weights else boat)
    data.materials.append(material); obj["static"]=False
    uv=data.uv_layers.new(name="UVMap")
    for poly in data.polygons:
        poly.use_smooth=True
        axes=[i for i in range(3) if i!=max(range(3),key=lambda k:abs(poly.normal[k]))]
        for li in poly.loop_indices:
            p=data.vertices[data.loops[li].vertex_index].co
            uv.data[li].uv=(p[axes[0]]/.675,p[axes[1]]/.675)
    attr=data.color_attributes.new(name="mask",type="BYTE_COLOR",domain="CORNER")
    for item in attr.data:item.color=(0,.5,0,1)
    if weights:
        for index, blend in enumerate(weights):
            for joint,weight in blend.items():
                group=obj.vertex_groups.get(joint) or obj.vertex_groups.new(name=joint)
                group.add([index],weight,"REPLACE")
        mod=obj.modifiers.new("rower_skin","ARMATURE"); mod.object=rig
    recenter(obj); objects.append(obj); return obj

def loft(name, rings, material, weight_fn, sides=24, fold=0):
    vertices=[]; weights=[]
    for k,(center,rx,ry) in enumerate(rings):
        for i in range(sides):
            a=i*math.tau/sides; ripple=1+fold*(math.sin(a*7+k*.55)+.5*math.sin(a*11-k*.2))
            vertices.append(tuple(center+Vector((rx*math.cos(a)*ripple,ry*math.sin(a)*ripple,0))))
            weights.append(weight_fn(k/(len(rings)-1)))
    faces=[(k*sides+i,k*sides+(i+1)%sides,(k+1)*sides+(i+1)%sides,(k+1)*sides+i)
           for k in range(len(rings)-1) for i in range(sides)]
    faces.extend([tuple(reversed(range(sides))),tuple((len(rings)-1)*sides+i for i in range(sides))])
    return mesh(name,vertices,faces,material,weights)

def ellipsoid(name, center, radii, material, joint, rings=12, sides=20, orientation=None):
    vertices=[]
    for k in range(rings+1):
        lat=-math.pi/2+math.pi*k/rings
        for i in range(sides):
            a=i*math.tau/sides
            v=Vector((radii[0]*math.cos(lat)*math.cos(a),radii[1]*math.cos(lat)*math.sin(a),radii[2]*math.sin(lat)))
            vertices.append(tuple(center+(orientation@v if orientation else v)))
    faces=[(k*sides+i,k*sides+(i+1)%sides,(k+1)*sides+(i+1)%sides,(k+1)*sides+i) for k in range(rings) for i in range(sides)]
    return mesh(name,vertices,faces,material,[{joint:1} for v in vertices])

def limb(name, points, radii, material, joints, sides=20):
    vertices=[]; weights=[]
    for k,p in enumerate(points):
        direction=(points[min(k+1,len(points)-1)]-points[max(0,k-1)]).normalized()
        a=direction.cross(Vector((0,0,1))).normalized(); b=direction.cross(a).normalized()
        ratio=k/(len(points)-1)
        blend=max(0,min(1,(ratio-.35)/.30))
        for i in range(sides):
            angle=i*math.tau/sides
            ripple=1+.065*math.sin(angle*6+ratio*5)
            vertices.append(tuple(p+radii[k]*ripple*(a*math.cos(angle)+b*math.sin(angle))))
            weights.append({joints[0]:1-blend,joints[1]:blend})
    faces=[(k*sides+i,k*sides+(i+1)%sides,(k+1)*sides+(i+1)%sides,(k+1)*sides+i) for k in range(len(points)-1) for i in range(sides)]
    faces.extend([tuple(reversed(range(sides))),tuple((len(points)-1)*sides+i for i in range(sides))])
    return mesh(name,vertices,faces,material,weights)

loft("rower_coat",[(P(1.18,-.18,.84),.235,.25),(P(1.17,-.20,.95),.22,.24),
    (P(1.15,-.22,1.07),.18,.20),(P(1.10,-.27,1.18),.145,.18),
    (P(1.06,-.30,1.34),.16,.21),(P(1.035,-.33,1.48),.13,.25),
    (P(1.035,-.34,1.55),.10,.17),(neck,.055,.063)],coat,
    lambda t:{"rower_root":max(0,1-t*1.5),"rower_spine":min(1,t*1.5)},fold=.06)
ellipsoid("rower_neck",neck+Vector((0,0,.025)),(.06,.063,.085),skin,"rower_head")
loft("rower_face",[(neck+Vector((.025,0,.065)),.036,.045),
    (neck+Vector((.027,0,.10)),.078,.075),(neck+Vector((.012,0,.185)),.104,.096),
    (neck+Vector((0,0,.27)),.108,.093),(neck+Vector((-.005,0,.32)),.075,.070),
    (neck+Vector((0,0,.35)),.012,.014)],skin,lambda t:{"rower_head":1},sides=28)
ellipsoid("rower_nose",neck+Vector((.108,0,.185)),(.034,.022,.044),skin,"rower_head",rings=8,sides=12)
for sign in (-1,1):
    ellipsoid("rower_ear_"+str(sign).replace("-","n"),neck+Vector((-.015,sign*.098,.18)),(.032,.022,.042),skin,"rower_head",rings=8,sides=12)
    ellipsoid("rower_eye_"+str(sign).replace("-","n"),neck+Vector((.103,sign*.040,.225)),(.008,.021,.008),features,"rower_head",rings=6,sides=12)
ellipsoid("rower_beard",neck+Vector((.060,0,.095)),(.040,.055,.026),features,"rower_head",rings=6,sides=16)

# 布衣交领：两条贴合胸前的独立滚边，不画在表面上。
for label,points in [("outer",[P(1.104,-.385,1.59),P(1.183,-.32,1.49),P(1.226,-.26,1.36),P(1.277,-.21,1.19)]),
                     ("inner",[P(1.104,-.285,1.59),P(1.183,-.37,1.48),P(1.22,-.36,1.35)])]:
    vertices=[]
    for p in points:vertices.extend([tuple(p+Vector((.009,-.024,0))),tuple(p+Vector((.009,.024,0)))])
    mesh("rower_collar_"+label,vertices,[(2*i,2*i+1,2*i+3,2*i+2) for i in range(len(points)-1)],linen,[{"rower_spine":1} for v in vertices])

for side in ("left","right"):
    a,e,h=shoulders[side],elbows[side],grips[side]
    wrist=h+(e-h).normalized()*.047
    points=[a.lerp(e,t) for t in (0,.25,.5,.75,1)]+[e.lerp(wrist,t) for t in (.25,.5,.75,1)]
    limb("rower_sleeve_"+side,points,[.115,.12,.125,.11,.105,.095,.094,.097,.09],coat,("rower_upper_"+side,"rower_fore_"+side))
    hand_orientation=shaft_axis.to_track_quat("X","Z").to_matrix()
    ellipsoid("rower_palm_"+side,h+Vector((0,0,.016)),(.068,.047,.027),skin,"rower_hand_"+side,rings=8,sides=16,orientation=hand_orientation)
    for finger in range(4):
        center=h+shaft_axis*((finger-1.5)*.022)+Vector((0,0,-.007))
        ellipsoid("rower_finger_%s_%d"%(side,finger),center,(.011,.035,.025),skin,"rower_hand_"+side,rings=6,sides=12)
    y=-.18+(-.17 if side=="left" else .17)
    h=P(1.16,y,.93); knee=P(1.49,y,.65); ankle=P(1.62,y,.42)
    pts=[h.lerp(knee,t) for t in (0,.25,.5,.75,1)]+[knee.lerp(ankle,t) for t in (.25,.5,.75,1)]
    limb("rower_trousers_"+side,pts,[.12,.125,.13,.12,.11,.10,.09,.085,.075],trousers,("rower_thigh_"+side,"rower_shin_"+side))
    ellipsoid("rower_shoe_"+side,ankle+Vector((.065,0,-.015)),(.14,.073,.046),trousers,"rower_foot_"+side,rings=8,sides=16)

# 斗笠近圆锥外形，宽檐压低以保留夜间船夫剪影。
hat_center=neck+Vector((0,0,.325))
loft("rower_straw_hat",[(hat_center,.315,.305),(hat_center+Vector((0,0,.025)),.32,.31),
    (hat_center+Vector((0,0,.085)),.215,.207),(hat_center+Vector((0,0,.145)),.10,.097),
    (hat_center+Vector((0,0,.17)),.012,.012)],reed,lambda t:{"rower_head":1},sides=48,fold=.005)

# 人物按材质合并，但保持单一 skin；部件权重、UV和遮罩随 join 保留。
groups=[(material,[o for o in objects if o.data.materials[0]==material]) for material in (coat,linen,trousers,skin,features,reed)]
for material,parts in groups:
    bpy.ops.object.select_all(action="DESELECT")
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    if len(parts)>1: bpy.ops.object.join()
    merged=parts[0]; merged.name="rower_"+material.name.split("__")[1]
    recenter(merged)

def empty(name,position,parent):
    o=bpy.data.objects.new(name,None); col.objects.link(o); o.parent=parent; o.location=position; o["static"]=False
    return o
oar=empty("oar_pivot",pivot,boat)
left=empty("ANCHOR_oar_hand_left",grips["left"]-pivot,oar)
right=empty("ANCHOR_oar_hand_right",grips["right"]-pivot,oar)
blade_center=shaft_axis*2.27
empty("ANCHOR_oar_blade",blade_center,oar)

def oar_surface(name, rings):
    a=shaft_axis.cross(Vector((0,0,1))).normalized(); b=shaft_axis.cross(a).normalized()
    vertices=[]; sides=16
    for distance,rx,ry in rings:
        for i in range(sides):
            angle=i*math.tau/sides
            vertices.append(tuple(shaft_axis*distance+a*rx*math.cos(angle)+b*ry*math.sin(angle)))
    faces=[(k*sides+i,k*sides+(i+1)%sides,(k+1)*sides+(i+1)%sides,(k+1)*sides+i) for k in range(len(rings)-1) for i in range(sides)]
    faces.extend([tuple(reversed(range(sides))),tuple((len(rings)-1)*sides+i for i in range(sides))])
    obj=mesh(name,vertices,faces,wood,parent=oar)
    # Grain stays along the shaft rather than the broad projected plane.
    for poly in obj.data.polygons:
        for li in poly.loop_indices:
            p=obj.data.vertices[obj.data.loops[li].vertex_index].co+obj.location
            obj.data.uv_layers.active.data[li].uv=(p.dot(shaft_axis)/1.5,.035+.045*p.dot(a))
    return obj
oar_surface("rowing_oar_shaft",[(-.94,.023,.023),(-.82,.025,.025),(1.62,.029,.029),(1.77,.04,.025)])
oar_surface("rowing_oar_blade",[(1.64,.032,.023),(1.82,.072,.019),(2.08,.113,.016),(2.38,.104,.014),(2.58,.073,.012),(2.64,.018,.009)])

for obj in col.objects:
    if obj.type=="MESH":
        bm=bmesh.new(); bm.from_mesh(obj.data); bmesh.ops.triangulate(bm,faces=list(bm.faces)); bm.to_mesh(obj.data); bm.free(); obj.data.update()
bpy.context.view_layer.update()
os.makedirs(ROOT+"/output/fengqiao-rower",exist_ok=True)
os.makedirs(ROOT+"/art/blender",exist_ok=True)
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import importlib, contract, validate, export_glb
importlib.reload(contract); importlib.reload(validate); importlib.reload(export_glb)
report=validate.validate()
assert not report.errors, report.errors
bpy.ops.wm.save_as_mainfile(filepath=ROOT+"/art/blender/fengqiao-sample-v02.blend")
path=export_glb.export_collection(col,ROOT+"/frontend/public/assets/models/fengqiao")
result={"scene":scene.name,"source":bpy.data.filepath,"model":path,"errors":report.errors,"warnings":report.warnings,
        "objects":len(col.objects),"bones":len(armature.bones),"triangles":sum(len(o.data.polygons) for o in col.objects if o.type=="MESH"),
        "hands":{side:list(grips[side]) for side in grips},"pivot":list(pivot)}
with open(ROOT+"/output/fengqiao-rower/blender-validation.json","w",encoding="utf-8") as f:json.dump(result,f,ensure_ascii=False,indent=2)
print(json.dumps(result,ensure_ascii=False))
