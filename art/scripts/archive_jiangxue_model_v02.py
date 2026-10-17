"""Immutable v02 source/asset/validation snapshot; all copies verified, no overwrites."""
from pathlib import Path
import hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[2];DEST=ROOT/'docs/plans/R3-江雪/assets/scene-v02'
def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()
paths=['art/blender/jiangxue-scene-v02.blend','art/scripts/archive_jiangxue_model_v02.py','art/scripts/components/jiangxue/common.py',
       'frontend/public/assets/models/jiangxue/scene_v02.glb','frontend/public/assets/scenes/jiangxue.scene-v02.json',
       'frontend/public/assets/terrain/jiangxue-v02.height.png','frontend/public/assets/terrain/jiangxue-v02.height.json',
       'docs/CONTRACT.md','docs/CREDITS.md','docs/plans/R3-江雪/plan.md','HANDOFF.md',
       'frontend/src/main.ts','frontend/src/scenes/JiangxueScene.ts','frontend/src/labs/jiangxue.ts','frontend/src/labs/jiangxue.css',
       'frontend/src/systems/nature/SnowTerrain.ts','frontend/src/systems/nature/WinterDaylight.ts','frontend/src/systems/nature/QuietSnow.ts',
       'frontend/src/systems/water/NightRiver.ts','frontend/src/systems/materials/applyMaterials.ts','frontend/src/engine/objectResources.ts',
       'frontend/src/engine/Assets.ts','frontend/src/engine/Engine.ts','frontend/src/engine/Clock.ts',
       'frontend/tools/test-jiangxue-contract.mjs','frontend/tools/verify-jiangxue-model.mjs','frontend/tools/capture-jiangxue-model.mjs',
       'frontend/tools/authenticated-ui-fixture.mjs','frontend/tools/entry-navigation.mjs',
       'frontend/tools/asset-contract.mjs','frontend/tools/check-contract.mjs','frontend/tools/check-budget.mjs',
       'frontend/tools/optimize-assets.mjs','frontend/tools/meshopt-exact.mjs',
       'art/scripts/contract.py','art/scripts/validate.py','art/scripts/export_glb.py','art/scripts/bake_terrain.py',
       'output/jiangxue-model-v02/protected-v01-sha256.txt','output/jiangxue-model-v02/validation/protected-verification.txt',
       'docs/plans/R3-江雪/assets/scene-v01/manifest.json']
files=[ROOT/p for p in paths]
for folder,pattern in [('art/scripts/components/jiangxue/v02','*.py'),('art/blender/components/jiangxue-v02','*.blend'),
                       ('art/textures/jiangxue-v01','*'),('art/textures/fengqiao-v01','*'),('art/textures/fengqiao-v03','*'),
                       ('output/jiangxue-model-v02/components','*.json'),('output/jiangxue-model-v02/validation','*'),
                       ('output/jiangxue-model-v02/attempts','**/*')]:
    files.extend(p for p in (ROOT/folder).glob(pattern) if p.is_file() and p.name not in ('csrf.json','git-status.txt'))
files=sorted(set(files));assert all(p.is_file() for p in files)
assert not DEST.exists(),'Refuse overwriting v02 evidence'
rows=[]
for p in files:
    rel=p.relative_to(ROOT);q=DEST/rel;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q);digest=sha(p);assert sha(q)==digest
    rows.append({'path':rel.as_posix(),'bytes':p.stat().st_size,'sha256':digest})
(DEST/'manifest.json').write_text(json.dumps({'date':'2026-10-12','scope':'quality-sample v02 modeling revision; actual acceptance and limitations in HANDOFF; first attempts retained',
    'baseline':'scene-v01/manifest.json (preserved source, published GLB and heightmap)',
    'replayOrder':['initialize','bank','rock_prototypes','rock_detail','rock_placement','bank_snow','rock_snow','tree_core','tree_twigs','terrain','assemble','export_ready','rock_snow_refine','publish_refined_snow','export_ready'],
    'files':rows},ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'files':len(rows),'verifiedCopies':len(rows),'bytes':sum(r['bytes'] for r in rows)}))
