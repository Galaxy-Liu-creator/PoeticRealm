"""把当前 .blend 的 terrain 高度场烘焙为 CONTRACT 第 10 节规定的 PNG + JSON。

用法：
    blender -b art/blender/fengqiao.blend \
      --python art/scripts/bake_terrain.py -- --out frontend/public/assets/terrain

terrain 必须是规则的矩形高度场网格；这与“纸页和地形是同一张网格”的运行时
表示一致。PNG 由脚本直接编码为 RGB 8 位，避免 Blender 色彩管理或 alpha 预乘
改写数据通道。
"""
from __future__ import annotations

import argparse
import binascii
from datetime import datetime, timezone
import json
import os
import struct
import sys
import zlib

import bpy
import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from contract import TERRAIN, script_args  # noqa: E402

ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
DEFAULT_RESOLUTION = 1024


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="烘焙地形高度与墨迹引导遮罩")
    parser.add_argument("--out", required=True, help="输出目录")
    parser.add_argument("--scene", help="场景 id；默认取 .blend 文件名")
    parser.add_argument("--resolution", type=int, default=DEFAULT_RESOLUTION)
    parser.add_argument("--water-level", type=float, default=0.0)
    return parser.parse_args(script_args())


def _terrain_object() -> bpy.types.Object:
    collection = bpy.data.collections.get(TERRAIN)
    if collection is None:
        raise SystemExit("[bake] 找不到 terrain 集合")
    objects = list(collection.all_objects)
    if len(objects) != 1 or objects[0].name != TERRAIN or objects[0].type != "MESH":
        raise SystemExit("[bake] terrain 集合必须且只能包含一个名为 terrain 的网格")
    return objects[0]


def _height_grid(obj: bpy.types.Object) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh(preserve_all_data_layers=False, depsgraph=depsgraph)
    try:
        coords = np.empty((len(mesh.vertices), 3), dtype=np.float64)
        for index, vertex in enumerate(mesh.vertices):
            world = evaluated.matrix_world @ vertex.co
            coords[index] = (world.x, world.y, world.z)
    finally:
        evaluated.to_mesh_clear()

    if not len(coords):
        raise SystemExit("[bake] terrain 是空网格")

    rounded_x = np.round(coords[:, 0], 6)
    rounded_y = np.round(coords[:, 1], 6)
    xs = np.unique(rounded_x)
    ys = np.unique(rounded_y)
    if len(xs) < 2 or len(ys) < 2 or len(xs) * len(ys) != len(coords):
        raise SystemExit(
            "[bake] terrain 必须是规则的矩形高度场：每个 XY 采样点只能有一个高度"
        )

    heights = np.full((len(ys), len(xs)), np.nan, dtype=np.float64)
    x_indices = np.searchsorted(xs, rounded_x)
    y_indices = np.searchsorted(ys, rounded_y)
    heights[y_indices, x_indices] = coords[:, 2]
    if np.isnan(heights).any():
        raise SystemExit("[bake] terrain 高度场存在缺失采样点")
    return xs, ys, heights


def _resample(
    xs: np.ndarray,
    ys: np.ndarray,
    heights: np.ndarray,
    resolution: int,
) -> np.ndarray:
    if resolution < 2:
        raise SystemExit("[bake] resolution 必须大于等于 2")

    target_x = xs[0] + (np.arange(resolution) + 0.5) / resolution * (xs[-1] - xs[0])
    # PNG 顶行对应 Blender +Y。
    target_y = ys[-1] - (np.arange(resolution) + 0.5) / resolution * (ys[-1] - ys[0])

    ix1 = np.clip(np.searchsorted(xs, target_x, side="right"), 1, len(xs) - 1)
    iy1 = np.clip(np.searchsorted(ys, target_y, side="right"), 1, len(ys) - 1)
    ix0 = ix1 - 1
    iy0 = iy1 - 1
    tx = (target_x - xs[ix0]) / (xs[ix1] - xs[ix0])
    ty = (target_y - ys[iy0]) / (ys[iy1] - ys[iy0])

    h00 = heights[iy0[:, None], ix0[None, :]]
    h10 = heights[iy0[:, None], ix1[None, :]]
    h01 = heights[iy1[:, None], ix0[None, :]]
    h11 = heights[iy1[:, None], ix1[None, :]]
    lower = h00 * (1.0 - tx[None, :]) + h10 * tx[None, :]
    upper = h01 * (1.0 - tx[None, :]) + h11 * tx[None, :]
    return lower * (1.0 - ty[:, None]) + upper * ty[:, None]


