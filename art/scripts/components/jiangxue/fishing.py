"""One component group: tapered bent bamboo rod, grip bindings and a continuous fishing line."""
import sys,math,json
ROOT='D:/University-Competition/Math_Media/PoeticRealm'
sys.path.insert(0,ROOT+'/art/scripts/components/jiangxue')
from common import *
col=component('jx_fishing_tackle',('jx_hat_accessories',));boat=bpy.data.objects['boat_guest']
spec=json.loads(active()['fisherman_parameters']);left=Vector(spec['grips']['left']);axis=Vector(spec['axis'])
rod=root('fishing_rod',dynamic=True);rod.parent=boat
shape=Shape();points=[];radii=[];start=left-axis*.36
for i in range(33):
    length=P['rod_length']*i/32;t=length/P['rod_length']
    p=start+axis*length+Vector((0,0,-.34*t*t))
    points.append(p);radii.append(.013*(1-t)+.0032*t)
shape.tube(points,radii,sides=12)
shape.finish('fishing_bamboo',col,solid('pbr_wood__jx_bamboo',(.13,.11,.052),.73),rod,dynamic=True)
binding=Shape()
for distance in (.05,.36,.66,1.05,1.43,1.88,2.35,2.80):
    p=start+axis*distance+Vector((0,0,-.34*(distance/P['rod_length'])**2))
    radius=.013*(1-distance/P['rod_length'])+.0032*distance/P['rod_length']
    binding.tube([p-axis*.008,p+axis*.008],[radius*1.18,radius*1.18],sides=12)
binding.finish('fishing_bamboo_nodes',col,solid('pbr_wood__jx_bamboo_nodes',(.069,.065,.032)),rod,dynamic=True)
tip=points[-1];water=Vector((tip.x+.08,tip.y-.17,-.006));line=Shape()
line_points=[tip.lerp(water,t)+Vector((-.025*math.sin(math.pi*t),-.035*math.sin(math.pi*t),0)) for t in [i/24 for i in range(25)]]
line.tube(line_points,.0012,sides=5);line.finish('fishing_line',col,solid('pbr_cloth__jx_line',(.10,.105,.091),.88),boat,dynamic=True)
for name,location,parent in [('ANCHOR_fishing_grip',left,rod),('ANCHOR_fishing_tip',tip,rod),('ANCHOR_fishing_water',water,boat)]:
    obj=bpy.data.objects.new(name,None);col.objects.link(obj);obj.parent=parent;obj.location=location
active()['fishing_parameters']=json.dumps({'tip':list(tip),'water':list(water),'grips':spec['grips'],'length':P['rod_length']})
finish(col,extra={'lengthMetres':P['rod_length'],'lineRadiusMetres':.0012,'lineEnds':{'rodTip':list(tip),'water':list(water)},'outsideBoat':abs(water.y)>.91})
view('CAM_fisherman')
