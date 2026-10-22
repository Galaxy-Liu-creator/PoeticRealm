"""Only simplify the distant branch frame to one continuous cross branch; crowns stay intact."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
col=collection('bd_v03_tree_far_bark');m=bpy.data.materials['pbr_wood__bdbark']
for variant in range(3):
    h=5.5+variant*.95;v=[];f=[]
    append_geometry(v,f,cylinder_data((0,0,0),(.2,-.15,h*.80),.19+variant*.025,.035,6))
    append_geometry(v,f,cylinder_data((-h*.25,-.12,h*.69),(h*.25,-.12,h*.73),.05,.035,4))
    mesh('src_tree_bark_coarse_v03_%02d'%variant,v,f,col,[m],smooth=True)
placements=json.loads((OUT/'placements.json').read_text())['placements']
for bank in ['right_near','left_near','left_far','right_far']:
    vs=[];fs=[]
    for p in placements:
        if p['bank']!=bank:continue
        proto=bpy.data.objects['src_tree_bark_coarse_v03_%02d'%p['variant']]
        t=Matrix.Translation(Vector(p['position']))@Matrix.Rotation(p['yaw'],4,'Z')@Matrix.Diagonal((p['scale'],)*3+(1,))
        append_geometry(vs,fs,([tuple(t@proto.matrix_basis@v.co) for v in proto.data.vertices],[tuple(p.vertices) for p in proto.data.polygons]))
    o=mesh('src_forest_bark_coarse_'+bank+'_v03',vs,fs,col,[m],smooth=True);checked(o)
    target=bpy.data.objects['forest_bark_'+bank+('_lod_mesh' if bank.endswith('near') else '')]
    target.data=o.data.copy();target.matrix_basis=(target.parent.matrix_basis.inverted() if bank.endswith('near') else Matrix.Identity(4))@o.matrix_basis
save_component(col,{'trees':230,'barkTrianglesPerTree':32,'totalFarTreeTriangles':72,'savedTriangles':2760,'crownGeometry':'unchanged five-clump crowns'})
