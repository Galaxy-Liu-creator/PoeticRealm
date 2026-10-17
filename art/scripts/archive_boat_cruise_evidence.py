"""Preserve actual boat-course evidence and confirm the authored assets are unchanged."""
from pathlib import Path
import hashlib
import json
import shutil
from archive_scene_evidence import HISTORY

ROOT = Path(__file__).resolve().parents[2]
RUN = ROOT / 'output/playwright/boat-cruise-v01/lifecycle-v01'
LOGS = ROOT / 'output/boat-cruise-v01'
DEST = ROOT / 'docs/plans/R2-枫桥场景/assets/boat-cruise-v01'

def load(path):
    return json.loads(path.read_text(encoding='utf8'))

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def copy(path, relative):
    target = DEST / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(path, target)

def main():
    previous = load(ROOT / 'docs/plans/R2-枫桥场景/assets/scene-v01/artifact-manifest.json')
    preserved = dict(HISTORY)
    for key in ('model',):
        item = previous[key]
        preserved[item['path']] = item['sha256']
    for relative, expected in preserved.items():
        assert digest(ROOT / relative) == expected, 'Authored asset changed: ' + relative
    report = load(RUN / 'verification.json')
    legacy = load(ROOT/'output/playwright/boat-cruise-v01/legacy-v01/verification.json')
    assert legacy['status']=='pass' and legacy['environmentComparison']=={'mean':0,'changed':0}
    source = previous['source']
    source_current_sha = digest(ROOT/source['path'])
    assert report['status'] == 'pass' and report['scope'] == 'visual-and-lifecycle'
    assert not report['errors'] and report['loadGate']['passed']
    assert report['lastDisposal']['memory'] == {'geometries':0, 'textures':0}
    assert report['lastDisposal']['contextLost'] and report['oarClearance']['intersections'] == 0
    DEST.mkdir(parents=True, exist_ok=False)
    copy(RUN / 'verification.json', 'verification.json')
    copy(ROOT/'output/playwright/boat-cruise-v01/legacy-v01/verification.json','legacy/verification.json')
    frames = ['timeline-t'+str(t) for t in (0,8,16,24,32)]
    frames += ['cruise-boat-t'+str(t) for t in (0,16,32)]
    frames += ['CAM_enter-1920','CAM_boat-1920','CAM_rower-1920','sample-1440','sample-390','native-devtools-1920','cruise-follow-t8','cruise-follow-repeat']
    for frame in frames:
        copy(RUN / (frame+'.png'), 'frames/'+frame+'.png')
    for label in ('start','middle','end'):
        copy(LOGS / ('video-review-'+label+'.png'), 'video-review/'+label+'.png')
    copy(Path(report['video']), 'scene-preview.webm')
    for name in ('build.log','unit-tests.log','contract.json','budget.json','asset-fixtures.log','current-blender-validation.log','legacy-regression.log'):
        copy(LOGS / name, name)
    copy(ROOT / 'frontend/public/assets/scenes/fengqiao.scene-v01.json', 'scene-manifest.json')
    artifact = {
        'date':'2026-10-08', 'scope':'boat-course-and-visual-lifecycle', 'fullSceneAccepted':False,
        'navigation':report['navigation'], 'loadGate':report['loadGate'],
        'legacy':{'status':legacy['status'],'environmentComparison':legacy['environmentComparison'],'report':'legacy/verification.json'},
        'preservedAuthoredAssets':preserved, 'sceneManifestSHA256':digest(DEST/'scene-manifest.json'),
        'currentSource':{'path':source['path'],'sha256':source_current_sha,
                         'previousArchiveSHA256':source['sha256'],
                         'matchesPreviousArchive':source_current_sha==source['sha256'],
                         'writtenByThisTask':False},
        'video':{'path':'scene-preview.webm','sha256':digest(DEST/'scene-preview.webm'),
                 'durationSeconds':24.96,'width':1440,'height':900,'fps':25,
                 'reviewedFrameTimesSeconds':[5,12,22],'edited':False},
        'method':'Real Chrome/AMD/D3D11 frames and lifecycle. Runtime course only; authored geometry preserved. Existing full-scene performance failure remains unresolved; no new full performance acceptance.',
    }
    (DEST/'artifact-manifest.json').write_text(json.dumps(artifact,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    (DEST/'README.md').write_text('# 舟沿河航行验证证据\n\n本目录保存2026-10-08运行端舟朝向与滑行修正的原始证据，当前状态只维护在根HANDOFF.md。scene-manifest.json记录米制路径和速度；verification.json包含实测航向、前进位置、近景跟随、回放、97点划桨、减少动态及释放检查。frames为真实页面截图，scene-preview.webm为1440×900/25fps连续原录制，未变速；video-review保存已目视检查的三个源视频帧。\n\n构建、74项单测、真实契约/预算及破坏夹具日志随附。9个历史源/导出及当前GLB校验值保持，见artifact-manifest.json。本轮未写主blend；当前主blend字节校验值与上轮归档不同，单独如实记录且保留其当前状态。此轮是视觉与生命周期验收；没有重跑完整持续性能，之前整场性能未通过的结论继续保留。\n',encoding='utf8')
    print(json.dumps({'archive':str(DEST),'status':report['status'],'preservedAssets':len(preserved)},ensure_ascii=False))

if __name__ == '__main__':
    main()
