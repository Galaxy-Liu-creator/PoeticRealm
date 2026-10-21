"""Replace checked components only; no geometry is generated during assembly."""
import sys
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common_v06 import *
scene=active();assert not scene.get('v06_assembled')
for name in ('jx_v06_rock_prototype','jx_v06_rock_remaining','jx_v06_terrain','jx_v06_tree'):assert scene.get(name+'_checked'),name
history=bpy.data.collections.new('jx_v06_previous_components');scene.collection.children.link(history)
export=bpy.data.collections[EXPORT]
pairs=[(f'shore_rock_v02_{i:02}',f'src_rock_v06_{i:02}') for i in range(14)]
pairs += [(f'rock_snow_v02_{i:02}',f'src_snow_v06_{i:02}') for i in range(14)]
pairs += [('dead_tree_fine_v02','src_dead_tree_fine_v06'),('dead_tree_snow_v02','src_dead_tree_snow_v06'),('dead_tree_roots_v06','src_dead_tree_roots_v06'),('terrain','src_terrain_v06')]
for name,source in pairs:
    old=bpy.data.objects.get(name);src=bpy.data.objects[source]
    target=bpy.data.collections['terrain'] if name=='terrain' else export
    if old:
        history.objects.link(old)
        for c in list(old.users_collection):
            if c!=history:c.objects.unlink(old)
        old.name='history_v05_'+name
    obj=src.copy();obj.data=src.data.copy();target.objects.link(obj);obj.name=name;obj.hide_set(False);obj.hide_render=False
history.hide_render=True;history.hide_viewport=True
for name in ('jx_v06_rock_prototype','jx_v06_rock_remaining','jx_v06_terrain','jx_v06_tree'):
    c=bpy.data.collections[name];c.hide_viewport=True;c.hide_render=True
scene['v06_assembled']=True
bpy.context.view_layer.update()
report('components/assembly.json',{'replacements':pairs,'geometryBuiltDuringAssembly':False})
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
print('Checked rock groups, terrain and tree assembled')
