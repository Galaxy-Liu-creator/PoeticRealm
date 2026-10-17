"""One component correction: overview framing with the boat right of centre."""
import sys,json
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue')
from common import *
scene=active();camera=bpy.data.objects['CAM_enter'];camera.location=(-13,-25,7);target=Vector((6,18,1.0))
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=45
with open(OUTPUT+'/components/jx_camera_refined.json','w',encoding='utf8') as f:json.dump({'camera':camera.name,'position':list(camera.location),'target':list(target),'lens':45,'purpose':'boat right of centre; left poetry safe region'},f,indent=2)
bpy.ops.wm.save_as_mainfile(filepath=MAIN,check_existing=False);view('CAM_enter')
