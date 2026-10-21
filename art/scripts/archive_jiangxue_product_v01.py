"""Preserve the first normal-route Jiangxue integration and its actual validation."""
from pathlib import Path
import hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[2]
DEST=ROOT/'docs/plans/R3-江雪/assets/product-v01'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    assert not DEST.exists(),'Keep existing evidence immutable'
    paths=['HANDOFF.md','docs/CREDITS.md','docs/plans/R3-江雪/plan.md',
           'frontend/src/app/Application.ts','frontend/src/scenes/preparePoemScene.ts','frontend/src/scenes/JiangxueScene.ts',
           'frontend/src/systems/audio/AudioEngine.ts','frontend/src/ui/pages/Poem.ts','frontend/src/ui/styles/fengqiao-scene.css',
           'frontend/src/transition/RealmReveal.ts','frontend/tools/verify-jiangxue-product.mjs','frontend/tools/verify-jiangxue-abort.mjs',
           'frontend/public/assets/scenes/jiangxue.scene-v06.json','art/scripts/archive_jiangxue_product_v01.py']
    files={ROOT/p for p in paths}
    evidence=ROOT/'output/jiangxue-product-v01'
    files.update(p for p in (evidence/'validation').rglob('*') if p.is_file())
    manifest={'stage':'jiangxue-product-v01','files':[],'retainedLocalAttempts':[]}
    for p in sorted(files):
        rel=p.relative_to(ROOT);target=DEST/rel;target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(p,target);digest=sha(p);assert sha(target)==digest
        manifest['files'].append({'path':str(rel),'bytes':p.stat().st_size,'sha256':digest})
    for p in sorted((evidence/'attempts').rglob('*')):
        if p.is_file():manifest['retainedLocalAttempts'].append({'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':sha(p)})
    (DEST/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'copiedAndVerified':len(manifest['files']),'retainedAttempts':len(manifest['retainedLocalAttempts'])}))
if __name__=='__main__':main()
