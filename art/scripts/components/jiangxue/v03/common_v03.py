"""Revision-scoped existing mesh helpers; importing creates no objects."""
import importlib.util,sys,os,json,math,bpy
from mathutils import Vector,Matrix
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
spec=importlib.util.spec_from_file_location('jx_v03_helpers',ROOT+'/art/scripts/components/jiangxue/v02/common_v02.py')
helpers=importlib.util.module_from_spec(spec);spec.loader.exec_module(helpers)
SCENE='jiangxue_modeling_v03';SOURCE='jiangxue_components_v03';EXPORT='glb_scene_v03'
OUTPUT=ROOT+'/output/jiangxue-model-v03';MAIN=ROOT+'/art/blender/jiangxue-scene-v03.blend'
def active():
    if bpy.context.scene.name!=SCENE or bpy.data.filepath.replace('\\','/')!=MAIN:raise RuntimeError('Only independent saved v03 may be modified')
    return bpy.context.scene
for key in ('SCENE','SOURCE','EXPORT','OUTPUT','MAIN'):
    setattr(helpers,key,globals()[key]);setattr(helpers.base,key,globals()[key])
helpers.active=active;helpers.base.active=active
P=dict(helpers.P);P.update({'water':0.,'boat':(2.,-2.,-.30),'flow_speed':.10});helpers.P=P;helpers.base.P=P
component=helpers.component;mesh=helpers.mesh;Shape=helpers.Shape;view=helpers.view;finish=helpers.finish;publish=helpers.publish;retire=helpers.retire
def center(y):return 7*math.sin(y*.009)+5*math.sin(y*.019)
def course():return [(2.+center(y)-center(-2.),y,-.30) for y in (-2.,4.,10.,18.,28.,40.,54.)]
P['boat_angle']=math.atan2(6.,center(4.)-center(-2.))
