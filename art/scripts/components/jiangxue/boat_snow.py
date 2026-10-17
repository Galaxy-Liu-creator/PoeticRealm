"""One checked component: shallow, irregular snow volumes on the existing gunwales."""
import sys, math, os, numpy as np
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue');sys.path.insert(0,ROOT+'/art/scripts')
from common import *
from bake_terrain import write_rgb_png
col=component('jx_boat_snow',('jx_boat_structure',))
directory=ROOT+'/art/textures/jiangxue-v01';os.makedirs(directory,exist_ok=True)
noise=np.random.default_rng(P['seed']).normal(0,1,(512,512))
height=noise.copy()
for _ in range(4): height=(height+np.roll(height,1,0)+np.roll(height,-1,0)+np.roll(height,1,1)+np.roll(height,-1,1))/5
dy,dx=np.gradient(height)
normal=np.stack((-dx*.22,-dy*.22,np.ones_like(height)),axis=-1)
normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
albedo=np.clip(236+height[...,None]*2+np.array([-4,0,3]),0,255).astype(np.uint8)
roughness=np.repeat(np.clip(238+height[...,None]*5,0,255).astype(np.uint8),3,axis=-1)
write_rgb_png(directory+'/snow_basecolor.png',albedo)
write_rgb_png(directory+'/snow_normal.png',np.rint((normal*.5+.5)*255).astype(np.uint8))
write_rgb_png(directory+'/snow_roughness.png',roughness)
material=textured('pbr_snow__fresh',[directory+'/snow_'+s+'.png' for s in ('basecolor','normal','roughness')])
shape=Shape()
for side in (-1,1):
    points=[];radii=[]
    for i in range(49):
        x=-3.19+6.47*i/48
        width=.91*max(.04,1-(x/3.50)**2)**.48
        points.append((x,side*(width*.972-.005),1.045+.25*(abs(x)/3.4)**3))
        radii.append(.029+.005*math.sin(x*5+side))
    shape.tube(points,radii,sides=10,aspect=.60)
shape.finish('boat_gunwale_snow',col,material,bpy.data.objects['boat_guest'],dynamic=True)
finish(col,extra={'thicknessMetres':[.025,.04],'sourceTextures':'original fixed-seed microheight maps; no third-party snow image'})
view('CAM_boat')
