"""Assemble checked low-detail prototypes at the existing, unchanged 230 roots."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
col=collection('bd_v03_forest_far');placements=json.loads((OUT/'placements.json').read_text())['placements'];rows=[]
for bank in ['right_near','left_near','left_far','right_far']:
    group=[p for p in placements if p['bank']==bank]
    for kind in ['bark','leaves']:
        vs=[];fs=[];slots=[]
        for p in group:
            proto=bpy.data.objects['src_tree_'+kind+'_far_v03_%02d'%p['variant']]
            t=Matrix.Translation(Vector(p['position']))@Matrix.Rotation(p['yaw'],4,'Z')@Matrix.Diagonal((p['scale'],)*3+(1,))
            append_geometry(vs,fs,([tuple(t@proto.matrix_basis@v.co) for v in proto.data.vertices],[tuple(f.vertices) for f in proto.data.polygons]));slots.extend(f.material_index for f in proto.data.polygons)
        mats=list(bpy.data.objects['src_tree_'+kind+'_far_v03_00'].data.materials)
        o=mesh('src_forest_'+kind+'_'+bank+'_far_v03',vs,fs,col,mats,smooth=True)
        for p,i in zip(o.data.polygons,slots):p.material_index=i
        if kind=='leaves':
            mask=o.data.color_attributes.new(name='mask',type='BYTE_COLOR',domain='POINT')
            for p in mask.data:p.color=(0,0,0,1)
        checked(o);name='forest_'+kind+'_'+bank
        if bank.endswith('near'):publish_lod(o,name,160.)
        else:
            target=bpy.data.objects[name];target.data=o.data.copy();target.matrix_basis=o.matrix_basis.copy()
        rows.append({'bank':bank,'kind':kind,'trees':len(group),'triangles':sum(len(p.vertices)-2 for p in o.data.polygons)})
save_component(col,{'assembly':rows,'seed':'unchanged v02 placement seed','positions':'exact v02 root positions/yaw/scale','nearBanks':'full v02 near trees and separate coarse LODs','farBanks':'coarse checked trees'},closed=True)
