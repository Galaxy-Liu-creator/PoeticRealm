"""One component group: aged CC0 anatomy, fitted work clothes and the bound fishing stance."""
import bpy,sys,gzip,json,math
from mathutils import Vector,Matrix
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue')
from common import *
col=component('jx_fisherman_body',('jx_boat_structure',));boat=bpy.data.objects['boat_guest']
REF=ROOT+'/art/references/mpfb-hm08-d0a32e5/'
vertices=[];texcoords=[];groups={};group=''
with open(REF+'base.obj',encoding='utf8') as stream:
    for line in stream:
        f=line.split()
        if not f:continue
        if f[0]=='v':vertices.append(Vector(tuple(map(float,f[1:4]))))
        elif f[0]=='vt':texcoords.append(tuple(map(float,f[1:3])))
        elif f[0]=='g':group=f[1];groups.setdefault(group,[])
        elif f[0]=='f':groups[group].append([(int(p.split('/')[0])-1,int(p.split('/')[1])-1) for p in f[1:]])
assert len(vertices)==19158
for filename,amount in [('asian-male-young.target.gz',.15),('asian-male-old.target.gz',.85),('universal-male-young-averagemuscle-averageweight.target.gz',1.)]:
    with gzip.open(REF+filename,'rt') as stream:
        for line in stream:
            if not line.strip() or line.startswith('#'):continue
            f=line.split();vertices[int(f[0])]+=Vector(tuple(map(float,f[1:4])))*amount
raw=[Vector((v.z,v.x,v.y))*.1 for v in vertices]
body_ids=sorted({i for face in groups['body'] for i,_ in face})
floor=min(raw[i].z for i in body_ids);height=max(raw[i].z for i in body_ids)-floor
scale=P['fisherman_height']/height;offset=Vector((-1.68,0,.445-floor*scale))
points=[v*scale+offset for v in raw]
def locator(spec):
    ids={i for f in groups[spec['cube_name']] for i,_ in f} if spec['strategy']=='CUBE' else spec['vertex_indices']
    return sum((points[i] for i in ids),Vector())/len(ids)
with open(REF+'rig.game_engine.json') as f:definitions=json.load(f)
with open(REF+'weights.game_engine.json') as f:source_weights=json.load(f)['weights']
aliases={'Root':'fisherman_ground','pelvis':'fisherman_root','spine_03':'fisherman_spine','head':'fisherman_head'}
for side,short in [('left','l'),('right','r')]:
    for src,dst in [('upperarm','upper'),('lowerarm','fore'),('hand','hand'),('thigh','thigh'),('calf','shin'),('foot','foot')]:aliases[src+'_'+short]='fisherman_'+dst+'_'+side
def bone_name(name):return aliases.get(name,'fisherman_'+name.lower())
weights=[{} for _ in vertices]
for joint,entries in source_weights.items():
    for index,w in entries:
        if w>0:weights[index][bone_name(joint)]=w
for i in body_ids:
    entries=sorted(weights[i].items(),key=lambda entry:-entry[1])[:4];total=sum(w for _,w in entries)
    weights[i]={key:w/total for key,w in entries}
armature=bpy.data.armatures.new('fisherman_skeleton');rig=bpy.data.objects.new('src_fisherman_rig',armature)
col.objects.link(rig);rig.parent=boat;rig['static']=False
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
for key,spec in definitions.items():
    bone=armature.edit_bones.new(bone_name(key));bone.head=locator(spec['head']);bone.tail=locator(spec['tail']);bone.align_roll(Vector((0,1,0)))
for key,spec in definitions.items():
    if spec['parent']:armature.edit_bones[bone_name(key)].parent=armature.edit_bones[bone_name(spec['parent'])]
bpy.ops.object.mode_set(mode='OBJECT')
skin=solid('pbr_skin__jx_aged',(.28,.175,.115),.78)
cloth=textured('pbr_cloth__jx_worklinen',[ROOT+'/art/textures/fengqiao-v03/'+s for s in ('linen_work_basecolor.jpg','linen_normal.png','linen_roughness.png')])
pants=solid('pbr_cloth__jx_trousers',(.035,.051,.061),.94)
created=[];hip=armature.bones['fisherman_root'].head_local.z
def is_hand(index):return any(('hand_' in k or any(f in k for f in ('index_','middle_','ring_','pinky_','thumb_'))) and w>.2 for k,w in weights[index].items())
def is_head(index):return sum(w for k,w in weights[index].items() if k in ('fisherman_head','fisherman_neck_01'))>.45
def subset(name,faces,material,inflate=0):
    ids=sorted({i for face in faces for i,_ in face});index={value:k for k,value in enumerate(ids)}
    obj=mesh(name,[points[i] for i in ids],[[index[i] for i,_ in face] for face in faces],col,material,rig,
             uvs=[[texcoords[t] for _,t in face] for face in faces],dynamic=True)
    if inflate:
        for v in obj.data.vertices:v.co+=v.normal*(inflate+.003*math.sin((v.co.z+obj.location.z)*37))
        obj.data.update()
    for k,i in enumerate(ids):
        for joint,w in weights[i].items():
            group=obj.vertex_groups.get(joint) or obj.vertex_groups.new(name=joint);group.add([k],w,'REPLACE')
    mod=obj.modifiers.new('anatomical_skin','ARMATURE');mod.object=rig;created.append(obj);return obj
