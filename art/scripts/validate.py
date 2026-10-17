"""校验当前 Blender 文件是否符合 docs/CONTRACT.md。

用法：
    blender -b art/blender/fengqiao.blend --python art/scripts/validate.py

错误会令 Blender 以非零状态退出；预算中的“建议值”只产生警告。
"""
from __future__ import annotations

import math
import os
import sys
from collections.abc import Iterable

import bpy
import bmesh
from mathutils import Vector

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from contract import (  # noqa: E402
    BEHAVIORS,
    LIGHT_TYPES,
    MASK_ATTR,
    MATERIAL_SLOTS,
    MAX_CAMERA_ROLL_DEG,
    MAX_SLOTS_PER_OBJECT,
    ORIGIN_TOLERANCE_M,
    RE_EXPORT_COLLECTION,
    RE_MARKER,
    RE_MATERIAL,
    RE_OBJECT,
    TERRAIN,
    TRIS_PER_OBJECT,
    TRIS_PER_SCENE,
    USER_PROPS,
    YUAN,
    material_base,
    user_props,
)


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)


def _is_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _close(value: float, expected: float, tolerance: float = 1e-6) -> bool:
    return abs(value - expected) <= tolerance


def _collection_objects(collection: bpy.types.Collection) -> Iterable[bpy.types.Object]:
    """递归遍历集合；按对象名去重，避免嵌套集合重复报告。"""
    seen: set[str] = set()
    for obj in collection.all_objects:
        if obj.name not in seen:
            seen.add(obj.name)
            yield obj


def _validate_scene(report: Report) -> None:
    units = bpy.context.scene.unit_settings
    if units.system != "METRIC":
        report.error("场景单位必须是 METRIC")
    if not _close(units.scale_length, 1.0):
        report.error(f"Unit Scale 必须是 1.0，当前为 {units.scale_length:g}")
    if bpy.context.scene.render.fps != 30:
        report.error(f"帧率必须是 30 fps，当前为 {bpy.context.scene.render.fps}")


def _validate_collections(report: Report) -> list[bpy.types.Collection]:
    top_level = list(bpy.context.scene.collection.children)
    export_collections: list[bpy.types.Collection] = []
    terrain_collections = [col for col in top_level if col.name == TERRAIN]

    for collection in top_level:
        if collection.name.startswith("glb_"):
            export_collections.append(collection)
            if not RE_EXPORT_COLLECTION.fullmatch(collection.name):
                report.error(f"导出集合名不合法：{collection.name}")

    if not export_collections:
        report.error("至少需要一个顶层 glb_ 导出集合")
    if len(terrain_collections) > 1:
        report.error("顶层 terrain 集合只能有一个")

    return export_collections


def _validate_name(obj: bpy.types.Object, report: Report) -> None:
    is_marker = bool(RE_MARKER.fullmatch(obj.name))
    if obj.name == TERRAIN:
        return
    if obj.name.startswith(("CAM_", "FOCUS_", "EMIT_", "SFX_", "LIGHT_", "ANCHOR_", "PLACE_")):
        if not is_marker:
            report.error(f"标记物体名不合法：{obj.name}")
    elif not RE_OBJECT.fullmatch(obj.name):
        report.error(f"物体名不合法：{obj.name}")

    if obj.name.startswith("CAM_") and obj.type != "CAMERA":
        report.error(f"{obj.name} 必须是相机")
    if is_marker and not obj.name.startswith("CAM_") and obj.type != "EMPTY":
        report.error(f"{obj.name} 必须是空物体")


