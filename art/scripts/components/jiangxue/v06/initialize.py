"""Fork the existing model; preserve the v05 file and all history."""
import sys
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common_v06 import *
assert bpy.context.scene.name=='jiangxue_modeling_v05'
assert not MAIN.exists(),'Resume v06 instead of initializing again'
for folder in ('checkpoints','components','validation','raw','attempts'):(OUTPUT/folder).mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT/'checkpoints/live-v05-before-revision.blend'),copy=True,check_existing=False)
bpy.context.scene.name=SCENE
for old,new in [('glb_scene_v05',EXPORT),('jiangxue_components_v05',SOURCE),('jiangxue_preview_v05','jiangxue_preview_v06')]:
    bpy.data.collections[old].name=new
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
print('v06 fork saved; v05 remains unchanged')
