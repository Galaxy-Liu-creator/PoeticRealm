"""P0 灰模：程序化生成 art/blender/fengqiao.blend 与 art/blender/props.blend。

    blender -b --factory-startup --python art/scripts/build_greybox.py

只为验证转场和契约，不是最终美术。布局（Blender 坐标，Z 向上，米）：
- 江沿 Y 轴南北穿过，蜿蜒；西岸（-X）为高山（月落西山），东岸为低丘；
- 寒山寺在东岸北段，客船泊在江心南段；寺前江面 EMIT_bell 到客船约 950 m；
- 所有随机量带固定种子，重复运行得到同样的 .blend。
"""
import math
import os
import random

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BLEND_DIR = os.path.join(ROOT, "art", "blender")

TERRAIN_SIZE = 1500.0
TERRAIN_RES = 301  # 顶点数 / 边，约 5 m 一格
RIVER_HALF_WIDTH = 55.0
SEED = 20260928


# ---------------------------------------------------------------- 地形函数

def river_x(y):
    return 70.0 * np.sin(y / 260.0) + 25.0 * np.sin(y / 97.0 + 1.3)


def _hash2(ix, iy, seed):
    h = (ix * 374761393 + iy * 668265263 + seed * 144269504) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFFFF) / float(0xFFFFFF)


def value_noise(x, y, seed):
    ix, iy = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64)
    fx, fy = x - ix, y - iy
    ux, uy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a = _hash2(ix, iy, seed)
    b = _hash2(ix + 1, iy, seed)
    c = _hash2(ix, iy + 1, seed)
    d = _hash2(ix + 1, iy + 1, seed)
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy


def fbm(x, y, seed, octaves=5):
    total, amp, freq, norm = 0.0, 0.5, 1.0, 0.0
    for o in range(octaves):
        total = total + amp * value_noise(x * freq, y * freq, seed + o)
        norm += amp
        amp *= 0.5
        freq *= 2.0
    return total / norm


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def terrain_height(x, y):
    """地形高度（米）。x、y 可以是标量或数组。"""
    x = np.asarray(x, dtype=np.float64)
    y = np.asarray(y, dtype=np.float64)
    dx = x - river_x(y)
    d = np.abs(dx)
    # 江床：江心 -4 m，到岸边 0
    bed = -4.0 * (1.0 - np.clip(d / RIVER_HALF_WIDTH, 0, 1) ** 2)
    # 岸边平地缓升
    bank = np.where(d > RIVER_HALF_WIDTH, 1.5 + 0.012 * (d - RIVER_HALF_WIDTH), 0.0)
    # 山：离江越远越高；西岸高山，东岸低丘；ridged fbm 做出山脊
    n = fbm(x / 180.0, y / 180.0, 7)
    ridge = 1.0 - np.abs(2.0 * fbm(x / 260.0 + 11.0, y / 260.0 - 5.0, 13) - 1.0)
    west = dx < 0
    amp = np.where(west, 175.0, 85.0)
    start = np.where(west, 140.0, 180.0)
    envelope = smoothstep(start, start + 320.0, d)
    mountain = envelope * amp * (0.35 + 0.45 * ridge + 0.35 * n)
    return bed + bank + mountain


# ---------------------------------------------------------------- 工具

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.fps = 30
    return scene


def new_collection(name):
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col


def get_material(name, rgb):
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1.0)
    if mat.node_tree is None:  # 5.x 新材质默认有节点树
        mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    return mat


SCENE_COLORS = {
    "ink_wood": (0.36, 0.22, 0.14),
    "ink_tile": (0.18, 0.2, 0.22),
    "ink_stone": (0.55, 0.53, 0.5),
    "ink_foliage": (0.55, 0.12, 0.06),  # 江枫：霜后的红
    "ink_cloth": (0.42, 0.36, 0.26),
}


def mesh_object(name, bm, materials, collection):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in materials:
        me.materials.append(get_material(m, SCENE_COLORS[m]))
    obj = bpy.data.objects.new(name, me)
    collection.objects.link(obj)
    return obj


def paint_mask(obj, sway_from=None, sway_to=None):
    """写顶点色 mask（CONTRACT 7）：R = 风摆权重（按高度），G = 积墨（越低越重）。"""
    me = obj.data
    attr = me.color_attributes.new(name="mask", type="BYTE_COLOR", domain="CORNER")
    zs = [v.co.z for v in me.vertices]
    zmin, zmax = min(zs), max(zs)
    span = max(zmax - zmin, 1e-6)
    for loop in me.loops:
        z = me.vertices[loop.vertex_index].co.z
        g = 0.85 * (1.0 - (z - zmin) / span) ** 2
        r = 0.0
        if sway_from is not None:
            r = min(max((z - sway_from) / (sway_to - sway_from), 0.0), 1.0)
        attr.data[loop.index].color = (r, g, 0.0, 1.0)


