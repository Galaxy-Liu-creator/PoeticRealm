"""v03: CC0 hm08 anatomy, tailored linen, stern-mounted yuloh. Never overwrite v01/v02.
Run from the saved v02 scene. Upstream data is pinned under art/references; no MPFB program code is copied.
"""
import bpy, bmesh, json, gzip, math, os, sys
from mathutils import Vector, Matrix, Quaternion

ROOT = os.environ.get('POETIC_ASSET_ROOT', 'D:/University-Competition/Math_Media/PoeticRealm')
REF = ROOT + '/art/references/mpfb-hm08-d0a32e5/'
scene = bpy.context.scene
assert scene.name == 'fengqiao_quality_v02', 'Start only from saved v02'
col = bpy.data.collections['glb_sample_v02']
boat = bpy.data.objects['boat_guest']
boat.location.x=3.85; boat.location.y=-.45  # The quay reaches x=-1.616; leave the entire submerged stern sweep in open water.
# Scope is the previous rower and working oar only; all hull, shore and user scenes survive.
old = [o for o in col.objects if o.name.startswith(('rower_', 'rowing_oar_', 'ANCHOR_oar_')) or o.name == 'oar_pivot']
assert len(old) == 13, [o.name for o in old]
for o in old: bpy.data.objects.remove(o, do_unlink=True)
scene.name = 'fengqiao_quality_v03'; col.name = 'glb_sample_v03'

vertices=[]; texcoords=[]; groups={}; group=''
with open(REF+'base.obj', encoding='utf8') as stream:
    for line in stream:
        fields=line.split()
        if not fields: continue
        if fields[0]=='v': vertices.append(Vector(tuple(map(float, fields[1:4]))))
        elif fields[0]=='vt': texcoords.append(tuple(map(float, fields[1:3])))
        elif fields[0]=='g': group=fields[1]; groups.setdefault(group,[])
        elif fields[0]=='f': groups[group].append([(int(p.split('/')[0])-1, int(p.split('/')[1])-1) for p in fields[1:]])
assert len(vertices)==19158 and 'body' in groups, len(vertices)
# Morph files store additive deltas in MakeHuman decimetres; the two independent macro families are combined.
for filename, amount in [('asian-male-young.target.gz', .80), ('asian-male-old.target.gz', .20),
                         ('universal-male-young-averagemuscle-averageweight.target.gz', 1.0)]:
    with gzip.open(REF+filename, 'rt') as stream:
        for line in stream:
            if not line.strip() or line.startswith('#'): continue
            p=line.split(); vertices[int(p[0])] += Vector(tuple(map(float,p[1:4])))*amount
# MH: X right, Y height, Z towards viewer. Blender: Z height, +X vessel bow.
def convert(v): return Vector((v.z, v.x, v.y))*.1
raw=[convert(v) for v in vertices]
body_ids=sorted({i for f in groups['body'] for i,_ in f})
floor=min(raw[i].z for i in body_ids); height=max(raw[i].z for i in body_ids)-floor
scale=1.70/height
offset=Vector((-2.42, .07, .34-floor*scale))
points=[v*scale+offset for v in raw]

def locator(spec):
    if spec['strategy']=='CUBE': ids={i for f in groups[spec['cube_name']] for i,_ in f}
    elif spec['strategy']=='MEAN': ids=spec['vertex_indices']
    else: raise ValueError(spec['strategy'])
    return sum((points[i] for i in ids), Vector())/len(ids)
with open(REF+'rig.game_engine.json') as f: definitions=json.load(f)
with open(REF+'weights.game_engine.json') as f: source_weights=json.load(f)['weights']
aliases={'Root':'rower_ground','pelvis':'rower_root','spine_03':'rower_spine','head':'rower_head'}
for side,short in [('left','l'),('right','r')]:
    for src,dst in [('upperarm','upper'),('lowerarm','fore'),('hand','hand'),('thigh','thigh'),('calf','shin'),('foot','foot')]:
        aliases[src+'_'+short]='rower_'+dst+'_'+side
def name(key): return aliases.get(key, 'rower_'+key.lower())
weights=[{} for _ in vertices]
for joint, entries in source_weights.items():
    for index,weight in entries:
        if weight>0: weights[index][name(joint)]=weight
for i in body_ids:
    entries=sorted(weights[i].items(),key=lambda item:-item[1])[:4]
    total=sum(w for _,w in entries)
    assert total>0, i
    weights[i]={k:w/total for k,w in entries}

