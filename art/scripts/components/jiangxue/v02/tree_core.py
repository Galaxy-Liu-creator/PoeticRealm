"""One component: bent tapering dead trunk and four continuous main branch paths."""
import sys,json
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue/v02')
from tree_helpers import *
col=component('jx_v02_tree_core',('jx_v02_bank_snow',));parent=bpy.data.objects['dead_tree_root']
parent.location.z=ground(parent.location.x-23,parent.location.y-24)-.025
paths=[([(0,0,-.13),(-.13,.07,.8),(.1,.11,1.7),(.05,-.07,2.8),(.32,.13,3.8),(.16,.21,4.9),(.48,.1,6.)],[.23,.19,.15,.12,.09,.062,.016]),
       ([(.08,0,1.8),(-.58,-.12,2.3),(-1.25,.1,3.15),(-2.13,.25,3.9),(-2.7,.31,4.16)],[.12,.092,.062,.036,.007]),
       ([(.12,0,2.85),(.8,-.13,3.35),(1.65,-.32,4.2),(2.1,-.48,4.7),(2.36,-.57,5.32)],[.105,.072,.048,.025,.006]),
       ([(.25,.16,4.15),(-.28,.46,4.66),(-.88,.71,5.14),(-1.15,.86,5.70)],[.065,.047,.024,.005])]
shape=Shape();uvs=[];prepared=[]
for knots,radii in paths:
    points,width=curve(knots,radii);tube(shape,uvs,points,width,sides=12);prepared.append({'points':points,'radii':width})
bark=bpy.data.materials['pbr_wood__jxbark'].copy();bark.name='pbr_wood__jxcurvedbark'
obj=mesh('dead_tree_core_v02',shape.vertices,shape.faces,col,bark,parent,uvs=uvs)
active()['tree_v02_paths']=json.dumps(prepared)
finish(col,extra={'curvedPaths':len(paths),'heightMetres':6.13,'rootSurfaceMetres':parent.location.z+.025,'uv':'longitudinal metre scale, follows each branch'})
retire(('dead_tree_primary','dead_tree_twigs','dead_tree_branch_snow'))
bpy.ops.wm.save_as_mainfile(filepath=MAIN,check_existing=False);view('CAM_nature')