def add_box(bm, size, center, mat_index=0):
    """在 bm 里加一个长方体；center 为底面中心。"""
    sx, sy, sz = size
    cx, cy, cz = center
    res = bmesh.ops.create_cube(bm, size=1.0)
    verts = res["verts"]
    for v in verts:
        v.co = Vector((cx + v.co.x * sx, cy + v.co.y * sy, cz + (v.co.z + 0.5) * sz))
    for f in {f for v in verts for f in v.link_faces}:
        f.material_index = mat_index
    return verts


def add_hip_roof(bm, width, depth, eave_z, ridge_z, overhang, mat_index):
    """唐风庑殿顶的灰模：出檐深远、屋坡平缓。底面在 eave_z，正脊在 ridge_z。"""
    w, d = width / 2 + overhang, depth / 2 + overhang
    ridge_half = max(w - d, w * 0.25)
    pts = [(-w, -d, eave_z), (w, -d, eave_z), (w, d, eave_z), (-w, d, eave_z),
           (-ridge_half, 0, ridge_z), (ridge_half, 0, ridge_z)]
    vs = [bm.verts.new(p) for p in pts]
    faces = [(0, 1, 5, 4), (2, 3, 4, 5), (1, 2, 5), (3, 0, 4), (3, 2, 1, 0)]
    for idx in faces:
        f = bm.faces.new([vs[i] for i in idx])
        f.material_index = mat_index


def build_hall(name, width, depth, body_h, roof_h, overhang, collection):
    bm = bmesh.new()
    add_box(bm, (width, depth, body_h), (0, 0, 0), mat_index=0)
    add_hip_roof(bm, width, depth, body_h, body_h + roof_h, overhang, mat_index=1)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = mesh_object(name, bm, ["ink_wood", "ink_tile"], collection)
    paint_mask(obj)
    return obj


def build_boat(name, collection):
    """客船：船身（ink_wood）+ 船篷（ink_cloth）。正面朝 -Y，原点在底面中心。"""
    bm = bmesh.new()
    verts = add_box(bm, (2.4, 9.0, 1.1), (0, 0, 0), mat_index=0)
    for v in verts:  # 首尾收窄、上翘
        t = abs(v.co.y) / 4.5
        if t > 0.99:
            v.co.x *= 0.25
            if v.co.z > 0.5:
                v.co.z += 0.35
    for v in add_box(bm, (2.0, 3.2, 1.3), (0, 0.6, 1.1), mat_index=1):
        if v.co.z > 2.0:
            v.co.x *= 0.55  # 篷顶收成拱形的近似
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = mesh_object(name, bm, ["ink_wood", "ink_cloth"], collection)
    paint_mask(obj, sway_from=1.8, sway_to=2.4)
    return obj


def build_tree_mesh():
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.35, radius2=0.25, depth=3.0,
                          matrix=__import__("mathutils").Matrix.Translation((0, 0, 1.5)))
    bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=3.2, radius2=0.0, depth=7.0,
                          matrix=__import__("mathutils").Matrix.Translation((0, 0, 6.0)))
    me = bpy.data.meshes.new("tree")
    bm.to_mesh(me)
    bm.free()
    me.materials.append(get_material("ink_foliage", SCENE_COLORS["ink_foliage"]))
    return me


def empty(name, loc, collection, display="PLAIN_AXES", rot=None, **props):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = display
    obj.empty_display_size = 5.0
    obj.location = loc
    if rot is not None:
        obj.rotation_euler = rot
    for k, v in props.items():
        obj[k] = v
    collection.objects.link(obj)
    return obj


def camera(name, loc, target, collection, fov_deg=38.0, yuan="ping"):
    cam = bpy.data.cameras.new(name)
    cam.sensor_fit = "VERTICAL"
    cam.lens_unit = "FOV"
    cam.angle = math.radians(fov_deg)
    cam.clip_start = 0.1
    cam.clip_end = 5000.0
    obj = bpy.data.objects.new(name, cam)
    obj.location = loc
    # -Z 指向目标、Y 朝上 → 无滚转（CONTRACT 11）
    obj.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    obj["yuan"] = yuan
    collection.objects.link(obj)
    return obj


def ground(x, y):
    return float(terrain_height(x, y))


# ---------------------------------------------------------------- 场景

def build_terrain(collection):
    n = TERRAIN_RES
    half = TERRAIN_SIZE / 2
    xs = np.linspace(-half, half, n)
    X, Y = np.meshgrid(xs, xs)
    Z = terrain_height(X, Y)
    verts = np.stack([X.ravel(), Y.ravel(), Z.ravel()], axis=1)
    idx = np.arange(n * n).reshape(n, n)
    quads = np.stack([idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]], axis=-1).reshape(-1, 4)
    me = bpy.data.meshes.new("terrain")
    me.from_pydata(verts.tolist(), [], quads.tolist())
    me.update()
    obj = bpy.data.objects.new("terrain", me)
    collection.objects.link(obj)
    return obj


