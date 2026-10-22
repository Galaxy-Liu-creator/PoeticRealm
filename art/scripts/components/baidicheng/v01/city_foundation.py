"""E: terrace, steps and perimeter wall; no roof or timber generation."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
assert active().get('bd_cliff_city_checked')
col=collection('bd_city_foundation');v=[];f=[];cx,cy,cz=CITY
stone=material('pbr_stone__bdcity',(.39,.37,.30),.92)
for z,w,d,h in [(cz+.20,51,51,.4),(cz+.65,50,50,.5),(cz+1.1,49,49,.4)]:append_geometry(v,f,box_data((cx,cy,z),(w,d,h)))
for i in range(9):append_geometry(v,f,box_data((cx,cy-25.8-i*.45,cz+1.2-i*.12),(7,.7,.16)))
mesh('src_city_terrace',v,f,col,[stone])
v=[];f=[]
for x,w in [(-14,20),(14,20)]:append_geometry(v,f,box_data((cx+x,cy-24,cz+2.6),(w,1.1,2.8)))
for x in [-24,24]:append_geometry(v,f,box_data((cx+x,cy,cz+2.6),(1.1,49,2.8)))
append_geometry(v,f,box_data((cx,cy+24,cz+2.6),(49,1.1,2.8)))
for side in [-1,1]:
 for i in range(15):append_geometry(v,f,box_data((cx+side*24,cy-23+i*3.2,cz+4.25),(1.25,1.3,.6)))
for x in range(-23,24,3):
 if abs(x)>4:append_geometry(v,f,box_data((cx+x,cy-24,cz+4.25),(1.3,1.25,.6)))
mesh('src_city_wall',v,f,col,[stone])
save_component(col,{'supportTopMeters':cz,'terraceTopMeters':cz+1.3,'gateOpeningMeters':8,'sizeMeters':[51,51]})
