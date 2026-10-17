"""One component: an irregular near-bank substrate and a small family of closed rock forms."""
import sys,math,random
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue')
from common import *
col=component('jx_shore_rock')
root_obj=bpy.data.objects['shore_root']
textures=ROOT+'/art/textures/fengqiao-v01/'
rock=textured('pbr_rock__jx_bank',[textures+filename for filename in ('rock_01_Diffuse.jpg','rock_01_nor_gl.png','rock_01_Rough.png')])
# A continuous rounded bank, broad enough for the snow path and rooted trees.
xs=41;ys=53;vertices=[]
for j in range(ys):
    y=-21+49*j/(ys-1)
    edge=-7.5+1.3*math.sin(y*.19)+.45*math.sin(y*.63)
    for i in range(xs):
        t=i/(xs-1);x=edge+28*t
        z=-.8+7.7*(1-math.exp(-t*3.4))+.45*math.sin(y*.14+t*7)*math.sin(math.pi*t)
        vertices.append((x,y,z))
faces=[(j*xs+i,j*xs+i+1,(j+1)*xs+i+1,(j+1)*xs+i) for j in range(ys-1) for i in range(xs-1)]
edge=[*range(xs),*(j*xs+xs-1 for j in range(1,ys)),
      *( (ys-1)*xs+i for i in range(xs-2,-1,-1)),*(j*xs for j in range(ys-2,0,-1))]
bottom=len(vertices)
for index in edge:vertices.append((vertices[index][0],vertices[index][1],-2.0))
for i,index in enumerate(edge):
    k=(i+1)%len(edge);faces.append((index,bottom+i,bottom+k,edge[k]))
faces.append(tuple(reversed(range(bottom,len(vertices)))))
mesh('shore_bank',vertices,faces,col,rock,root_obj)
# Weathered rock sections are independent shells with broad folds, never pointed cones.
rng=random.Random(P['seed']);all_shapes=Shape()
for k in range(14):
    y=-19+k*3.45+rng.uniform(-.5,.5);x=-7.1+1.3*math.sin(y*.19)
    sx=rng.uniform(1.8,3.9);sy=rng.uniform(1.9,3.0);sz=rng.uniform(1.6,3.1)
    vs=[];n=18;m=10
    for row in range(1,m):
        latitude=math.pi*row/m
        for j in range(n):
            angle=math.tau*j/n
            irregular=1+.12*math.sin(angle*3+k)+.06*math.sin(angle*7+row*.6)
            vs.append((x+sx*.5*math.sin(latitude)*math.cos(angle)*irregular,
                       y+sy*.5*math.sin(latitude)*math.sin(angle)*irregular,
                       .20+sz*.5+sz*.5*math.cos(latitude)+.12*math.sin(angle*2+row)))
    top=len(vs);vs.append((x,y,.2+sz));low=len(vs);vs.append((x,y,.12))
    fs=[(r*n+j,r*n+(j+1)%n,(r+1)*n+(j+1)%n,(r+1)*n+j) for r in range(m-2) for j in range(n)]
    fs += [(top,j,(j+1)%n) for j in range(n)]
    fs += [(low,(m-2)*n+(j+1)%n,(m-2)*n+j) for j in range(n)]
    all_shapes.add(vs,fs)
all_shapes.finish('shore_boulders',col,rock,root_obj)
finish(col,extra={'nearRockCount':14,'bankMetres':[28,49],'waterline':0})
view('CAM_nature')
