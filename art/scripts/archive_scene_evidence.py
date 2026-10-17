"""Archive an immutable component candidate and its actual gate results."""
from pathlib import Path
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[2]
TASK = ROOT / 'output/fengqiao-scene-v01'
RUNS = ROOT / 'output/playwright/fengqiao-scene-v01'
DEST = ROOT / 'docs/plans/R2-枫桥场景/assets/scene-v01'
HISTORY = {
    'art/blender/fengqiao-sample-v01.blend':'694b8394942943178ba1239bb1005f7c7870a2418df2bc051393d352edc0d0f6',
    'art/blender/fengqiao-sample-v02.blend':'cfd60149342263d701ae60befe2bc7afae13e0f10dcfe8e55b737e0a3d127e99',
    'art/blender/fengqiao-sample-v03.blend':'7056b269b62e148c45e60fa62f81ef7b3d2afea2804291921e818338861344f8',
    'art/blender/fengqiao-sample-v04.blend':'4f3fa91b7e9ce973b7bb3f0d8fb3a576e9ec09ddc7dab0a7585784943687fb7e',
    'frontend/public/assets/models/fengqiao/sample_v01.glb':'37540f5d04a5829c99a03b4ed802478a21bd2ec1e36895706ced132a5720caeb',
    'frontend/public/assets/models/fengqiao/sample_v02.glb':'7ffde5fa94fd3ea26e3d7e346c3142fd85d037176f15f4133985171bb57a3114',
    'frontend/public/assets/models/fengqiao/sample_v03.glb':'cf87dd3bc8c86b4680d871e6f200aa37cea14ff4aa908e293c3c18c2ba452107',
    'frontend/public/assets/models/fengqiao/sample_v04.glb':'bf4868c46bc0eea6b1c67579d1db706ac9f9297ca1e874ae5326755cebcd6b97',
}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def load(path):
    return json.loads(path.read_text(encoding='utf8'))

def record(path):
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':path.stat().st_size,'sha256':digest(path)}

def copy(source, target):
    target = DEST / target
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(source,target)

