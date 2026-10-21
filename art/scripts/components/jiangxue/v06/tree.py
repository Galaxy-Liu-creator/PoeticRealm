"""One bounded component group: connected fine branches, root flare and branch snow."""
import sys, math, random, json
from pathlib import Path
import bpy, bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common_v06 import *

def curved(knots,radii,samples=5):
    points=[];width=[]
    for i in range(len(knots)-1):
        p0,p1,p2,p3=[Vector(knots[j]) for j in (max(0,i-1),i,i+1,min(len(knots)-1,i+2))]
        for j in range(samples):
            t=j/samples
            points.append(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t))
            width.append(radii[i]*(1-t)+radii[i+1]*t)
    return points+[Vector(knots[-1])],width+[radii[-1]]

class Tubes:
    def __init__(self):self.verts=[];self.faces=[];self.uvs=[]
    def add(self,points,radii,sides=7,aspect=1):
        offset=len(self.verts);dist=0;distances=[]
        for i,p in enumerate(points):
            if i:dist+=(p-points[i-1]).length
            distances.append(dist)
            axis=(points[min(i+1,len(points)-1)]-points[max(0,i-1)]).normalized()
            a=axis.cross(Vector((0,0,1)) if abs(axis.z)<.9 else Vector((0,1,0))).normalized();b=axis.cross(a).normalized()
            for j in range(sides):
                theta=math.tau*j/sides;self.verts.append(tuple(p+radii[i]*(a*math.cos(theta)+b*math.sin(theta)*aspect)))
        for i in range(len(points)-1):
            for j in range(sides):
                self.faces.append(tuple(offset+k for k in (i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j)))
                self.uvs.append([(distances[i]/1.5,j/sides*.3),(distances[i]/1.5,(j+1)/sides*.3),(distances[i+1]/1.5,(j+1)/sides*.3),(distances[i+1]/1.5,j/sides*.3)])
        for ids in (list(reversed(range(sides))),[(len(points)-1)*sides+j for j in range(sides)]):
            self.faces.append(tuple(offset+j for j in ids));self.uvs.append([(.1+.03*math.cos(math.tau*j/sides),.1+.03*math.sin(math.tau*j/sides)) for j in ids])
    def mesh(self,name,col,mat,parent):
        data=bpy.data.meshes.new(name);data.from_pydata(self.verts,[],self.faces);data.materials.append(mat)
        uv=data.uv_layers.new(name='UVMap')
        for face,values in zip(data.polygons,self.uvs):
            for i,value in zip(face.loop_indices,values):uv.data[i].uv=value
            face.use_smooth=len(face.vertices)==4
        bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free();data.update()
        obj=bpy.data.objects.new(name,data);col.objects.link(obj);obj.parent=parent;obj['static']=True;normalize_origin(obj);return obj

col=new_collection('jx_v06_tree');parent=bpy.data.objects['dead_tree_root'];rng=random.Random(41021)
paths=json.loads(active()['tree_v02_paths']);branches=Tubes();snow=Tubes();roots=Tubes();starts=[];count=0
for k,path in enumerate(paths):
    pts=[Vector(p) for p in path['points']];radii=path['radii']
    for j in range(7,len(pts)-2,4):
        start=pts[j];azimuth=k*1.9+j*1.17;length=rng.uniform(.55,1.25)
        direction=Vector((math.cos(azimuth),math.sin(azimuth)*.8,rng.uniform(.55,1.15))).normalized()
        end=start+direction*length
        points,rs=curved([start,start+direction*length*.47+Vector((.04,-.04,-.05)),end],[min(.038,radii[j]*.55),.016,.0018])
        branches.add(points,rs);count+=1;starts.append({'path':k,'sample':j,'distanceToParentCenter':0})
        mid=points[5];side=Vector((-direction.y,direction.x,.7)).normalized()
        fork,fr=curved([mid,mid+side*.22,mid+side*rng.uniform(.38,.62)],[.012,.007,.0013],samples=3)
        branches.add(fork,fr,sides=6);count+=1
    if k>0:
        selected=pts[4:-4];rs=radii[4:-4]
        support=[p+Vector((0,0,r+.015)) for p,r in zip(selected,rs)]
        snow.add(support,[.028*(math.sin(math.pi*i/max(1,len(support)-1))*.7+.3) for i in range(len(support))],sides=8,aspect=.40)
bank=bpy.data.objects['shore_bank_v02'];graph=bpy.context.evaluated_depsgraph_get();bvh=BVHTree.FromObject(bank,graph);transform=bank.matrix_world.inverted()@parent.matrix_world;inverse=transform.inverted();root_checks=[]
for i in range(5):
    angle=i*math.tau/5+.25;end=Vector((math.cos(angle)*.85,math.sin(angle)*.85,0))
    q=transform@end;hit=bvh.ray_cast(Vector((q.x,q.y,50)),Vector((0,0,-1)))[0];assert hit is not None
    end.z=(inverse@hit).z-.045
    start=Vector((0,0,.14));mid=(start+end)*.45;mid.z+=.025
    points,rs=curved([start,mid,end],[.10,.075,.008],samples=4);roots.add(points,rs,sides=9)
    root_checks.append({'tip':list(end),'embeddedMetres':.045})
mat=bpy.data.materials['pbr_wood__jxcurvedbark']
branches.mesh('src_dead_tree_fine_v06',col,mat,parent)
snow.mesh('src_dead_tree_snow_v06',col,bpy.data.materials['pbr_snow__driftv02'],parent)
roots.mesh('src_dead_tree_roots_v06',col,mat,parent)
print(save_component(col,{'fineBranches':count,'connections':starts,'rootContacts':root_checks,'snowStrips':3,'seed':41021}))