armature=bpy.data.armatures.new('rower_skeleton_v03')
rig=bpy.data.objects.new('rower_rig',armature); col.objects.link(rig); rig.parent=boat; rig['static']=False
bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True); bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
for key,spec in definitions.items():
    b=armature.edit_bones.new(name(key)); b.head=locator(spec['head']); b.tail=locator(spec['tail'])
    # Derive roll from a consistent global transverse axis after the coordinate conversion.
    b.align_roll(Vector((0,1,0)))
for key,spec in definitions.items():
    if spec['parent']: armature.edit_bones[name(key)].parent=armature.edit_bones[name(spec['parent'])]
bpy.ops.object.mode_set(mode='OBJECT')

def solid(label,color,rough):
    m=bpy.data.materials.new(label); m.use_nodes=True
    shader=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value=(*color,1); shader.inputs['Roughness'].default_value=rough
    shader.inputs['Metallic'].default_value=0
    return m
skin=solid('pbr_skin__weathered',(.28,.145,.078),.72)
hair=solid('pbr_skin__darkhair',(.012,.009,.006),.91)
eye=solid('pbr_skin__eyes',(.25,.22,.15),.43)
iris=solid('pbr_skin__iris',(.008,.007,.005),.48)
cloth=bpy.data.materials.new('pbr_cloth__worklinen'); cloth.use_nodes=True
shader=next(n for n in cloth.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
shader.inputs['Metallic'].default_value=0; shader.inputs['Roughness'].default_value=.92
for suffix,socket in [('Diffuse','Base Color'),('Rough','Roughness'),('nor_gl','Normal')]:
    filename={'Diffuse':'linen_work_basecolor.jpg','Rough':'linen_roughness.png','nor_gl':'linen_normal.png'}[suffix]
    img=bpy.data.images.load(ROOT+'/art/textures/fengqiao-v03/'+filename,check_existing=True)
    texture=cloth.node_tree.nodes.new('ShaderNodeTexImage'); texture.image=img
    if suffix=='nor_gl':
        img.colorspace_settings.name='Non-Color'; normal=cloth.node_tree.nodes.new('ShaderNodeNormalMap')
        normal.inputs['Strength'].default_value=.65
        cloth.node_tree.links.new(texture.outputs['Color'],normal.inputs['Color']); cloth.node_tree.links.new(normal.outputs['Normal'],shader.inputs[socket])
    else:
        if suffix=='Rough': img.colorspace_settings.name='Non-Color'
        cloth.node_tree.links.new(texture.outputs['Color'],shader.inputs[socket])
linen=solid('pbr_cloth__worncollar',(.22,.19,.13),.93)
trousers=solid('pbr_cloth__worktrousers',(.042,.046,.043),.94)
reed=bpy.data.materials['pbr_cloth__reed']; wood=bpy.data.materials['pbr_wood__aged']
created=[]
def mesh(label, vs, faces, material, blends=None, uvfaces=None, parent=None):
    data=bpy.data.meshes.new(label+'_mesh'); data.from_pydata(vs,[],faces); data.update()
    obj=bpy.data.objects.new(label,data); col.objects.link(obj); obj.parent=parent or (rig if blends else boat)
    data.materials.append(material); obj['static']=False
    uv=data.uv_layers.new(name='UVMap')
    for fi,poly in enumerate(data.polygons):
        poly.use_smooth=True
        axes=[i for i in range(3) if i!=max(range(3),key=lambda k:abs(poly.normal[k]))]
        for k,li in enumerate(poly.loop_indices):
            p=data.vertices[data.loops[li].vertex_index].co
            uv.data[li].uv=uvfaces[fi][k] if uvfaces else (p[axes[0]]/.271,p[axes[1]]/.271)
    attr=data.color_attributes.new(name='mask',type='BYTE_COLOR',domain='CORNER')
    for item in attr.data: item.color=(0,.5,0,1)
    if blends:
        for i,blend in enumerate(blends):
            for joint,w in blend.items():
                if w<=0: continue
                g=obj.vertex_groups.get(joint) or obj.vertex_groups.new(name=joint); g.add([i],w,'REPLACE')
        mod=obj.modifiers.new('anatomical_skin','ARMATURE'); mod.object=rig
    created.append(obj); return obj

head_z=armature.bones['rower_neck_01'].head_local.z-.045
hip_z=armature.bones['rower_root'].head_local.z
hand_names={'rower_hand_left','rower_hand_right'}
def is_hand(i): return any('hand_' in k or any(f in k for f in ('index_','middle_','ring_','pinky_','thumb_')) for k,w in weights[i].items() if w>.20)
def is_head(i): return sum(w for k,w in weights[i].items() if k in ('rower_head','rower_neck_01')) > .45
skin_faces=[f for f in groups['body'] if all(is_head(i) or is_hand(i) for i,_ in f)]
coat_faces=[f for f in groups['body'] if all(hip_z-.04 < points[i].z and not is_head(i) and not is_hand(i) for i,_ in f)]
# Trousers terminate beneath the tunic overlap, so their animated upper rim never
# intersects the coat or belt. The thigh weights still follow both leg chains.
pants_faces=[f for f in groups['body'] if all(.58 < points[i].z < hip_z-.11 and not is_hand(i) for i,_ in f)]
def subset(label, faces, material, inflate=0):
    ids=sorted({i for f in faces for i,_ in f}); indices={i:k for k,i in enumerate(ids)}
    vs=[points[i].copy() for i in ids]
    obj=mesh(label,vs,[[indices[i] for i,_ in f] for f in faces],material,
             [weights[i] for i in ids],[[texcoords[t] for _,t in f] for f in faces] if not inflate else None)
    if inflate:
        neighbours=[set() for _ in obj.data.vertices]
        for edge in obj.data.edges:
            a,b=edge.vertices; neighbours[a].add(b); neighbours[b].add(a)
        for _ in range(10):
            smoothed=[v.co.copy() for v in obj.data.vertices]
            for k,v in enumerate(obj.data.vertices):
                if neighbours[k]: smoothed[k]=v.co.lerp(sum((obj.data.vertices[n].co for n in neighbours[k]),Vector())/len(neighbours[k]),.40)
            for v,p in zip(obj.data.vertices,smoothed): v.co=p
        obj.data.update()
        normals=[v.normal.copy() for v in obj.data.vertices]
        for k,vertex in enumerate(obj.data.vertices):
            p=vertex.co; q=points[ids[k]]
            # Loose cloth offsets the anatomical surface, with small nonuniform longitudinal creases.
            folds=.0025*math.sin(q.z*42+q.y*18)+.0018*math.sin(q.z*67-q.x*22)
            vertex.co += normals[k]*(inflate+folds)
        obj.data.update()
    return obj
subset('rower_anatomy',skin_faces,skin)
subset('rower_linen_coat',coat_faces,cloth,.035)
subset('rower_trousers',pants_faces,trousers,.028)

# Eyeballs are the CC0 fitting meshes, with dark front iris faces; no helper cubes are exported.
for side,group in [('left','helper-l-eye'),('right','helper-r-eye')]:
    faces=groups[group]; ids=sorted({i for f in faces for i,_ in f}); index={i:k for k,i in enumerate(ids)}
    obj=mesh('rower_eye_'+side,[points[i] for i in ids],[[index[i] for i,_ in f] for f in faces],eye,
             [{'rower_head':1} for _ in ids]); obj.data.materials.append(iris)
    center=sum((points[i] for i in ids),Vector())/len(ids)
    front=max(points[i].x for i in ids)
    for p in obj.data.polygons:
        if p.center.x > front-.004: p.material_index=1

def surface(label, rings, material, joint=None, parent=None, sides=32, caps=True):
    vs=[]
    for center,a,b,rx,ry in rings:
        for i in range(sides):
            angle=i*math.tau/sides; vs.append(tuple(center+a*rx*math.cos(angle)+b*ry*math.sin(angle)))
    faces=[(k*sides+i,k*sides+(i+1)%sides,(k+1)*sides+(i+1)%sides,(k+1)*sides+i) for k in range(len(rings)-1) for i in range(sides)]
    if caps: faces.extend([tuple(reversed(range(sides))),tuple((len(rings)-1)*sides+i for i in range(sides))])
    return mesh(label,vs,faces,material,[{joint:1} for _ in vs] if joint else None,parent=parent)
Z=Vector((0,0,1)); X=Vector((1,0,0)); Y=Vector((0,1,0))
# Short work coat: overlapping cross collar, broad woven belt, gathered lower hem.
cx=offset.x; cy=offset.y
hem=surface('rower_coat_hem',[(Vector((cx+.020,cy,hip_z+z)),X,Y,rx,ry) for z,rx,ry in [(-.23,.21,.24),(-.16,.21,.24),(-.08,.195,.225),(.035,.155,.185),(.10,.144,.177)]],cloth,'rower_root',sides=48,caps=False)
for vertex in hem.data.vertices:
    v=vertex.co; angle=math.atan2((v.y-cy)/.24,(v.x-cx-.020)/.21)
    fold=.009*(math.sin(angle*7)+.35*math.sin(angle*11))*(1-max(0,min(1,(v.z-hip_z+.23)/.285))*.72)
    v.x+=math.cos(angle)*fold; v.y+=math.sin(angle)*fold
hem.data.update()
surface('rower_belt',[(Vector((cx+.020,cy,hip_z+z)),X,Y,rx,ry) for z,rx,ry in [(.035,.162,.192),(.068,.157,.188)]],trousers,'rower_root',sides=48,caps=False)
chest=armature.bones['rower_spine'].tail_local
neck=armature.bones['rower_neck_01'].head_local
surface('rower_back_collar',[(neck+Vector((0,0,z)),X,Y,.082,.088) for z in (-.03,.018)],linen,'rower_spine',sides=40)
for label,sign,length in [('outer',-1,1),('inner',1,.58)]:
    line=[]
    for k in range(13):
        t=k/12*length; p=Vector((neck.x+.050+.09*math.sin(t*math.pi/2),cy+sign*(.075-.22*t),neck.z-.015-.32*t))
        line.append(p)
    vs=[tuple(p+Y*w) for p in line for w in (-.020,.020)]
    mesh('rower_collar_'+label,vs,[(k*2,k*2+1,k*2+3,k*2+2) for k in range(12)],linen,[{'rower_spine':1} for _ in vs])
head=armature.bones['rower_head']; hat_z=max(points[i].z for i in body_ids)-.065
surface('rower_straw_hat',[(Vector((head.head_local.x-.016,cy,hat_z+z)),X,Y,r,r*.96) for z,r in [(-.016,.305),(0,.315),(.035,.26),(.09,.155),(.155,.01)]],reed,'rower_head',sides=64)
# Thin brim binding creates a readable edge, rather than a solid disk.
surface('rower_hat_binding',[(Vector((head.head_local.x-.016,cy,hat_z+z)),X,Y,.309,.296) for z in (-.019,-.008)],linen,'rower_head',sides=64)
for side in ('left','right'):
    wrist=armature.bones['rower_hand_'+side].head_local
    direction=(wrist-armature.bones['rower_fore_'+side].head_local).normalized()
    a=direction.cross(Z).normalized(); b=direction.cross(a).normalized()
    surface('rower_cuff_'+side,[(wrist+direction*d,a,b,.062,.062) for d in (-.08,-.055,-.03,-.012)],cloth,'rower_fore_'+side)
    ankle=armature.bones['rower_foot_'+side].head_local
    surface('rower_shoe_'+side,[(ankle+Vector((.066,0,z)),X,Y,rx,ry) for z,rx,ry in [(-.065,.11,.060),(-.052,.125,.063),(-.02,.115,.06),(.017,.077,.047)]],trousers,'rower_foot_'+side)

def empty(label,p,parent):
    o=bpy.data.objects.new(label,None); col.objects.link(o); o.parent=parent; o.location=p; o['static']=False; return o
# Tall fixed pin and matching mortise support; the outer blade always remains submerged.
pivot=Vector((-2.88,.40,1.27))
oar=empty('oar_pivot',pivot,boat)
axis=Vector((-1,-.055,-.85)).normalized(); across=axis.cross(Z).normalized(); normal=axis.cross(across).normalized()
handle_axis=Vector((1,-.51,.35)).normalized()
surface('rowing_oar_shaft',[(axis*d,across,normal,r,r) for d,r in [(0,.034),(.4,.034),(.8,.035),(1.2,.035),(1.6,.04)]],wood,parent=oar,sides=24)
surface('rowing_oar_handle',[(handle_axis*d, Y, Z, r,r) for d,r in [(0,.037),(.12,.038),(.28,.034),(.48,.029),(.7,.027),(.91,.026),(1.03,.024)]],wood,parent=oar,sides=24)
surface('rowing_oar_blade',[(axis*d,across,normal,rx,ry) for d,rx,ry in [(1.42,.043,.025),(1.6,.084,.021),(1.86,.117,.017),(2.16,.114,.015),(2.4,.084,.012),(2.47,.016,.008)]],wood,parent=oar,sides=24)
surface('rowing_oar_pin',[(Vector((-2.88,.40,z)),X,Y,r,r) for z,r in [(.54,.05),(1.17,.05),(1.26,.045),(1.295,.02)]],wood)
surface('rowing_oar_binding',[(handle_axis*d,Y,Z,.038,.038) for d in (.19,.20,.22,.24,.26,.28,.30,.32)],reed,parent=oar,sides=24)
for side,d in [('left',.56),('right',.77)]: empty('ANCHOR_oar_hand_'+side,handle_axis*d,oar)
empty('ANCHOR_oar_blade',axis*2.23,oar)
empty('ANCHOR_oar_tether',handle_axis*.65,oar)
empty('ANCHOR_boat_tether',Vector((-2.44,.13,.55)),boat)
for side in ('left','right'):
    ankle=armature.bones['rower_foot_'+side].head_local.copy()
    # V stance: forward left foot and slightly aft right foot.
    ankle.x += .105 if side=='left' else -.10
    ankle.z=.445
    empty('ANCHOR_rower_foot_'+side,ankle,boat)

# Build a comfortable neutral working pose with analytic two-bone IK, then bake it as bind pose.
def aim(bone,target):
    current=bone.matrix.to_quaternion(); direction=(target-bone.head).normalized()
    current=(bone.tail-bone.head).normalized().rotation_difference(direction) @ current
    mat=current.to_matrix().to_4x4(); mat.translation=bone.head; bone.matrix=mat
    bpy.context.view_layer.update()
def solve(upper,lower,tip,target,pole):
    a=upper.head.copy(); direction=target-a; distance=direction.length; direction.normalize()
    l1=upper.length; l2=lower.length; d=min(l1+l2-.00001,max(abs(l1-l2)+.00001,distance))
    along=(l1*l1-l2*l2+d*d)/(2*d)
    bend=Vector(pole); bend-=direction*bend.dot(direction); bend.normalize()
    elbow=a+direction*along+bend*math.sqrt(max(0,l1*l1-along*along))
    aim(upper,elbow); aim(lower,target)
for side in ('left','right'):
    solve(rig.pose.bones['rower_thigh_'+side],rig.pose.bones['rower_shin_'+side],rig.pose.bones['rower_foot_'+side],
          bpy.data.objects['ANCHOR_rower_foot_'+side].location,(1,0,0))
# Grip palm: fingers descend across the shaft, and flex around it in the final binding.
for side in ('left','right'):
    hand=rig.pose.bones['rower_hand_'+side]
    grip=pivot+bpy.data.objects['ANCHOR_oar_hand_'+side].location
    wrist=grip+Vector((.020,.079,.010))
    solve(rig.pose.bones['rower_upper_'+side],rig.pose.bones['rower_fore_'+side],hand,wrist,(-.1,1 if side=='left' else -1,-.5))
    desired=Matrix((X, -Y, -Z)).transposed().to_4x4(); desired.translation=hand.head; hand.matrix=desired
    bpy.context.view_layer.update()
    short='l' if side=='left' else 'r'
    across=Y-handle_axis*Y.dot(handle_axis); across.normalize(); upward=handle_axis.cross(across).normalized()
    for finger in ('index','middle','ring','pinky'):
        for segment,direction in [('01',across*.15-upward*.988),('02',across*.92-upward*.392),('03',across*.80+upward*.60)]:
            b=rig.pose.bones['rower_'+finger+'_'+segment+'_'+short]
            aim(b,b.head+direction.normalized()*b.length)
    for segment,direction in [('01',-across*.70-upward*.70),('02',-across*.95+upward*.10),('03',-across*.65+upward*.76)]:
        b=rig.pose.bones['rower_thumb_'+segment+'_'+short]; aim(b,b.head+direction.normalized()*b.length)
    bpy.context.view_layer.update()
    empty('ANCHOR_rower_palm_'+side,grip,rig)
# Bake all clothing and anatomical meshes plus the posed skeleton, keeping normalized original skin weights.
bpy.context.view_layer.update()
pose={b.name:b.matrix.copy() for b in rig.pose.bones}
rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
transforms={key:pose[key] @ rest[key].inverted() for key in pose}
for obj in created:
    if obj.parent!=rig: continue
    for v in obj.data.vertices:
        p=v.co.copy(); out=Vector(); total=0
        for entry in v.groups:
            joint=obj.vertex_groups[entry.group].name; out+=(transforms[joint] @ p)*entry.weight; total+=entry.weight
        if total: v.co=out/total
    obj.data.update()
bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True); bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
for b in rig.data.edit_bones:
    length=b.length; b.matrix=pose[b.name]; b.length=length
