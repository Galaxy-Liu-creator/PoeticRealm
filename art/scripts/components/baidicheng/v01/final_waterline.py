"""Assign the continuous band in the final visible mesh and matching latest source meshes."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
active();rows=[]
names=['cliff_right_near','cliff_left_near','cliff_left_far','cliff_right_far','city_promontory']
names += ['src_cliff_'+n+'_shoulder' for n in ['right_near','left_near','left_far','right_far']]
for name in names:
    o=bpy.data.objects[name];assert o.parent is None
    for p in o.data.polygons:
        heights=[(o.matrix_basis@o.data.vertices[i].co).z for i in p.vertices]
        assert not(min(heights)<.22-1e-4 and max(heights)>.22+1e-4)
        p.material_index=int(max(heights)<=.22+1e-4)
    rows.append({'node':name,'wetFaces':sum(p.material_index==1 for p in o.data.polygons)})
report('components/final-waterline.json',{'geometryUnchanged':True,'rootSpace':'explicit matrix_basis for parentless source objects, including hidden source collections','nodes':rows})
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
