"""J: one independent metric distant-terrain component, with a carved river valley."""
import sys,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
active();assert 'terrain' not in bpy.data.collections
col=bpy.data.collections.new('terrain');bpy.context.scene.collection.children.link(col)
size=1000.;n=161
peaks=[(-250,70,174,105),(-190,290,156,96),(-90,402,128,84),(135,392,148,100),(255,255,182,112),(265,-30,131,104)]
def height(x,y):
    h=max(a*math.exp(-((x-px)**2/(s*s)+(y-py)**2/(s*s*1.45))) for px,py,a,s in peaks)
    detail=1+.04*math.sin(x*.071+y*.035)+.025*math.sin(x*.137-y*.11)
    clearing=1-math.exp(-(max(0,abs(x)-137)/58)**2-(max(0,y-277)/74)**2-(max(0,-y-115)/90)**2)
    channel=1-math.exp(-(max(0,abs(x-river_center(y))-27)/25)**2)
    return -3+h*detail*clearing*channel
vertices=[(-size/2+size*i/(n-1),-size/2+size*j/(n-1),height(-size/2+size*i/(n-1),-size/2+size*j/(n-1))) for j in range(n) for i in range(n)]
faces=[(j*n+i,j*n+i+1,(j+1)*n+i+1,(j+1)*n+i) for j in range(n-1) for i in range(n-1)]
data=bpy.data.meshes.new('bd_terrain_grid');data.from_pydata(vertices,[],faces);data.update()
o=bpy.data.objects.new('terrain',data);col.objects.link(o)
assert max(abs(height(x,y)+3) for x,y in PATH)<.01
active()['bd_terrain_checked']=True
report('components/terrain.json',{'sizeMeters':[size,size],'grid':[n,n],'heightRange':[min(v[2] for v in vertices),max(v[2] for v in vertices)],'riverBedAtPath':[height(x,y) for x,y in PATH],'peaks':peaks})
LIB.mkdir(parents=True,exist_ok=True);bpy.data.libraries.write(str(LIB/'bd_distant_terrain.blend'),{col},fake_user=True)
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
print('Independent terrain checked, metric height range:',min(v[2] for v in vertices),max(v[2] for v in vertices))
