"""Preserve the live source and create an independent revision; no geometry."""
import bpy,sys
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
assert bpy.context.scene.name=='jiangxue_modeling_v02'
assert bpy.data.filepath.replace('\\','/')==ROOT+'/art/blender/jiangxue-scene-v02.blend'
from pathlib import Path
assert not Path(ROOT+'/art/blender/jiangxue-scene-v03.blend').exists()
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/output/jiangxue-model-v03/checkpoints/live-v02-before-revision.blend',copy=True,check_existing=False)
bpy.context.scene.name='jiangxue_modeling_v03'
bpy.data.collections['glb_scene_v02'].name='glb_scene_v03'
bpy.data.collections['jiangxue_components_v02'].name='jiangxue_components_v03'
bpy.data.collections['jiangxue_preview'].name='jiangxue_preview_v03'
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/art/blender/jiangxue-scene-v03.blend',check_existing=False)
print('Independent v03 initialized; v02 file untouched')
