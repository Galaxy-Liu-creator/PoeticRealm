"""B10: assemble already checked source components, validate and export."""
import bpy,sys,os,json
sys.path.insert(0,"D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao")
sys.path.insert(0,"D:/University-Competition/Math_Media/PoeticRealm/art/scripts")
import common as c
import importlib
importlib.reload(c)
from validate import validate
from export_glb import export_collection
components=["architecture_foundation","architecture_frame","architecture_brackets",
            "architecture_rafters","architecture_roof","temple_enclosure",
            "bell_frame_body","bridge_arch_abutments","bridge_deck_rails"]
c.publish(components)
report=validate()
print(vars(report))
if report.errors: raise RuntimeError("Architecture assembly failed validation")
c.checkpoint("b10-assembled","CAM_enter")
path=c.ROOT+"/art/blender/components/fengqiao/architecture-v01.blend"
os.makedirs(os.path.dirname(path),exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=path,copy=True,check_existing=False)
out=export_collection(bpy.data.collections[c.EXPORT],c.ROOT+"/output/fengqiao-scene-v01/unoptimized")
print(json.dumps({"source":bpy.data.filepath,"export":out,"components":components}))
