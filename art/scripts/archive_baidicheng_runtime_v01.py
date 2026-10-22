"""Freeze the first Baidicheng runtime revision without changing model archives."""
from pathlib import Path
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'docs/plans/R3-白帝城/assets/runtime-v01'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    assert not DEST.exists(), 'Never replace an evidence revision'
    sources = [
        'HANDOFF.md', 'docs/CONTRACT.md', 'docs/CREDITS.md',
        'docs/plans/R3-白帝城/plan.md',
        'frontend/src/scenes/BaidichengScene.ts',
        'frontend/src/scenes/preparePoemScene.ts',
        'frontend/src/systems/nature/CanyonFrameCache.ts',
        'frontend/src/systems/nature/CanyonFrameCache.test.ts',
        'frontend/src/systems/audio/AudioEngine.ts',
        'frontend/src/app/Application.ts',
        'frontend/src/ui/pages/Poem.ts',
        'frontend/src/ui/styles/fengqiao-scene.css',
        'frontend/tools/profile-baidicheng-render.mjs',
        'frontend/tools/verify-baidicheng-cache.mjs',
        'frontend/tools/verify-baidicheng-product.mjs',
        'frontend/tools/verify-baidicheng-model.mjs',
        'frontend/tools/isolated-vite-fixture.mjs',
        'frontend/tools/capture-baidicheng-model.mjs',
        'frontend/tools/inspect-baidicheng-video.mjs',
        'frontend/tools/check-budget.mjs',
        'frontend/public/assets/scenes/baidicheng.scene-v03.json',
        'frontend/public/assets/terrain/baidicheng-v03.height.json',
        'frontend/public/assets/terrain/baidicheng-v03.height.png',
        'art/scripts/archive_baidicheng_runtime_v01.py',
    ]
    files = {ROOT / p for p in sources}
    evidence = ROOT / 'output/baidicheng-runtime-v01'
    for folder in ['profiling', 'validation', 'attempts']:
        files.update(p for p in (evidence / folder).rglob('*')
                     if p.is_file() and p.name not in ['vite.log', 'vite.pid'])
    manifest = {
        'revision': 'runtime-v01', 'modelRevision': '03',
        'scope': 'Native-resolution static color/depth cache and normal product entry. Application snapshot includes parallel profile work; this runtime changed only the Baidicheng preparation timeout there.',
        'files': [], 'localModels': [],
    }
    DEST.mkdir(parents=True)
    for source in sorted(files):
        relative = source.relative_to(ROOT)
        target = DEST / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        digest = sha(source)
        assert sha(target) == digest
        manifest['files'].append({'path': str(relative), 'bytes': source.stat().st_size, 'sha256': digest})
    for relative in ['frontend/public/assets/models/baidicheng/scene_v03.glb',
                     'art/blender/baidicheng-scene-v03.blend',
                     'art/blender/baidicheng-scene-v03.blend1']:
        source = ROOT / relative
        manifest['localModels'].append({'path': relative, 'bytes': source.stat().st_size, 'sha256': sha(source)})
    (DEST / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'copiedAndVerified': len(manifest['files']), 'localModels': len(manifest['localModels'])}))


if __name__ == '__main__':
    main()
