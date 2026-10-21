"""Single terrain component: open foreground and layered distant ridges in metres."""
import sys, math
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common_v06 import *

def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)

assert not active().get('jx_v06_terrain_checked')
col=bpy.data.collections.get('jx_v06_terrain') or new_collection('jx_v06_terrain')
obj=bpy.data.objects.get('src_terrain_v06')
if obj is None:
    old=bpy.data.objects['terrain'];obj=old.copy();obj.data=old.data.copy();obj.name='src_terrain_v06';col.objects.link(obj)
peaks=[(-174,190,29,64,74),(-242,270,38,60,72),(-116,284,23,40,59),
       (142,155,33,50,64),(233,265,47,59,63),(112,289,24,38,45)]
for v in obj.data.vertices:
    x,y=v.co.x,v.co.y;center=7*math.sin(y*.009)+5*math.sin(y*.019)
    distance=max(0,abs(x-center)-(37+5*math.cos(y*.012)))
    ramp=1-math.exp(-distance/43)
    shoulder=13+5*math.sin(y*.026+x*.011)+2.5*math.sin(y*.065-x*.038)
    peak=sum(h*math.exp(-((x-cx)/sx)**2-((y-cy)/sy)**2) for cx,cy,h,sx,sy in peaks)
    erosion=(2.8*math.sin(x*.092+y*.063)+1.1*math.sin(x*.186-y*.124)) * ramp
    near=smooth(100,174,math.hypot(x,y))
    v.co.z=-2.5+max(0,shoulder+peak+erosion)*ramp*near
obj.data.update()
assert len(obj.data.vertices)==145*145
assert min(v.co.z for v in obj.data.vertices)<-2.4 and max(v.co.z for v in obj.data.vertices)<75
check_mesh(obj,closed=False)
report('components/jx_v06_terrain.json',{'component':col.name,'samples':145,'sizeMetres':[600,600],
       'heightMetres':[min(v.co.z for v in obj.data.vertices),max(v.co.z for v in obj.data.vertices)],
       'peaks':peaks,'riverCorridorPreserved':True})
active()[col.name+'_checked']=True
LIBRARY.mkdir(parents=True,exist_ok=True);bpy.data.libraries.write(str(LIBRARY/(col.name+'.blend')),{col},fake_user=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT/'checkpoints/jx_v06_terrain.blend'),copy=True,check_existing=False)
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
print('Distant terrain saved; source heights retained in metres')
