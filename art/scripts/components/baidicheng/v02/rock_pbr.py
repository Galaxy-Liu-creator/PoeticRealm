"""Only the affected geological materials; preserve original material IDs as history."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
active();mapping={}
for name,role in [('pbr_rock__bdwall','dry'),('pbr_rock__bdwet','wet')]:
    old=bpy.data.materials[name];old.name=name+'_v01';m=old.copy();m.name=name
    bsdf=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    image=bpy.data.images.load(str(ROOT/'art/textures/baidicheng-v02'/(role+'_basecolor.jpg')),check_existing=False);image.pack()
    node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;m.node_tree.links.new(node.outputs['Color'],bsdf.inputs['Base Color'])
    normal=next((n for n in m.node_tree.nodes if n.type=='NORMAL_MAP'),None)
    if normal:normal.inputs['Strength'].default_value=.62
    mapping[old]=m
for o in bpy.data.objects:
    if o.type!='MESH':continue
    if o.name in ['cliff_right_near','cliff_left_near','cliff_left_far','cliff_right_far','city_promontory'] or ('fractured_v02' in o.name):
        for i,m in enumerate(o.data.materials):
            if m in mapping:o.data.materials[i]=mapping[m]
report('components/cliff-pbr.json',json.loads((ROOT/'art/textures/baidicheng-v02/processing.json').read_text()))
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
