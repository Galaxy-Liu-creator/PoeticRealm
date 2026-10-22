"""Validate/export the existing assembly, bake metric terrain and write its manifest."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
sys.path.insert(0,str(ROOT/'art/scripts'))
from validate import validate
from export_glb import export_collection
scene=active();assert scene.get('bd_assembled') and scene.get('bd_terrain_checked')
result=validate();report('validation/blender-contract.json',{'errors':result.errors,'warnings':result.warnings});assert not result.errors,result.errors
output=export_collection(bpy.data.collections[EXPORT],str(OUT/'raw'))
import bake_terrain
from types import SimpleNamespace
bake_terrain.parse_args=lambda:SimpleNamespace(out=str(ROOT/'frontend/public/assets/terrain'),scene='baidicheng-v01',resolution=1024,water_level=0.)
bake_terrain.main()
nodes=[o.name for o in bpy.data.collections[EXPORT].all_objects]
manifest={'contractVersion':'0.2','scene':'baidicheng','scope':'quality-sample','model':'models/baidicheng/scene_v01.glb','terrain':'baidicheng-v01','waterLevel':0.,'requiredNodes':nodes,'boatNavigation':json.loads(scene['boat_navigation_json'])}
p=ROOT/'frontend/public/assets/scenes/baidicheng.scene-v01.json';p.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
print('Raw GLB and manifest:',output,p)
