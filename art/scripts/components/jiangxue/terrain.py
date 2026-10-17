"""One component: broad weathered valley heights; no near-bank or other scene geometry."""
import sys,math
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue')
from common import *
scene=active()
if bpy.data.collections.get('terrain'):raise RuntimeError('Terrain already exists')
col=bpy.data.collections.new('terrain');scene.collection.children.link(col)
vertices=[];n=145;size=P['terrain_size']
for j in range(n):
    y=-size/2+size*j/(n-1)
    river_center=10*math.sin(y*.007)+8*math.sin(y*.014)
    river_halfwidth=24+8*math.cos(y*.012)
    for i in range(n):
        x=-size/2+size*i/(n-1)
        distance=max(0,abs(x-river_center)-river_halfwidth)
        ramp=1-math.exp(-distance/36)
        ridge=48+19*math.sin(y*.033+x*.009)+12*math.sin(y*.055-x*.027)
        broad=(30*math.exp(-((x+100)**2+(y-130)**2)/14000)
               +46*math.exp(-((x-150)**2+(y-155)**2)/11000))
        detail=(math.sin(x*.088+y*.047)*4+math.sin(x*.18-y*.081)*2)*ramp
        near=max(0,min(1,(math.hypot(x,y)-43)/40))
        z=-2.5+(max(0,ridge+broad+detail)*ramp)*near
        vertices.append((x,y,z))
faces=[(j*n+i,j*n+i+1,(j+1)*n+i+1,(j+1)*n+i) for j in range(n-1) for i in range(n-1)]
data=bpy.data.meshes.new('jx_authored_heightfield');data.from_pydata(vertices,[],faces);data.update()
obj=bpy.data.objects.new('terrain',data);col.objects.link(obj)
obj.data.materials.append(solid('pbr_snow__terrain_preview',(.56,.66,.71)))
for poly in obj.data.polygons:poly.use_smooth=True
scene['terrain_component']={'size':size,'samples':n,'source':'authored analytic river valley mesh; standard bake_terrain.py'}
bpy.ops.wm.save_as_mainfile(filepath=OUTPUT+'/checkpoints/jx_terrain.blend',copy=True,check_existing=False)
bpy.ops.wm.save_as_mainfile(filepath=MAIN,check_existing=False)
print({'terrainVertices':len(vertices),'triangles':len(faces)*2,'size':size,'minimum':min(v[2] for v in vertices),'maximum':max(v[2] for v in vertices)})
view('CAM_enter')
