"""Archive one successful browser revision and make an unretimed review video."""
import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path
from fractions import Fraction

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('run', help='Browser verification output directory')
parser.add_argument('--revision', choices=('03','04'), default='03')
args = parser.parse_args()
run = Path(args.run).resolve()
revision = args.revision
out = ROOT / ('docs/plans/R2-枫桥场景/assets/sample-v' + revision)
out.mkdir(parents=True, exist_ok=True)
report = json.loads((run / 'verification.json').read_text(encoding='utf8'))
assert report['status'] == 'pass' and report['scope'] == 'full-quality-sample'
assert len(report['frames']) == 3 and report['lastDisposal']['memory'] == {'geometries': 0, 'textures': 0}

def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def artifact(path):
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': digest(path)}

preserved = {
    'art/blender/fengqiao-sample-v01.blend': '694b8394942943178ba1239bb1005f7c7870a2418df2bc051393d352edc0d0f6',
    'frontend/public/assets/models/fengqiao/sample_v01.glb': '37540f5d04a5829c99a03b4ed802478a21bd2ec1e36895706ced132a5720caeb',
    'art/blender/fengqiao-sample-v02.blend': 'cfd60149342263d701ae60befe2bc7afae13e0f10dcfe8e55b737e0a3d127e99',
    'frontend/public/assets/models/fengqiao/sample_v02.glb': '7ffde5fa94fd3ea26e3d7e346c3142fd85d037176f15f4133985171bb57a3114',
}
if revision == '04':
    preserved.update({
        'art/blender/fengqiao-sample-v03.blend': '7056b269b62e148c45e60fa62f81ef7b3d2afea2804291921e818338861344f8',
        'frontend/public/assets/models/fengqiao/sample_v03.glb': 'cf87dd3bc8c86b4680d871e6f200aa37cea14ff4aa908e293c3c18c2ba452107',
    })
for relative, expected in preserved.items():
    assert digest(ROOT / relative) == expected, 'Historical asset changed: ' + relative

human = ROOT / 'art/references/mpfb-hm08-d0a32e5'
human_manifest = json.loads((human / 'source.json').read_text(encoding='utf8'))
for entry in human_manifest['files']:
    assert digest(human / entry['local']) == entry['sha256'], entry['local']
textures = ROOT / 'art/textures/fengqiao-v03'
texture_manifest = json.loads((textures / 'source.json').read_text(encoding='utf8'))
for entry in texture_manifest['retainedSources'] + texture_manifest['delivery']:
    assert digest(textures / entry['file']) == entry['sha256'], entry['file']

names = ['native-devtools-1920.png', 'performance.json.gz', 'sample-1440.png',
         'determinism-t8.png', 'determinism-repeat.png', 'reflection-off.png', 'shadows-off.png', 'fire-off.png']
names += ['CAM_' + name + '-1920.png' for name in ('enter', 'riverbank', 'boat', 'rower')]
names += ['rowing-t' + str(t) + '.png' for t in (0, 1.2, 2.4, 3.6, 4.8)]
names += ['timeline-t' + str(t) + '.png' for t in (0, 8, 16, 24, 32)]
if revision == '04': names += ['environment-raw-server.png']
for name in names:
    shutil.copy2(run / name, out / name)
shutil.copy2(run / 'verification.json', out / 'browser-verification.json')
validation = 'output/fengqiao-rower-v03' if revision == '03' else 'output/fengqiao-boat-v04'
shutil.copy2(ROOT / validation / 'blender-validation.json', out / 'blender-validation.json')
source = out / 'rower-source.webm'
shutil.copy2(Path(report['video']), source)

def metadata(path):
    probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries',
        'format=duration:stream=codec_type,codec_name,width,height,avg_frame_rate', '-of', 'json', str(path)],
        check=True, capture_output=True, text=True)
    data = json.loads(probe.stdout)
    video = next(s for s in data['streams'] if s['codec_type'] == 'video')
    return {'duration': float(data['format']['duration']), 'fps': float(Fraction(video['avg_frame_rate'])),
            'size': [video['width'], video['height']], 'codec': video['codec_name']}

ffmpeg = shutil.which('ffmpeg')
assert ffmpeg, 'FFmpeg and ffprobe must be available on PATH'
source_meta = metadata(source)
start = max(0, source_meta['duration'] - 8.4)
preview = out / 'rower-preview.mp4'
subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source),
                '-ss', str(start), '-t', '8.4', '-c:v', 'libx264', '-crf', '20',
                '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', str(preview)], check=True)
preview_meta = metadata(preview)
for name, t in [('preview-start', 0), ('preview-mid', preview_meta['duration'] / 2),
                ('preview-end', max(0, preview_meta['duration'] - .08))]:
    subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(t),
                    '-i', str(preview), '-frames:v', '1', str(out / (name + '.png'))], check=True)
    names.append(name + '.png')

