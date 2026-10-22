"""Immutable v02 source/evidence archive; do not recursively copy historical archives."""
from pathlib import Path
import hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[2]
DEST=ROOT/'docs/plans/R3-白帝城/assets/scene-v02'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    assert not DEST.exists(),'Never replace an evidence revision'
    files=set()
    for relative in ['art/scripts/components/baidicheng/v02','art/textures/baidicheng-v02','frontend/src/scenes/baidicheng']:
        files.update(p for p in (ROOT/relative).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
    for relative in ['HANDOFF.md','docs/CONTRACT.md','docs/CREDITS.md','docs/plans/R3-白帝城/plan.md','frontend/src/scenes/BaidichengScene.ts','frontend/src/labs/baidicheng.ts','frontend/src/systems/nature/CanyonCover.ts','frontend/src/systems/nature/CanyonTerrain.ts','frontend/tools/asset-contract.mjs','frontend/tools/check-contract.mjs','frontend/tools/check-budget.mjs','frontend/tools/baidicheng-contract.mjs','frontend/tools/capture-baidicheng-model.mjs','frontend/tools/verify-baidicheng-model.mjs','frontend/tools/inspect-baidicheng-video.mjs','frontend/public/assets/scenes/baidicheng.scene-v02.json','frontend/public/assets/terrain/baidicheng-v02.height.png','frontend/public/assets/terrain/baidicheng-v02.height.json','art/scripts/archive_baidicheng_model_v02.py']:
        files.add(ROOT/relative)
    evidence=ROOT/'output/baidicheng-model-v02'
    for folder in ['components','validation']:
        files.update(p for p in (evidence/folder).rglob('*') if p.is_file())
    DEST.mkdir(parents=True)
    manifest={'revision':'02','files':[],'localModels':[],'retainedLocalAttempts':[]}
    for source in sorted(files):
        relative=source.relative_to(ROOT);target=DEST/relative;target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(source,target);digest=sha(source);assert sha(target)==digest
        manifest['files'].append({'path':str(relative),'bytes':source.stat().st_size,'sha256':digest})
    models=[ROOT/'art/blender/baidicheng-scene-v02.blend',ROOT/'frontend/public/assets/models/baidicheng/scene_v02.glb',*(ROOT/'art/blender/components/baidicheng-v02').glob('*.blend')]
    for source in sorted(models):manifest['localModels'].append({'path':str(source.relative_to(ROOT)),'bytes':source.stat().st_size,'sha256':sha(source)})
    for folder in ['attempts','checkpoints']:
        for p in sorted((evidence/folder).rglob('*')):
            if p.is_file():manifest['retainedLocalAttempts'].append({'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':sha(p)})
    (DEST/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'copiedAndVerified':len(manifest['files']),'localModels':len(manifest['localModels']),'retainedLocalAttempts':len(manifest['retainedLocalAttempts'])}))
if __name__=='__main__':main()
