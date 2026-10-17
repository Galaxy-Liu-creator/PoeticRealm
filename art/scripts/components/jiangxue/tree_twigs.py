"""One component: fine twigs and restrained snow strips on the checked primary tree."""
import sys,random,math
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue')
from common import *
col=component('jx_tree_twigs',('jx_tree_primary',));tree=bpy.data.objects['dead_tree_root'];rng=random.Random(P['seed']+44)
shape=Shape()
for start in [(-.45,.17,2.45),(-.8,.26,2.7),(-1.22,.23,2.91),(.85,-.08,3.1),(1.34,-.1,3.36),(-.28,.27,4.0),(-.62,.36,4.26),(.35,.18,4.35)]:
    for side in (-1,1):
        end=Vector(start)+Vector((rng.uniform(-.35,.4),side*rng.uniform(.2,.50),rng.uniform(.12,.53)))
        middle=Vector(start).lerp(end,.55)+Vector((.04,0,.04))
        shape.tube([start,middle,end],[.024,.014,.0035],sides=8)
shape.finish('dead_tree_twigs',col,bpy.data.materials['pbr_wood__jx_bark'],tree)
snow=Shape()
for line in [[(-.40,.15,2.435),(-.87,.28,2.82),(-1.39,.22,3.045)],[(.81,-.08,3.17),(1.33,-.10,3.42),(1.75,-.21,3.75)]]:
    snow.tube(line,[.042,.03,.012],sides=8,aspect=.55)
snow.finish('dead_tree_branch_snow',col,bpy.data.materials['pbr_snow__fresh'],tree)
finish(col,extra={'twigCount':16,'bareTree':True,'snowStrips':2})
view('CAM_nature')