def _validate_props(obj: bpy.types.Object, report: Report) -> None:
    props = user_props(obj)
    unknown = sorted(set(props) - USER_PROPS)
    if unknown:
        report.error(f"{obj.name} 存在未登记的自定义属性：{', '.join(unknown)}")

    behavior = props.get("behavior")
    if behavior is not None and behavior not in BEHAVIORS:
        report.error(f"{obj.name}.behavior 取值不合法：{behavior!r}")
    for name in ("amp", "freq", "intensity", "range", "width", "height"):
        if name in props and not _is_number(props[name]):
            report.error(f"{obj.name}.{name} 必须是数字")
    for name in ("amp", "intensity"):
        if name in props and _is_number(props[name]) and props[name] < 0:
            report.error(f"{obj.name}.{name} 不能小于 0")
    for name in ("freq", "range", "width", "height"):
        if name in props and _is_number(props[name]) and props[name] <= 0:
            report.error(f"{obj.name}.{name} 必须大于 0")
    if "phase" in props and (
        not _is_number(props["phase"]) or not 0 <= props["phase"] <= 1
    ):
        report.error(f"{obj.name}.phase 必须在 0–1 之间")
    if "reveal" in props and (
        not _is_number(props["reveal"]) or not 0 <= props["reveal"] <= 1
    ):
        report.error(f"{obj.name}.reveal 必须在 0–1 之间")
    if "static" in props and not isinstance(props["static"], bool):
        report.error(f"{obj.name}.static 必须是布尔值")

    if obj.name.startswith("CAM_"):
        if props.get("yuan") not in YUAN:
            report.error(f"{obj.name} 必须有合法的 yuan 属性")
    elif "yuan" in props:
        report.error(f"{obj.name}.yuan 只允许用于 CAM_ 相机")

    if obj.name.startswith("LIGHT_"):
        light_type = props.get("light", "point")
        if light_type not in LIGHT_TYPES:
            report.error(f"{obj.name}.light 取值不合法：{light_type!r}")
        color = props.get("color", "#ffb060")
        if not isinstance(color, str) or len(color) != 7 or not color.startswith("#"):
            report.error(f"{obj.name}.color 必须是 #rrggbb")
        else:
            try:
                int(color[1:], 16)
            except ValueError:
                report.error(f"{obj.name}.color 必须是 #rrggbb")
    elif any(name in props for name in ("light", "color", "intensity", "range")):
        report.error(f"灯光属性只允许用于 LIGHT_，当前物体：{obj.name}")

    if obj.name.startswith("PLACE_"):
        asset = props.get("asset")
        if not isinstance(asset, str) or not RE_OBJECT.fullmatch(asset):
            report.error(f"{obj.name} 必须有合法的 asset 属性")
    elif "asset" in props:
        report.error(f"{obj.name}.asset 只允许用于 PLACE_ 标记")


def _validate_materials(obj: bpy.types.Object, report: Report) -> None:
    if obj.type != "MESH":
        return
    slots = list(obj.material_slots)
    if len(slots) > MAX_SLOTS_PER_OBJECT:
        report.error(
            f"{obj.name} 有 {len(slots)} 个材质槽，最多允许 {MAX_SLOTS_PER_OBJECT} 个"
        )
    needs_mask = False
    for index, slot in enumerate(slots):
        material = slot.material
        if material is None:
            report.error(f"{obj.name} 的第 {index + 1} 个材质槽为空")
            continue
        if not RE_MATERIAL.fullmatch(material.name):
            report.error(f"材质名不合法：{material.name}")
            continue
        base = material_base(material.name)
        if base not in MATERIAL_SLOTS:
            report.error(f"未登记的材质槽位：{material.name}")
            continue
        needs_mask = needs_mask or MATERIAL_SLOTS[base]
        if base.startswith("pbr_"):
            _validate_pbr(obj, material, report)

    if slots and needs_mask and MASK_ATTR not in obj.data.color_attributes:
        report.error(f"{obj.name} 使用积墨/风摆材质，但缺少顶点色 {MASK_ATTR}")


