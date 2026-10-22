"""Final camera-only refinement: isolate the city skyline above its perimeter wall."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
active();camera=bpy.data.objects['CAM_city'];focus=bpy.data.objects['FOCUS_city']
old={'camera':list(camera.location),'focus':list(focus.location),'lens':camera.data.lens}
camera.location=(-5,-3,56);focus.location=(52,128,73);camera.rotation_euler=(focus.location-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=42
report('components/city-camera-v03.json',{'before':old,'camera':list(camera.location),'focus':list(focus.location),'lens':42,'scope':'camera only, published geometry and route unchanged'})
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
