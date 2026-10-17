"""One far timber frame at a time, preserving rectangular bearings and silhouette."""
import bpy, sys, math, json, os, bmesh
from mathutils import Matrix, Vector
sys.path.insert(0, 'D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao')
import common as c
import distance_lod as lod

owner = globals().get('OWNER')
if owner not in ('temple', 'tower'): raise RuntimeError('Specify one OWNER')
lod.active()
tag, root_name, camera = ('temple-frame','temple_far','CAM_temple') if owner == 'temple' else ('bell-frame','bell_far','CAM_bell')
col_name = 'lod_' + tag.replace('-', '_')
previous = bpy.data.collections[col_name]
if bpy.data.collections.get(col_name + '_v01'): raise RuntimeError('Frame revision already authored')
previous.name += '_v01'; previous.hide_viewport = True; previous.hide_render = True
for obj in previous.objects:
    obj.name += '_v01'; world = obj.matrix_world.copy(); obj.parent = None; obj.matrix_world = world
col = bpy.data.collections.new(col_name); bpy.context.scene.collection.children.link(col)
s = c.P[owner]; root = bpy.data.objects[root_name]
part = c.Part(owner + '_far_frame', col, root, c.material('pbr_wood__aged'))
bottom, top, r = s['column_bottom'], s['column_top'], s['column_radius']
for x,y in c.column_grid(s):
    lift = .10*(abs(x)/(s['width']/2))**2
    part.tube([(x,y,bottom),(x-x*.008,y-y*.008,top+lift)], [r,r*.88], 8)
n = s.get('bays',1); xs = [-s['width']/2+s['width']*i/n for i in range(n+1)]
for y in (-s['depth']/2,s['depth']/2):
    for a,b in zip(xs,xs[1:]): part.box(((a+b)/2,y,top-.14),(b-a+.16,.32,.36))
for x in xs: part.box((x,0,top+.13),(.34,s['depth']+.24,.34))
if owner == 'temple':
    for y in (-s['depth']/6,s['depth']/6): part.box((0,y,top+.25),(s['width']-.4,.34,.38))

