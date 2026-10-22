"""Only authoring visibility for LODs. Both layers are explicitly included during export."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
entries=json.loads(active()['distance_lods_json']);assert len(entries)==9
for entry in entries:
    near=bpy.data.objects[entry['near']];far=bpy.data.objects[entry['far']]
    assert all(abs(a-b)<1e-5 for a,b in zip(sum((list(r) for r in near.matrix_basis),[]),sum((list(r) for r in far.matrix_basis),[])))
    near.hide_set(False)
    for o in [far,*far.children_recursive]:o.hide_set(True)
report('components/lod-authoring-visibility.json',{'mode':'near for authoring preview','definitions':entries,'export':'explicitly unhide both levels then restore'})
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
