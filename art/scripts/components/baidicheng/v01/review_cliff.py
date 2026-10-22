"""Inspect only the near-cliff silhouette; does not save or alter the model source."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
scene=active()
for o in scene.objects:o.hide_render=o.name not in ['src_cliff_near_right_detail','CAM_enter']
scene.camera=bpy.data.objects['CAM_enter'];camera=scene.camera
camera.location=(-20,-120,55);target=Vector((63,5,45));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
try:scene.render.engine='BLENDER_WORKBENCH'
except TypeError as error:raise RuntimeError('Workbench inspection unavailable: '+str(error))
scene.render.resolution_x=1000;scene.render.resolution_y=760;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'validation/cliff-prototype-detail.png')
bpy.ops.render.render(write_still=True)