def _validate_pbr(obj, material, report):
    nodes = material.node_tree.nodes if material.use_nodes and material.node_tree else []
    shader = next((node for node in nodes if node.type == "BSDF_PRINCIPLED"), None)
    if shader is None:
        report.error(f"{material.name} 必须使用 Principled BSDF")
        return
    def source(socket):
        return socket.links[0].from_node if socket.is_linked else None
    color = source(shader.inputs["Base Color"])
    if color is None:
        return
    if color.type != "TEX_IMAGE" or color.image is None:
        report.error(f"{material.name} 的程序颜色必须烘焙为图像")
        return
    if not obj.data.uv_layers:
        report.error(f"{obj.name} 的写实贴图需要 UV0")
    if color.image.colorspace_settings.name != "sRGB":
        report.error(f"{material.name} Base Color 必须为 sRGB")
    normal = source(shader.inputs["Normal"])
    roughness = source(shader.inputs["Roughness"])
    if normal is None or normal.type != "NORMAL_MAP":
        report.error(f"{material.name} 必须有切线 Normal Map")
    else:
        normal_image = source(normal.inputs["Color"])
        if normal_image is None or normal_image.type != "TEX_IMAGE" or normal_image.image is None:
            report.error(f"{material.name} Normal 必须引用图像")
        elif normal_image.image.colorspace_settings.name != "Non-Color":
            report.error(f"{material.name} Normal 必须为 Non-Color")
    rough_image = roughness
    if roughness is not None and roughness.type in ("SEPRGB", "SEPARATE_COLOR"):
        rough_image = source(roughness.inputs[0])
    if rough_image is None or rough_image.type != "TEX_IMAGE" or rough_image.image is None:
        report.error(f"{material.name} 带纹理时必须有 Roughness 图像输入")
    elif rough_image.image.colorspace_settings.name != "Non-Color":
        report.error(f"{material.name} Roughness 必须为 Non-Color")
    images = [node.image for node in nodes if node.type == "TEX_IMAGE" and node.image]
    for image in images:
        if max(image.size) > 2048:
            report.error(f"{material.name} 贴图 {image.name} 超过2K")


def _validate_mesh_transform(obj: bpy.types.Object, report: Report) -> None:
    if obj.type != "MESH" or obj.name == TERRAIN:
        return
    if any(scale < 0 for scale in obj.scale):
        report.error(f"{obj.name} 禁止负缩放")
    if any(not _close(scale, 1.0) for scale in obj.scale):
        report.error(f"{obj.name} 导出前必须应用缩放，当前为 {tuple(round(v, 6) for v in obj.scale)}")
    if not obj.data.vertices:
        report.error(f"{obj.name} 是空网格")
        return

    xs = [vertex.co.x for vertex in obj.data.vertices]
    ys = [vertex.co.y for vertex in obj.data.vertices]
    zs = [vertex.co.z for vertex in obj.data.vertices]
    center_x = (min(xs) + max(xs)) * 0.5
    center_y = (min(ys) + max(ys)) * 0.5
    if abs(center_x) > ORIGIN_TOLERANCE_M or abs(center_y) > ORIGIN_TOLERANCE_M:
        report.error(
            f"{obj.name} 原点不在底面中心：局部 XY 中心为 ({center_x:.4f}, {center_y:.4f})"
        )
    if abs(min(zs)) > ORIGIN_TOLERANCE_M:
        report.error(f"{obj.name} 原点不在底面：局部最低点 z={min(zs):.4f} m")


def _camera_roll_deg(obj: bpy.types.Object) -> float | None:
    rotation = obj.matrix_world.to_quaternion()
    forward = rotation @ Vector((0.0, 0.0, -1.0))
    up = rotation @ Vector((0.0, 1.0, 0.0))
    reference_up = Vector((0.0, 0.0, 1.0))
    reference_up -= forward * reference_up.dot(forward)
    if reference_up.length < 1e-6:
        return None
    reference_up.normalize()
    up.normalize()
    return math.degrees(up.angle(reference_up))


def _validate_camera(obj: bpy.types.Object, report: Report) -> None:
    if obj.type != "CAMERA":
        return
    if obj.data.sensor_fit != "VERTICAL":
        report.error(f"{obj.name} 的 Sensor Fit 必须是 VERTICAL")
    roll = _camera_roll_deg(obj)
    if roll is None:
        report.warn(f"{obj.name} 接近垂直俯视，无法稳定检查 roll")
    elif roll > MAX_CAMERA_ROLL_DEG:
        report.error(f"{obj.name} 的 roll 为 {roll:.3f}°，必须小于 {MAX_CAMERA_ROLL_DEG:g}°")


