"""One component: duplicate the validated v04 hull and its wooden structure into Jiangxue."""
import bpy,bmesh,sys,json
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue')
from common import *
col=component('jx_boat_structure')
with bpy.data.libraries.load(ROOT+'/art/blender/fengqiao-sample-v04.blend',link=False) as (source,target):
    target.objects=['boat_hull_closed','boat_wood_aged']
boat=bpy.data.objects['boat_guest']
removed=[]
for obj in target.objects:
    obj.name='src_'+obj.name;col.objects.link(obj)
    obj.parent=boat;obj['static']=False
    # Make the fishing boat open. Remove only complete disconnected canopy-frame parts.
    if obj.name=='src_boat_wood_aged':
        bm=bmesh.new();bm.from_mesh(obj.data);seen=set();remove=[]
        for vertex in bm.verts:
            if vertex in seen:continue
            island=set([vertex]);pending=[vertex];seen.add(vertex)
            while pending:
                current=pending.pop()
                for edge in current.link_edges:
                    other=edge.other_vert(current)
                    if other not in seen:seen.add(other);island.add(other);pending.append(other)
            coords=[v.co+obj.location for v in island]
            if max(v.z for v in coords)>1.15:
                removed.append({'vertices':len(island),'maxHeight':max(v.z for v in coords)});remove.extend(island)
        bmesh.ops.delete(bm,geom=remove,context='VERTS');bm.to_mesh(obj.data);bm.free();obj.data.update()
    for i,mat in enumerate(obj.data.materials):
        local=mat.copy();local.name='pbr_wood__jx_hull' if obj.name=='src_boat_hull_closed' else 'pbr_wood__jx_structure'
        obj.data.materials[i]=local
    # Recenter local origins after removing the canopy, preserving all parent-space coordinates.
    vertices=obj.data.vertices
    center=Vector(((min(v.co.x for v in vertices)+max(v.co.x for v in vertices))/2,
                   (min(v.co.y for v in vertices)+max(v.co.y for v in vertices))/2,min(v.co.z for v in vertices)))
    for v in vertices:v.co-=center
    obj.location+=center;obj.data.update()
finish(col,extra={'source':'fengqiao-sample-v04.blend','removedCanopyParts':removed,
                 'hullPreserved':True,'boatOrigin':list(boat.location)})
view()
