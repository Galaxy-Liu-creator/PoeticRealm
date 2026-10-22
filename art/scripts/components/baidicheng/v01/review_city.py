"""Inspect the assembled position of already-built city components; no saved source edits."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
scene=active()
for o in scene.objects:o.hide_render=not (o.name.startswith('src_city_') or o.name=='CAM_city')
camera=bpy.data.objects['CAM_city'];scene.camera=camera;camera.location=(0,49,99);camera.rotation_euler=(Vector((52,118,67))-camera.location).to_track_quat('-Z','Y').to_euler()
try:scene.render.engine='BLENDER_WORKBENCH'
except TypeError as error:raise RuntimeError(str(error))
scene.render.resolution_x=1100;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'validation/city-components.png')
bpy.ops.render.render(write_still=True)
