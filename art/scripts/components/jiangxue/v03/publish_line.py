"""Assembly only: publish the checked replacement line, retain the old source."""
import sys
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue/v03')
from common_v03 import *
scene=active();publish(bpy.data.collections['jx_v03_fishing_line'],dynamic=True)
scene['assembled_v03']=True;bpy.ops.wm.save_as_mainfile(filepath=MAIN,check_existing=False);view('CAM_enter')
