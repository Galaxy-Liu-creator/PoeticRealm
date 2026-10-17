"""Seeded bank stations and shared ground height; no Blender side effects."""
import math
ANCHORS=[(-18,-3.8,19),(-10,-4.8,16),(-2,-5.1,13),(4,-5.4,11),
          (9,-8.6,7.5),(15,-13.2,3.2),(20,-18,-2),(26,-22.7,-9.8),
          (34,-25,-16),(44,-28,-18)]
def edge(y,side):
    for i,(a,b) in enumerate(zip(ANCHORS,ANCHORS[1:])):
        if a[0]<=y<=b[0]:
            axis=1 if side<0 else 2;dt=b[0]-a[0];t=(y-a[0])/dt
            previous=ANCHORS[max(0,i-1)];following=ANCHORS[min(len(ANCHORS)-1,i+2)]
            ma=(b[axis]-previous[axis])/(b[0]-previous[0])*dt
            mb=(following[axis]-a[axis])/(following[0]-a[0])*dt
            return (2*t**3-3*t*t+1)*a[axis]+(t**3-2*t*t+t)*ma+(-2*t**3+3*t*t)*b[axis]+(t**3-t*t)*mb
    raise ValueError('Bank station outside supported range')
STATIONS=[]
for a,b in zip(ANCHORS,ANCHORS[1:]):
    for i in range(6):
        y=a[0]+(b[0]-a[0])*i/6;STATIONS.append((y,edge(y,-1),edge(y,1)))
STATIONS.append(ANCHORS[-1])
def top(y):
    return .74+.52*math.exp(-((y-15)/3.2)**2)+(.04*math.sin(y*.37) if y<24 else 0)
def ground(x,y,side):
    u=side*(x-edge(y,side))
    if u<.6:return -.18+.26*u/.6
    if u<1.8:return .08+(top(y)-.08)*(u-.6)/1.2
    return top(y)
