"""Only the promontory rim and fractured waterfront; the terrace stays supported."""
import sys
from pathlib import Path
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
from geology import noise2,finish
col=collection('bd_v02_city_rim');n=112;vs=[];fs=[];levels=[-3.,0.,.22,1.2,3.6,6.,10.,15.,21.,28.,36.,44.,51.,57.,61.,63.]
for j,z in enumerate(levels):
    t=j/(len(levels)-1)
    for i in range(n):
        a=math.tau*i/n;ca=math.cos(a);sa=math.sin(a)
        macro=noise2(ca*4,sa*4,SEED+763);fault=noise2(ca*11+z*.025,sa*11+z*.014,SEED+765)
        flare=1.07-.12*t+.065*macro+.055*fault*(1-.4*t)
        zz=z+(1.3*macro+.7*fault if j==len(levels)-1 else 0)
        vs.append((CITY[0]+42*ca*flare,CITY[1]+43*sa*flare,zz))
for j in range(len(levels)-1):
    for i in range(n):fs.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
inner=len(vs)
for i in range(n):
    a=math.tau*i/n;vs.append((CITY[0]+37.5*math.cos(a),CITY[1]+37.5*math.sin(a),63.))
top=(len(levels)-1)*n
for i in range(n):fs.append((top+i,top+(i+1)%n,inner+(i+1)%n,inner+i))
for ring,z in [(0,-3.),(inner,63.)]:
    center=len(vs);vs.append((*CITY[:2],z))
    for i in range(n):fs.append((center,ring+i,ring+(i+1)%n))
o=finish('src_city_promontory_rim_v02',vs,fs,col);checked(o)
bvh=BVHTree.FromPolygons([o.matrix_basis@v.co for v in o.data.vertices],[tuple(p.vertices) for p in o.data.polygons]);hits=[]
for x in [-25.5,25.5]:
    for y in [-25.5,25.5]:
        hit=bvh.ray_cast(Vector((CITY[0]+x,CITY[1]+y,130)),Vector((0,0,-1)))[0]
        assert hit is not None and abs(hit.z-63)<1e-4;hits.append(list(hit))
target=bpy.data.objects['city_promontory'];target.data=o.data.copy();target.matrix_basis=o.matrix_basis.copy()
save_component(col,{'terraceSupportPoints':hits,'flatSupportRadiusMeters':37.5,'rim':'non-circular jointed radius, variable outer rim elevation, inner terrace support plane at63m'})
