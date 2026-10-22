"""One non-export preview environment: water plane and lighting for Blender review."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
scene=active();col=bpy.data.collections['baidicheng_preview_v01'];assert not bpy.data.objects.get('bd_preview_water')
water=material('water',(.065,.17,.15),.22)
mesh('bd_preview_water',[(-500,-500,0),(500,-500,0),(500,500,0),(-500,500,0)],[(0,1,2,3)],col,[water])
sun=bpy.data.lights.new('bd_preview_sun','SUN');sun.energy=2.2;sun.color=(1,.79,.57)
o=bpy.data.objects.new('bd_preview_sun',sun);col.objects.link(o);o.rotation_euler=(.45,-.45,-.7)
world=bpy.data.worlds.new('bd_dawn_preview');world.use_nodes=True;node=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');node.inputs['Color'].default_value=(.55,.65,.72,1);node.inputs['Strength'].default_value=.6;scene.world=world
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
report('components/preview.json',{'exported':False,'waterLevel':0,'lighting':'static dawn working preview; runtime sky/water authored separately'})