def arm(x,y,z,length,width,height,rotation):
    profile=[(-length/2,.11),(-length*.17,-height*.55),(length*.17,-height*.55),(length/2,.11),
             (length/2,height*.45),(-length/2,height*.45)]
    verts=[tuple(Vector((x,y,z))+rotation@Vector((px,sy*width/2,pz))) for sy in (-1,1) for px,pz in profile]
    count=len(profile)
    faces=[tuple(reversed(range(count))),tuple(count+i for i in range(count))]
    faces += [(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
    part.add(verts,faces,wood=True)

for x,y in c.column_grid(s):
    perimeter=abs(abs(y)-s['depth']/2)<.01
    start=top+.10*(abs(x)/(s['width']/2))**2
    part.box((x,y,start+.12),(.53,.53,.24))
    steps=3 if owner=='temple' else 2
    increment=(s['bracket_top']-start-.25)/steps
    for k in range(steps):
        # The outermost arm reaches the same upper bearing as the near component.
        progress=k/(steps-1); extension=.28+progress*(1.05 if owner=='temple' else .70)
        z=start+.28+k*increment
        arm(x,y,z,1+progress*(1.08 if owner=='temple' else .72),.20,.28,Matrix.Identity(3))
        direction=1 if y>0 else -1; offset=direction*extension if perimeter else 0
        arm(x,y+offset,z+.12,1.02+progress*(1.38 if owner=='temple' else .92),.23,.28,Matrix.Rotation(math.pi/2,3,'Z'))
        for sign in (-1,1): part.box((x+sign*(.32+progress*(.42 if owner=='temple' else .28)),y+offset,z+increment-.05),(.25,.27,.17))
        if perimeter: part.box((x,y+direction*(extension+.35),z+increment-.05),(.30,.34,.17))
    part.box((x,y+(1 if y>0 else -1)*1.52 if perimeter else y,s['bracket_top']-.08),(.36,.45,.18))

hw=s['width']/2+s['eave']; hd=s['depth']/2+s['eave']
ridge=max(.8,(s['width']-s['depth'])/2); ez=s['bracket_top']; rz=s['roof_ridge']-.16
for y in (-hd+.25,-s['depth']/2,0,s['depth']/2,hd-.25):
    f=abs(y)/hd; z=ez+(rz-ez)*(1-f)**1.3-.12; span=hw*f+ridge*(1-f)-.12
    part.tube([(-span,y,z),(span,y,z)],.11,6)
part.tube([(-ridge-.4,0,rz-.12),(ridge+.4,0,rz-.12)],.17,6)
for sign in (-1,1):
    part.box((0,sign*s['depth']/6,ez+.12),(s['width']+.25,.34,.30))
    part.box((sign*ridge,0,ez+.12),(.34,s['depth']+.25,.30))
for x,y in c.column_grid(s):
    t=1-abs(y)/hd; z=ez+(rz-ez)*t**1.3-.12
    if z>ez+.15: part.box((x,y,(ez+z)/2),(.22,.22,z-ez+.08))
for x in (-ridge,ridge):
    for sign in (-1,1): part.tube([(x,sign*s['depth']/6,ez+.3),(x,0,rz-.14)],[.14,.10],6)
count=round(2*hw/.85)
for i in range(count+1):
    x=-hw+2*hw*i/count
    for sign in (-1,1):
        points=[]
        for j in range(4):
            t=j/3; points.append((x*(1-t)+max(-ridge,min(ridge,x))*t,sign*hd*(1-t),
                                  ez+(rz-ez)*t**1.3+.32*(1-t)**4*(abs(x)/hw)**6-.10))
        part.tube(points,.052,4)
for sign in (-1,1):
    for i in range(9):
        y=-hd+i*2*hd/8
        points=[(sign*(hw*(1-j/3)+ridge*j/3),y*(1-j/3),ez+(rz-ez)*(j/3)**1.3+.32*(1-j/3)**4*(abs(y)/hd)**6-.10) for j in range(4)]
        part.tube(points,.05,4)
    points=[(-hw+2*hw*i/12,sign*hd,ez+.32*abs(-1+2*i/12)**6-.10) for i in range(13)]
    part.tube(points,.12,6)
obj=part.mesh(); obj.name=root_name+'_wood_aged'
# Door/window and bell frame are checked near components copied without alteration.
source_name='src_temple_doors_windows' if owner=='temple' else 'src_bell_frame'
source=bpy.data.objects[source_name]
copy=source.copy(); copy.data=source.data.copy(); copy.modifiers.clear(); col.objects.link(copy); copy.parent=root
bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); copy.select_set(True); bpy.context.view_layer.objects.active=obj
bpy.ops.object.join()
for attribute in list(obj.data.color_attributes): obj.data.color_attributes.remove(attribute)
bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
nonmanifold=sum(not e.is_manifold for e in bm.edges);bm.to_mesh(obj.data);bm.free();obj.data.update()
if nonmanifold: raise RuntimeError('Far timber not closed')
report={'component':tag,'revision':2,'method':'parameter-authored bearings/columns/rafters; checked enclosure copied',
        'farTriangles':len(obj.data.polygons),'nonmanifoldEdges':nonmanifold}
with open(lod.OUT+'/components/'+tag+'-v02.json','w',encoding='utf8') as stream:json.dump(report,stream,indent=2)
bpy.context.scene.camera=bpy.data.objects[camera]
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D': area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.region_3d.update()
bpy.ops.wm.save_as_mainfile(filepath=lod.OUT+'/checkpoints/'+tag+'-v02.blend',copy=True,check_existing=False)
bpy.ops.wm.save_as_mainfile(filepath=lod.ROOT+'/art/blender/fengqiao-scene-v02.blend',check_existing=False)
print(json.dumps(report))
