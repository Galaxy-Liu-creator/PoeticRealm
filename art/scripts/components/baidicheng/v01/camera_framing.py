"""Revise only the overview shot after the first actual browser screenshot."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
scene=active();camera=bpy.data.objects['CAM_enter'];focus=bpy.data.objects['FOCUS_enter']
old={'camera':list(camera.location),'focus':list(focus.location),'lens':camera.data.lens}
camera.location=(7,-155,72);focus.location=(0,100,28);camera.rotation_euler=(focus.location-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=20
report('components/camera-framing-v02.json',{'before':old,'after':{'camera':list(camera.location),'focus':list(focus.location),'lens':20},'purpose':'complete boat, city and cliff crowns in the desktop overview'})
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