subset('fisherman_anatomy',[f for f in groups['body'] if all(is_head(i) or is_hand(i) for i,_ in f)],skin)
subset('fisherman_work_coat',[f for f in groups['body'] if all(hip-.16<points[i].z and not is_head(i) and not is_hand(i) for i,_ in f)],cloth,.035)
subset('fisherman_trousers',[f for f in groups['body'] if all(.48<points[i].z<hip+.02 and not is_hand(i) for i,_ in f)],pants,.023)
eye=solid('pbr_skin__jx_eye',(.025,.024,.020),.5)
for side,group in [('left','helper-l-eye'),('right','helper-r-eye')]:
    faces=groups[group];ids=sorted({i for f in faces for i,_ in f});index={i:k for k,i in enumerate(ids)}
    obj=mesh('fisherman_eye_'+side,[points[i] for i in ids],[[index[i] for i,_ in f] for f in faces],col,eye,rig,dynamic=True)
    vg=obj.vertex_groups.new(name='fisherman_head');vg.add(list(range(len(ids))),1,'REPLACE')
    mod=obj.modifiers.new('eye_skin','ARMATURE');mod.object=rig;created.append(obj)
def aim(bone,target):
    rotation=(bone.tail-bone.head).normalized().rotation_difference((target-bone.head).normalized())@bone.matrix.to_quaternion()
    matrix=rotation.to_matrix().to_4x4();matrix.translation=bone.head;bone.matrix=matrix;bpy.context.view_layer.update()
def solve(upper,lower,target,pole):
    start=upper.head.copy();direction=target-start;distance=direction.length;direction.normalize()
    a=upper.length;b=lower.length;distance=min(a+b-.00001,max(abs(a-b)+.00001,distance))
    along=(a*a-b*b+distance*distance)/(2*distance)
    bend=Vector(pole);bend-=direction*bend.dot(direction);bend.normalize()
    elbow=start+direction*along+bend*math.sqrt(max(0,a*a-along*along))
    aim(upper,elbow);aim(lower,target)
grips={'left':Vector((-1.55,-.13,1.36)),'right':Vector((-1.28,-.25,1.47))}
axis=(grips['right']-grips['left']).normalized();across=Vector((0,0,1)).cross(axis).normalized();up=axis.cross(across).normalized()
for side in ('left','right'):
    hand=rig.pose.bones['fisherman_hand_'+side]
    solve(rig.pose.bones['fisherman_upper_'+side],rig.pose.bones['fisherman_fore_'+side],grips[side]+up*.035,(-.3,1 if side=='left' else -1,-.5))
    aim(hand,hand.head-up*.085)
    short='l' if side=='left' else 'r'
    for finger in ('index','middle','ring','pinky'):
        for segment,direction in [('01',across*.20-up*.98),('02',across*.94-up*.34),('03',across*.70+up*.70)]:
            bone=rig.pose.bones['fisherman_'+finger+'_'+segment+'_'+short];aim(bone,bone.head+direction.normalized()*bone.length)
    for segment,direction in [('01',-across*.65-up*.75),('02',-across*.96+up*.10),('03',-across*.67+up*.74)]:
        bone=rig.pose.bones['fisherman_thumb_'+segment+'_'+short];aim(bone,bone.head+direction.normalized()*bone.length)
# Bake only this body's pose and keep its skin/weights for the runtime clock.
bpy.context.view_layer.update();pose={b.name:b.matrix.copy() for b in rig.pose.bones}
transforms={name:pose[name]@armature.bones[name].matrix_local.inverted() for name in pose}
for obj in created:
    for vertex in obj.data.vertices:
        p=vertex.co+obj.location;result=Vector();total=0
        for entry in vertex.groups:
            name=obj.vertex_groups[entry.group].name;result+=(transforms[name]@p)*entry.weight;total+=entry.weight
        if total:vertex.co=result/total-obj.location
    centre=Vector(((min(v.co.x for v in obj.data.vertices)+max(v.co.x for v in obj.data.vertices))/2,
                   (min(v.co.y for v in obj.data.vertices)+max(v.co.y for v in obj.data.vertices))/2,min(v.co.z for v in obj.data.vertices)))
    for vertex in obj.data.vertices:vertex.co-=centre
    obj.location+=centre;obj.data.update()
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
for bone in armature.edit_bones:
    length=bone.length;bone.matrix=pose[bone.name];bone.length=length
bpy.ops.object.mode_set(mode='OBJECT')
for bone in rig.pose.bones:bone.matrix_basis.identity()
active()['fisherman_parameters']=json.dumps({'grips':{key:list(v) for key,v in grips.items()},'axis':list(axis),'hip':hip,'headTop':max(p.z for p in points),'centre':[-1.68,0]})
finish(col,open_surfaces=tuple(o.name for o in created),extra={'humanSource':'CC0 hm08 d0a32e5','ageMorph':.85,'height':P['fisherman_height'],'skinBones':len(armature.bones),'stance':'standing; articulated grip; no idle body animation'})
view('CAM_fisherman')