def build_fengqiao():
    reset_scene()
    col_terrain = new_collection("terrain")
    col_main = new_collection("glb_main")
    col_foliage = new_collection("glb_foliage")
    build_terrain(col_terrain)

    # 寒山寺：东岸北段
    ty = 525.0
    tx = float(river_x(ty)) + 110.0
    tz = ground(tx, ty)
    base = mesh_object("temple_base", _box_bm((34, 24, 1.6)), ["ink_stone"], col_main)
    base.location = (tx, ty, tz)
    paint_mask(base)
    hall = build_hall("temple_hall", 24, 14, 8.0, 4.5, 4.0, col_main)
    hall.location = (tx, ty, tz + 1.6)
    bx, by = tx - 26.0, ty - 18.0
    bz = ground(bx, by)
    tower = build_hall("bell_tower", 8, 8, 11.0, 3.5, 2.5, col_main)
    tower.location = (bx, by, bz)
    for obj, r in ((base, 0.3), (hall, 0.45), (tower, 0.55)):
        obj["reveal"] = r

    # 客船：江心南段
    boat_y = -420.0
    boat_x = float(river_x(boat_y))
    boat = build_boat("boat_guest", col_main)
    boat.location = (boat_x, boat_y, -0.35)  # 吃水 0.35 m，水位 0
    boat["behavior"] = "bob"
    boat["amp"] = 0.08
    boat["freq"] = 0.25
    boat["reveal"] = 0.8

    # 标记物体
    emit = Vector((float(river_x(ty)) + 30.0, ty - 5.0, 0.0))
    empty("EMIT_bell", emit, col_main, display="ARROWS")
    empty("FOCUS_bell", (bx, by, bz + 12.0), col_main)
    empty("SFX_bell", (bx, by, bz + 9.0), col_main)
    fy = -300.0
    empty("LIGHT_fishfire_01", (float(river_x(fy)) + 20.0, fy, 2.5), col_main,
          light="point", color="#ffb060", intensity=1.0, range=30.0)
    py = -200.0
    empty("PLACE_boat_01", (float(river_x(py)) - 38.0, py, -0.3), col_main, display="ARROWS",
          rot=Euler((0, 0, math.radians(15))), asset="boat")

    # 机位
    ey = -690.0
    camera("CAM_enter", (float(river_x(ey)) - 20.0, ey, 70.0), (float(river_x(0)), 60.0, 8.0), col_main)
    camera("CAM_boat", (boat_x - 1.0, boat_y - 3.0, 2.6), (bx, by, bz + 10.0), col_main, fov_deg=34.0)

    # 植被：20 株共用一个网格，挂在同一空物体下（实例化方案 A）
    tree_me = build_tree_mesh()
    trees = bpy.data.objects.new("trees", None)
    col_foliage.objects.link(trees)
    rng = random.Random(SEED)
    for i in range(20):
        y = ty - 160.0 + rng.uniform(0, 260.0)
        x = float(river_x(y)) + RIVER_HALF_WIDTH + 8.0 + rng.uniform(0, 45.0)
        t = bpy.data.objects.new(f"tree_{i + 1:02d}", tree_me)
        t.location = (x, y, ground(x, y) - 0.2)
        t.rotation_euler = (0, 0, rng.uniform(0, math.tau))
        t.parent = trees
        t["reveal"] = 0.6
        col_foliage.objects.link(t)
    obj0 = bpy.data.objects["tree_01"]
    paint_mask(obj0, sway_from=3.0, sway_to=9.5)

    dist = (Vector((boat_x, boat_y)) - emit.xy).length
    print(f"[greybox] EMIT_bell → boat_guest 水平距离 {dist:.1f} m，钟声延迟 {dist / 340:.2f} s")

    path = os.path.join(BLEND_DIR, "fengqiao.blend")
    bpy.ops.wm.save_as_mainfile(filepath=path, compress=True)
    print(f"[greybox] 写入 {path}")


def _box_bm(size):
    bm = bmesh.new()
    add_box(bm, size, (0, 0, 0))
    return bm


def build_props():
    reset_scene()
    col = new_collection("glb_boat")
    build_boat("boat", col)
    path = os.path.join(BLEND_DIR, "props.blend")
    bpy.ops.wm.save_as_mainfile(filepath=path, compress=True)
    print(f"[greybox] 写入 {path}")


if __name__ == "__main__":
    os.makedirs(BLEND_DIR, exist_ok=True)
    build_fengqiao()
    build_props()
