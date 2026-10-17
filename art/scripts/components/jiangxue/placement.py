"""Assembly placement correction only: land feet and keep the line's water endpoint."""
import sys,json
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue')
from common import *
from mathutils.bvhtree import BVHTree
scene=active();graph=bpy.context.evaluated_depsgraph_get()
if scene.get('placement_checked'):raise RuntimeError('Placement already corrected')
deck=bpy.data.objects['src_boat_wood_aged'];bvh=BVHTree.FromObject(deck,graph);inv=deck.matrix_world.inverted()
rows=[]
for side in ('left','right'):
    shoe=bpy.data.objects['src_fisherman_shoe_'+side];ev=shoe.evaluated_get(graph)
    coords=[shoe.matrix_world@v.co for v in ev.data.vertices];sole=min(v.z for v in coords)
    p=Vector((sum(v.x for v in coords)/len(coords),sum(v.y for v in coords)/len(coords),sole+.15))
    hit=bvh.ray_cast(inv@p,inv.to_3x3()@Vector((0,0,-1)))
    if hit[0] is None:raise RuntimeError('Shoe misses deck')
    rows.append({'side':side,'soleBefore':sole,'deck':(deck.matrix_world@hit[0]).z})
delta=sum(r['deck']-r['soleBefore'] for r in rows)/2
bpy.data.objects['src_fisherman_rig'].location.z+=delta
bpy.data.objects['fishing_rod'].location.z+=delta
spec=json.loads(scene['fishing_parameters']);line=bpy.data.objects['src_fishing_line']
top=spec['tip'][2];bottom=spec['water'][2]
for vertex in line.data.vertices:
    height=vertex.co.z+line.location.z
    vertex.co.z+=delta*max(0,min(1,(height-bottom)/(top-bottom)))
offset=min(v.co.z for v in line.data.vertices)
for v in line.data.vertices:v.co.z-=offset
line.location.z+=offset;line.data.update()
spec['tip'][2]+=delta
for grip in spec['grips'].values():grip[2]+=delta
scene['fishing_parameters']=json.dumps(spec)
scene['placement_checked']=True
scene['placement_report']=json.dumps({'deltaZ':delta,'feet':rows,'waterEndpoint':spec['water']})
finish(bpy.data.collections['jx_fishing_tackle'],extra={'placement':json.loads(scene['placement_report'])})
view('CAM_boat')
