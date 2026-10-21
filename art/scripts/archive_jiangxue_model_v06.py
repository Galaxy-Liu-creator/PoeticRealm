"""Archive final modeling sources and actual evidence; prior archives are immutable."""
from pathlib import Path
import hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[2]
DEST=ROOT/'docs/plans/R3-江雪/assets/scene-v06'

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    assert not DEST.exists(),'Preserve an existing archive'
    files=set()
    for relative in ('art/scripts/components/jiangxue/v06','art/blender/components/jiangxue-v06'):
        files.update(p for p in (ROOT/relative).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix!='.blend1')
    for relative in ('art/blender/jiangxue-scene-v06.blend','art/scripts/archive_jiangxue_model_v06.py',
                     'frontend/public/assets/models/jiangxue/scene_v06.glb','frontend/public/assets/scenes/jiangxue.scene-v06.json',
                     'frontend/public/assets/terrain/jiangxue-v06.height.png','frontend/public/assets/terrain/jiangxue-v06.height.json',
                     'HANDOFF.md','docs/CONTRACT.md','docs/CREDITS.md','docs/plans/R3-江雪/plan.md',
                     'frontend/src/scenes/JiangxueScene.ts','frontend/src/labs/jiangxue.ts',
                     'frontend/src/systems/nature/SnowTerrain.ts','frontend/src/systems/nature/WinterDaylight.ts',
                     'frontend/tools/check-contract.mjs','frontend/tools/test-jiangxue-contract.mjs','frontend/tools/jiangxue-bank-contract.mjs',
                     'frontend/tools/verify-jiangxue-model.mjs','frontend/tools/capture-jiangxue-canvas.mjs'):
        files.add(ROOT/relative)
    evidence=ROOT/'output/jiangxue-model-v06'
    for folder in ('components','validation'):
        files.update(p for p in (evidence/folder).rglob('*') if p.is_file())
    manifest={'revision':'06','files':[],'retainedLocalAttempts':[]}
    for source in sorted(files):
        assert source.is_file(),source
        relative=source.relative_to(ROOT);target=DEST/relative;target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(source,target);digest=sha(source);assert sha(target)==digest
        manifest['files'].append({'path':str(relative),'bytes':source.stat().st_size,'sha256':digest})
    for p in sorted((evidence/'attempts').rglob('*')):
        if p.is_file():manifest['retainedLocalAttempts'].append({'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':sha(p)})
    (DEST/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'copiedAndVerified':len(manifest['files']),'retainedLocalAttempts':len(manifest['retainedLocalAttempts'])}))

if __name__=='__main__':main()
