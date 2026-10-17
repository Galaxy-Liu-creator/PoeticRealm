"""Only the primary dead-tree trunk and three structural branches; secondary twigs come later."""
import sys,math
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue')
from common import *
col=component('jx_tree_primary',('jx_shore_snow',))
# Root penetrates the checked bank, instead of floating at its illustrative initial height.
bank=bpy.data.objects['src_shore_bank'];tree=bpy.data.objects['dead_tree_root']
point=tree.location-bpy.data.objects['shore_root'].location
closest=min(bank.data.vertices,key=lambda v:(v.co.x+bank.location.x-point.x)**2+(v.co.y+bank.location.y-point.y)**2)
tree.location.z=closest.co.z+bank.location.z-.20
textures=ROOT+'/art/textures/fengqiao-v01/'
wood=textured('pbr_wood__jx_bark',[textures+s for s in ('wood_planks_Diffuse.jpg','wood_planks_nor_gl.png','wood_planks_Rough.png')])
shape=Shape();shape.tube([(0,0,0),(.04,0,.45),(.12,.02,1.4),(.38,.08,2.7),(.20,.15,3.75),(.42,.2,4.65)], [.20,.19,.155,.115,.075,.02],sides=16)
for points,radii in [([(.18,.02,1.8),(-.34,.15,2.35),(-.88,.28,2.75),(-1.45,.22,3.0)],[.10,.07,.042,.013]),
                     ([ (.36,.08,2.65),(.86,-.08,3.1),(1.35,-.10,3.35),(1.80,-.22,3.70)],[.10,.067,.04,.012]),
                     ([ (.21,.15,3.65),(-.30,.27,4.0),(-.80,.44,4.45)],[.067,.04,.010])]:shape.tube(points,radii,sides=12)
shape.finish('dead_tree_primary',col,wood,tree)
finish(col,extra={'rootContactHeight':tree.location.z,'height':4.65,'structuralBranches':3})
view('CAM_nature')
