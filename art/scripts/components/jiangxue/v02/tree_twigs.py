"""One component group: fine curved branch forks and sparse upward snow strips."""
import sys,json,random,math
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue/v02')
from tree_helpers import *
col=component('jx_v02_tree_twigs',('jx_v02_tree_core',));paths=json.loads(active()['tree_v02_paths']);rng=random.Random(P['seed']+22)
shape=Shape();uvs=[];snow=Shape();count=0;parent=bpy.data.objects['dead_tree_root']
for k,path in enumerate(paths):
    points=path['points'];radii=path['radii']
    for j in range(5,len(points)-3,3):
        start=Vector(points[j]);sign=-1 if (j+k)%2 else 1
        direction=Vector((sign*rng.uniform(.4,.85),rng.uniform(-.6,.65),rng.uniform(.35,.8)))
        length=rng.uniform(.55,1.25);end=start+direction*length
        knots=[tuple(start),tuple(start+direction*length*.42+Vector((0,.08,.04))),tuple(end)]
        width=[min(.035,radii[j]*.46),.014,.0025];pts,rs=curve(knots,width,samples=3)
        tube(shape,uvs,pts,rs,sides=7);count+=1
        if j%2==0:
            mid=Vector(pts[3]);tip=mid+Vector((sign*.18,.12,.35))
            ps,ws=curve([tuple(mid),tuple((mid+tip)*.5+Vector((0,.04,0))),tuple(tip)],[.01,.006,.0018],samples=2)
            tube(shape,uvs,ps,ws,sides=6);count+=1
    if k>0:
        selected=points[3:12];selected_width=radii[3:12]
        snow.tube([tuple(Vector(p)+Vector((0,0,r*.82+.012))) for p,r in zip(selected,selected_width)],
                  [.02+.018*(1-i/max(1,len(selected)-1)) for i in range(len(selected))],sides=8,aspect=.40)
mesh('dead_tree_fine_v02',shape.vertices,shape.faces,col,bpy.data.materials['pbr_wood__jxcurvedbark'],parent,uvs=uvs)
snow.finish('dead_tree_snow_v02',col,bpy.data.materials['pbr_snow__driftv02'],parent)
finish(col,extra={'fineBranchCount':count,'snowStrips':3,'taperingTipsMetres':.0018,'seed':P['seed']+22})
view('CAM_nature')
