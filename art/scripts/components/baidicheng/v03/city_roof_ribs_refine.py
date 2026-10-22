"""Refine only the near roof ribs against the actual triangulated roof surfaces."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
from mathutils.bvhtree import BVHTree
col=collection('bd_v03_city_roof_ribs_refined');tile=bpy.data.materials['pbr_tile__bdcity'];v=[];f=[];counts=[]
for bi,(x,y,w,d,h) in enumerate(BUILDINGS+[(0,-23,7,4,5.5)]):
    roof=bpy.data.objects['city_roof_%02d'%bi]
    rv=[roof.matrix_basis@p.co for p in roof.data.vertices]
    roof.data.calc_loop_triangles();bvh=BVHTree.FromPolygons(rv,[tuple(t.vertices) for t in roof.data.loop_triangles],all_triangles=True)
    def surface(point):
        hit=bvh.ray_cast(Vector((point.x,point.y,300)),Vector((0,0,-1)))[0]
        assert hit is not None,(bi,tuple(point))
        return hit.z
    hw=w/2+1.25;hd=d/2+1.15;rw=max(.7,(w-d)*.5);amount=max(6,round(w/1.1));clearances=[];count=0
    for side in [-1,1] if bi in [0,3,6] else [-1]:
        for k in range(amount+1):
            q=-.91+1.82*k/amount;centers=[]
            for s in [.001,.45,.90]:
                ww=hw*(1-s)+rw*s;dd=hd*(1-s)+.055*s
                c=Vector((CITY[0]+x+q*ww,CITY[1]+y+side*dd,0));c.z=surface(c)+.10;centers.append(c)
            minimum=min(a.lerp(b,j/32).z-surface(a.lerp(b,j/32)) for a,b in zip(centers,centers[1:]) for j in range(33))
            lift=max(0,.10-minimum)
            for c in centers:c.z+=lift
            clearances.append(minimum+lift-.04)
            points=[];faces=[]
            for c in centers:points.extend(tuple(c+Vector(delta)) for delta in [(-.08,0,0),(0,0,.04),(.08,0,0),(0,0,-.04)])
            for j in range(2):
                for a in range(4):faces.append((j*4+a,j*4+(a+1)%4,(j+1)*4+(a+1)%4,(j+1)*4+a))
            faces.extend([(3,2,1,0),(8,9,10,11)]);append_geometry(v,f,(points,faces));count+=1
    # Existing checked fascia geometry is copied unchanged.
    coarse=bpy.data.objects['src_city_roof_coarse_v03'];world=coarse.matrix_basis
    # Each roof has two eight-vertex fascia boxes in the coarse component.
    offset=bi*16;verts=[tuple(world@p.co) for p in list(coarse.data.vertices)[offset:offset+16]]
    faces=[tuple(i-offset for i in p.vertices) for p in coarse.data.polygons if all(offset<=i<offset+16 for i in p.vertices)]
    append_geometry(v,f,(verts,faces));counts.append({'roof':bi,'ribs':count,'minimumBottomClearanceMeters':min(clearances)})
o=mesh('src_city_roof_ribs_refined_v03',v,f,col,[tile]);checked(o)
target=bpy.data.objects['city_roof_detail'];target.data=o.data.copy();target.matrix_basis=target.parent.matrix_basis.inverted()@o.matrix_basis
save_component(col,{'roofs':counts,'ribWidthMeters':.16,'ribStations':[.001,.45,.90],'fit':'actual triangulated thick roof;33 samples per span; no coplanar overlap','previous':'bd_v03_city_roof_detail retained'})
