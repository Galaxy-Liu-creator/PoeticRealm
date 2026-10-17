"""Archive the selected night-scene evidence without replacing earlier packets."""
from pathlib import Path
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output/playwright/fengqiao-scene-v03"
DEST = ROOT / "docs/plans/R2-枫桥场景/assets/scene-v03"

PROTECTED = {
    "art/blender/fengqiao-sample-v01.blend": "694b8394942943178ba1239bb1005f7c7870a2418df2bc051393d352edc0d0f6",
    "art/blender/fengqiao-sample-v02.blend": "cfd60149342263d701ae60befe2bc7afae13e0f10dcfe8e55b737e0a3d127e99",
    "art/blender/fengqiao-sample-v03.blend": "7056b269b62e148c45e60fa62f81ef7b3d2afea2804291921e818338861344f8",
    "art/blender/fengqiao-sample-v04.blend": "4f3fa91b7e9ce973b7bb3f0d8fb3a576e9ec09ddc7dab0a7585784943687fb7e",
    "frontend/public/assets/models/fengqiao/sample_v01.glb": "37540f5d04a5829c99a03b4ed802478a21bd2ec1e36895706ced132a5720caeb",
    "frontend/public/assets/models/fengqiao/sample_v02.glb": "7ffde5fa94fd3ea26e3d7e346c3142fd85d037176f15f4133985171bb57a3114",
    "frontend/public/assets/models/fengqiao/sample_v03.glb": "cf87dd3bc8c86b4680d871e6f200aa37cea14ff4aa908e293c3c18c2ba452107",
    "frontend/public/assets/models/fengqiao/sample_v04.glb": "bf4868c46bc0eea6b1c67579d1db706ac9f9297ca1e874ae5326755cebcd6b97",
    "art/blender/fengqiao-scene-v01.blend": "b7a4daf0f7255cbd4f3267a76d0e169bbb35a11b516aa0617c2c1d5c11639a6c",
    "frontend/public/assets/models/fengqiao/scene_v01.glb": "e8f653c10690aaaa0f7a97e387871b439cab4adec351c9a4fc865f597aaddf0e",
    "art/blender/fengqiao-scene-v02.blend": "9d883f19e9159b7243e4cbae8046c156a5aabd13bcab3425f9dac8123ef75f7e",
    "frontend/public/assets/models/fengqiao/scene_v02.glb": "f22fb8b873d61d508c7316262e9246f17c8b4c21c116141c2249632a04d0aa57",
}

def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()

def verify_protected():
    for name, expected in PROTECTED.items():
        if digest(ROOT / name) != expected:
            raise RuntimeError(f"Protected asset changed: {name}")

verify_protected()
items = []