bpy.ops.object.mode_set(mode='OBJECT')
for b in rig.pose.bones: b.matrix_basis.identity()
# Wrist and palm are separate: the palm marker records the true shaft centre in hand-local coordinates.
for side in ('left','right'):
    anchor=bpy.data.objects['ANCHOR_rower_palm_'+side]
    grip=anchor.location.copy(); anchor.parent_type='BONE'; anchor.parent_bone='rower_hand_'+side
    b=rig.data.bones[anchor.parent_bone]
    anchor.location=b.matrix_local.inverted() @ grip-Vector((0,b.length,0))
    anchor.rotation_euler=(0,0,0)

# Merge character by material to contain reflected/shadow draw calls.
for material in (skin,hair,eye,cloth,linen,trousers,reed):
    parts=[o for o in col.objects if o.type=='MESH' and o.parent==rig and o.data.materials[0]==material]
    if not parts: continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    if len(parts)>1: bpy.ops.object.join()
    parts[0].name='rower_'+material.name.split('__')[1]
for obj in col.objects:
    if obj.type!='MESH': continue
    bm=bmesh.new(); bm.from_mesh(obj.data); bmesh.ops.triangulate(bm,faces=list(bm.faces)); bm.to_mesh(obj.data); bm.free(); obj.data.update()
    c=Vector(((min(v.co.x for v in obj.data.vertices)+max(v.co.x for v in obj.data.vertices))/2,
              (min(v.co.y for v in obj.data.vertices)+max(v.co.y for v in obj.data.vertices))/2,min(v.co.z for v in obj.data.vertices)))
    for v in obj.data.vertices: v.co-=c
    obj.location += obj.rotation_euler.to_matrix() @ c
