"""One component: layered, tapered straw strands; only attached after the cape core check."""
import sys,math,json,random
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue')
from common import *
col=component('jx_cape_fibres',('jx_cape_core',));rig=bpy.data.objects['src_fisherman_rig']
profiles=json.loads(active()['cape_profiles']);cx,cy=json.loads(active()['fisherman_parameters'])['centre'];rng=random.Random(P['seed']+52)
straw=solid('pbr_cloth__jx_straw_fibres',(.235,.172,.088),.95);strand_count=0
for label,rings in profiles.items():
    shape=Shape()
    for r in range(len(rings)-1):
        z0,rx0,ry0=rings[r];z1,rx1,ry1=rings[r+1]
        for j in range(94):
            theta=.40+(math.tau-.80)*(j+r*.31)/94+rng.uniform(-.012,.012)
            length_factor=rng.uniform(1.08,1.46);points=[]
            for t in (0,.52,1):
                f=t*length_factor
                rx=rx0+(rx1-rx0)*min(1,f)+.008+.010*t
                ry=ry0+(ry1-ry0)*min(1,f)+.008+.010*t
                angle=theta+.013*math.sin(t*math.pi+j)
                points.append((cx+rx*math.cos(angle),cy+ry*math.sin(angle),z0+(z1-z0)*f))
            radius=rng.uniform(.0025,.0045);shape.tube(points,[radius,radius*.82,.0008],sides=4,aspect=.70);strand_count+=1
    obj=shape.finish('fisherman_straw_'+label,col,straw,rig,dynamic=True)
    vg=obj.vertex_groups.new(name='fisherman_spine' if label=='shoulder' else 'fisherman_root')
    vg.add(list(range(len(obj.data.vertices))),1,'REPLACE');mod=obj.modifiers.new('straw_skin','ARMATURE');mod.object=rig
finish(col,extra={'strandCount':strand_count,'fixedSeed':P['seed']+52,'taperedClosedStrands':True})
view('CAM_fisherman')
