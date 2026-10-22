"""Only the distant ridge terrain; preserve route and metric height encoding."""
import sys,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
from geology import noise,noise2
active();col=bpy.data.collections['terrain'];o=bpy.data.objects['terrain']
size=1000.;n=201
peaks=[(-250,70,190,106),(-190,290,176,96),(-90,402,146,84),(135,392,170,100),(255,255,201,112),(265,-30,159,104),(-165,-125,168,90),(170,-115,170,90)]
def smooth(x):
    t=max(0,min(1,x));return t*t*(3-2*t)
def height(x,y):
    h=max(a*math.exp(-((x-px)**2/(s*s)+(y-py)**2/(s*s*1.45))) for px,py,a,s in peaks)
    ridge=1+.14*noise2(x/41,y/68,SEED+80)+.075*noise2(x/17,y/31,SEED+81)+.028*noise2(x/7,y/13,SEED+82)
    lateral=smooth((abs(x-river_center(y))-54)/82)
    outside=max(smooth((y-255)/105),smooth((-y-180)/100))
    clearing=max(lateral,outside)
    opening=smooth((y-240)/160)
    half_width=28+56*opening
    channel=smooth((abs(x-river_center(y))-half_width)/(30+45*opening))
    return -3+h*ridge*clearing*channel
vertices=[(-500+size*i/(n-1),-500+size*j/(n-1),height(-500+size*i/(n-1),-500+size*j/(n-1))) for j in range(n) for i in range(n)]
faces=[(j*n+i,j*n+i+1,(j+1)*n+i+1,(j+1)*n+i) for j in range(n-1) for i in range(n-1)]
data=bpy.data.meshes.new('bd_terrain_ridges_v02');data.from_pydata(vertices,[],faces);data.update();o.data=data
assert max(abs(height(x,y)+3) for x,y in PATH)<.01
active()['bd_terrain_checked']=True
report('components/terrain-open.json',{'sizeMeters':[size,size],'grid':[n,n],'heightRange':[min(v[2] for v in vertices),max(v[2] for v in vertices)],'riverBedAtPath':[height(x,y) for x,y in PATH],'peaks':peaks,'relief':'three deterministic anisotropic noise scales, smooth valley clearing'})
LIB.mkdir(parents=True,exist_ok=True);bpy.data.libraries.write(str(LIB/'bd_v02_distant_terrain_open.blend'),{col},fake_user=True)
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
print('v02 terrain ridge checked:',len(vertices),'vertices')
