"""One closed far roof, with the same curved eave and ridge parameters as near."""
import bpy, sys, math, json, bmesh
from mathutils import Vector
sys.path.insert(0,'D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao')
import common as c
import distance_lod as lod
owner=globals().get('OWNER')
if owner not in ('temple','tower'):raise RuntimeError('Specify one OWNER')
lod.active()
revision=globals().get('REVISION',2)
if revision not in (2,3):raise RuntimeError('Unsupported roof revision')
root_name='temple_far' if owner=='temple' else 'bell_far'
tag='temple-roof' if owner=='temple' else 'bell-roof'
name=root_name+'_tile_charcoal';previous=bpy.data.objects[name]
col_name='lod_'+tag.replace('-','_')+'_v'+str(revision).zfill(2)
if bpy.data.collections.get(col_name):raise RuntimeError('Roof revision already authored')
archive=bpy.data.collections.new('lod_'+tag.replace('-','_')+'_v'+str(revision-1).zfill(2)+'_archive');bpy.context.scene.collection.children.link(archive)
world=previous.matrix_world.copy();previous.parent=None;previous.matrix_world=world;previous.name+='_v'+str(revision-1).zfill(2)
archive.objects.link(previous)
for col in list(previous.users_collection):
    if col!=archive:col.objects.unlink(previous)
archive.hide_viewport=True;archive.hide_render=True
col=bpy.data.collections.new(col_name);bpy.context.scene.collection.children.link(col)
s=c.P[owner];part=c.Part(owner+'_far_roof',col,bpy.data.objects[root_name],c.material('pbr_tile__charcoal'))
error=0
for side in ('front','side'):
    for sign in (-1,1):
        hw=s['width']/2+s['eave'];hd=s['depth']/2+s['eave'];ridge=max(.8,(s['width']-s['depth'])/2)
        spacing=.9 if revision==2 else 1.2
        nu=max(8,round((2*hw if side=='front' else 2*hd)/spacing)*2);nt=5
        for u in (0,1):
            curve=lambda t:s['bracket_top']+(s['roof_ridge']-s['bracket_top'])*t**1.3+.32*(1-t)**4*u**6
            for sample in range(601):
                t=sample/600*.985;i=min(nt-1,int(t/.985*nt));a=i/nt*.985;b=(i+1)/nt*.985
                error=max(error,abs(curve(t)-(curve(a)+(curve(b)-curve(a))*(t-a)/(b-a))))
        verts=[]
        for layer in (0,1):
            for i in range(nt+1):
                t=i/nt*.985
                for j in range(nu+1):
                    u=-1+2*j/nu
                    x,y=(u*(hw*(1-t)+ridge*t),sign*hd*(1-t)) if side=='front' else (sign*(hw*(1-t)+ridge*t),u*hd*(1-t))
                    z=s['bracket_top']+(s['roof_ridge']-s['bracket_top'])*t**1.3+.32*(1-t)**4*abs(u)**6+.025*(1-t)*(1+math.cos(j*math.pi))
                    verts.append((x,y,z-layer*.14))
        faces=[];count=(nu+1)*(nt+1)
        for i in range(nt):
            for j in range(nu):
                a=i*(nu+1)+j;b=a+1;d=(i+1)*(nu+1)+j;cc=d+1
                faces += [(a,b,cc,d),(a+count,d+count,cc+count,b+count)]
        boundary=list(range(nu+1))+[(i+1)*(nu+1)+nu for i in range(nt)]+list(reversed(range(nt*(nu+1),nt*(nu+1)+nu)))+[i*(nu+1) for i in range(nt-1,0,-1)]
        faces += [(a,b,b+count,a+count) for a,b in zip(boundary,boundary[1:]+boundary[:1])]
        part.add(verts,faces)
        for j in range(0,nu,2):part.tube([verts[j],verts[j+2]],.035,4)
ridge=max(.8,(s['width']-s['depth'])/2)
part.tube([(-ridge-.12,0,s['roof_ridge']+.03),(ridge+.12,0,s['roof_ridge']+.03)],.15,8)
for sign in (-1,1):
    part.tube([(sign*ridge,0,s['roof_ridge']+.05),(sign*(ridge+.14),0,s['roof_ridge']+.48),
               (sign*(ridge+.08),0,s['roof_ridge']+.86),(sign*(ridge-.24),0,s['roof_ridge']+1.02)],[.16,.15,.12,.035],6)
obj=part.mesh();obj.name=name
for uv in list(obj.data.uv_layers):obj.data.uv_layers.remove(uv)
for color in list(obj.data.color_attributes):obj.data.color_attributes.remove(color)
bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free();obj.data.update()
if obj.data.validate():raise RuntimeError('Invalid authored far roof')
bm=bmesh.new();bm.from_mesh(obj.data);nonmanifold=sum(not e.is_manifold for e in bm.edges);bm.free()
if nonmanifold or error>.06:raise RuntimeError('Far roof closure/curve failed')
for polygon in obj.data.polygons:polygon.use_smooth=True
bpy.data.collections['glb_scene_v02'].objects.link(obj);col.objects.unlink(obj)
near_name='temple_main' if owner=='temple' else 'bell_tower'
for mesh in bpy.data.objects[near_name].children_recursive:mesh.hide_set(True)
for mesh in bpy.data.objects[root_name].children_recursive:mesh.hide_set(False)
bpy.context.scene.camera=bpy.data.objects['CAM_temple']
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':area.spaces.active.region_3d.update()
report={'component':tag,'revision':revision,'ribSpacingMetres':spacing,'farTriangles':len(obj.data.polygons),'nonmanifoldEdges':nonmanifold,'curveErrorMetres':error}
version='-v'+str(revision).zfill(2)
with open(lod.OUT+'/components/'+tag+version+'.json','w',encoding='utf8') as stream:json.dump(report,stream,indent=2)
bpy.ops.wm.save_as_mainfile(filepath=lod.OUT+'/checkpoints/'+tag+version+'.blend',copy=True,check_existing=False)
bpy.ops.wm.save_as_mainfile(filepath=lod.ROOT+'/art/blender/fengqiao-scene-v02.blend',check_existing=False)
print(json.dumps(report))
