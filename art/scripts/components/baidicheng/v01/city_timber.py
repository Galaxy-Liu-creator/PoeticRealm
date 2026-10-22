"""F: parameterized posts, lintels, eave supports and small enclosure panels."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
assert active().get('bd_city_foundation_checked')
col=collection('bd_city_timber');cx,cy,cz=CITY
wood=material('pbr_wood__bdcity',(.21,.115,.061),.8)
plaster=material('pbr_stone__bdplaster',(.65,.59,.45),.96)
v=[];f=[];wallv=[];wallf=[]
buildings=BUILDINGS+[(0,-23,7,4,5.5)]
for x,y,w,d,h in buildings:
    floor=cz+1.3;top=floor+h
    for xx in [-w/2,0,w/2]:
        for yy in [-d/2,d/2]:append_geometry(v,f,cylinder_data((cx+x+xx,cy+y+yy,floor),(cx+x+xx,cy+y+yy,top),.20,.17,10))
    for yy in [-d/2,d/2]:
        append_geometry(v,f,box_data((cx+x,cy+y+yy,top-.25),(w+.55,.30,.38)))
        append_geometry(v,f,box_data((cx+x,cy+y+yy,top+.12),(w+1.4,.45,.28)))
    for xx in [-w/2,0,w/2]:
        append_geometry(v,f,box_data((cx+x+xx,cy+y,top+.25),(.28,d+1.8,.30)))
        for yy in [-d/2,d/2]:append_geometry(v,f,box_data((cx+x+xx,cy+y+yy,top-.02),(.8,.8,.2)))
    if y>-20:
        append_geometry(wallv,wallf,box_data((cx+x,cy+y+d/2-.1,floor+h*.46),(w-.3,.22,h*.92)))
        for xx in [-w/2+.1,w/2-.1]:append_geometry(wallv,wallf,box_data((cx+x+xx,cy+y,floor+h*.46),(.22,d-.3,h*.92)))
        for xx in [-w*.34,w*.34]:append_geometry(wallv,wallf,box_data((cx+x+xx,cy+y-d/2+.1,floor+h*.46),(w*.27,.22,h*.92)))
mesh('src_city_timber',v,f,col,[wood]);mesh('src_city_enclosure',wallv,wallf,col,[plaster])
save_component(col,{'buildings':len(buildings),'sharedBayParameters':True,'postRadiusMeters':.2,'support':'terrace top + 1.3m'})
