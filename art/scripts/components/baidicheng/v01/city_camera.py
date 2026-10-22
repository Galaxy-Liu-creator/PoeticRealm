"""Move only CAM_city so the city roofs clear the foreground cliff lip."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
active();camera=bpy.data.objects['CAM_city'];focus=bpy.data.objects['FOCUS_city']
old=list(camera.location);camera.location=(-10,-25,48);focus.location=(52,126,71);camera.rotation_euler=(focus.location-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=28
report('components/city-camera-v02.json',{'before':old,'camera':list(camera.location),'focus':list(focus.location),'purpose':'city silhouette clears its own supporting cliff lip'})
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
