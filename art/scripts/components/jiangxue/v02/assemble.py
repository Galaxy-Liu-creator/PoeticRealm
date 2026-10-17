"""Assemble checked replacements only; no new geometry creation."""
import sys,json
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue/v02')
from common_v02 import *
scene=active();assert scene.get('terrain_v02_checked');assert not scene.get('assembled_v02')
for name in ('jx_v02_bank','jx_v02_rock_cluster','jx_v02_bank_snow','jx_v02_rock_snow','jx_v02_tree_core','jx_v02_tree_twigs'):
    publish(bpy.data.collections[name])
camera=bpy.data.objects['CAM_rocks'];camera.location=(4,-7,6)
camera.rotation_euler=(Vector((16,12,2.0))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=43
scene['assembled_v02']=True
view('CAM_enter');bpy.ops.wm.save_as_mainfile(filepath=MAIN,check_existing=False)
sys.path.insert(0,ROOT+'/art/scripts')
from validate import validate
report=validate()
with open(OUTPUT+'/validation/blender-contract.json','w',encoding='utf8') as f:json.dump({'errors':report.errors,'warnings':report.warnings},f,ensure_ascii=False,indent=2)
print(json.dumps({'errors':report.errors,'warnings':report.warnings,'objects':len(bpy.data.collections[EXPORT].all_objects)}))
assert not report.errors