model = ROOT / ('frontend/public/assets/models/fengqiao/sample_v' + revision + '.glb')
blend = ROOT / ('art/blender/fengqiao-sample-v' + revision + '.blend')
manifest = {
    'date': '2026-10-07', 'revision': revision, 'scope': 'Fengqiao four-element sample: standing boatman' if revision == '03' else 'Fengqiao sample: sealed bow/stern and side-mounted working oar',
    'browserRun': run.relative_to(ROOT).as_posix(), 'model': artifact(model), 'source': artifact(blend),
    'preservedHistoricalAssets': preserved,
    'blender': json.loads((out / 'blender-validation.json').read_text(encoding='utf8')),
    'budget': json.loads((out / 'node-budget.log').read_text(encoding='utf8')),
    'browser': report['browser'], 'frames': report['frames'], 'loadMs': report['details']['loadMs'],
    'navigationAndFixtureWaitMs': report['firstLoadMs'], 'strokeLimits': report['strokeLimits'],
    'lastDisposal': report['lastDisposal'],
    'oarClearance': report.get('oarClearance'),
    'environmentComparison': report.get('environmentComparison'),
    'references': {'human': human_manifest, 'linen': texture_manifest, 'mechanics': 'https://www.taioca.org/about-3'},
    'video': {'source': artifact(source), 'sourceMetadata': source_meta,
              'preview': artifact(preview), 'previewMetadata': preview_meta,
              'trimStartSeconds': start, 'requestedDurationSeconds': 8.4, 'retimed': False},
    'evidence': [artifact(out / name) for name in names + ['browser-verification.json', 'blender-validation.json',
                 'node-contract.log', 'node-budget.log', 'asset-tests.log', 'build.log', 'unit-tests.log']],
    'implementation': [artifact(ROOT / name) for name in (['art/scripts/refine_fengqiao_rower.py'] if revision == '03' else ['art/scripts/repair_fengqiao_boat.py','frontend/tools/oar-clearance.mjs']) + [
        'art/scripts/prepare_rower_textures.py', 'frontend/src/systems/characters/Rower.ts',
        'frontend/src/labs/fengqiao.ts', 'frontend/tools/verify-fengqiao-sample.mjs']],
    'limits': 'Not full Fengqiao acceptance, presentation-machine verification, sound or 3D entry/return acceptance; no historical reconstruction claim.',
}
if revision == '04':
    manifest['environment'] = artifact(ROOT / 'frontend/public/assets/environments/fengqiao-night-v01.rgba16f.gz')
    manifest['environmentMetadata'] = json.loads((ROOT / 'frontend/public/assets/environments/fengqiao-night-v01.json').read_text(encoding='utf8'))
    manifest['implementation'] += [artifact(ROOT / name) for name in ['frontend/src/systems/materials/NightEnvironment.ts',
        'frontend/tools/bake-fengqiao-environment.mjs', 'frontend/tools/check-contract.mjs', 'frontend/tools/check-budget.mjs',
        'frontend/tools/asset-contract.mjs', 'frontend/tools/test-asset-contract.mjs', 'frontend/public/assets/scenes/fengqiao.sample.json']]
    shutil.copy2(ROOT / 'frontend/public/assets/environments/fengqiao-night-v01.json', out / 'environment-source.json')
    baseline = ROOT / 'output/playwright/fengqiao-boat-v04/v07-final'
    baseline_out = out / 'environment-procedural-baseline'
    baseline_out.mkdir(exist_ok=True)
    shutil.copy2(baseline / 'rowing-t2.4.png', baseline_out / 'rowing-t2.4.png')
    prior = json.loads((baseline / 'verification.json').read_text(encoding='utf8'))
    baseline_record = {'scope': 'Original procedural-PMREM pixel reference, not performance acceptance',
        'sourceFrame': artifact(baseline / 'rowing-t2.4.png'), 'frame': artifact(baseline_out / 'rowing-t2.4.png'),
        'upstreamRunStatus': prior['status'], 'upstreamFailure': prior.get('failure'), 'frames': prior['frames']}
    (baseline_out / 'source.json').write_text(json.dumps(baseline_record,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    manifest['proceduralEnvironmentBaseline'] = baseline_record
    manifest['evidence'] += [artifact(out / name) for name in ['environment-source.json', 'blender-source-validation.log',
        'environment-procedural-baseline/rowing-t2.4.png', 'environment-procedural-baseline/source.json']]
(out / 'artifact-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print(json.dumps({'model': manifest['model'], 'source': manifest['source'], 'video': manifest['video'],
                  'evidenceFiles': len(manifest['evidence']), 'provenanceAndHistoryHashes': 'pass'}, ensure_ascii=False))
