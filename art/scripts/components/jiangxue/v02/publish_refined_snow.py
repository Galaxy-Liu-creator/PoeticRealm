"""Assembly only: publish the independently checked refined snow component."""
import sys,json
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue/v02')
from common_v02 import *
scene=active();name='jx_v02_rock_snow_refined';assert name in json.loads(scene['component_checks'])
col=bpy.data.collections[name]
publish(col)
col.hide_viewport=True;col.hide_render=True
bpy.ops.wm.save_as_mainfile(filepath=MAIN,check_existing=False);view('CAM_rocks')
