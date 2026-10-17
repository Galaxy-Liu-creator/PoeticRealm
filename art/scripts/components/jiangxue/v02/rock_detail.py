"""Refine only the three inspected rock prototypes; retain the coarse checkpoint."""
import sys,math
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue/v02')
from common_v02 import *
col=component('jx_v02_rock_detail',('jx_v02_rock_prototypes',));parent=bpy.data.objects['shore_root']
bpy.data.collections['jx_v02_rock_prototypes'].hide_viewport=True;bpy.data.collections['jx_v02_rock_prototypes'].hide_render=True
for k,size in enumerate(((6.6,4.5,3.4),(4.3,3.5,4.6),(7.4,4.2,3.8))):
    bpy.data.objects['src_rock_proto_v02_'+str(k)].name='history_rock_proto_coarse_'+str(k)
    bm=bmesh.new();bmesh.ops.create_icosphere(bm,subdivisions=4,radius=1);bm.verts.ensure_lookup_table();bm.verts.index_update()
    vertices=[]
    for v in bm.verts:
        x,y,z=v.co;layer=.10*math.sin(z*7.2+k*1.7)+.043*math.sin(z*19+k)
        xx=(math.copysign(abs(x)**.57,x)*(1+layer)+.105*z+.045*math.sin(y*6+z*3+k))*size[0]*.5
        yy=(math.copysign(abs(y)**.62,y)*(1+layer*.8)+.065*z+.025*math.sin(x*7-z*5))*size[1]*.5
        zz=(math.copysign(abs(z)**.72,z)+.065*math.sin(x*4+y*5+k)*(1-abs(z)*.45))*size[2]*.5
        vertices.append((xx,yy,zz))
    faces=[tuple(v.index for v in face.verts) for face in bm.faces];bm.free()
    obj=mesh('rock_proto_v02_'+str(k),vertices,faces,col,bpy.data.materials['pbr_rock__jxbank'],parent)
    obj.location=(-10+k*7,-35,0)
camera=bpy.data.objects.get('CAM_rocks')
if camera is None:
    data=bpy.data.cameras.new('jx_rocks_inspection');data.sensor_fit='VERTICAL';data.lens=34
    camera=bpy.data.objects.new('CAM_rocks',data);bpy.data.collections[EXPORT].objects.link(camera);camera['yuan']='ping'
camera.location=(17,-29,9);camera.rotation_euler=(Vector((23,-10,1.4))-camera.location).to_track_quat('-Z','Y').to_euler()
finish(col,extra={'detail':'1280 triangles per original eroded prototype','source':'refined original geometry; coarse prototypes retained','inspectionCamera':'CAM_rocks'})
view('CAM_rocks')
