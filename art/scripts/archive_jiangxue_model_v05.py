"""Snapshot v05 sources and actual evidence without overwriting an earlier archive.

Model binaries remain local under the repository's existing ignore rules.
Task status and interpretation belong only in the root HANDOFF.md.
"""
from pathlib import Path
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'docs/plans/R3-江雪/assets/scene-v05'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    assert not DEST.exists(), 'Archive exists; preserve it and create a distinct revision'
    files = set()
    for relative in ('art/scripts/components/jiangxue/v05', 'art/blender/components/jiangxue-v05'):
        files.update(p for p in (ROOT / relative).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix != '.blend1')
    files.update(ROOT / p for p in (
        'art/blender/jiangxue-scene-v05.blend',
        'art/scripts/archive_jiangxue_model_v05.py',
        'frontend/public/assets/models/jiangxue/scene_v05.glb',
        'frontend/public/assets/scenes/jiangxue.scene-v05.json',
        'frontend/public/assets/terrain/jiangxue-v02.height.png',
        'frontend/public/assets/terrain/jiangxue-v02.height.json',
        'docs/CONTRACT.md', 'docs/CREDITS.md', 'docs/plans/R3-江雪/plan.md', 'HANDOFF.md',
        'frontend/src/labs/jiangxue.ts', 'frontend/src/scenes/JiangxueScene.ts',
        'frontend/tools/verify-jiangxue-model.mjs', 'frontend/tools/capture-jiangxue-model.mjs',
        'frontend/tools/check-contract.mjs', 'frontend/tools/test-jiangxue-contract.mjs',
        'frontend/tools/jiangxue-bank-contract.mjs', 'frontend/tools/capture-jiangxue-canvas.mjs',
        'art/scripts/components/jiangxue/v04/rock_snow.py',
        'art/scripts/components/jiangxue/v04/common_v04.py',
    ))
    evidence = ROOT / 'output/jiangxue-model-v05'
    for folder in ('validation', 'components'):
        files.update(p for p in (evidence / folder).rglob('*') if p.is_file() and p.suffix != '.tmp')
    manifest = {'revision': '04', 'files': [], 'retainedLocalAttempts': []}
    for source in sorted(files):
        assert source.is_file(), source
        relative = source.relative_to(ROOT)
        target = DEST / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        digest = sha(source)
        assert sha(target) == digest
        manifest['files'].append({'path': str(relative), 'bytes': source.stat().st_size, 'sha256': digest})
    for source in sorted((evidence / 'attempts').rglob('*')):
        if source.is_file():
            manifest['retainedLocalAttempts'].append({'path': str(source.relative_to(ROOT)), 'bytes': source.stat().st_size, 'sha256': sha(source)})
    (DEST / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'copiedAndVerified': len(manifest['files']), 'retainedLocalAttempts': len(manifest['retainedLocalAttempts'])}))


if __name__ == '__main__':
    main()
