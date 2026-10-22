"""G: thick hipped roofs, curved eaves and ridges on checked timber."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
assert active().get('bd_city_timber_checked')
col=collection('bd_city_roofs');cx,cy,cz=CITY
tile=material('pbr_tile__bdcity',(.21,.24,.23),.86)
ridgev=[];ridgef=[]
for idx,(x,y,w,d,h) in enumerate(BUILDINGS+[(0,-23,7,4,5.5)]):
    hw=w/2+1.25;hd=d/2+1.15;rise=min(2.6,d*.30);base=cz+1.3+h+.30;rw=max(.7,(w-d)*.5)
    vertices=[];faces=[]
    corners=[(-1,-1),(0,-1),(1,-1),(1,0),(1,1),(0,1),(-1,1),(-1,0)]
    specs=[(hw,hd,base-.18,0)]+[(hw*(1-s)+rw*s,hd*(1-s)+.055*s,base+rise*(.82*s+.18*s*s),.28*(1-s)**3) for s in [0,.17,.38,.62,.82,1]]
    for ww,dd,z,up in specs:
        for a,b in corners:vertices.append((cx+x+a*ww,cy+y+b*dd,z+up*(abs(a*b))))
    for j in range(len(specs)-1):
        for k in range(8):faces.append((j*8+k,j*8+(k+1)%8,(j+1)*8+(k+1)%8,(j+1)*8+k))
    faces.extend([tuple(reversed(range(8))),tuple((len(specs)-1)*8+k for k in range(8))])
    mesh('src_city_roof_%02d'%idx,vertices,faces,col,[tile],smooth=False)
    append_geometry(ridgev,ridgef,cylinder_data((cx+x-rw,cy+y,base+rise+.06),(cx+x+rw,cy+y,base+rise+.06),.12,.12,8))
    for side in [-1,1]:append_geometry(ridgev,ridgef,cylinder_data((cx+x+side*rw,cy+y,base+rise+.06),(cx+x+side*(rw+.35),cy+y,base+rise+.38),.12,.055,8))
mesh('src_city_ridges',ridgev,ridgef,col,[tile])
save_component(col,{'roofs':7,'eaveThicknessMeters':.18,'shape':'broad shallow four-slope roofs; eave curve and hip outlines remain geometry','framework':'bd_city_timber'})
