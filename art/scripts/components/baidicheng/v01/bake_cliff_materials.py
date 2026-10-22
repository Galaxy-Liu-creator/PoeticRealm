"""Bake the prototype's factors, then restore direct exportable image inputs."""
import sys,subprocess,os
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
active();source_dir=OUT/'sources';source_dir.mkdir(parents=True,exist_ok=True)
def image_upstream(socket):
    for link in socket.links:
        node=link.from_node
        if node.type=='TEX_IMAGE':return node.image
        for i in node.inputs:
            if i.is_linked:
                value=image_upstream(i)
                if value:return value
    return None
dry=bpy.data.materials['pbr_rock__bdwall'];bsdf=next(n for n in dry.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
color=image_upstream(bsdf.inputs['Base Color']);rough=image_upstream(bsdf.inputs['Roughness']);assert color.packed_file and rough.packed_file
base=source_dir/'registered-rock-basecolor.jpg';raw=source_dir/'registered-rock-roughness.png'
base.write_bytes(bytes(color.packed_file.data));raw.write_bytes(bytes(rough.packed_file.data))
destination=ROOT/'art/textures/baidicheng-v01'
subprocess.run([os.environ.get('POETIC_TEXTURE_PYTHON','/usr/bin/python3'),str(Path(__file__).resolve().parent/'prepare_rock_textures.py'),str(base),str(raw),str(destination)],check=True)
for material_name,role in [('pbr_rock__bdwall','dry'),('pbr_rock__bdwet','wet')]:
    m=bpy.data.materials[material_name];bsdf=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    for socket,file,space in [('Base Color',role+'_basecolor.jpg','sRGB'),('Roughness',role+'_roughness.png','Non-Color')]:
        image=bpy.data.images.load(str(destination/file),check_existing=False);image.colorspace_settings.name=space;image.pack()
        node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;m.node_tree.links.new(node.outputs['Color'],bsdf.inputs[socket])
report('components/cliff-baked-pbr-v04.json',json.loads((destination/'processing.json').read_text()))
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
