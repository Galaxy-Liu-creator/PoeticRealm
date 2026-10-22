"""Only real roof ribs/eave lines on the seven checked thick roof surfaces."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
col=collection('bd_v03_city_roof_detail');tile=bpy.data.materials['pbr_tile__bdcity'];v=[];f=[];cv=[];cf=[];counts=[]
for bi,(x,y,w,d,h) in enumerate(BUILDINGS+[(0,-23,7,4,5.5)]):
    hw=w/2+1.25;hd=d/2+1.15;rise=min(2.6,d*.30);base=CITY[2]+1.3+h+.30;rw=max(.7,(w-d)*.5)
    amount=max(6,round(w/.85));count=0
    for side in [-1,1] if bi in [0,3,6] else [-1]:
        for k in range(amount+1):
            q=-.91+1.82*k/amount;points=[];faces=[]
            for s in [0.,.45,.90]:
                ww=hw*(1-s)+rw*s;dd=hd*(1-s)+.055*s
                z=base+rise*(.82*s+.18*s*s)+.28*(1-s)**3*abs(q)+.065
                c=Vector((CITY[0]+x+q*ww,CITY[1]+y+side*dd,z))
                points.extend(tuple(c+Vector(delta)) for delta in [(-.035,0,0),(0,0,.035),(.035,0,0),(0,0,-.025)])
            for j in range(2):
                for a in range(4):faces.append((j*4+a,j*4+(a+1)%4,(j+1)*4+(a+1)%4,(j+1)*4+a))
            faces.extend([(3,2,1,0),(8,9,10,11)]);append_geometry(v,f,(points,faces));count+=1
    for side in [-1,1]:
        p=box_data((CITY[0]+x,CITY[1]+y+side*hd,base-.11),(hw*2,.14,.16));append_geometry(v,f,p);append_geometry(cv,cf,p)
    counts.append({'roof':bi,'raisedRibs':count})
mesh('src_city_roof_detail_v03',v,f,col,[tile]);mesh('src_city_roof_coarse_v03',cv,cf,col,[tile])
save_component(col,{'roofs':counts,'ribWidthMeters':.07,'ribSurfaceOffsetMeters':.065,'ribStations':[0,.45,.90],'eaveThicknessMeters':.16})
