"""Recheck world-space material bands after origin normalization; geometry stays unchanged."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
active();rows=[];bpy.context.view_layer.update()
for name in ['right_near','left_near','left_far','right_far','city_promontory']:
    o=bpy.data.objects['src_'+('cliff_'+name if name!='city_promontory' else name)]
    count=0
    for p in o.data.polygons:
        heights=[(o.matrix_world@o.data.vertices[i].co).z for i in p.vertices]
        assert not (min(heights)<.22-1e-4 and max(heights)>.22+1e-4),(o.name,p.index)
        p.material_index=int(max(heights)<=.22+1e-4)
        if p.material_index:count+=1
    rows.append({'node':o.name,'wetFaces':count,'boundaryMeters':.22})
    c=next(c for c in o.users_collection if c.name.startswith('bd_'))
    bpy.data.libraries.write(str(LIB/(c.name+'-waterline-v02.blend')),{c},fake_user=True)
report('components/waterline-v02.json',{'geometryUnchanged':True,'checks':rows})
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
print(rows)
