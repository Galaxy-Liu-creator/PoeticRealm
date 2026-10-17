"""Archive immutable modeling evidence; verify bytes and reject overwrites."""
from pathlib import Path
import hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[2]
DEST=ROOT/'docs/plans/R3-江雪/assets/scene-v01'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
files=[ROOT/'art/blender/jiangxue-scene-v01.blend',ROOT/'art/textures/jiangxue-v01/source.json',
       ROOT/'frontend/public/assets/models/jiangxue/scene_v01.glb',ROOT/'frontend/public/assets/scenes/jiangxue.scene-v01.json',
       ROOT/'frontend/public/assets/terrain/jiangxue-v01.height.png',ROOT/'frontend/public/assets/terrain/jiangxue-v01.height.json',
       ROOT/'docs/CONTRACT.md',ROOT/'docs/CREDITS.md',ROOT/'docs/plans/R3-江雪/plan.md',
       ROOT/'frontend/src/main.ts',ROOT/'frontend/src/scenes/JiangxueScene.ts',ROOT/'frontend/src/labs/jiangxue.ts',ROOT/'frontend/src/labs/jiangxue.css',
       ROOT/'frontend/src/systems/nature/SnowTerrain.ts',ROOT/'frontend/src/systems/nature/QuietSnow.ts',
       ROOT/'frontend/tools/test-jiangxue-contract.mjs',ROOT/'frontend/tools/verify-jiangxue-model.mjs',ROOT/'frontend/tools/capture-jiangxue-model.mjs']
for folder,pattern in [('art/scripts/components/jiangxue','*.py'),('art/textures/jiangxue-v01','*.png'),('output/jiangxue-model-v01/components','*.json'),('output/jiangxue-model-v01/validation','*')]:
    files.extend(p for p in (ROOT/folder).glob(pattern) if p.is_file())
files.extend((ROOT/'output/jiangxue-model-v01').glob('protected*.txt'))
for rel in ('art/scripts/contract.py','art/scripts/validate.py','art/scripts/export_glb.py','art/scripts/bake_terrain.py',
            'frontend/tools/asset-contract.mjs','frontend/tools/check-contract.mjs','frontend/tools/check-budget.mjs','frontend/tools/optimize-assets.mjs','frontend/tools/meshopt-exact.mjs',
            'frontend/src/systems/materials/applyMaterials.ts','frontend/src/engine/objectResources.ts','frontend/src/engine/Assets.ts','frontend/src/engine/Engine.ts','frontend/src/systems/water/NightRiver.ts','docs/plans/README.md'):
    files.append(ROOT/rel)
rows=[]
for source in sorted(set(files)):
    rel=source.relative_to(ROOT);dest=DEST/rel
    if dest.exists():raise RuntimeError('Refuse overwriting evidence: '+str(dest))
    dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,dest)
    digest=sha(source);assert sha(dest)==digest
    rows.append({'path':str(rel).replace('\\','/'),'bytes':source.stat().st_size,'sha256':digest})
manifest=DEST/'manifest.json'
if manifest.exists():raise RuntimeError('Archive manifest already exists')
manifest.write_text(json.dumps({'date':'2026-10-10','scope':'quality-sample modeling candidate; performance failures retained; ordinary Jiangxue product route not connected','files':rows},ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'files':len(rows),'verifiedCopies':len(rows),'bytes':sum(r['bytes'] for r in rows)},ensure_ascii=False))
