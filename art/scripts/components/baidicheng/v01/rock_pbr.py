"""Resolve the cliff's photographic PBR inputs from the registered Jiangxue rock material."""
import sys,shutil
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
active()
with bpy.data.libraries.load(str(ROOT/'art/blender/jiangxue-scene-v06.blend'),link=False) as (a,b):
    assert 'pbr_rock__jxbank' in a.materials;b.materials=['pbr_rock__jxbank']
source=b.materials[0]
assert sum(n.type=='TEX_IMAGE' for n in source.node_tree.nodes)>=3
old=[bpy.data.materials['pbr_rock__bdwall'],bpy.data.materials['pbr_rock__bdwet']]
for m in old:m.name=m.name+'prototype'
dry=source.copy();dry.name='pbr_rock__bdwall';wet=source.copy();wet.name='pbr_rock__bdwet'
for mat,color in [(dry,(.85,.8,.68,1)),(wet,(.38,.44,.38,1))]:
    node=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');node.inputs['Base Color'].default_value=color
    normal=next((n for n in mat.node_tree.nodes if n.type=='NORMAL_MAP'),None)
    if normal:normal.inputs['Strength'].default_value=.6
rows=[]
for o in bpy.context.scene.objects:
    if o.type!='MESH':continue
    for i,m in enumerate(o.data.materials):
        if m in old:o.data.materials[i]=[dry,wet][old.index(m)];rows.append(o.name)
report('components/cliff-pbr-v02.json',{'source':'jiangxue-scene-v06.blend/pbr_rock__jxbank','registeredAsset':'Poly Haven Rock 01 CC0','nodes':sorted(set(rows)),'channels':'shared original BaseColor, Normal, Roughness pixels'})
for p,target in [(ROOT/'frontend/public/assets/models/baidicheng/scene_v01.glb',OUT/'attempts/constant-rock-first-export.glb'),(OUT/'validation/optimization.json',OUT/'attempts/constant-rock-optimization.json')]:
    assert not target.exists();shutil.move(str(p),str(target))
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
