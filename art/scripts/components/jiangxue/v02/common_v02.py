"""Revision-scoped helpers; importing this file builds no geometry."""
import importlib.util,sys,os,json,math,bpy,bmesh
from mathutils import Vector,Matrix
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
spec=importlib.util.spec_from_file_location('jx_v02_base',ROOT+'/art/scripts/components/jiangxue/common.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
SCENE='jiangxue_modeling_v02';SOURCE='jiangxue_components_v02';EXPORT='glb_scene_v02'
OUTPUT=ROOT+'/output/jiangxue-model-v02';MAIN=ROOT+'/art/blender/jiangxue-scene-v02.blend'
for key in ('SCENE','SOURCE','EXPORT','OUTPUT','MAIN'):setattr(base,key,globals()[key])
P=dict(base.P);P.update({'seed':31029,'bank_length':230.,'bank_width':95.});base.P=P
def active():
    if bpy.context.scene.name!=SCENE or bpy.data.filepath.replace('\\','/')!=MAIN:raise RuntimeError('Only the saved Jiangxue v02 may be modified')
    return bpy.context.scene
base.active=active
component=base.component;root=base.root;solid=base.solid;textured=base.textured
mesh=base.mesh;Shape=base.Shape;view=base.view;publish=base.publish

def finish(col,extra=None):
    scene=active();bpy.context.view_layer.update();rows=[]
    for obj in col.objects:
        if obj.type!='MESH':continue
        bm=bmesh.new();bm.from_mesh(obj.data);invalid=sum(not e.is_manifold for e in bm.edges)
        assert not invalid,(obj.name,invalid)
        assert all(math.isfinite(c) for v in bm.verts for c in v.co)
        bm.free();assert all(abs(s-1)<1e-6 for s in obj.scale)
        assert 0<len(obj.data.materials)<=2
        rows.append({'object':obj.name,'vertices':len(obj.data.vertices),'triangles':sum(len(p.vertices)-2 for p in obj.data.polygons),'nonmanifoldEdges':invalid})
    report={'component':col.name,'scene':SCENE,'objects':rows,'parameters':P,'extra':extra or {}}
    with open(OUTPUT+'/components/'+col.name+'.json','w',encoding='utf8') as f:json.dump(report,f,ensure_ascii=False,indent=2)
    checks=json.loads(scene.get('component_checks','{}'));checks[col.name]=report;scene['component_checks']=json.dumps(checks)
    bpy.data.libraries.write(ROOT+'/art/blender/components/jiangxue-v02/'+col.name+'.blend',{col},fake_user=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUTPUT+'/checkpoints/'+col.name+'.blend',copy=True,check_existing=False)
    bpy.ops.wm.save_as_mainfile(filepath=MAIN,check_existing=False);print(json.dumps(report))

def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def edge(y):
    return -6.5+2.7*math.sin(y*.064)+1.15*math.sin(y*.21)+.34*math.sin(y*.51)
def ground(x,y):
    d=x-edge(y)
    # Broken rock ledges, a sloping shoulder, then rolling snowy ground.
    h=-.7+4.8*smooth(.4,4.0,d)+2.3*smooth(6,15,d)
    h+=(.55*math.sin(y*.12)+.35*math.sin(y*.37+d*.31))*smooth(.1,3,d)
    h+=1.0*math.sin(d*.11+y*.06)*smooth(8,22,d)
    h+=5*smooth(24,95,d)
    fade=smooth(-40,-22,y)*(1-smooth(140,190,y))
    return -1.7+(h+1.7)*fade

def retire(names):
    history=bpy.data.collections.get('jx_v02_retired')
    if history is None:
        history=bpy.data.collections.new('jx_v02_retired');active().collection.children.link(history)
    for name in names:
        obj=bpy.data.objects.get(name)
        if obj and bpy.data.collections[EXPORT] in obj.users_collection:
            history.objects.link(obj);bpy.data.collections[EXPORT].objects.unlink(obj)
    history.hide_viewport=True;history.hide_render=True

def shell_grid(name,vertices,rows,columns,col,material,parent,bottom=-3.0):
    faces=[(j*columns+i,j*columns+i+1,(j+1)*columns+i+1,(j+1)*columns+i) for j in range(rows-1) for i in range(columns-1)]
    perimeter=[*range(columns),*(j*columns+columns-1 for j in range(1,rows)),*((rows-1)*columns+i for i in range(columns-2,-1,-1)),*(j*columns for j in range(rows-2,0,-1))]
    offset=len(vertices)
    vertices=list(vertices)+[(vertices[i][0],vertices[i][1],bottom) for i in perimeter]
    for j,index in enumerate(perimeter):
        k=(j+1)%len(perimeter);faces.append((index,offset+j,offset+k,perimeter[k]))
    faces.append(tuple(reversed(range(offset,len(vertices)))))
    return mesh(name,vertices,faces,col,material,parent)
