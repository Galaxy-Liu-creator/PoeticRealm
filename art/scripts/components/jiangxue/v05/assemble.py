"""Copy checked waterline rocks and bank snow; no geometry generation here."""
import sys
from pathlib import Path
import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common_v05 import active, MAIN, EXPORT, check_mesh, report

scene = active()
assert not scene.get('v05_assembled')
for name in ('jx_v05_waterline_prototype', 'jx_v05_waterline_remaining', 'jx_v05_bank_snow'):
    assert scene.get(name + '_checked'), name
export = bpy.data.collections[EXPORT]
history = bpy.data.collections.new('jx_v05_previous_bank_waterline')
scene.collection.children.link(history)
pairs = [(f'shore_rock_v02_{i:02}', f'src_shore_rock_v05_{i:02}') for i in range(14)]
pairs.append(('shore_snow_v02', 'src_shore_snow_v05'))
for target_name, source_name in pairs:
    old, source = bpy.data.objects[target_name], bpy.data.objects[source_name]
    check_mesh(source)
    history.objects.link(old)
    export.objects.unlink(old)
    old.name = 'history_v04_' + target_name
    obj = source.copy()
    obj.data = source.data.copy()
    export.objects.link(obj)
    obj.name = target_name
    obj.hide_set(False)
    obj.hide_render = False
history.hide_viewport = True
history.hide_render = True
for name in ('jx_v05_waterline_prototype', 'jx_v05_waterline_remaining', 'jx_v05_bank_snow_prototype', 'jx_v05_bank_snow'):
    col = bpy.data.collections[name]
    col.hide_viewport = True
    col.hide_render = True
scene['v05_assembled'] = True
report('components/assembly.json', {'replaced': pairs, 'geometryBuiltDuringAssembly': False})
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN), check_existing=False)
print('Fourteen waterline rocks and one checked bank mantle assembled')
