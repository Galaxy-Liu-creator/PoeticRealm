"""Replace only checked caps; keep prior source and runtime geometry as history."""
import sys
from pathlib import Path
import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common_v04 import active, EXPORT, MAIN, mesh_check, write_report

scene = active()
assert not scene.get('snow_v04_assembled'), 'Already assembled; resume verification'
assert scene.get('jx_v04_snow_prototype_checked') and scene.get('jx_v04_snow_remaining_checked')
export = bpy.data.collections[EXPORT]
history = bpy.data.collections.new('jx_v04_previous_snow')
scene.collection.children.link(history)
rows = []
for i in range(14):
    name = f'rock_snow_v02_{i:02}'
    old = bpy.data.objects[name]
    source = bpy.data.objects[f'src_rock_snow_v04_{i:02}']
    mesh_check(source)
    assert export in old.users_collection
    history.objects.link(old)
    export.objects.unlink(old)
    old.name = 'history_v03_' + name
    new = source.copy()
    new.data = source.data.copy()
    export.objects.link(new)
    new.name = name
    new.hide_set(False)
    new.hide_render = False
    rows.append({'node': name, 'source': source.name, 'history': old.name})
history.hide_viewport = True
history.hide_render = True
for name in ('jx_v04_snow_prototype', 'jx_v04_snow_remaining'):
    collection = bpy.data.collections[name]
    collection.hide_viewport = True
    collection.hide_render = True
scene['snow_v04_assembled'] = True
write_report('components/assembly.json', {'replaced': rows, 'geometryBuiltDuringAssembly': False})
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN), check_existing=False)
print('Fourteen checked caps assembled; previous snow retained outside export')
