"""Only the existing hall fronts: recessed windows, straight timber grilles and doors."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
col=collection('bd_v03_city_joinery');wood=bpy.data.materials['pbr_wood__bdcity'];dark=material('pbr_wood__bdrecess',(.045,.052,.035),.98)
v=[];f=[];slots=[];cv=[];cf=[];floor=CITY[2]+1.3;windows=[]
def part(center,size,slot=0):
    p=box_data(center,size);append_geometry(v,f,p);slots.extend([slot]*len(p[1]))
for bi,(x,y,w,d,h) in enumerate(BUILDINGS):
    front=CITY[1]+y-d/2-.06;z=floor+h*.56;wh=min(1.9,h*.47);ww=min(2.7,w*.22)
    for side in [-1,1]:
        px=CITY[0]+x+side*w*.34
        part((px,front+.025,z),(ww,.035,wh),1)
        for sx in [-1,1]:part((px+sx*ww/2,front-.018,z),(.09,.095,wh+.16))
        for sz in [-1,1]:part((px,front-.018,z+sz*wh/2),(ww+.09,.095,.09))
        for k in range(1,7):part((px-ww/2+ww*k/7,front-.035,z),(.045,.07,wh))
        part((px,front-.04,z+.25),(ww,.075,.055))
        append_geometry(cv,cf,box_data((px,front,z),(ww,.07,wh)))
        windows.append({'center':[px,front,z],'size':[ww,wh]})
    # Plain paired plank doors inside the existing central entrance bay.
    dw=min(1.6,w*.16);dh=min(3.2,h*.73);center=CITY[0]+x
    for side in [-1,1]:
        part((center+side*(dw/2+.035),front+.08,floor+dh/2),(dw,.12,dh))
        part((center+side*(dw/2+.035),front-.005,floor+dh*.24),(dw,.08,.12))
        part((center+side*(dw/2+.035),front-.005,floor+dh*.76),(dw,.08,.12))
        part((center+side*.15,front-.04,floor+dh*.51),(.08,.08,.32))
        append_geometry(cv,cf,box_data((center+side*(dw/2+.035),front+.08,floor+dh/2),(dw,.12,dh)))
# Gate side boards leave a clear central passage between its original posts.
for side in [-1,1]:part((CITY[0]+side*2.6,CITY[1]-24.96,floor+1.9),(1.3,.12,3.8))
o=mesh('src_city_joinery_detail_v03',v,f,col,[wood,dark])
for p,i in zip(o.data.polygons,slots):p.material_index=i
mesh('src_city_joinery_coarse_v03',cv,cf,col,[dark])
save_component(col,{'windows':windows,'frontOffsetMeters':.06,'mullionWidthMeters':.045,'halls':6,'doors':'plain paired boards in existing openings','gateClearWidthMeters':3.9})