focus=bpy.data.objects['FOCUS_boat']; focus.location=boat.location+Vector((-1.1,0,1.25))
cam=bpy.data.objects['CAM_boat']; cam.location=boat.location+Vector((-6.3,-6.8,3.6))
cam.rotation_euler=(focus.location-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.lens=32
camera_data=cam.data.copy(); camera_data.name='boatman_close_camera'
close=bpy.data.objects.new('CAM_rower',camera_data); col.objects.link(close); close['yuan']='ping'
close.location=boat.location+Vector((-3.15,-3.8,2.10)); target=boat.location+Vector((-2.46,.10,1.25))
close.rotation_euler=(target-close.location).to_track_quat('-Z','Y').to_euler(); close.data.lens=36
empty('FOCUS_rower',Vector((-2.35,.08,1.25)),boat)
enter=bpy.data.objects['CAM_enter']; enter.location=Vector((10,-12,7)); enter_target=Vector((-.4,1.2,.35))
enter.rotation_euler=(enter_target-enter.location).to_track_quat('-Z','Y').to_euler(); enter.data.lens=42
bpy.context.view_layer.update()
sys.path.insert(0,ROOT+'/art/scripts')
import importlib,validate,export_glb,contract
for module in (contract,validate,export_glb): importlib.reload(module)
report=validate.validate(); assert not report.errors, report.errors
os.makedirs(ROOT+'/output/fengqiao-rower-v03',exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/art/blender/fengqiao-sample-v03.blend')
path=export_glb.export_collection(col,ROOT+'/frontend/public/assets/models/fengqiao')
result={'scene':scene.name,'source':bpy.data.filepath,'model':path,'errors':report.errors,'warnings':report.warnings,
        'objects':len(col.objects),'bones':len(armature.bones),'triangles':sum(len(o.data.polygons) for o in col.objects if o.type=='MESH'),
        'humanSourceHeight':height,'humanScale':scale,'style':'stern-yuloh','pivot':list(pivot)}
with open(ROOT+'/output/fengqiao-rower-v03/blender-validation.json','w',encoding='utf8') as f: json.dump(result,f,ensure_ascii=False,indent=2)
print(json.dumps(result,ensure_ascii=False))
