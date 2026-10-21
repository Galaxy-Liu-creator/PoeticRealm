"""Validate and export only the final assembly, then bake its own terrain."""
import sys
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common_v06 import *
sys.path.insert(0,str(ROOT/'art/scripts'))
from validate import validate
from export_glb import export_collection
scene=active();assert scene.get('v06_assembled') and scene.get('jx_v06_cameras_checked')
result=validate();report('validation/blender-contract.json',{'errors':result.errors,'warnings':result.warnings});assert not result.errors,result.errors
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
print(export_collection(bpy.data.collections[EXPORT],str(OUTPUT/'raw')))
import bake_terrain
from types import SimpleNamespace
bake_terrain.parse_args=lambda:SimpleNamespace(out=str(ROOT/'frontend/public/assets/terrain'),scene='jiangxue-v06',resolution=1024,water_level=0.)
bake_terrain.main()
