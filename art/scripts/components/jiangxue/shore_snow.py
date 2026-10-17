"""One component: snow thickness following checked bank surfaces and rock crowns."""
import sys,math
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue')
from common import *
col=component('jx_shore_snow',('jx_shore_rock','jx_boat_snow'))
snow=bpy.data.materials['pbr_snow__fresh'];parent=bpy.data.objects['shore_root']
bank=bpy.data.objects['src_shore_bank'];vs=[];faces=[];xs=41;ys=53
# Reuse the exact checked top grid; leave the first two waterline rows exposed.
for j in range(ys):
    for i in range(2,xs):
        p=bank.data.vertices[j*xs+i].co+bank.location
        depth=.19+.065*math.sin(p.y*.24+p.x*.6)+.04*math.sin(p.x*1.8-p.y*.9)
        vs.append(tuple(p+Vector((0,0,max(.08,depth)))))
n=xs-2
faces=[(j*n+i,j*n+i+1,(j+1)*n+i+1,(j+1)*n+i) for j in range(ys-1) for i in range(n-1)]
edge=[*range(n),*(j*n+n-1 for j in range(1,ys)),*((ys-1)*n+i for i in range(n-2,-1,-1)),*(j*n for j in range(ys-2,0,-1))]
low=len(vs)
for i in edge:vs.append(tuple(Vector(vs[i])-Vector((0,0,.07))))
for k,index in enumerate(edge):
    nxt=(k+1)%len(edge);faces.append((index,low+k,low+nxt,edge[nxt]))
faces.append(tuple(reversed(range(low,len(vs)))))
mesh('shore_snow',vs,faces,col,snow,parent)
# Snow crown surfaces use the actual rock faces whose normals face upward.
rocks=bpy.data.objects['src_shore_boulders'];rv=[];rf=[]
for poly in rocks.data.polygons:
    if poly.normal.z<.35:continue
    points=[rocks.data.vertices[i].co+rocks.location for i in poly.vertices]
    if min(p.z for p in points)<1.1:continue
    offset=len(rv);thickness=.09
    rv.extend(tuple(p+Vector((0,0,thickness))) for p in points)
    rv.extend(tuple(p+Vector((0,0,.006))) for p in points)
    k=len(points);rf.extend([tuple(offset+i for i in range(k)),tuple(offset+k+i for i in reversed(range(k)))])
    rf.extend((offset+i,offset+k+i,offset+k+(i+1)%k,offset+(i+1)%k) for i in range(k))
mesh('rock_snow_caps',rv,rf,col,snow,parent)
finish(col,extra={'bankSnowDepthMetres':[.08,.30],'rockCapThickness':.09,'surfaceSource':'checked bank grid and upward rock polygons'})
view('CAM_nature')
