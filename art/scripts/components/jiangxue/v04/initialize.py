"""Fork the saved v03 without changing the previous files or rebuilding geometry."""
import sys
from pathlib import Path
import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common_v04 import MAIN, OUTPUT, SCENE, EXPORT, SOURCE

assert bpy.context.scene.name == 'jiangxue_modeling_v03'
assert Path(bpy.data.filepath).name == 'jiangxue-scene-v03.blend'
assert not MAIN.exists(), 'A v04 already exists; resume it instead of overwriting'
for directory in ('checkpoints', 'components', 'validation', 'raw'):
    (OUTPUT / directory).mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / 'checkpoints/live-v03-before-revision.blend'), copy=True, check_existing=False)
bpy.context.scene.name = SCENE
bpy.data.collections['glb_scene_v03'].name = EXPORT
bpy.data.collections['jiangxue_components_v03'].name = SOURCE
bpy.data.collections['jiangxue_preview_v03'].name = 'jiangxue_preview_v04'
bpy.context.scene['revision_v04_scope'] = 'rock snow only; inherit checked v03 hull, rig, river course and terrain'
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN), check_existing=False)
print('Independent v04 saved; geometry unchanged')
