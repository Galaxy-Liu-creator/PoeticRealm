from pathlib import Path
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'docs/plans/R3-白帝城/assets/audio-v01'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    assert not DEST.exists(), 'Never replace an evidence revision'
    sources = [
        'HANDOFF.md', 'docs/CONTRACT.md', 'docs/CREDITS.md',
        'frontend/src/systems/audio/AudioEngine.ts',
        'frontend/src/systems/audio/AudioEngine.test.ts',
        'frontend/src/systems/audio/baidichengSound.ts',
        'frontend/src/systems/audio/baidichengSound.test.ts',
        'frontend/src/scenes/BaidichengScene.ts',
        'frontend/tools/verify-baidicheng-audio.mjs',
        'frontend/tools/verify-baidicheng-deployment.mjs',
        'frontend/tools/check-budget.mjs',
        'art/scripts/archive_baidicheng_audio_v01.py',
    ]
    files = {ROOT / source for source in sources}
    files.update(path for path in (ROOT / 'output/baidicheng-audio-v01').rglob('*')
                 if path.is_file())
    manifest = {'revision': 'audio-v01', 'modelRevision': '03',
                'scope': 'Original bank calls and frontend-only update on local 5186',
                'files': [], 'localModels': []}
    DEST.mkdir(parents=True)
    for source in sorted(files):
        relative = source.relative_to(ROOT)
        target = DEST / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        digest = sha(source)
        assert sha(target) == digest
        manifest['files'].append({'path': str(relative),
                                  'bytes': source.stat().st_size, 'sha256': digest})
    for relative in ['frontend/public/assets/models/baidicheng/scene_v03.glb',
                     'art/blender/baidicheng-scene-v03.blend']:
        source = ROOT / relative
        manifest['localModels'].append({'path': relative,
                                        'bytes': source.stat().st_size, 'sha256': sha(source)})
    (DEST / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'copiedAndVerified': len(manifest['files']),
                      'localModelReferences': len(manifest['localModels'])}))


if __name__ == '__main__':
    main()
