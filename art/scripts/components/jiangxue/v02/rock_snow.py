"""One component: closed uneven snow volumes sampled from each checked rock surface."""
import sys,math,random
from mathutils.bvhtree import BVHTree
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue/v02')
from common_v02 import *
col=component('jx_v02_rock_snow',('jx_v02_rock_cluster','jx_v02_bank_snow'));graph=bpy.context.evaluated_depsgraph_get();rng=random.Random(P['seed']+9)
rows=[]
for rock in bpy.data.collections['jx_v02_rock_cluster'].objects:
    bvh=BVHTree.FromObject(rock,graph);data=rock.data
    rx=(max(v.co.x for v in data.vertices)-min(v.co.x for v in data.vertices))*.5
    ry=(max(v.co.y for v in data.vertices)-min(v.co.y for v in data.vertices))*.5
    zmax=max(v.co.z for v in data.vertices);phase=rng.random()*math.tau
    center=Vector((-.08*rx,.06*ry,0));sides=40;rings=8;points=[center];radii=[]
    for j in range(sides):
        a=math.tau*j/sides;radius=.77+.095*math.sin(a*3+phase)+.045*math.sin(a*7+phase)
        for attempt in range(8):
            p=center+Vector((rx*radius*math.cos(a),ry*radius*math.sin(a),zmax+2))
            if bvh.ray_cast(p,Vector((0,0,-1)))[0] is not None:break
            radius*=.88
        else:raise RuntimeError('No supporting rock surface')
        radii.append(radius)
    for ring in range(1,rings+1):
        t=ring/rings
        for j in range(sides):
            a=math.tau*j/sides;r=radii[j]*t
            points.append(center+Vector((rx*r*math.cos(a),ry*r*math.sin(a),0)))
    top=[];bottom=[];depths=[]
    for i,p in enumerate(points):
        hit=bvh.ray_cast(Vector((p.x,p.y,zmax+2)),Vector((0,0,-1)))[0]
        if hit is None:raise RuntimeError('Snow support sample missed')
        t=0 if i==0 else ((i-1)//sides+1)/rings
        depth=.022+(.14+.055*math.sin(p.x*1.5+p.y+phase))*(1-t*t)
        base=hit+rock.location
        top.append(tuple(base+Vector((0,0,depth))));bottom.append(tuple(base-Vector((0,0,.006))));depths.append(depth+.006)
    faces=[(0,1+j,1+(j+1)%sides) for j in range(sides)]
    for ring in range(rings-1):
        old=1+ring*sides;nxt=old+sides
        faces.extend((old+j,nxt+j,nxt+(j+1)%sides,old+(j+1)%sides) for j in range(sides))
    count=len(top);faces+= [tuple(reversed(tuple(i+count for i in face))) for face in list(faces)]
    edge_start=1+(rings-1)*sides
    faces.extend((edge_start+j,edge_start+j+count,edge_start+(j+1)%sides+count,edge_start+(j+1)%sides) for j in range(sides))
    name='rock_snow_v02_'+rock.name.rsplit('_',1)[-1]
    mesh(name,top+bottom,faces,col,bpy.data.materials['pbr_snow__driftv02'],bpy.data.objects['shore_root'])
    rows.append({'rock':rock.name,'snow':'src_'+name,'sampledContact':True,'thicknessMetres':[min(depths),max(depths)],'samples':count})
finish(col,extra={'surfaceSamples':rows,'solidSnowVolumes':True})
view('CAM_nature')
