"""Only the city promontory, with support checks against the existing terrace."""
import sys
from pathlib import Path
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
from geology import promontory
col=collection('bd_v02_city_support');o=promontory(col);checked(o)
bvh=BVHTree.FromPolygons([o.matrix_basis@v.co for v in o.data.vertices],[tuple(p.vertices) for p in o.data.polygons])
hits=[]
for x in [-25.5,25.5]:
    for y in [-25.5,25.5]:
        hit=bvh.ray_cast(Vector((CITY[0]+x,CITY[1]+y,130)),Vector((0,0,-1)))[0]
        assert hit is not None and abs(hit.z-63)<1e-4
        hits.append(list(hit))
target=bpy.data.objects['city_promontory'];target.data=o.data.copy();target.matrix_basis=o.matrix_basis.copy()
save_component(col,{'terraceSupportPoints':hits,'waterlineMeters':.22,'layers':16,'radialSegments':112})
