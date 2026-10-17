"""Save a separate revision and preserve the current unsaved state. No geometry creation."""
import bpy,json,os
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
assert bpy.context.scene.name=='jiangxue_modeling_v01'
assert bpy.data.filepath.replace('\\','/')==ROOT+'/art/blender/jiangxue-scene-v01.blend'
target=ROOT+'/art/blender/jiangxue-scene-v02.blend'
assert not os.path.exists(target),'v02 exists; do not overwrite'
dirty=bpy.data.is_dirty
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/output/jiangxue-model-v02/checkpoints/live-v01-before-revision.blend',copy=True,check_existing=False)
scene=bpy.context.scene;scene.name='jiangxue_modeling_v02'
bpy.data.collections['glb_scene_v01'].name='glb_scene_v02'
bpy.data.collections['jiangxue_components_v01'].name='jiangxue_components_v02'
scene['revision_baseline']=json.dumps({'from':'jiangxue-scene-v01.blend','liveWasDirty':dirty,'preservedLiveCheckpoint':True})
bpy.ops.wm.save_as_mainfile(filepath=target,check_existing=False)
print(json.dumps({'scene':scene.name,'saved':target,'liveWasDirty':dirty}))
