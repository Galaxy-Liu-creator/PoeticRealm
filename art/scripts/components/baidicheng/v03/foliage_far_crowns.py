"""Only the distant crowns: three rounded 16-triangle lobes replace five octahedra."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
col=collection('bd_v03_tree_far_round');mats=[bpy.data.materials['pbr_foliage__bdcanopy'],bpy.data.materials['pbr_foliage__bdtips']]
for variant in range(3):
    h=5.5+variant*.95;vs=[];fs=[];slots=[]
    for k,(x,y,z,rx,ry,rz) in enumerate([(0,0,.88,.30,.27,.20),(-.22,.02,.68,.26,.28,.20),(.22,-.02,.72,.26,.28,.20)]):
        c=Vector((x*h,y*h,z*h));v=[tuple(c+Vector((0,0,-rz*h))),tuple(c+Vector((0,0,rz*h)))]
        for layer in [-1,1]:
            for i in range(4):
                a=math.tau*i/4+(math.pi/4 if layer==1 else 0);v.append(tuple(c+Vector((rx*h*math.cos(a),ry*h*math.sin(a),layer*.3*rz*h))))
        f=[]
        for i in range(4):
            j=(i+1)%4;f.extend([(0,2+j,2+i),(2+i,2+j,6+j,6+i),(1,6+i,6+j)])
        append_geometry(vs,fs,(v,f));slots.extend([int(k==0)]*len(f))
    o=mesh('src_tree_leaves_round_v03_%02d'%variant,vs,fs,col,mats,smooth=True)
    for p,i in zip(o.data.polygons,slots):p.material_index=i
    mask=o.data.color_attributes.new(name='mask',type='BYTE_COLOR',domain='POINT')
    for item in mask.data:item.color=(0,0,0,1)
placements=json.loads((OUT/'placements.json').read_text())['placements']
for bank in ['right_near','left_near','left_far','right_far']:
    vs=[];fs=[];slots=[]
    for p in placements:
        if p['bank']!=bank:continue
        o=bpy.data.objects['src_tree_leaves_round_v03_%02d'%p['variant']];t=Matrix.Translation(Vector(p['position']))@Matrix.Rotation(p['yaw'],4,'Z')@Matrix.Diagonal((p['scale'],)*3+(1,))
        append_geometry(vs,fs,([tuple(t@o.matrix_basis@v.co) for v in o.data.vertices],[tuple(f.vertices) for f in o.data.polygons]));slots.extend(f.material_index for f in o.data.polygons)
    o=mesh('src_forest_leaves_round_'+bank+'_v03',vs,fs,col,mats,smooth=True)
    for p,i in zip(o.data.polygons,slots):p.material_index=i
    mask=o.data.color_attributes.new(name='mask',type='BYTE_COLOR',domain='POINT')
    for item in mask.data:item.color=(0,0,0,1)
    checked(o);target=bpy.data.objects['forest_leaves_'+bank+('_lod_mesh' if bank.endswith('near') else '')];target.data=o.data.copy();target.matrix_basis=(target.parent.matrix_basis.inverted() if bank.endswith('near') else Matrix.Identity(4))@o.matrix_basis
save_component(col,{'trees':230,'crownTriangles':48,'barkTriangles':32,'totalFarTreeTriangles':80,'crownVerticesPerTree':30,'roots':'same230 authored positions','revision':'smoother silhouette at equal crown vertex count'})
