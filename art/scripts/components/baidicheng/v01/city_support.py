"""Widen only the city support before adding the square terrace."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
col=bpy.data.collections['bd_cliff_city'];col.name='bd_cliff_city_support'
o=bpy.data.objects['src_city_promontory'];inverse=o.matrix_world.inverted()
for v in o.data.vertices:
    world=o.matrix_world@v.co;world.x=CITY[0]+(world.x-CITY[0])*42/30;world.y=CITY[1]+(world.y-CITY[1])*43/31
    v.co=inverse@world
normalize_origin(o)
from mathutils.bvhtree import BVHTree
points=[o.matrix_world@v.co for v in o.data.vertices];bvh=BVHTree.FromPolygons(points,[tuple(p.vertices) for p in o.data.polygons])
hits=[]
for x in [-25.5,25.5]:
 for y in [-25.5,25.5]:
    hit=bvh.ray_cast(Vector((CITY[0]+x,CITY[1]+y,100)),Vector((0,0,-1)))[0]
    assert hit is not None and abs(hit.z-63)<1e-4,(x,y,list(hit) if hit else None)
    hits.append(list(hit))
save_component(col,{'foundationCornerSupport':hits,'topRadiusMeters':[39.9,40.85],'revision':'widened before foundation placement'})