def _triangle_count(obj: bpy.types.Object) -> int:
    return sum(max(0, len(polygon.vertices) - 2) for polygon in obj.data.polygons)


def _validate_closed_hull(obj: bpy.types.Object, report: Report) -> None:
    if obj.name != 'boat_hull_closed':
        return
    if obj.type != 'MESH' or obj.parent is None or obj.parent.name != 'boat_guest':
        report.error('boat_hull_closed 必须为 boat_guest 子级实体网格')
        return
    bm = bmesh.new()
    try:
        bm.from_mesh(obj.data)
        if not bm.faces or any(not edge.is_manifold for edge in bm.edges):
            report.error('boat_hull_closed 船壳首尾/厚度存在开放或非流形边')
    finally:
        bm.free()


def _validate_terrain(report: Report) -> None:
    collection = bpy.data.collections.get(TERRAIN)
    if collection is None:
        return
    objects = list(_collection_objects(collection))
    if len(objects) != 1 or objects[0].name != TERRAIN or objects[0].type != "MESH":
        report.error("terrain 集合必须且只能包含一个名为 terrain 的网格")
        return
    obj = objects[0]
    if any(not _close(scale, 1.0) for scale in obj.scale):
        report.error("terrain 必须应用缩放")
    coords = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
    if not coords:
        report.error("terrain 是空网格")
        return
    xmin, xmax = min(v.x for v in coords), max(v.x for v in coords)
    ymin, ymax = min(v.y for v in coords), max(v.y for v in coords)
    if abs(xmin + xmax) > ORIGIN_TOLERANCE_M * 2 or abs(ymin + ymax) > ORIGIN_TOLERANCE_M * 2:
        report.error("terrain 的 XY 范围必须以世界原点为中心")
    if not _close(xmax - xmin, ymax - ymin, ORIGIN_TOLERANCE_M * 2):
        report.error("terrain 的 X/Y 尺寸必须相同")


def validate() -> Report:
    report = Report()
    _validate_scene(report)
    export_collections = _validate_collections(report)
    _validate_terrain(report)

    exported: dict[str, bpy.types.Object] = {}
    for collection in export_collections:
        for obj in _collection_objects(collection):
            exported[obj.name] = obj

    scene_triangles = 0
    for obj in exported.values():
        _validate_name(obj, report)
        _validate_props(obj, report)
        _validate_materials(obj, report)
        _validate_mesh_transform(obj, report)
        _validate_camera(obj, report)
        _validate_closed_hull(obj, report)
        if obj.type == "MESH":
            triangles = _triangle_count(obj)
            scene_triangles += triangles
            if triangles > TRIS_PER_OBJECT:
                report.warn(
                    f"{obj.name} 约 {triangles:,} 三角面，超过单物体建议值 {TRIS_PER_OBJECT:,}"
                )
    if scene_triangles > TRIS_PER_SCENE:
        report.warn(
            f"导出集合合计约 {scene_triangles:,} 三角面，超过场景建议值 {TRIS_PER_SCENE:,}"
        )

    return report


def main() -> None:
    report = validate()
    for warning in report.warnings:
        print(f"[validate] WARNING {warning}")
    for error in report.errors:
        print(f"[validate] ERROR {error}")

    blend_name = bpy.data.filepath or "<未保存文件>"
    if report.errors:
        print(
            f"[validate] 失败：{blend_name}，"
            f"{len(report.errors)} 个错误，{len(report.warnings)} 个警告"
        )
        raise SystemExit(1)
    print(
        f"[validate] 通过：{blend_name}，"
        f"0 个错误，{len(report.warnings)} 个警告"
    )


if __name__ == "__main__":
    main()
