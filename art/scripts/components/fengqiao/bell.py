"""B07: load-bearing bell frame, thick hollow bronze bell and hanging eye."""
import bpy,sys,math
sys.path.insert(0,"D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao")
import common as c
import importlib
importlib.reload(c)
col=c.component("bell_frame_body","tower");root=bpy.data.objects["bell_tower"]
wood=c.Part("bell_frame",col,root,c.material("pbr_wood__aged"))
for x in (-1.5,1.5):
    wood.tube([(x,0,1.68),(x,0,6.38)],.19,12)
    wood.tube([(x,0,5.5),(x*.52,0,6.27)],.11,8)
wood.box((0,0,6.42),(3.55,.37,.31))
wood.box((0,0,2.4),(3.28,.24,.22))
wood.tube([(-.3,-1.8,3.70),(-.3,-1.04,3.7)],.16,12)
wood.tube([(-.3,0,6.35),(-.3,0,5.96),(-.3,-1.83,5.96)],.10,8)
wood.mesh(.012)
bronze=c.solid("pbr_metal__bellbronze",(.14,.12,.072),.52,.78)
bell=c.Part("bell_body",col,root,bronze)
# The profile returns along the inner wall, retaining an open mouth and closed crown.
profile=[(1.03,3.20),(1.05,3.29),(.98,3.46),(.92,3.64),(.86,4.15),(.75,4.70),
         (.61,5.15),(.43,5.45),(.08,5.57),(.08,5.46),(.36,5.34),(.54,5.04),
         (.67,4.63),(.79,4.10),(.85,3.65),(.91,3.42),(.96,3.25),(.95,3.20)]
bell.lathe(profile,48)
for z,r in [(3.35,1.012),(3.73,.915),(4.68,.766),(5.16,.615)]:
    points=[(r*math.cos(i*math.tau/48),r*math.sin(i*math.tau/48),z) for i in range(49)]
    # Closed solid ring has caps inside its deliberately contacting seam.
    bell.tube(points,.018,6)
bell.tube([(-.24,0,5.52),(-.25,0,5.82),(0,0,6.14),(.25,0,5.82),(.24,0,5.52)],.095,10)
bell.mesh()
iron=c.Part("bell_hanging_pin",col,root,c.material("pbr_metal__iron"))
iron.tube([(0,-.28,6.13),(0,.28,6.13)],.07,10)
for y in (-.25,.25): iron.tube([(0,y,6.13),(0,y,6.39)],.055,8)
for y in (-1.65,-1.10): iron.tube([(-.3,y,3.70),(-.3,y,5.96)],.016,8)
iron.mesh()
c.verify(col,expected=lambda:None)
c.checkpoint("b07-bell","CAM_bell")
