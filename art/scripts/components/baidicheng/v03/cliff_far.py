"""ONE bank LOD: reduce the interior face, preserve every waterline/top/shoulder vertex."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
from geology import SPECS,finish
which=sys.argv[sys.argv.index('--')+1];near=bpy.data.objects['cliff_'+which];n=SPECS[which][-1]+1
assert len(near.data.vertices)==n*55
world=[near.matrix_basis@v.co for v in near.data.vertices];vs=[];fs=[];copied={}
def vertex(i):
    if i not in copied:copied[i]=len(vs);vs.append(tuple(world[i]))
    return copied[i]
def front(i,j):return vertex(i*49+j)
def rear(i,j):return vertex(i*49+45+j)
def top(i):return [front(i,44)]+[vertex(n*49+i*6+k) for k in range(6)]+[rear(i,3)]
levels=[0,1,2,4,8,14,22,31,38,44];rows=[]
for j in levels:
    columns=list(range(n)) if j in [0,1,2,44] else sorted(set([*range(0,n,3),n-1]))
    rows.append([(i,front(i,j)) for i in columns])
for a,b in zip(rows,rows[1:]):
    ia=ib=0
    while ia<len(a)-1 or ib<len(b)-1:
        na=a[ia+1][0] if ia<len(a)-1 else math.inf;nb=b[ib+1][0] if ib<len(b)-1 else math.inf
        if na==nb:fs.append((a[ia][1],a[ia+1][1],b[ib+1][1],b[ib][1]));ia+=1;ib+=1
        elif na<nb:fs.append((a[ia][1],a[ia+1][1],b[ib][1]));ia+=1
        else:fs.append((a[ia][1],b[ib+1][1],b[ib][1]));ib+=1
top_faces=[]
for i in range(n-1):
    for j in range(3):fs.append((rear(i+1,j),rear(i,j),rear(i,j+1),rear(i+1,j+1)))
    fs.append((front(i,0),rear(i,0),rear(i+1,0),front(i+1,0)))
    a=top(i);b=top(i+1)
    for k in range(7):top_faces.append(len(fs));fs.append((a[k],b[k],b[k+1],a[k+1]))
for i in [0,n-1]:
    fs.extend([(front(i,0),front(i,1),rear(i,1),rear(i,0)),(front(i,1),front(i,2),rear(i,2),rear(i,1))])
    fs.append(tuple([front(i,j) for j in levels[2:]]+top(i)[1:-1]+[rear(i,3),rear(i,2)]))
col=collection('bd_v03_cliff_far_'+which);o=finish('src_cliff_'+which+'_far_v03',vs,fs,col)
for pi in top_faces:
    for li in o.data.polygons[pi].loop_indices:
        q=o.matrix_basis@o.data.vertices[o.data.loops[li].vertex_index].co;o.data.uv_layers.active.data[li].uv=(q.x/11,q.y/11)
bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4]);bm.to_mesh(o.data);bm.free()
checked(o);publish_lod(o,near.name,190.)
save_component(col,{'nearNode':near.name,'frontLevels':levels,'interiorColumnStep':3,'preserved':'all waterline/top/shoulder vertices and exact top surface triangles','trianglesNear':sum(len(p.vertices)-2 for p in near.data.polygons),'distanceMeters':190.})
