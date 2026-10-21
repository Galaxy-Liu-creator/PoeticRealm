"""Validate and export the checked collection using the common export pipeline."""
import sys
from pathlib import Path
import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common_v04 import active, ROOT, EXPORT, MAIN, OUTPUT, write_report
sys.path.insert(0, str(ROOT / 'art/scripts'))
from validate import validate
from export_glb import export_collection

scene = active()
assert scene.get('snow_v04_assembled')
report = validate()
write_report('validation/blender-contract.json', {'errors': report.errors, 'warnings': report.warnings})
assert not report.errors, report.errors
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN), check_existing=False)
print(export_collection(bpy.data.collections[EXPORT], str(OUTPUT / 'raw')))
