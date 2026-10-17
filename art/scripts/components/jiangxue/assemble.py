"""Assemble previously checked components; creates no new scene geometry."""
import sys,json,importlib
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue')
import common
importlib.reload(common)
from common import *
scene=active()
if not scene.get('placement_checked') or 'terrain_component' not in scene:raise RuntimeError('Missing placement or terrain check')
if scene.get('assembled'):raise RuntimeError('Already assembled')
for name in ('jx_boat_structure','jx_boat_snow','jx_shore_rock','jx_shore_snow','jx_rock_snow_v02','jx_tree_primary','jx_tree_twigs'):
    publish(bpy.data.collections[name])
for name in ('jx_fisherman_body','jx_cape_core','jx_cape_fibres','jx_hat_accessories','jx_fishing_tackle'):
    publish(bpy.data.collections[name],dynamic=True)
scene['assembled']=True
for area in bpy.context.screen.areas if bpy.context.screen else []:
    if area.type=='VIEW_3D':area.spaces.active.overlay.show_overlays=False
view('CAM_enter')
bpy.ops.wm.save_as_mainfile(filepath=OUTPUT+'/checkpoints/assembly.blend',copy=True,check_existing=False)
bpy.ops.wm.save_as_mainfile(filepath=MAIN,check_existing=False)
sys.path.insert(0,ROOT+'/art/scripts')
from validate import validate
report=validate()
with open(OUTPUT+'/validation/blender-contract.json','w',encoding='utf8') as f:json.dump({'errors':report.errors,'warnings':report.warnings},f,indent=2)
print(json.dumps({'errors':report.errors,'warnings':report.warnings,'objects':len(bpy.data.collections[EXPORT].all_objects)}))
if report.errors:raise RuntimeError('Assembly contract failed')