def _smoothstep(edge0: float, edge1: float, values: np.ndarray) -> np.ndarray:
    t = np.clip((values - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def _encode_channels(heights: np.ndarray, water_level: float) -> tuple[np.ndarray, float, float]:
    h_min = float(np.min(heights))
    h_max = float(np.max(heights))
    if h_max - h_min < 1e-6:
        raise SystemExit("[bake] terrain 高度范围过小，无法编码")

    normalized = np.clip((heights - h_min) / (h_max - h_min), 0.0, 1.0)
    height16 = np.rint(normalized * 65535.0).astype(np.uint16)
    red = (height16 >> 8).astype(np.uint8)
    green = (height16 & 255).astype(np.uint8)

    # 江谷保持纸白；山体随高度逐步成为墨扩散的优先通道。
    guide = np.rint(
        _smoothstep(water_level + 0.5, water_level + 30.0, heights) * 255.0
    ).astype(np.uint8)
    rgb = np.stack((red, green, guide), axis=-1)
    return rgb, h_min, h_max


def _png_chunk(chunk_type: bytes, data: bytes) -> bytes:
    payload = chunk_type + data
    return (
        struct.pack(">I", len(data))
        + payload
        + struct.pack(">I", binascii.crc32(payload) & 0xFFFFFFFF)
    )


def write_rgb_png(filepath: str, rgb: np.ndarray) -> None:
    height, width, channels = rgb.shape
    if channels != 3 or rgb.dtype != np.uint8:
        raise ValueError("write_rgb_png 只接受 uint8 RGB 数组")
    rows = [b"\x00" + rgb[row].tobytes() for row in range(height)]
    raw = b"".join(rows)
    png = b"\x89PNG\r\n\x1a\n"
    png += _png_chunk("IHDR".encode("ascii"), struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    png += _png_chunk("IDAT".encode("ascii"), zlib.compress(raw, level=9))
    png += _png_chunk("IEND".encode("ascii"), b"")
    with open(filepath, "wb") as handle:
        handle.write(png)


def _scene_id(explicit: str | None) -> str:
    if explicit:
        return explicit
    if not bpy.data.filepath:
        raise SystemExit("[bake] 未保存的 .blend 必须传入 --scene")
    return os.path.splitext(os.path.basename(bpy.data.filepath))[0]


def main() -> None:
    args = parse_args()
    scene = _scene_id(args.scene)
    obj = _terrain_object()
    xs, ys, source_heights = _height_grid(obj)
    heights = _resample(xs, ys, source_heights, args.resolution)
    rgb, h_min, h_max = _encode_channels(heights, args.water_level)

    output_dir = os.path.abspath(args.out)
    os.makedirs(output_dir, exist_ok=True)
    png_path = os.path.join(output_dir, f"{scene}.height.png")
    json_path = os.path.join(output_dir, f"{scene}.height.json")
    write_rgb_png(png_path, rgb)

    blend_path = os.path.abspath(bpy.data.filepath)
    try:
        baked_from = os.path.relpath(blend_path, ROOT).replace(os.sep, "/")
    except ValueError:
        baked_from = blend_path.replace(os.sep, "/")
    metadata = {
        "scene": scene,
        "resolution": args.resolution,
        "size": [round(float(xs[-1] - xs[0]), 6), round(float(ys[-1] - ys[0]), 6)],
        "heightRange": [round(h_min, 6), round(h_max, 6)],
        "waterLevel": args.water_level,
        "bakedFrom": baked_from,
        "bakedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
    }
    with open(json_path, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(metadata, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(
        f"[bake] {scene}: {args.resolution}×{args.resolution}，"
        f"范围 {h_min:.3f}–{h_max:.3f} m"
    )
    print(f"[bake] 写入 {png_path}")
    print(f"[bake] 写入 {json_path}")


if __name__ == "__main__":
    main()
