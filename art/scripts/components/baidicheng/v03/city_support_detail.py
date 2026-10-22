"""Only column bases and bracket support; modify the affected post tops explicitly."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
col=collection('bd_v03_city_support');buildings=BUILDINGS+[(0,-23,7,4,5.5)];floor=CITY[2]+1.3
v=[];f=[];slots=[];cv=[];cf=[];wood=bpy.data.materials['pbr_wood__bdcity'];stone=bpy.data.materials['pbr_stone__bdcity']
def part(data,slot):
    slots.extend([slot]*len(data[1]));append_geometry(v,f,data)
def arm(center,length,depth,axis):
    cx,cy,cz=center;profile=[(-length/2,.10),(-length/2,-.02),(-length*.30,-.18),(length*.30,-.18),(length/2,-.02),(length/2,.10)]
    verts=[]
    for side in [-1,1]:
        for a,z in profile:verts.append((cx+(a if axis==0 else side*depth/2),cy+(side*depth/2 if axis==0 else a),cz+z))
    n=len(profile);faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return verts,faces
target=bpy.data.objects['city_timber'];tv=[target.matrix_basis@p.co for p in target.data.vertices];assert len(tv)==1568
connections=[]
for bi,(x,y,w,d,h) in enumerate(buildings):
    top=floor+h;post_top=top-1.1
    for ix,xx in enumerate([-w/2,0,w/2]):
        for iy,yy in enumerate([-d/2,d/2]):
            px=CITY[0]+x+xx;py=CITY[1]+y+yy;pi=bi*224+(ix*2+iy)*20
            assert all(abs(tv[pi+k].z-top)<1e-4 for k in range(10,20))
            for k in range(10,20):tv[pi+k].z=post_top
            part(cylinder_data((px,py,floor-.1),(px,py,floor+.12),.37,.32,8),0)
            part(box_data((px,py,post_top+.125),(.62,.62,.25)),1)
            part(arm((px,py,post_top+.35),1.45,.29,0),1)
            part(arm((px,py,post_top+.85),1.60,.30,1),1)
            part(box_data((px,py,post_top+.81),(.43,.43,.78)),1)
            append_geometry(cv,cf,box_data((px,py,post_top+.5),(.45,.45,1.0)))
            append_geometry(cv,cf,box_data((px,py,top-.05),(.65,1.55,.3)))
            connections.append({'post':[px,py,post_top],'bearingTop':post_top+1.20,'beamUnderside':top-.44})
o=mesh('src_city_support_detail_v03',v,f,col,[stone,wood])
for p,i in zip(o.data.polygons,slots):p.material_index=i
coarse=mesh('src_city_support_coarse_v03',cv,cf,col,[wood])
timber=mesh('src_city_timber_lowered_v03',[tuple(p) for p in tv],[tuple(p.vertices) for p in target.data.polygons],col,[wood])
checked(timber);target.data=timber.data.copy();target.matrix_basis=timber.matrix_basis.copy()
save_component(col,{'posts':42,'postShorteningMeters':1.1,'baseRadiusMeters':.37,'bearingSpanMeters':[1.45,1.60],'connections':connections,'scope':'support geometry only; same floor and roof levels'})
