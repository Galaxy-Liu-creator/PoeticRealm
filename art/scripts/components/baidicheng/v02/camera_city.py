"""Only the city camera, retaining its upright Blender CAM/FOCUS contract."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
active();camera=bpy.data.objects['CAM_city'];focus=bpy.data.objects['FOCUS_city']
camera.location=(-8,20,68);focus.location=(52,125,70)
camera.rotation_euler=(focus.location-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.lens=36;camera.data.sensor_fit='VERTICAL';camera.data.sensor_height=24
report('components/city-camera.json',{'camera':list(camera.location),'focus':list(focus.location),'lens':36,'reason':'clear the foreground wall so the existing roof group can be read, retain slight upward gao view'})
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
