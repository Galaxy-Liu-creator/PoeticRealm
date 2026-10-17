"""Revise only the affected shoreline stones and their continuous snow crowns."""
import sys,math,random,bmesh,bpy
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue')
from common import *
col=component('jx_rock_snow_v02',('jx_shore_snow',))
previous=bpy.data.objects['src_shore_boulders']
data=previous.data.copy();obj=bpy.data.objects.new('src_shore_boulders_v02',data)
col.objects.link(obj);obj.parent=previous.parent;obj.location=previous.location;obj['static']=True
bm=bmesh.new();bm.from_mesh(data);seen=set();rng=random.Random(P['seed']+21)
ys=[-20,-16.7,-15.1,-10.8,-7.4,-5.3,2.2,4.8,8.9,13.3,15.0,18.6,24.1,27.0]
island_index=0
for vertex in bm.verts:
    if vertex in seen:continue
    island={vertex};pending=[vertex];seen.add(vertex)
    while pending:
        current=pending.pop()
        for edge in current.link_edges:
            other=edge.other_vert(current)
            if other not in seen:seen.add(other);island.add(other);pending.append(other)
    local=[v.co+obj.location for v in island]
    centre=Vector(tuple((min(v[a] for v in local)+max(v[a] for v in local))/2 for a in range(3)))
    y=ys[island_index]+rng.uniform(-.4,.4);distance=rng.uniform(-.45,2.8)
    x=-7.5+1.3*math.sin(y*.19)+.45*math.sin(y*.63)+distance
    floor=-.8+7.7*(1-math.exp(-max(0,distance)/28*3.4))
    target=Vector((x,y,floor+.4+centre.z))
    stretch=Vector((rng.uniform(.75,1.5),rng.uniform(.8,1.35),rng.uniform(.8,1.4)))
    for v in island:
        p=v.co+obj.location-centre
        p=Vector((p.x*stretch.x,p.y*stretch.y,p.z*stretch.z))
        p.x+=.15*math.sin(p.z*4.8+island_index)*math.sin(p.y*2)
        p.y+=.09*math.sin(p.z*3+p.x*2)
        v.co=p+target-obj.location
    island_index+=1
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free();data.update()
snow_vertices=[];snow_faces=[];mapping={}
for poly in data.polygons:
    if poly.normal.z<.28:continue
    face=[]
    for i in poly.vertices:
        if i not in mapping:
            mapping[i]=len(snow_vertices)
            p=data.vertices[i].co+obj.location
            snow_vertices.append(tuple(p+Vector((0,0,.105+.01*math.sin(p.x*2+p.y)))))
        face.append(mapping[i])
    snow_faces.append(tuple(face))
cap=mesh('rock_snow_caps_v02',snow_vertices,snow_faces,col,bpy.data.materials['pbr_snow__fresh'],obj.parent)
bpy.ops.object.select_all(action='DESELECT');cap.select_set(True);bpy.context.view_layer.objects.active=cap
mod=cap.modifiers.new('snow_volume','SOLIDIFY');mod.thickness=.09;mod.offset=-1
bpy.ops.object.modifier_apply(modifier=mod.name)
for old_name in ('src_shore_boulders','src_rock_snow_caps'):
    old=bpy.data.objects[old_name];old.hide_render=True;old.hide_set(True)
finish(col,extra={'replaces':['shore_boulders','rock_snow_caps'],'rockCount':island_index,
                 'snowSurface':'shared top vertices, closed 90mm volume','history':'initial source library and checkpoint preserved'})
view('CAM_nature')
