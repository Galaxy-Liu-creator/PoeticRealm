"""Preserve live v04 and fork v05; no geometry is built or discarded."""
import sys
from pathlib import Path
import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common_v05 import MAIN, OUTPUT, SCENE, EXPORT, SOURCE

assert bpy.context.scene.name == 'jiangxue_modeling_v04'
assert Path(bpy.data.filepath).name == 'jiangxue-scene-v04.blend'
assert not MAIN.exists(), 'Resume existing v05; do not initialize again'
for folder in ('checkpoints', 'components', 'validation', 'raw', 'attempts'):
    (OUTPUT / folder).mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / 'checkpoints/live-v04-before-revision.blend'), copy=True, check_existing=False)
bpy.context.scene.name = SCENE
bpy.data.collections['glb_scene_v04'].name = EXPORT
bpy.data.collections['jiangxue_components_v04'].name = SOURCE
bpy.data.collections['jiangxue_preview_v04'].name = 'jiangxue_preview_v05'
bpy.context.scene['revision_v05_scope'] = 'continuous rock wet boundary and surface-sampled bank snow'
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN), check_existing=False)
print('Independent v05 saved; existing geometry retained')
