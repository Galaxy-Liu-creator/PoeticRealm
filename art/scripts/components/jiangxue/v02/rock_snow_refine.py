"""One local revision: retain previous caps, rebuild snow only on upward rock faces."""
import sys,math,random
from mathutils.bvhtree import BVHTree
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue/v02')
from common_v02 import *
active();old=bpy.data.collections['jx_v02_rock_snow'];old.hide_viewport=True;old.hide_render=True
names=['rock_snow_v02_'+str(i).zfill(2) for i in range(14)];retire(names)
for name in names:
    bpy.data.objects[name].name='history_first_'+name
    bpy.data.objects['src_'+name].name='history_source_'+name
col=component('jx_v02_rock_snow_refined',('jx_v02_rock_cluster','jx_v02_bank_snow'))
graph=bpy.context.evaluated_depsgraph_get();rng=random.Random(P['seed']+9);rows=[]
for rock in bpy.data.collections['jx_v02_rock_cluster'].objects:
    data=rock.data;bvh=BVHTree.FromPolygons([v.co for v in data.vertices],[tuple(p.vertices) for p in data.polygons])
    rx=(max(v.co.x for v in data.vertices)-min(v.co.x for v in data.vertices))*.5;ry=(max(v.co.y for v in data.vertices)-min(v.co.y for v in data.vertices))*.5
    zmax=max(v.co.z for v in data.vertices);phase=rng.random()*math.tau;center=Vector((-.08*rx,.06*ry,0));sides=40;rings=8;points=[center];radii=[]
    for j in range(sides):
        a=math.tau*j/sides;radius=.77+.095*math.sin(a*3+phase)+.045*math.sin(a*7+phase)
        for attempt in range(20):
            p=center+Vector((rx*radius*math.cos(a),ry*radius*math.sin(a),zmax+2));hit=bvh.ray_cast(p,Vector((0,0,-1)))
            if hit[0] is not None and hit[1].z>.62:break
            radius*=.91
        else:raise RuntimeError('No upward supporting surface')
        radii.append(radius)
    for ring in range(1,rings+1):
        for j in range(sides):
            a=math.tau*j/sides;r=radii[j]*ring/rings;points.append(center+Vector((rx*r*math.cos(a),ry*r*math.sin(a),0)))
    top=[];bottom=[];depths=[]
    for i,p in enumerate(points):
        hit=bvh.ray_cast(Vector((p.x,p.y,zmax+2)),Vector((0,0,-1)))[0];assert hit is not None
        t=0 if i==0 else ((i-1)//sides+1)/rings;depth=.022+(.14+.055*math.sin(p.x*1.5+p.y+phase))*(1-t*t);base=hit+rock.location
        top.append(tuple(base+Vector((0,0,depth))));bottom.append(tuple(base-Vector((0,0,.006))));depths.append(depth+.006)
    faces=[(0,1+j,1+(j+1)%sides) for j in range(sides)]
    for ring in range(rings-1):
        oldring=1+ring*sides;nxt=oldring+sides;faces.extend((oldring+j,nxt+j,nxt+(j+1)%sides,oldring+(j+1)%sides) for j in range(sides))
    count=len(top);faces += [tuple(reversed(tuple(i+count for i in face))) for face in list(faces)];start=1+(rings-1)*sides
    faces.extend((start+j,start+j+count,start+(j+1)%sides+count,start+(j+1)%sides) for j in range(sides))
    name='rock_snow_v02_'+rock.name.rsplit('_',1)[-1];mesh(name,top+bottom,faces,col,bpy.data.materials['pbr_snow__driftv02'],bpy.data.objects['shore_root'])
    rows.append({'rock':rock.name,'snow':'src_'+name,'samples':count,'upwardBoundaryNormalMinimum':.62,'thicknessMetres':[min(depths),max(depths)]})
finish(col,extra={'surfaceSamples':rows,'solidSnowVolumes':True});view('CAM_rocks')
