"""Only partition the checked forest by its four authored bank groups."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
active();col=collection('bd_v02_forest_chunks')
placements=json.loads((OUT/'components/foliage-placements-supported.json').read_text())['placements'];groups=['right_near','left_near','left_far','right_far'];rows=[]
for kind,proto in [('bark','src_tree_bark_crown_v02_'),('leaves','src_tree_leaves_fringe_v02_')]:
    old=bpy.data.objects['src_forest_'+kind+'_supported_v02'];vertices=[tuple(old.matrix_basis@v.co) for v in old.data.vertices]
    grouped={g:([],[],[]) for g in groups};vo=0;fo=0
    for p in placements:
        model=bpy.data.objects[proto+'%02d'%p['variant']];nv=len(model.data.vertices);nf=len(model.data.polygons);vs,fs,slots=grouped[p['bank']]
        part_faces=[tuple(i-vo for i in poly.vertices) for poly in old.data.polygons[fo:fo+nf]]
        append_geometry(vs,fs,(vertices[vo:vo+nv],part_faces));slots.extend(poly.material_index for poly in old.data.polygons[fo:fo+nf]);vo+=nv;fo+=nf
    assert vo==len(old.data.vertices) and fo==len(old.data.polygons)
    previous=bpy.data.objects['forest_'+kind];previous.name='src_forest_'+kind+'_prepartition_v02'
    bpy.data.collections[EXPORT].objects.unlink(previous);bpy.data.collections[SOURCE].objects.link(previous)
    root=bpy.data.objects.new('forest_'+kind,None);bpy.data.collections[EXPORT].objects.link(root);root['static']=True
    for bank,(vs,fs,slots) in grouped.items():
        name='forest_'+kind+'_'+bank;o=mesh('src_'+name+'_v02',vs,fs,col,list(old.data.materials),smooth=True)
        for poly,slot in zip(o.data.polygons,slots):poly.material_index=slot
        if kind=='leaves':
            mask=o.data.color_attributes.new(name='mask',type='BYTE_COLOR',domain='POINT')
            for item in mask.data:item.color=(0,0,0,1)
        checked(o,kind=='bark');pub=bpy.data.objects.new(name,o.data.copy());bpy.data.collections[EXPORT].objects.link(pub);pub.parent=root;pub.matrix_basis=o.matrix_basis.copy();pub['static']=True
        rows.append({'node':name,'trees':sum(p['bank']==bank for p in placements),'triangles':sum(len(p.vertices)-2 for p in pub.data.polygons)})
save_component(col,{'partition':rows,'changed':'grouping only; exact world vertices, faces and materials preserved','trees':len(placements)},closed=False)
