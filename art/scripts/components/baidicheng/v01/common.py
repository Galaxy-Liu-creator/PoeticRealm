"""Shared parameters and pure helpers. Importing creates no scene geometry."""
from pathlib import Path
import bpy, bmesh, json, math
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[5]
MAIN=ROOT/'art/blender/baidicheng-scene-v01.blend'
OUT=ROOT/'output/baidicheng-model-v01'
LIB=ROOT/'art/blender/components/baidicheng-v01'
SCENE='baidicheng_modeling_v01'
SOURCE='baidicheng_components_v01'
EXPORT='glb_scene_v01'
SEED=821047
PATH=[(10.,-28.),(4.,12.),(-8.,52.),(-11.,96.),(-2.,140.),(15.,187.),(26.,238.)]
BUILDINGS=[(-1,0,11,8,5.2),(14,1,8,6,4.2),(-15,3,8,6,4.2),(0,13,14,9,6.1),(-14,17,7,6,4.1),(15,18,7,6,4.1)]
CITY=(52.,118.,63.)

def active():
    assert bpy.context.scene.name==SCENE
    assert Path(bpy.data.filepath).resolve()==MAIN
    return bpy.context.scene

def report(name,data):
    p=OUT/name;p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')

def collection(name,parent=SOURCE):
    active();assert name not in bpy.data.collections,name
    c=bpy.data.collections.new(name);bpy.data.collections[parent].children.link(c);return c

def normalize_origin(o):
    vs=o.data.vertices
    center=Vector(((min(v.co.x for v in vs)+max(v.co.x for v in vs))/2,(min(v.co.y for v in vs)+max(v.co.y for v in vs))/2,min(v.co.z for v in vs)))
    for v in vs:v.co-=center
    o.matrix_basis=o.matrix_basis@Matrix.Translation(center);o.data.update();bpy.context.view_layer.update()

def mesh(name,verts,faces,col,materials,smooth=False,uv_scale=4.):
    assert name not in bpy.data.objects,name
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    o=bpy.data.objects.new(name,data);col.objects.link(o)
    for m in materials:data.materials.append(m)
    uv=data.uv_layers.new(name='UVMap')
    for p in data.polygons:
        p.use_smooth=smooth
        axis=max(range(3),key=lambda a:abs(p.normal[a]));axes=[a for a in range(3) if a!=axis]
        for li in p.loop_indices:
            co=data.vertices[data.loops[li].vertex_index].co
            uv.data[li].uv=(co[axes[0]]/uv_scale,co[axes[1]]/uv_scale)
    normalize_origin(o);return o

def material(name,color,roughness=.8,metallic=0.):
    assert name not in bpy.data.materials,name
    m=bpy.data.materials.new(name);m.use_nodes=True
    bsdf=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value=(*color,1);bsdf.inputs['Roughness'].default_value=roughness;bsdf.inputs['Metallic'].default_value=metallic
    m.diffuse_color=(*color,1);return m

def box_data(center,size):
    x,y,z=center;w,d,h=(a/2 for a in size)
    v=[(x+sx*w,y+sy*d,z+sz*h) for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    return v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]

def append_geometry(vertices,faces,part):
    v,f=part;offset=len(vertices);vertices.extend(v);faces.extend(tuple(i+offset for i in p) for p in f)

def cylinder_data(a,b,r1,r2=None,segments=8):
    a,b=Vector(a),Vector(b);direction=(b-a).normalized();u=direction.cross(Vector((0,0,1)))
    if u.length<.1:u=direction.cross(Vector((0,1,0)))
    u.normalize();v=direction.cross(u).normalized();r2=r1 if r2 is None else r2
    points=[tuple(p+r*(math.cos(i*math.tau/segments)*u+math.sin(i*math.tau/segments)*v)) for p,r in [(a,r1),(b,r2)] for i in range(segments)]
    faces=[tuple(reversed(range(segments))),tuple(range(segments,2*segments))]
    faces.extend((i,(i+1)%segments,(i+1)%segments+segments,i+segments) for i in range(segments))
    return points,faces

def checked(o,closed=True):
    bm=bmesh.new();bm.from_mesh(o.data)
    row={'object':o.name,'vertices':len(bm.verts),'triangles':sum(len(f.verts)-2 for f in bm.faces),'nonmanifoldEdges':sum(not e.is_manifold for e in bm.edges),'volume':bm.calc_volume(signed=True)}
    assert all(math.isfinite(c) for v in bm.verts for c in v.co)
    bm.free()
    if closed:assert row['nonmanifoldEdges']==0 and row['volume']>0,row
    assert 1<=len(o.data.materials)<=2,row
    if any(m.use_nodes and any(n.type=='TEX_IMAGE' for n in m.node_tree.nodes) for m in o.data.materials):assert o.data.uv_layers,row
    assert all(abs(s-1)<1e-6 for s in o.scale)
    return row

def save_component(col,checks,closed=True):
    rows=[checked(o,closed) for o in col.all_objects if o.type=='MESH']
    report('components/'+col.name+'.json',{'component':col.name,'meshes':rows,'checks':checks})
    active()[col.name+'_checked']=True
    LIB.mkdir(parents=True,exist_ok=True)
    bpy.data.libraries.write(str(LIB/(col.name+'.blend')),{col},fake_user=True)
    (OUT/'checkpoints').mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'checkpoints'/(col.name+'.blend')),copy=True,check_existing=False)
    bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
    print(json.dumps({'component':col.name,'meshes':rows,'checks':checks}))

def river_center(y):
    return 9*math.sin((y+28)/63)-.025*(y+28)

def bank_x(side,y):
    center=river_center(y)
    width=48+8*math.sin(y*.025+.4)+7*math.sin(y*.012)
    return center+side*width
