"""B12: publish the inspected roof revision; all other assemblies stay intact."""
import bpy,sys,os
sys.path.insert(0,'D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao')
sys.path.insert(0,'D:/University-Competition/Math_Media/PoeticRealm/art/scripts')
import common as c
import importlib;importlib.reload(c)
from validate import validate
from export_glb import export_collection
c.active();assert bpy.context.scene['roof_revision']==2
archive=bpy.data.collections.new('roof_published_v01');bpy.data.collections[c.SOURCE].children.link(archive)
for name in ('temple_main_tile_charcoal','bell_tower_tile_charcoal'):
    obj=bpy.data.objects[name];bpy.data.collections[c.EXPORT].objects.unlink(obj);archive.objects.link(obj);obj.name+='_v01'
c.publish(['architecture_roof'])
report=validate();print(vars(report));assert not report.errors
c.checkpoint('b12-roof-revision','CAM_enter')
path=c.ROOT+'/art/blender/components/fengqiao/roof-v02.blend';os.makedirs(os.path.dirname(path),exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=path,copy=True,check_existing=False)
print(export_collection(bpy.data.collections[c.EXPORT],c.ROOT+'/output/fengqiao-scene-v01/final-v01'))
