"""按 CONTRACT 第 13 节参数导出当前 .blend 的全部 glb_ 集合。

用法：
    blender -b art/blender/fengqiao.blend \
      --python art/scripts/export_glb.py -- --out frontend/public/assets/models/fengqiao
"""
from __future__ import annotations

import argparse
import os
import sys

import bpy

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from contract import RE_EXPORT_COLLECTION, script_args  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="按 glb_ 集合导出 GLB")
    parser.add_argument("--out", required=True, help="输出目录")
    parser.add_argument(
        "--collection",
        action="append",
        default=[],
        help="只导出指定 glb_ 集合；可重复传入",
    )
    return parser.parse_args(script_args())


def export_collection(collection: bpy.types.Collection, output_dir: str) -> str:
    # Python UV edits must reach evaluated meshes before glTF computes tangents.
    for obj in collection.all_objects:
        if obj.type == "MESH":
            obj.data.update()
    bpy.context.view_layer.update()
    from validate import validate
    report = validate()
    if report.errors:
        raise RuntimeError("导出前契约校验失败：" + "; ".join(report.errors))
    filename = f"{collection.name.removeprefix('glb_')}.glb"
    filepath = os.path.abspath(os.path.join(output_dir, filename))
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    bpy.ops.export_scene.gltf(
        filepath=filepath,
        check_existing=False,
        export_format="GLB",
        collection=collection.name,
        export_yup=True,
        export_apply=True,
        export_extras=True,
        export_cameras=True,
        export_lights=False,
        export_materials="EXPORT",
        export_vertex_color="NAME",
        export_vertex_color_name="mask",
        export_texcoords=True,
        export_normals=True,
        export_tangents=True,
        export_animations=bool(bpy.data.actions),
        export_gpu_instances=True,
        export_draco_mesh_compression_enable=False,
        export_image_format="AUTO",
    )
    return filepath


def main() -> None:
    args = parse_args()
    requested = set(args.collection)
    top_level = list(bpy.context.scene.collection.children)
    collections = [col for col in top_level if RE_EXPORT_COLLECTION.fullmatch(col.name)]
    if requested:
        missing = sorted(requested - {col.name for col in collections})
        if missing:
            raise SystemExit(f"[export] 找不到集合：{', '.join(missing)}")
        collections = [col for col in collections if col.name in requested]
    if not collections:
        raise SystemExit("[export] 当前文件没有可导出的顶层 glb_ 集合")

    output_dir = os.path.abspath(args.out)
    print(f"[export] 输出目录：{output_dir}")
    for collection in sorted(collections, key=lambda col: col.name):
        filepath = export_collection(collection, output_dir)
        size_kib = os.path.getsize(filepath) / 1024
        print(f"[export] {collection.name} → {filepath} ({size_kib:.1f} KiB)")
    print(f"[export] 完成：{len(collections)} 个 GLB")


if __name__ == "__main__":
    main()
