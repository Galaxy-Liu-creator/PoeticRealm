"""Curved tube geometry with physical longitudinal UVs; no geometry on import."""
from common_v02 import *

def curve(knots,radii,samples=5):
    points=[];width=[]
    for i in range(len(knots)-1):
        p0=Vector(knots[max(0,i-1)]);p1=Vector(knots[i]);p2=Vector(knots[i+1]);p3=Vector(knots[min(len(knots)-1,i+2)])
        for j in range(samples):
            t=j/samples;t2=t*t;t3=t2*t
            p=.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3)
            points.append(tuple(p));width.append(radii[i]*(1-t)+radii[i+1]*t)
    points.append(knots[-1]);width.append(radii[-1]);return points,width

def tube(shape,uvs,points,radii,sides=10):
    vertices=[];distances=[0.]
    for i,p in enumerate(points):
        if i:distances.append(distances[-1]+(Vector(p)-Vector(points[i-1])).length)
        axis=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])).normalized()
        guide=Vector((0,0,1)) if abs(axis.z)<.9 else Vector((0,1,0))
        a=axis.cross(guide).normalized();b=axis.cross(a).normalized()
        for j in range(sides):
            angle=math.tau*j/sides;vertices.append(tuple(Vector(p)+radii[i]*(a*math.cos(angle)+b*math.sin(angle))))
    faces=[]
    for i in range(len(points)-1):
        for j in range(sides):
            faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
            v=j/sides*.30;vn=(j+1)/sides*.30;u=distances[i]/1.5;un=distances[i+1]/1.5
            uvs.append([(u,v),(u,vn),(un,vn),(un,v)])
    faces.extend((tuple(reversed(range(sides))),tuple((len(points)-1)*sides+j for j in range(sides))))
    uvs.extend([[(.1+.03*math.cos(math.tau*j/sides),.1+.03*math.sin(math.tau*j/sides)) for j in reversed(range(sides))],
                [(.1+.03*math.cos(math.tau*j/sides),.1+.03*math.sin(math.tau*j/sides)) for j in range(sides)]])
    shape.add(vertices,faces)