def main():
    for name, expected in HISTORY.items():
        assert digest(ROOT/name)==expected, 'Historical asset changed: '+name
    performance=load(RUNS/'crop-final-v01/verification.json')
    lifecycle=load(RUNS/'crop-lifecycle-v01/verification.json')
    legacy=load(RUNS/'legacy-crop-smoke-v02/verification.json')
    compression=load(TASK/'final-compression-v01.json')
    model=ROOT/'frontend/public/assets/models/fengqiao/scene_v01.glb'
    assert digest(model)==compression['outputSHA256'] and compression['semanticDataExact']
    assert lifecycle['status']=='pass' and lifecycle['scope']=='visual-and-lifecycle'
    assert not lifecycle['errors'] and lifecycle['lastDisposal']['memory']=={'geometries':0,'textures':0}
    assert lifecycle['lastDisposal']['contextLost']
    assert legacy['status']=='pass' and legacy['environmentComparison']=={'mean':0,'changed':0}
    DEST.mkdir(parents=True,exist_ok=False)
    for label, run in [('performance','crop-final-v01'),('lifecycle','crop-lifecycle-v01'),('legacy','legacy-crop-smoke-v02')]:
        copy(RUNS/run/'verification.json',label+'/verification.json')
    frames=['CAM_enter-1920','CAM_temple-1920','CAM_bridge-1920','CAM_bell-1920','CAM_nature-1920','CAM_riverbank-1920','CAM_boat-1920','CAM_rower-1920','sample-1440','sample-390','native-devtools-1920','wind-on','wind-off','rowing-t2.4']
    frames += ['timeline-t'+str(t) for t in (0,8,16,24,32)]
    for frame in frames: copy(RUNS/'crop-lifecycle-v01'/(frame+'.png'),'frames/'+frame+'.png')
    for label in ('start','middle','end'):
        copy(TASK/('video-review-'+label+'.png'),'video-review/'+label+'.png')
    copy(Path(lifecycle['video']),'scene-preview.webm')
    components=['architecture_brackets','architecture_foundation','architecture_frame','architecture_rafters','architecture_roof','bell_frame_body','bridge_arch_abutments','bridge_bank_approaches','bridge_deck_rails','layout_blocks','maple_branches','maple_leaves','reed_prototypes','reed_scatter','rock_prototypes','shore_profile','shore_rock_scatter','temple_enclosure']
    for name in components: copy(TASK/'components'/(name+'.json'),'components/'+name+'.json')
    for source,target in [('final-budget.json','budget.json'),('final-contract.json','contract.json'),('final-asset-fixtures.log','asset-fixtures.log'),('final-meshopt-fixtures.log','meshopt-fixtures.log'),('final-compression-v01.json','compression.json'),('saved-blender-validation.log','blender-validation.log'),('final-build.log','build.log'),('final-png-unit-tests.log','unit-tests.log'),('render-profile-v01.log','render-profile.log')]:
        copy(TASK/source,target)
    manifest={
        'date':'2026-10-07','scope':'quality-sample','evidenceRevision':'bridge-bank-components-v01',
        'fullSceneAccepted':False,'model':record(model),'source':record(ROOT/'art/blender/fengqiao-scene-v01.blend'),
        'environment':record(ROOT/'frontend/public/assets/environments/fengqiao-night-v01.rgba16f.gz'),
        'budget':load(TASK/'final-budget.json'),'preservedHistoricalAssets':HISTORY,
        'lifecycle':{'status':lifecycle['status'],'loadGate':lifecycle['loadGate'],'checks':lifecycle['checks'],'disposal':lifecycle['lastDisposal']['memory'],'contextLost':True},
        'performance':{'status':performance['status'],'loadGate':performance['loadGate'],'frames':performance['frames'],'failure':performance.get('failure')},
        'legacy':{'status':legacy['status'],'loadGate':legacy['loadGate'],'environmentComparison':legacy.get('environmentComparison')},
        'video':record(DEST/'scene-preview.webm'),
        'videoReview':{'width':1440,'height':900,'fps':25,'durationSeconds':27.24,'sampleTimesSeconds':[5,13,24],'framesVisuallyInspected':True,'edited':False},
        'method':'Component-first Blender authoring; exact RGBA and decoded Meshopt bytes; real Chrome/D3D11 fixed frames, pixel controls and lifecycle. Failed performance remains failed; no full-scene acceptance.',
    }
    (DEST/'artifact-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    (DEST/'README.md').write_text('# 桥寺与河岸组件候选证据\n\n本目录归档独立 scene-v01 的制作与实际浏览器证据，范围为 quality-sample。原始门禁结果及资产校验值见 artifact-manifest.json；性能与生命周期报告分别保留，后者不能替代前者。当前任务状态只维护在根 HANDOFF.md。\n\n源文件：art/blender/fengqiao-scene-v01.blend；分段源码：art/scripts/components/fengqiao；候选清单：frontend/public/assets/scenes/fengqiao.scene-v01.json。\n\ncomponents 保存独立组件几何检查；compression 保存逐像素/逐原字节无损核验；frames 为实际1920/1440/390截图，scene-preview.webm 为原始连续录制，未变速或补帧。performance 与 lifecycle 内的 verification.json 为完整原始报告，包含实际硬件与严格门禁结果。\n\n复验：先运行 Node 资产契约/预算工具，再按 HANDOFF.md 的候选清单与输出参数运行 verify-fengqiao-sample.mjs。--diagnose-load 只继续采集失败后证据，不修改最终3秒门禁。保留非导出组件与历史小样，按 AGENT.md 分段修改。\n',encoding='utf8')
    print(json.dumps({'archive':str(DEST),'model':manifest['model'],'performanceStatus':performance['status'],'lifecycleStatus':lifecycle['status'],'historicalAssetsPreserved':len(HISTORY)},ensure_ascii=False))

if __name__=='__main__': main()
