"""契约常量：docs/CONTRACT.md 的机器可读版本。

validate.py / export_glb.py / bake_terrain.py 共用。改契约时先改 CONTRACT.md，
再改这里（CONTRACT 17.1），tools/check-contract.mjs 里有对应的一份 JS 版本。
"""
import re
import sys

# 第 3 节：命名
RE_OBJECT = re.compile(r"^[a-z][a-z0-9_]*$")
RE_MARKER = re.compile(r"^(CAM|FOCUS|EMIT|SFX|LIGHT|ANCHOR|PLACE)_[a-z0-9_]+$")
RE_MATERIAL = re.compile(r"^[a-z]+(_[a-z]+)?(__[a-z0-9]+)?$")
RE_EXPORT_COLLECTION = re.compile(r"^glb_[a-z0-9_]+$")
MASK_ATTR = "mask"
TERRAIN = "terrain"

# 第 6 节：材质槽位 → 是否需要顶点色 mask
MATERIAL_SLOTS = {
    "ink_rock": True,
    "ink_wood": True,
    "ink_tile": True,
    "ink_stone": True,
    "ink_foliage": True,
    "ink_cloth": True,
    "water": False,
    "paper": False,
    "snow": True,
    "glow": False,
    "pbr_rock": False,
    "pbr_stone": False,
    "pbr_wood": False,
    "pbr_tile": False,
    "pbr_foliage": True,
    "pbr_cloth": True,
    "pbr_metal": False,
    "pbr_skin": False,
    "pbr_snow": False,
}
MAX_SLOTS_PER_OBJECT = 2

# 第 5 节：自定义属性白名单
BEHAVIORS = {"bob", "sway", "flicker"}
YUAN = {"gao", "shen", "ping"}
LIGHT_TYPES = {"point", "spot"}
USER_PROPS = {
    "behavior", "amp", "freq", "phase", "reveal", "static",
    "yuan", "light", "color", "intensity", "range", "asset",
    # ANCHOR_page 的书页尺寸（CONTRACT 16.1）
    "width", "height",
}

# 第 14 节：预算（三角面为建议值 → 警告）
TRIS_PER_SCENE = 1_000_000
TRIS_PER_OBJECT = 50_000
MAX_CAMERA_ROLL_DEG = 1.0
ORIGIN_TOLERANCE_M = 0.01


def material_base(name):
    """ink_rock__cliff → ink_rock"""
    return name.split("__", 1)[0]


def script_args():
    """blender -b x.blend --python s.py -- --out dir → ['--out', 'dir']"""
    return sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def user_props(id_block):
    """物体上用户自己加的自定义属性（排除 Blender / 插件内部的 _RNA_UI 等）。"""
    return {k: id_block[k] for k in id_block.keys() if not k.startswith("_") and k != "cycles"}