def archive(source, target):
    destination = DEST / target
    if destination.exists():
        raise RuntimeError(f"Refusing to overwrite evidence: {destination}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
    source_hash = digest(source)
    if source_hash != digest(destination):
        raise RuntimeError(f"Copy mismatch: {destination}")
    items.append({"path": target, "source": source.relative_to(ROOT).as_posix(),
                  "bytes": destination.stat().st_size, "sha256": source_hash})

core = ["verification.json", "build.log", "tests.log", "contract.log", "budget.log",
        "fog-off.png", "fog-on.png", "moon-repeat.png", "native-product.png",
        "product-1920.png", "product-1440.png", "product-390.png",
        "reduced.png", "reduced-repeat.png",
        "video/page@342f906d8e34c1a185f0a4d507cec9a0.webm"]
core += [f"moon-t{t}.png" for t in (0, 8, 16, 24, 32, 40)]
core += [f"{kind}-p{p}.png" for kind in ("entry", "return") for p in (0, 0.25, 0.5, 0.75)]
core += [f"verse-CAM_{view}.png" for view in ("moonset", "riverbank", "temple", "boat")]
core += [f"audio/{name}.wav" for name in ("wind", "water", "crow", "bell")]
core += [f"video/inspected-{n:02}.png" for n in (1, 2, 3)]
for name in core:
    archive(OUTPUT / "accepted-flow" / name, f"accepted-flow/{name}")

for name in ("cold-load.json", "cold-load-final.json"):
    archive(OUTPUT / name, f"diagnostics/{name}")
for folder in ("initial", "quick", "product", "product-final", "product-complete",
               "product-perf", "product-final-perf", "rower-final"):
    archive(OUTPUT / folder / "verification.json", f"diagnostics/{folder}/verification.json")
    archive(OUTPUT / folder / "failure.png", f"diagnostics/{folder}/failure.png")
for name in ("verification.json", "progress.json", "native-devtools-1920.png", "performance.json.gz"):
    archive(OUTPUT / "full" / name, f"diagnostics/full/{name}")

sources = [
    "frontend/public/assets/scenes/fengqiao.scene-v03.json",
    "frontend/public/assets/terrain/fengqiao.height.json",
    "frontend/src/engine/Assets.ts", "frontend/src/engine/Engine.ts",
    "frontend/src/scenes/FengqiaoScene.ts", "frontend/src/scenes/fengqiao/timeline.ts",
    "frontend/src/labs/fengqiao.ts", "frontend/src/app/Application.ts",
    "frontend/src/ui/pages/Poem.ts", "frontend/src/ui/styles/fengqiao-scene.css",
    "frontend/src/transition/RealmReveal.ts", "frontend/src/transition/PageReturn.ts",
    "frontend/src/systems/nature/MoonFall.ts", "frontend/src/systems/nature/HeightFog.ts",
    "frontend/src/systems/nature/DistantTerrain.ts", "frontend/src/systems/water/NightRiver.ts",
    "frontend/src/systems/audio/AudioEngine.ts", "frontend/src/systems/audio/fengqiaoSound.ts",
    "frontend/src/systems/audio/fengqiaoSound.test.ts", "frontend/src/engine/Assets.test.ts",
    "frontend/tools/verify-fengqiao-scene.mjs", "frontend/tools/check-fengqiao-cold-load.mjs",
    "frontend/tools/asset-contract.mjs", "frontend/tools/check-budget.mjs",
    "docs/CONTRACT.md", "docs/CREDITS.md",
]
for name in sources:
    archive(ROOT / name, f"source/{name}")

verify_protected()
manifest = {
    "date": "2026-10-08", "scope": "full-scene", "fullSceneAccepted": False,
    "functionalChecks": 11, "unitTests": 88,
    "sourceModelReused": "frontend/public/assets/models/fengqiao/scene_v02.glb",
    "modelAndEnvironmentBytes": 14982076, "distributedBytesIncludingTerrain": 17194260,
    "protectedAssets": PROTECTED,
    "heightmapSHA256": digest(ROOT / "frontend/public/assets/terrain/fengqiao.height.png"),
    "audio": "Original runtime synthesis; WAVs are audition evidence, not added download assets. Human audition remains open.",
    "video": {"durationSeconds": 107.84, "size": [1440, 810], "fps": 25,
              "edited": False, "audioRecorded": False, "containsTestSeeks": True,
              "inspectedSeconds": [7, 50, 90]},
    "openGates": ["Stable first-frame load <= 3000 ms", "Rower view P95 <= 20 ms", "R4 target-device/offline acceptance"],
    "deferred": ["Complex automatic four-verse camera storyboard"],
    "diagnosticRevisions": {"full": "Earlier height-fog v1; load gate failed, downstream checks collected",
                             "product-final-perf": "Selected height-fog v2; all three views measured without recording",
                             "rower-final": "Unselected fog v3 experiment; reverted to v2"},
    "files": items,
}
manifest_path = DEST / "artifact-manifest.json"
if manifest_path.exists():
    raise RuntimeError("Refusing to overwrite artifact manifest")
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"archivedFiles": len(items), "protectedAssets": len(PROTECTED),
                  "destination": str(DEST)}, ensure_ascii=False))
