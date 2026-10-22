"""K: copy only checked existing components, remap parents and rig targets. No new geometry."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
scene=active();assert not scene.get('bd_assembled')
cols=['bd_boat_day','bd_cliff_right_near','bd_cliff_left_near','bd_cliff_left_far','bd_cliff_right_far','bd_cliff_city_support','bd_city_foundation','bd_city_timber','bd_city_roofs','bd_foliage_scatter']
for c in cols:assert scene.get(c+'_checked'),c
export=bpy.data.collections[EXPORT];sources=[o for c in cols for o in bpy.data.collections[c].objects]
assert len(sources)==len(set(sources))
names={o:o.name.removeprefix('src_') for o in sources}
for o in sources:o.name='src_'+names[o]
mapping={}
for src in sources:
    dst=src.copy()
    if src.type in ['MESH','ARMATURE']:dst.data=src.data.copy()
    dst.name=names[src];export.objects.link(dst);mapping[src]=dst
for src,dst in mapping.items():
    dst.parent=mapping.get(src.parent)
    dst.matrix_parent_inverse=src.matrix_parent_inverse.copy();dst.matrix_basis=src.matrix_basis.copy()
    for m in dst.modifiers:
        if m.type=='ARMATURE' and m.object in mapping:m.object=mapping[m.object]
    for constraint in dst.constraints:
        if hasattr(constraint,'target') and constraint.target in mapping:constraint.target=mapping[constraint.target]
    if dst.type=='MESH' and dst.name!='mask_probe' and 'boat' not in dst.name and not dst.find_armature():dst['static']=not bool(dst.get('behavior'))
boat=bpy.data.objects['boat_guest'];bpy.context.view_layer.update()
for name in ['FOCUS_boat','FOCUS_rower']:
    focus=bpy.data.objects[name];matrix=focus.matrix_world.copy();focus.parent=boat;focus.matrix_world=matrix
bpy.data.objects['mask_probe'].location=(-300,-300,-10)
bpy.data.collections[SOURCE].hide_render=True;bpy.data.collections[SOURCE].hide_viewport=True
bpy.data.collections['terrain'].hide_render=True;bpy.data.collections['terrain'].hide_viewport=True
scene.camera=bpy.data.objects['CAM_enter'];scene['bd_assembled']=True
scene['bd_assembly_sources']=json.dumps(cols)
bpy.context.view_layer.update()
report('components/assembly.json',{'sourceCollections':cols,'objects':len(sources),'rigTargetsRemapped':True,'geometryGeneration':False})
resolved=[]
for image in bpy.data.images:
    if image.packed_file or not image.filepath:continue
    path=image.filepath.replace('\\','/')
    if '/art/' in path:
        local=ROOT/'art'/path.split('/art/',1)[1]
        if local.is_file():image.filepath=str(local);resolved.append({'image':image.name,'local':str(local.relative_to(ROOT))})
report('components/texture-paths.json',{'revisionLocalRelocations':resolved,'historicalSourcesUnchanged':True})
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(MAIN),check_existing=False)
print('Assembled checked components:',len(sources))
