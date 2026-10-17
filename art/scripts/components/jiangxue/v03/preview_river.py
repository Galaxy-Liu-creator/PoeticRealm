"""One simple component: Blender-only water at the contracted 0m water level."""
import sys,json
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue/v03')
from common_v03 import *
scene=active();col=bpy.data.collections['jiangxue_preview_v03'];assert not bpy.data.objects.get('preview_river_v03')
mat=bpy.data.materials.new('preview_water_v03');mat.use_nodes=True
bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bsdf.inputs['Base Color'].default_value=(.028,.10,.135,1);bsdf.inputs['Roughness'].default_value=.18;bsdf.inputs['Metallic'].default_value=0;bsdf.inputs['IOR'].default_value=1.333
mat.diffuse_color=(.028,.10,.135,1)
noise=mat.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=2.4;noise.inputs['Detail'].default_value=2
bump=mat.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.13;bump.inputs['Distance'].default_value=.018
mat.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);mat.node_tree.links.new(bump.outputs['Normal'],bsdf.inputs['Normal'])
data=bpy.data.meshes.new('preview_river_v03_mesh');data.from_pydata([(-350,-350,0),(350,-350,0),(350,350,0),(-350,350,0)],[],[(0,1,2,3)]);data.materials.append(mat)
obj=bpy.data.objects.new('preview_river_v03',data);col.objects.link(obj)
assert obj.name not in bpy.data.collections[EXPORT].all_objects
result={'waterLevelMetres':0,'extentMetres':700,'previewOnly':True,'exported':False,'matches':'Fengqiao non-exported preview_river / published NightRiver'}
with open(OUTPUT+'/components/preview_river.json','w',encoding='utf8') as f:json.dump(result,f,indent=2)
bpy.data.libraries.write(ROOT+'/art/blender/components/jiangxue-v03/preview_river.blend',{col},fake_user=True)
bpy.ops.wm.save_as_mainfile(filepath=MAIN,check_existing=False);view('CAM_enter');print(json.dumps(result))
