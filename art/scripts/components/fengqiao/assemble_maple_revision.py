"""C09: replace only already inspected maple branches and leaves."""
import bpy,sys,os
sys.path.insert(0,'D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao')
sys.path.insert(0,'D:/University-Competition/Math_Media/PoeticRealm/art/scripts')
import common as c
import importlib;importlib.reload(c)
from validate import validate
from export_glb import export_collection
c.active()
assert bpy.context.scene['maple_branch_revision']==3 and bpy.context.scene['maple_leaf_revision']==3
archive=bpy.data.collections.new('maple_published_v02');bpy.data.collections[c.SOURCE].children.link(archive)
for name in ('maple_grove_wood_aged','maple_grove_foliage_maple'):
    obj=bpy.data.objects[name];bpy.data.collections[c.EXPORT].objects.unlink(obj);archive.objects.link(obj);obj.name+='_v02'
c.publish(['maple_branches','maple_leaves'])
report=validate();print(vars(report));assert not report.errors
c.checkpoint('c09-maple-revision','CAM_enter')
path=c.ROOT+'/art/blender/components/fengqiao/nature-v02.blend';os.makedirs(os.path.dirname(path),exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=path,copy=True,check_existing=False)
print(export_collection(bpy.data.collections[c.EXPORT],c.ROOT+'/output/fengqiao-scene-v01/nature-v02'))
