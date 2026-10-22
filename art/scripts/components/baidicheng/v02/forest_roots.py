"""Repair publication roots as real EMPTY IDs, preserving the previous mesh source."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
active();rows=[]
for kind in ['bark','leaves']:
    old=bpy.data.objects['forest_'+kind];children=list(old.children);old.name='src_forest_'+kind+'_prepartition_v02'
    bpy.data.collections[EXPORT].objects.unlink(old);bpy.data.collections[SOURCE].objects.link(old)
    root=bpy.data.objects.new('forest_'+kind,None);bpy.data.collections[EXPORT].objects.link(root);root['static']=True
    for child in children:
        basis=child.matrix_basis.copy();child.parent=root;child.matrix_basis=basis
    assert root.type=='EMPTY' and len(root.children)==4
    rows.append({'root':root.name,'type':root.type,'children':[c.name for c in children]})
report('components/forest-roots.json',{'roots':rows,'preservedMeshRoots':[o.name for o in bpy.data.collections[SOURCE].objects if 'prepartition' in o.name]})
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
