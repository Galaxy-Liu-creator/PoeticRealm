"""A: independent five-camera layout and removable dimension blocks only."""
import bpy
import math
import sys
from mathutils import Vector
sys.path.insert(0,"D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao")
import common as c
import importlib
importlib.reload(c)

scene = bpy.context.scene
if scene.name != "fengqiao_quality_v04" or bpy.data.filepath.replace("\\","/").split("/")[-1] != "fengqiao-scene-v01.blend":
    raise RuntimeError("Begin from the preserved independent v04 working copy")
scene.name = c.SCENE
bpy.data.collections["glb_sample_v04"].name = c.EXPORT
scene["contractVersion"] = "0.2"
scene["modeling_parameters"] = __import__("json").dumps(c.P)
export = bpy.data.collections[c.EXPORT]

def marker(name, position):
    obj = bpy.data.objects.get(name)
    if obj is None:
        obj = bpy.data.objects.new(name,None);export.objects.link(obj)
    obj.location = position
    return obj

def camera(name, position, target, fov):
    obj = bpy.data.objects.get(name)
    if obj is None:
        data=bpy.data.cameras.new(name+"_data")
        obj=bpy.data.objects.new(name,data);export.objects.link(obj)
    obj.data.sensor_fit="VERTICAL"
    obj.data.lens=obj.data.sensor_height/(2*math.tan(fov/2))
    obj.location=position
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()
    obj["yuan"]="ping"
    marker("FOCUS_"+name.removeprefix("CAM_"),target)
    return obj

camera("CAM_enter",(22,-28,13),(1,16,3.0),.66)
camera("CAM_moonset",(15,-20,9),(-8,36,4.5),.70)
camera("CAM_riverbank",(7.8,-7.8,3.6),(-1.8,3,.75),.74)
camera("CAM_temple",(24,10,7.6),(7.5,33,5),.66)
camera("CAM_bridge",(7,2,4.8),(-5,15,1.9),.75)
camera("CAM_bell",(-13,20,5.3),(-5,31,5.0),.62)
camera("CAM_nature",(8,-4,4.2),(-5,5,2.6),.73)
# Preserve existing close-up boat/rower cameras for contact comparison.
for owner,name in [("temple","temple_main"),("tower","bell_tower"),("bridge","bridge_main")]:
    c.get_root(name,c.P[owner]["origin"])
marker("SFX_bell",(-5,31,4.7));marker("EMIT_bell",(-5,26,0))
marker("SFX_crow",(-8,6,7))
col=c.component("layout_blocks","layout")
for owner,name,center,size in [
    ("temple","temple_dimension",(0,0,4.5),(16.8,9.6,9)),
    ("tower","tower_dimension",(0,0,4.0),(5.4,5.4,8)),
    ("bridge","bridge_dimension",(0,0,1.6),(16,3.8,3.2)),
]:
    parent=bpy.data.objects[{"temple":"temple_main","tower":"bell_tower","bridge":"bridge_main"}[owner]]
    part=c.Part(name,col,parent,c.material("pbr_stone__dry"))
    part.box(center,size);part.mesh()
scene.render.resolution_x=1920;scene.render.resolution_y=1080
scene.render.resolution_percentage=100
c.verify(col)
c.checkpoint("a01-layout","CAM_enter")
