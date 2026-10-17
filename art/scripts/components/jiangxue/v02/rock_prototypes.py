"""One component group: three authored eroded rock prototypes, inspected before placement."""
import sys,math
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue/v02')
from common_v02 import *
col=component('jx_v02_rock_prototypes',('jx_v02_bank',));dry=bpy.data.materials['pbr_rock__jxbank']
for k,size in enumerate(((6.6,4.5,3.4),(4.3,3.5,4.6),(7.4,4.2,3.8))):
    bm=bmesh.new();bmesh.ops.create_icosphere(bm,subdivisions=3,radius=1.0);bm.verts.ensure_lookup_table();bm.verts.index_update()
    vertices=[]
    for v in bm.verts:
        x,y,z=v.co
        sx=math.copysign(abs(x)**.57,x);sy=math.copysign(abs(y)**.62,y);sz=math.copysign(abs(z)**.72,z)
        layer=.10*math.sin(z*7.2+k*1.7)+.043*math.sin(z*19.0+k)
        sx=(sx*(1+layer)+.105*z+.045*math.sin(y*6+z*3+k))*size[0]*.5
        sy=(sy*(1+layer*.8)+.065*z+.025*math.sin(x*7-z*5))*size[1]*.5
        sz=(sz+.065*math.sin(x*4+y*5+k)*(1-abs(z)*.45))*size[2]*.5
        vertices.append((sx,sy,sz))
    faces=[tuple(v.index for v in face.verts) for face in bm.faces];bm.free()
    obj=mesh('rock_proto_v02_'+str(k),vertices,faces,col,dry,bpy.data.objects['shore_root'])
    obj.location=(4+k*7,-2,3.0)
finish(col,extra={'count':3,'source':'Project-owned rock prototype refinement, not a scanned mesh','material':'registered CC0 Rock 01 texture set','features':'eroded ledges, uneven planes, asymmetric shoulders'})
view('CAM_nature')
