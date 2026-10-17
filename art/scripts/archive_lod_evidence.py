"""Archive a checked distance-LOD candidate without replacing older evidence."""
from pathlib import Path
import hashlib
import json
import shutil
from archive_scene_evidence import HISTORY

ROOT = Path(__file__).resolve().parents[2]
TASK = ROOT / 'output/fengqiao-scene-v02'
RUNS = ROOT / 'output/playwright/fengqiao-scene-v02'
FINAL = RUNS / 'lazy-full-v01'
DEST = ROOT / 'docs/plans/R2-枫桥场景/assets/scene-v02'
PROTECTED = dict(HISTORY, **{
    'art/blender/fengqiao-scene-v01.blend': 'b7a4daf0f7255cbd4f3267a76d0e169bbb35a11b516aa0617c2c1d5c11639a6c',
    'frontend/public/assets/models/fengqiao/scene_v01.glb': 'e8f653c10690aaaa0f7a97e387871b439cab4adec351c9a4fc865f597aaddf0e',
})

def load(path):
    return json.loads(path.read_text(encoding='utf8'))

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def record(path):
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': digest(path)}

def copy(source, target):
    target = DEST / target
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)

def main():
    for name, expected in PROTECTED.items():
        assert digest(ROOT / name) == expected, 'Protected asset changed: ' + name
    final = load(FINAL / 'verification.json')
    legacy = load(RUNS / 'legacy-lazy-v01/verification.json')
    views = load(RUNS / 'views-final-v01/profile.json')
    near = load(TASK / 'near-original-final.json')
    compression = load(TASK / 'compression-v04.json')
    budget = load(TASK / 'final-budget-v02.json')
    metadata = load(TASK / 'video-metadata-final.json')
    cold = load(TASK / 'cold-load.json')
    assert final['status'] == 'pass' and final['scope'] == 'full-quality-sample'
    assert final['loadGate']['passed'] and not final['errors']
    assert len(final['frames']) == 3
    assert all(f['fps'] >= 50 and f['p95'] <= 20 and f['maxCalls'] <= 120 for f in final['frames'])
    assert final['lastDisposal']['memory'] == {'geometries': 0, 'textures': 0}
    assert final['lastDisposal']['contextLost']
    assert cold['status'] == 'pass' and len(cold['trials']) == 5
    assert all(c['mean'] == 0 and c['changed'] == 0 for c in final['imageComparisons'])
    assert near['status'] == 'pass' and not near['differences']
    assert legacy['status'] == 'pass' and legacy['environmentComparison'] == {'mean': 0, 'changed': 0}
    assert not views['errors'] and len(views['samples']) == 8
    model = ROOT / 'frontend/public/assets/models/fengqiao/scene_v02.glb'
    assert digest(model) == compression['outputSHA256'] == near['afterSHA256']
    assert compression['semanticDataExact'] and budget['distributedBytes'] <= 15_000_000
    stream = metadata['streams'][0]
    assert (stream['width'], stream['height']) == (1440, 900)
    assert stream['avg_frame_rate'] == '25/1' and float(metadata['format']['duration']) > 24
    DEST.mkdir(parents=True, exist_ok=False)
    for name in ('full-v01', 'merge-full-v01', 'reuse-full-v01', 'reuse-full-v02', 'lazy-full-v01', 'legacy-reuse-v01', 'legacy-lazy-v01'):
        copy(RUNS / name / 'verification.json', 'runs/' + name + '/verification.json')
    copy(RUNS / 'views-final-v01/profile.json', 'view-diagnostics.json')
    copy(FINAL / 'performance.json.gz', 'performance.json.gz')
    frames = ['CAM_' + name + '-1920' for name in ('enter', 'riverbank', 'boat', 'rower', 'temple', 'bridge', 'bell', 'nature')]
    frames += ['sample-1440', 'sample-390', 'native-devtools-1920', 'wind-on', 'wind-off', 'wind-far-on', 'wind-far-off', 'rowing-t2.4', 'lod-all-near', 'lod-all-far']
    frames += ['timeline-t' + str(t) for t in (0, 8, 16, 24, 32)]
    frames += ['lod-' + name + '-' + level for name in ('temple_main', 'bell_tower', 'bridge_main', 'maple_grove', 'reed_bed') for level in ('near', 'far')]
    for name in frames:
        copy(FINAL / (name + '.png'), 'frames/' + name + '.png')
    for label in ('start', 'middle', 'end'):
        copy(TASK / ('video-review-final-' + label + '.png'), 'video-review/' + label + '.png')
    copy(Path(final['video']), 'scene-preview.webm')
    components = ['temple-roof', 'bell-roof', 'temple-frame', 'bell-frame', 'temple-shell', 'bell-shell', 'bridge', 'maple-branches', 'maple-leaves', 'reeds', 'temple-frame-v02', 'bell-frame-v02', 'temple-roof-v02', 'bell-roof-v02', 'temple-roof-v03', 'bell-roof-v03']
    for name in components:
        copy(TASK / 'components' / (name + '.json'), 'components/' + name + '.json')
    documents = {'final-budget-v02.json': 'budget.json', 'final-contract-v02.json': 'contract.json', 'compression-v04.json': 'compression.json', 'near-original-diagnostic.json': 'near-original-diagnostic.json', 'near-original-final.json': 'near-original-final.json', 'near-tangent-restoration.json': 'near-tangent-restoration.json', 'saved-blender-validation.log': 'blender-validation.log', 'final-build-v03.log': 'build.log', 'final-tests-v03.log': 'unit-tests.log', 'final-fixtures.log': 'asset-fixtures.log', 'video-metadata-final.json': 'video-metadata.json', 'lazy-full-v01.log': 'browser.log', 'cold-load.json': 'cold-load.json'}
    for source, target in documents.items():
        copy(TASK / source, target)
    copy(ROOT / 'frontend/public/assets/scenes/fengqiao.scene-v02.json', 'scene-manifest.json')
    manifest = {
        'date': '2026-10-08', 'scope': 'quality-sample', 'evidenceRevision': 'distance-lods-v01', 'fullSceneAccepted': False,
        'source': record(ROOT / 'art/blender/fengqiao-scene-v02.blend'), 'model': record(model), 'rawExport': record(TASK / 'raw-v03/scene_v02.glb'), 'restoredNearExport': record(TASK / 'raw-v04/scene_v02.glb'),
        'environment': record(ROOT / 'frontend/public/assets/environments/fengqiao-night-v01.rgba16f.gz'), 'budget': budget, 'protectedAssets': PROTECTED,
        'nearPreservation': near, 'selectedFarReports': ['temple-roof-v03', 'bell-roof-v03', 'temple-frame-v02', 'bell-frame-v02', 'temple-shell', 'bell-shell', 'bridge', 'maple-branches', 'maple-leaves', 'reeds'],
        'performance': {'status': final['status'], 'loadGate': final['loadGate'], 'frames': final['frames'], 'browser': final['browser']},
        'coldLoads': cold,
        'viewDiagnostics': views,
        'lifecycle': {'checks': final['checks'], 'errors': final['errors'], 'disposal': final['lastDisposal']['memory'], 'contextLost': True},
        'imageComparisons': final['imageComparisons'], 'renderReuseComparisons': final['renderReuseComparisons'], 'staticMergeComparisons': final['staticMergeComparisons'],
        'legacy': {'status': legacy['status'], 'loadGate': legacy['loadGate'], 'environmentComparison': legacy['environmentComparison']},
        'video': record(DEST / 'scene-preview.webm'), 'videoReview': {'metadata': metadata, 'sampleTimesSeconds': [5, 13, 24], 'framesVisuallyInspected': True, 'edited': False},
        'method': 'Inspected component-first Blender far models, preserved released near accessor bytes, exact image/Meshopt encoding, shared main-camera LOD across passes; real Chrome/D3D11 gates and counterfactual images. Earlier failures retained. Full scene awaits night storytelling, sound and product integration.',
    }
    (DEST / 'artifact-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    (DEST / 'README.md').write_text('# 远近层级与渲染检查证据\n\n本目录保存独立scene-v02候选的实际原始报告与校验值，范围为quality-sample；当前任务状态只维护在根HANDOFF.md。\n\n制作源：art/blender/fengqiao-scene-v02.blend。远景分段源码：art/scripts/components/fengqiao/{distance_lod,frame_lod,roof_lod}.py。components包含历次检查，最终选择以artifact-manifest.json的selectedFarReports为准；早期减面尖角与无效屋面候选保留为非导出历史。\n\nBlender重导出仅有船夫皮肤一项切线值漂移，restore-lod-near-tangents.mjs在压缩前恢复原发布流；严格compare-lod-near.mjs核对全部原命名近景节点、顶点字节、材质、贴图与绑定。远景是新制作的简化几何；其后的PNG/WebP/Meshopt编码才是无损步骤。\n\nruns保存早期性能失败、矩阵与水面优化之后的完整门禁，以及最终资产和旧小样回归。frames为真实机位、距离阈值、时间线和缩窗截图，scene-preview.webm为未变速的原始连续录像；video-review包含三处实际提取帧。静态合并有少量Float32边缘舍入，另两项渲染优化及切线恢复前后均要求逐像素一致。\n\n复验：从frontend运行真实契约/预算及compare-lod-near.mjs；以SAMPLE_MANIFEST=public/assets/scenes/fengqiao.scene-v02.json运行verify-fengqiao-sample.mjs。完整脚本保留3秒、三轮60秒≥50fps/P95≤20ms、十次释放等门禁。--diagnose-load仅继续采证，不改变失败结果。制作与发布方法以AGENT.md、CONTRACT及modeling计划为准，后续另存新修订，不覆盖此目录。\n', encoding='utf8')
    print(json.dumps({'archive': str(DEST), 'model': manifest['model'], 'status': final['status'], 'protectedAssets': len(PROTECTED)}, ensure_ascii=False))

if __name__ == '__main__':
    main()
