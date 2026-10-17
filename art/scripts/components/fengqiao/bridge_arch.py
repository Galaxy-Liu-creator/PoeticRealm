"""B08: elliptical stone voussoirs and submerged abutments only."""
import bpy,sys,math
sys.path.insert(0,"D:/University-Competition/Math_Media/PoeticRealm/art/scripts/components/fengqiao")
import common as c
import importlib
importlib.reload(c)
col=c.component("bridge_arch_abutments","bridge");s=c.P["bridge"];root=bpy.data.objects["bridge_main"]
dry=c.Part("bridge_arch_stone",col,root,c.material("pbr_stone__dry"))
wet=c.Part("bridge_submerged_footings",col,root,c.material("pbr_stone__wet"))
a,rise,ring,w=s["half_span"],s["rise"],s["ring"],s["half_width"]
for i in range(39):
    t0=i*math.pi/39+.0015;t1=(i+1)*math.pi/39-.0015
    verts=[]
    for y in (-w,w):
        for rad,h,t in [(a,rise,t0),(a,rise,t1),(a+ring,rise+ring,t1),(a+ring,rise+ring,t0)]:
            verts.append((-rad*math.cos(t),y,s["spring"]+h*math.sin(t)))
    dry.add(verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
for sign in (-1,1):
    wet.box((sign*(a+1.15),0,-.52),(2.10,4.7,1.45))
    dry.box((sign*(a+1.15),0,.69),(2.10,4.5,.96))
    for course in range(3):
        for j in range(4):
            dry.box((sign*(a+1.15),-1.65+j*1.10,.26+course*.34),(2.15,1.08,.325))
dry.mesh(.010);wet.mesh(.025)
c.verify(col)
c.checkpoint("b08-bridge-arch","CAM_bridge")
