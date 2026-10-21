"""Run the shared production validator/exporter for v05 only."""
import sys
from pathlib import Path
import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common_v05 import active, ROOT, MAIN, OUTPUT, EXPORT, report
sys.path.insert(0, str(ROOT / 'art/scripts'))
from validate import validate
from export_glb import export_collection

scene = active()
assert scene.get('v05_assembled')
result = validate()
report('validation/blender-contract.json', {'errors': result.errors, 'warnings': result.warnings})
assert not result.errors, result.errors
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN), check_existing=False)
print(export_collection(bpy.data.collections[EXPORT], str(OUTPUT / 'raw')))
