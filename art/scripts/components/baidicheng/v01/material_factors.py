"""Deliver explicit texture multiplication factors for dry and wet cliff materials."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
active();rows=[]
for name,color,roughness in [('pbr_rock__bdwall',(.70,.81,.78,1),.94),('pbr_rock__bdwet',(.33,.43,.39,1),.34)]:
    m=bpy.data.materials[name];tree=m.node_tree;bsdf=next(n for n in tree.nodes if n.type=='BSDF_PRINCIPLED')
    source=bsdf.inputs['Base Color'].links[0].from_socket
    multiply=tree.nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1.;multiply.inputs[2].default_value=color
    tree.links.new(source,multiply.inputs[1]);tree.links.new(multiply.outputs[0],bsdf.inputs['Base Color'])
    source=bsdf.inputs['Roughness'].links[0].from_socket
    factor=tree.nodes.new('ShaderNodeMath');factor.operation='MULTIPLY';factor.inputs[1].default_value=roughness
    tree.links.new(source,factor.inputs[0]);tree.links.new(factor.outputs[0],bsdf.inputs['Roughness'])
    rows.append({'material':name,'baseColorFactor':color,'roughnessFactor':roughness})
report('components/cliff-factors-v03.json',{'factors':rows,'texturePixelsUnchanged':True})
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
