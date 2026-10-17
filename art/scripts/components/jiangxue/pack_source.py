"""Pack already registered image bytes into the final editable source; no geometry changes."""
import bpy,json
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
assert bpy.data.filepath.replace('\\','/')==ROOT+'/art/blender/jiangxue-scene-v01.blend'
bpy.context.window.scene=bpy.data.scenes['jiangxue_modeling_v01']
bpy.ops.file.pack_all()
images=[{'name':image.name,'packed':bool(image.packed_file or image.packed_files)} for image in bpy.data.images if image.source=='FILE']
assert all(image['packed'] for image in images)
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath,check_existing=False)
with open(ROOT+'/output/jiangxue-model-v01/validation/packed-source.json','w',encoding='utf8') as f:json.dump({'fileImages':images,'geometryChanged':False},f,indent=2)
