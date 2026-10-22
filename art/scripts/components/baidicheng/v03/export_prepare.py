"""Only triangulate publication ngons; editable component topology stays unchanged."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
rows=[]
for o in bpy.data.collections[EXPORT].all_objects:
    if o.type!='MESH':continue
    if o.name.startswith(('forest_bark','forest_leaves')):
        assert all(not any(n.type=='TEX_IMAGE' for n in m.node_tree.nodes) for m in o.data.materials)
        while o.data.uv_layers:o.data.uv_layers.remove(o.data.uv_layers[0])
    ngons=sum(len(p.vertices)>4 for p in o.data.polygons)
    if ngons:
        bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4]);bm.to_mesh(o.data);bm.free()
    rows.append({'name':o.name,'triangles':sum(len(p.vertices)-2 for p in o.data.polygons),'ngonsTriangulated':ngons})
report('components/export-preparation.json',{'meshes':rows,'triangles':sum(r['triangles'] for r in rows)})
assert sum(r['triangles'] for r in rows)<=200000
bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
print('Prepared publication only:',sum(r['triangles'] for r in rows),'triangles')
