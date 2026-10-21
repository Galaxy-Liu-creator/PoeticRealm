"""Repair affected source/export origins while preserving all world-space vertices."""
import sys,json
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common_v06 import *
scene=active();rows=[]
names=[f'{prefix}{i:02}' for prefix in ('shore_rock_v02_','rock_snow_v02_','src_rock_v06_','src_snow_v06_') for i in range(14)]
names += ['dead_tree_'+part+suffix for part in ('fine','snow') for suffix in ('_v02',)]
names += ['dead_tree_roots_v06','src_dead_tree_fine_v06','src_dead_tree_snow_v06','src_dead_tree_roots_v06']
for name in names:
    obj=bpy.data.objects[name]
    matrix=obj.parent.matrix_world@obj.matrix_parent_inverse@obj.matrix_basis if obj.parent else obj.matrix_basis.copy()
    before=[matrix@v.co for v in obj.data.vertices]
    normalize_origin(obj)
    matrix=obj.parent.matrix_world@obj.matrix_parent_inverse@obj.matrix_basis if obj.parent else obj.matrix_basis.copy()
    deviation=max((matrix@v.co-a).length for v,a in zip(obj.data.vertices,before))
    assert deviation<3e-5,(name,deviation);rows.append({'object':name,'worldSurfaceDeviationMetres':deviation})
for col_name in ('jx_v06_rock_prototype','jx_v06_rock_remaining','jx_v06_tree'):
    col=bpy.data.collections[col_name];path=OUTPUT/'components'/(col_name+'.json');old=json.loads(path.read_text())
    save_component(col,old['checks'])
report('validation/origin-normalization.json',{'objects':rows})
bpy.context.view_layer.update();bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
print({'normalized':len(rows),'maximumSurfaceDeviation':max(r['worldSurfaceDeviationMetres'] for r in rows)})
