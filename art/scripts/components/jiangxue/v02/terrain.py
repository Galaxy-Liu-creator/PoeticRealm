"""One component revision: layered valley shoulders and asymmetric distant ridges."""
import sys,math,json
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue/v02')
from common_v02 import *
scene=active();terrain=bpy.data.objects['terrain']
assert not scene.get('terrain_v02_checked'),'Terrain v02 already authored'
peaks=[(-115,155,34,75,70),(-195,245,24,90,90),(112,178,45,68,75),(205,248,28,95,92)]
for v in terrain.data.vertices:
    x,y=v.co.x,v.co.y;center=7*math.sin(y*.009)+5*math.sin(y*.019);width=27+6*math.cos(y*.012)
    distance=max(0,abs(x-center)-width);ramp=1-math.exp(-distance/30)
    shoulder=28+8*math.sin(y*.021+x*.015)+4*math.sin(y*.051-x*.035)
    peak=sum(h*math.exp(-((x-cx)/sx)**2-((y-cy)/sy)**2) for cx,cy,h,sx,sy in peaks)
    erosion=(3*math.sin(x*.085+y*.062)+1.6*math.sin(x*.173-y*.112)+.7*math.sin(x*.37+y*.26))*ramp
    near=smooth(72,146,math.hypot(x,y))
    v.co.z=-2.5+max(0,shoulder+peak+erosion)*ramp*near
terrain.data.update();scene['terrain_v02_checked']=True
report={'scene':SCENE,'sizeMetres':[600,600],'samples':145,'peaks':peaks,'minimum':min(v.co.z for v in terrain.data.vertices),'maximum':max(v.co.z for v in terrain.data.vertices),'heightEncoding':'standard bake_terrain RGB8/RG16+B'}
scene['terrain_component']=json.dumps(report)
with open(OUTPUT+'/components/jx_v02_terrain.json','w',encoding='utf8') as f:json.dump(report,f,indent=2)
bpy.ops.wm.save_as_mainfile(filepath=OUTPUT+'/checkpoints/jx_v02_terrain.blend',copy=True,check_existing=False)
bpy.ops.wm.save_as_mainfile(filepath=MAIN,check_existing=False);print(json.dumps(report));view('CAM_enter')
