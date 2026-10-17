"""One component group: thick split-front shoulder cape and its lower rain-skirt."""
import sys,math,json
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue')
from common import *
col=component('jx_cape_core',('jx_fisherman_body',));rig=bpy.data.objects['src_fisherman_rig']
directory=ROOT+'/art/textures/fengqiao-v01/'
straw=textured('pbr_cloth__jx_straw',[directory+s for s in ('tatami_mat_Diffuse.jpg','tatami_mat_nor_gl.png','tatami_mat_Rough.png')])
spec=json.loads(active()['fisherman_parameters']);cx,cy=spec['centre'];top=spec['headTop']
profiles={'shoulder':[(top-.23,.10,.105),(top-.28,.19,.29),(top-.39,.30,.39),(top-.53,.35,.43),(top-.66,.33,.39)],
          'skirt':[(top-.62,.245,.265),(top-.77,.28,.30),(top-.91,.29,.33),(top-1.07,.29,.32)]}
for label,rings in profiles.items():
    n=89;vertices=[]
    for inner in (False,True):
        for z,rx,ry in rings:
            for j in range(n):
                theta=.38+(math.tau-.76)*j/(n-1);wave=.006*math.sin(theta*17+z*10)
                vertices.append((cx+(rx-(.012 if inner else 0)+wave)*math.cos(theta),
                                 cy+(ry-(.012 if inner else 0)+wave)*math.sin(theta),z+.005*math.sin(theta*11)))
    count=len(rings)*n;faces=[]
    for r in range(len(rings)-1):
        for j in range(n-1):
            a=r*n+j;faces.append((a,a+1,a+n+1,a+n));faces.append((count+a,count+a+n,count+a+n+1,count+a+1))
    for j in range(n-1):
        faces.append((j,count+j,count+j+1,j+1));a=(len(rings)-1)*n+j;faces.append((a,a+1,count+a+1,count+a))
    for r in range(len(rings)-1):
        a=r*n;faces.append((a,a+n,count+a+n,count+a))
        a=r*n+n-1;faces.append((a,count+a,count+a+n,a+n))
    obj=mesh('fisherman_cape_'+label,vertices,faces,col,straw,rig,dynamic=True)
    joint='fisherman_spine' if label=='shoulder' else 'fisherman_root'
    group=obj.vertex_groups.new(name=joint);group.add(list(range(len(vertices))),1,'REPLACE')
    mod=obj.modifiers.new('cape_skin','ARMATURE');mod.object=rig
active()['cape_profiles']=json.dumps(profiles)
finish(col,extra={'capeSections':2,'thicknessMetres':.012,'frontOpeningRadians':.76,'material':'existing CC0 woven reed; actual straw strands in next component'})
view('CAM_fisherman')
