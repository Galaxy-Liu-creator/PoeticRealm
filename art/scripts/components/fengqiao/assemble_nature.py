"""C08: assemble checked banks, rocks and plants; archive the old block sample."""
import bpy,sys,os
sys.path.insert(0,'D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao')
sys.path.insert(0,'D:/University-Competition/Math_Media/PoeticRealm/art/scripts')
import common as c
import importlib;importlib.reload(c)
from validate import validate
from export_glb import export_collection
archive=bpy.data.collections.new('shore_sample_archive');bpy.data.collections[c.SOURCE].children.link(archive)
for name in ('shore_stone_wet','shore_stone_dry'):
    obj=bpy.data.objects[name];bpy.data.collections[c.EXPORT].objects.unlink(obj);archive.objects.link(obj)
c.publish(['shore_profile','shore_rock_scatter','bridge_bank_approaches','maple_branches','maple_leaves','reed_scatter'])
r=validate();print(vars(r));assert not r.errors
c.checkpoint('c08-assembled','CAM_enter')
path=c.ROOT+'/art/blender/components/fengqiao/nature-v01.blend';os.makedirs(os.path.dirname(path),exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=path,copy=True,check_existing=False)
print(export_collection(bpy.data.collections[c.EXPORT],c.ROOT+'/output/fengqiao-scene-v01/nature-v01'))
