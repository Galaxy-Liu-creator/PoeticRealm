"""Archive reviewed source text and evidence; binary model sources stay in their local paths."""
from pathlib import Path
import hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[2]
DEST=ROOT/'docs/plans/R3-白帝城/assets/scene-v01'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    assert not DEST.exists(),'Never replace an existing evidence revision'
    files=set()
    for relative in ['art/scripts/components/baidicheng','art/textures/baidicheng-v01','frontend/src/scenes/baidicheng','docs/plans/R3-白帝城']:
        files.update(p for p in (ROOT/relative).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
    for relative in ['HANDOFF.md','docs/CONTRACT.md','docs/CREDITS.md','docs/plans/README.md','frontend/src/main.ts','frontend/src/scenes/BaidichengScene.ts','frontend/src/labs/baidicheng.ts','frontend/src/systems/nature/DawnDaylight.ts','frontend/src/systems/nature/CanyonCover.ts','frontend/src/systems/nature/CanyonTerrain.ts','frontend/tools/asset-contract.mjs','frontend/tools/check-contract.mjs','frontend/tools/check-budget.mjs','frontend/tools/baidicheng-contract.mjs','frontend/tools/capture-baidicheng-model.mjs','frontend/tools/verify-baidicheng-model.mjs','frontend/tools/inspect-baidicheng-video.mjs','frontend/public/assets/scenes/baidicheng.scene-v01.json','frontend/public/assets/terrain/baidicheng-v01.height.png','frontend/public/assets/terrain/baidicheng-v01.height.json','art/scripts/archive_baidicheng_model_v01.py']:
        files.add(ROOT/relative)
    evidence=ROOT/'output/baidicheng-model-v01'
    for folder in ['components','validation']:
        files.update(p for p in (evidence/folder).rglob('*') if p.is_file())
    DEST.mkdir(parents=True)
    manifest={'revision':'01','files':[],'localModels':[],'retainedLocalAttempts':[]}
    for source in sorted(files):
        relative=source.relative_to(ROOT);target=DEST/relative;target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(source,target);digest=sha(source);assert sha(target)==digest
        manifest['files'].append({'path':str(relative),'bytes':source.stat().st_size,'sha256':digest})
    models=[ROOT/'art/blender/baidicheng-scene-v01.blend',ROOT/'frontend/public/assets/models/baidicheng/scene_v01.glb',*(ROOT/'art/blender/components/baidicheng-v01').glob('*.blend')]
    for source in sorted(models):manifest['localModels'].append({'path':str(source.relative_to(ROOT)),'bytes':source.stat().st_size,'sha256':sha(source)})
    for folder in ['attempts','checkpoints']:
        for p in sorted((evidence/folder).rglob('*')):
            if p.is_file():manifest['retainedLocalAttempts'].append({'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':sha(p)})
    (DEST/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'copiedAndVerified':len(manifest['files']),'localModels':len(manifest['localModels']),'retainedLocalAttempts':len(manifest['retainedLocalAttempts'])}))
if __name__=='__main__':main()
