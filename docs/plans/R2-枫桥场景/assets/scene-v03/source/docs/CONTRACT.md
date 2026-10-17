# CONTRACT · Blender ↔ 代码契约

> 版本：v0.2 · 2026-10-06（写实 PBR 与局部质量小样扩展，兼容 v0.1）
>
> 这份文档是 Blender 制作端和 three.js 运行端之间**唯一的约定**。没有它，在 Blender 里改一个物体名，代码就会悄悄失效。
>
> - 本文件取代 `docs/设计文档.md` 第 18、19 章，成为唯一来源；设计文档只保留摘要。
> - 标注 **【P0 验证】** 的条目是初稿中的推定做法，要在 P0 技术验证中实测后才能定稿。
> - 修改规则见第 17 节：涉及数据接口的改动要同时改本文件、校验脚本和受影响的资产。

## v3 产品转向兼容说明（2026-10-01）

2026-10-02 路径整理：前端工程迁 frontend，本文发布路径改为 frontend/public/assets，Node 工具改为 frontend/tools。art 保留根目录，Blender 示例从仓库根运行。只调整工作区位置，不改变 v0.1 的节点、属性、材质、单位、编码或预算。

- 2026-10-01 UI 转向未修改 v0.1 数据接口；2026-10-06 的 v0.2 增量见第18节。旧节点、ink_* 材质和高度图编码继续兼容，不把旧灰模解释成写实资产。
- 本契约决定资产如何交接，不决定网站必须先看书房、纸面隆起或全屏水墨。新版产品体验以 `docs/设计文档.md` v3 和 ADR 0004 为准；下文的书房 / 纸面生长描述及其旧设计章节号属于 v2 接口背景（历史文档见 Git `6bdd81a`）。
- 写实 PBR 输入按第18节实施；程序化地形替换与 study 退役仍是后续提案。局部小样通过不等于完整枫桥场景验收。
- 新的自然环境系统可复用既有高度图、标记与尺度，UI 屏幕空间转场不新增 GLB 属性。需要新相机 / 焦点时仍先登记契约。

---

## 目录

1. 坐标、单位与原点
2. 文件与集合组织
3. 命名规范
4. 标记物体（空物体前缀）
5. 自定义属性 → `userData`
6. 材质槽位
7. 顶点色遮罩
8. UV
9. 植被与实例化
10. 地形高度图
11. 相机
12. 动画
13. 导出参数
14. 预算
15. 处理流程与校验
16. 每个场景必须提供的节点（初稿）
17. 变更规则与记录

---

## 1. 坐标、单位与原点

| 项 | 约定 |
|---|---|
| 单位 | 1 Blender 单位 = 1 米（Scene → Units：Metric，Unit Scale 1.0） |
| 上方向 | Blender +Z → three.js +Y（导出器 `export_yup=True` 自动转换） |
| 正面 | 模型正面在 Blender 里朝 **−Y**，到 three.js 里朝 **+Z** |
| 换算 | Blender `(x, y, z)` → three.js `(x, z, −y)` |
| 原点 | 落地物体的原点放在**底面中心**；悬挂物（灯笼）原点放在挂点 |
| 变换 | 网格物体导出前必须应用缩放（Scale = 1, 1, 1）；旋转可以保留，但**禁止负缩放**（镜像要先应用） |
| 世界原点 | 每个场景的世界原点 = 地形中心，地面高度 0 m 对应高度图的 `heightRange[0]`（见第 10 节） |

三首诗的场景都按真实尺度（米）制作。入境前代码会把整个世界根节点缩到书页大小，入境后再恢复为 1（见设计文档 13.7），**制作端不需要关心这一步**。

---

## 2. 文件与集合组织

### 2.1 源文件

| 文件 | 内容 | 导出到 |
|---|---|---|
| `art/blender/study.blend` | 书房、书封与装帧 | `frontend/public/assets/models/study/` |
| `art/blender/fengqiao.blend` | 枫桥夜泊 | `frontend/public/assets/models/fengqiao/` |
| `art/blender/jiangxue.blend` | 江雪 | `frontend/public/assets/models/jiangxue/` |
| `art/blender/baidicheng.blend` | 早发白帝城 | `frontend/public/assets/models/baidicheng/` |
| `art/blender/props.blend` | 跨场景复用的物件（舟、单株植被…） | `frontend/public/assets/models/common/` |

### 2.2 集合 = 导出单元

- 顶层集合名以 `glb_` 开头的才会被导出，一个集合导出一个 GLB：`glb_<name>` → `<scene>/<name>.glb`。
- 其他集合（参考图、工作区、灯光预览、旧版本）一律不导出。
- 地形放在名为 `terrain` 的集合里，里面只有一个名为 `terrain` 的网格物体。它**不导出 GLB**，只由 `bake_terrain.py` 烘焙成高度图（见第 10 节）。

建议每个场景拆成：

| 集合 | 内容 | 加载时机 |
|---|---|---|
| `glb_main` | 建筑、桥、舟等主体 + 全部标记物体 | 进入场景前 |
| `glb_foliage` | 植被单株 + 实例化 | 可以晚一步 |
| `glb_far` | 远山剪影、城墙远影 | 入境后半段淡入 |

### 2.3 跨场景复用 【P0 验证】

`props.blend` 里的物件导出到 `common/`，只下载一次。场景里要放一个复用物件时，不要复制几何，而是放一个空物体 `PLACE_<资产名>_<序号>`（见第 4 节），由代码在该位置实例化 `common/<资产名>.glb`。

---

## 3. 命名规范

### 3.1 规则

| 对象 | 规则 | 正则 | 例 |
|---|---|---|---|
| 普通物体 | 小写字母开头，小写字母 / 数字 / 下划线 | `^[a-z][a-z0-9_]*$` | `temple_main`、`bell_tower` |
| 标记物体 | 大写前缀 + 下划线 + 小写名 | `^(CAM\|FOCUS\|EMIT\|SFX\|LIGHT\|ANCHOR\|PLACE)_[a-z0-9_]+$` | `CAM_boat`、`FOCUS_bell` |
| 材质 | 槽位名，可带变体后缀 | `^[a-z]+(_[a-z]+)?(__[a-z0-9]+)?$` | `ink_rock`、`ink_rock__cliff` |
| 集合 | 见 2.2 | `^(glb_[a-z0-9_]+\|terrain)$`（导出相关） | `glb_main` |
| 顶点色属性 | 固定名 | `^mask$` | `mask` |

### 3.2 为什么这么严格

- **禁止点号**：Blender 复制物体会自动命名为 `tree.001`，而 three.js 的 GLTFLoader 会清洗节点名（去掉 `.`、`:`、`/`、`[`、`]`，空格换成下划线），`tree.001` 到代码里就变成了 `tree001`，分镜里按原名找不到。
- **禁止中文和空格**：同上，而且跨平台工具链容易出编码问题。
- **同一个 GLB 内名字唯一**：代码用 `getObjectByName` 查找，重名只会拿到第一个。

---

## 4. 标记物体（空物体前缀）

标记物体是给代码看的"钉子"：它们本身不渲染，代码按名字找到它们，读取位置、朝向和自定义属性。

| 前缀 | 类型 | 含义 | 读取内容 |
|---|---|---|---|
| `CAM_` | 相机 | 每句诗的机位 | 位置、朝向、垂直视角（第 11 节） |
| `FOCUS_` | 空物体 | 镜头焦点（Focus 模式飞向这里） | 位置 |
| `EMIT_` | 空物体 | 波纹、粒子的发射点 | 位置、朝向（+Z 轴为发射方向） |
| `SFX_` | 空物体 | 空间声源 | 位置 |
| `LIGHT_` | 空物体 | 灯光位置，灯光本身由代码创建 | 位置 + 属性 `light`（第 5 节） |
| `ANCHOR_` | 空物体 | 代码要挂接东西的位置（如书页中心、峡谷段的出入口） | 位置、朝向 + 属性 |
| `PLACE_` | 空物体 | 放置一个复用物件（2.3） | 位置、朝向、缩放 + 属性 `asset` |

规则：

- 标记物体放在 `glb_main` 集合里，和它服务的场景一起导出。
- 空物体显示类型用 Plain Axes 或 Arrows，便于在 Blender 里看清朝向。
- 标记物体**不要**作为网格的父级；网格可以作为标记物体的子级（例如 `PLACE_` 下挂一个预览用的低模，导出时排除）。
- Blender 灯光不导出（`export_lights=False`），灯光一律用 `LIGHT_` 标记。

---

## 5. 自定义属性 → `userData`

导出时勾选 Custom Properties（`export_extras=True`），物体属性会出现在 three.js 的 `object.userData` 中。前端按属性自动挂行为，不必每个物体写一个 JS 文件。

### 5.1 属性表

| 属性 | 类型 | 取值 | 适用于 | 默认 | 作用 |
|---|---|---|---|---|---|
| `behavior` | string | `"bob"` \| `"sway"` \| `"flicker"` | 网格 | 无 | 由 `systems/behaviors` 自动挂载 |
| `amp` | float | ≥ 0 | 有 `behavior` 的物体 | 行为默认值 | 幅度（bob：米；sway：弧度；flicker：亮度比例） |
| `freq` | float | > 0 | 有 `behavior` 的物体 | 行为默认值 | 频率（Hz） |
| `phase` | float | 0–1 | 有 `behavior` 的物体 | 由名字哈希得出 | 相位，避免一排灯笼同步摆动 |
| `reveal` | float | 0–1 | 网格 | 按集合顺序 | 生长阶段内的出现时刻（设计文档 13.6） |
| `static` | bool | `true` / `false` | 网格 | 无 `behavior` 时为 `true` | 为 `true` 才参与按材质合并 |
| `yuan` | string | `"gao"` \| `"shen"` \| `"ping"` | `CAM_` | 必填 | 三远类型（设计文档 15.3） |
| `light` | string | `"point"` \| `"spot"` | `LIGHT_` | `"point"` | 灯光类型 |
| `color` | string | `"#rrggbb"` | `LIGHT_` | `"#ffb060"` | 灯光颜色 |
| `intensity` | float | ≥ 0 | `LIGHT_` | 1.0 | 相对强度，场景 config 里再乘总亮度 |
| `range` | float | > 0（米） | `LIGHT_` | 10 | 衰减距离 |
| `asset` | string | `common/` 下的 GLB 名 | `PLACE_` | 必填 | 要放置的复用物件 |

### 5.2 规则

- 属性名大小写敏感，只用上表中的名字；拼错的属性会被 `check-contract` 报出来。
- 有 `behavior` 的物体会被自动视为 `static: false`，不参与合并（动起来的东西不能和别人合成一个网格）。
- 行为全部是时间的纯函数，由全局时钟驱动；`phase` 保证同类物体不整齐划一。

---

## 6. 材质槽位

旧 ink_* 材质仍是水墨槽位；新增 pbr_* 材质保留 glTF 的写实输入，禁止替换为丢失贴图的通用材质。程序化节点须先烘焙或转为可导出的图像节点。

### 6.1 槽位表

| 材质名 | 前端替换为 | 典型物体 | 需要顶点色 `mask` |
|---|---|---|---|
| `ink_rock` | 山石：皴法 triplanar + 色阶 | 山体、石岸、绝壁 | G（积墨） |
| `ink_wood` | 木构 | 建筑、桥的木作、船 | G |
| `ink_tile` | 屋瓦 | 屋顶 | G |
| `ink_stone` | 砌石 | 石拱桥、台基、城墙 | G |
| `ink_foliage` | 枝叶 | 枫树、芦苇、树林 | R（风摆）+ G |
| `ink_cloth` | 衣物、帆 | 蓑衣、船篷 | R + G |
| `water` | 水面 | 江面（一般由代码生成，此槽位用于小水面） | — |
| `paper` | 纸 | 书页、宣纸 | — |
| `snow` | 积雪 | 雪岸、屋顶积雪 | G |
| `glow` | 自发光，参与 Bloom | 渔火、灯笼、烛火 | — |

### 6.2 规则

- 材质名必须是第6.1节或第18.1节登记的槽位，允许变体后缀 `__<变体>`（如 `ink_rock__cliff`）；ink 变体参数写在场景 config 里，PBR 变体直接交付 glTF 材质。
- Blender 材质中只有两样东西会被读取：
  - Principled BSDF 的 **Base Color**：作为该物体的"场景色"（墨色之后染上的颜色）；
  - Base Color 上接的**贴图**（可选）：同样作为场景色。
- 其余节点一律忽略。不要在 Blender 里为最终效果调节点，效果以浏览器里为准。
- 一个物体最多 2 个材质槽；每多一个槽，就多一次 draw call。
- 禁止空材质槽。

---

## 7. 顶点色遮罩

顶点色不是颜色，而是给 shader 用的遮罩。

| 通道 | 含义 | 0 | 1 |
|---|---|---|---|
| R | 风吹摆动权重 | 不动（根部、枝干） | 摆动最大（叶尖、蓑衣下摆、灯笼穗） |
| G | AO / 积墨 | 不积墨（受光的凸处） | 墨最重（凹处、接缝、屋檐下） |
| B | 预留 | — | — |
| A | 预留 | — | — |

规则：

- 颜色属性名固定为 **`mask`**，域用 Face Corner 或 Point 均可，类型用 Byte Color。
- 导出时按名字导出：`export_vertex_color='NAME'`、`export_vertex_color_name='mask'`。默认设置 `MATERIAL` 只导出被材质引用的顶点色，而这里的顶点色不会被 Blender 材质引用，会被丢掉。
- 需要 `mask` 的槽位见 6.1；缺失时 `validate.py` 报错。
- G 通道可以在 Blender 里烘焙 AO 到顶点色后再手工加深接缝。

---

## 8. UV

- 使用 `ink_rock`、`ink_stone`、`snow` 的物体**不需要 UV**：皴法笔触以 triplanar 方式按世界坐标投射。
- 其他物体如果 Base Color 接了贴图，需要 UV0。
- UV1 预留，暂不使用。

---

## 9. 植被与实例化

- Blender 里只做**单株**，用 Geometry Nodes 或粒子系统摆放。
- 前端要的是 InstancedMesh：同一株的所有实例只花一次 draw call。
- 两条路，P0 验证后二选一 【P0 验证】：

| 方案 | 做法 | 优点 | 限制 |
|---|---|---|---|
| A. `EXT_mesh_gpu_instancing` | 导出时开 `export_gpu_instances=True`，GLTFLoader 直接还原成 InstancedMesh | 不用写解析代码 | 导出器只对**同一个空物体下的子物体**生效，GN 实例要先实现（Realize）成这种结构 |
| B. 矩阵 JSON | `export_glb.py` 读取实例变换写成 `<scene>/<name>.instances.json`，单株另存一个 GLB | 完全可控，可以在前端再按画质档位抽稀 | 要自己写导出与解析 |

- 单株面数：近景 ≤ 3 000 三角面，远景 ≤ 500。
- 单株原点在根部。

---

## 10. 地形高度图

地形不导出 GLB：书页和地形是同一张网格（设计文档 13.1），只需要高度数据。

### 10.1 文件

| 文件 | 内容 |
|---|---|
| `frontend/public/assets/terrain/<scene>.height.png` | 高度 + 墨迹引导遮罩 |
| `frontend/public/assets/terrain/<scene>.height.json` | 尺寸、高度范围、水位等元数据 |

两者都由 `art/scripts/bake_terrain.py` 从 `terrain` 集合中的 `terrain` 物体烘焙，**不要手工编辑**。

### 10.2 PNG 编码

| 项 | 约定 |
|---|---|
| 尺寸 | 正方形，1024 × 1024（像素中心采样） |
| 格式 | RGB 8 位 PNG，**无 alpha 通道**（有 alpha 时浏览器预乘会破坏数据） |
| R | 16 位高度的高 8 位 |
| G | 16 位高度的低 8 位 |
| B | 墨迹引导遮罩：0 = 保持纸白（江河、留白），255 = 墨优先流向（山体轮廓） |
| 高度公式 | `h16 = round((h − hMin) / (hMax − hMin) × 65535)`，`R = h16 >> 8`，`G = h16 & 255` |
| 方向 | 图片上方 = Blender **+Y** = three.js **−Z**；图片右方 = +X。即 Blender 顶视图（小键盘 7）看到的样子 |
| 色彩管理 | 按原始数据写入，不做 sRGB 转换 |

前端加载时用 `createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })` 解码，在 JS 里一次性还原成浮点纹理。

### 10.3 元数据 JSON

```json
{
  "scene": "fengqiao",
  "resolution": 1024,
  "size": [1500, 1500],
  "heightRange": [-4.0, 180.0],
  "waterLevel": 0.0,
  "bakedFrom": "art/blender/fengqiao.blend",
  "bakedAt": "2026-10-01T12:00:00Z"
}
```

| 字段 | 含义 |
|---|---|
| `size` | 地形在 X、Z 方向的范围（米），以世界原点为中心 |
| `heightRange` | `[hMin, hMax]`（米） |
| `waterLevel` | 水面高度（米），低于此处由水面系统覆盖 |

### 10.4 制作要求

- `terrain` 物体的范围必须正好是 `size`，中心在世界原点。
- 书页边缘一圈（约 5% 宽）由代码压平，这里的地形会看不见，不要在边缘放重要地貌。
- 江河走向在 B 通道里画成 0（留白）：墨不会流进去，江就是纸上的留白。

---

## 11. 相机

- 每句诗的机位直接在 Blender 里用相机构图，命名 `CAM_<名称>`，导出时开 `export_cameras=True`。
- 代码只取：位置、朝向、垂直视角（yfov）。画面宽高比由浏览器窗口决定，所以构图以**垂直方向**为准：相机 Sensor Fit 设为 **Vertical**，在 16:9 下构图，关键内容放在中间 4:3 区域内（保证窄屏也不丢）。
- 每个 `CAM_` 必须带属性 `yuan`（5.1）。
- 相机的裁剪距离（clip start/end）不导出，由代码按离地高度动态设置（设计文档 13.7）。
- 相机不要有滚转（Roll ≈ 0），这是防晕规则（设计文档 15.4）。`validate.py` 检查 |roll| < 1°。

---

## 12. 动画

- 首选**代码动画**：摆动、漂浮、闪烁都用 `behavior`（第 5 节），不在 Blender 里 K 帧。
- 确实需要 Blender 关键帧的（如蓑笠翁收竿、乌鸦扇翅），Action 命名 `<物体名>__<动作名>`，例如 `crow__flap`。
- 导出后由全局时钟驱动（`mixer.setTime(t)`），不自由播放，保证可跳转、可复现。
- 帧率统一 30 fps；循环动画首尾帧一致。

---

## 13. 导出参数

`art/scripts/export_glb.py` 统一调用 `bpy.ops.export_scene.gltf`，参数写死在脚本里，**不要在 Blender 界面里手动导出**。参数名已在 Blender 5.1.1 中核对。

| 参数 | 值 | 说明 |
|---|---|---|
| `export_format` | `'GLB'` | |
| `collection` | `'glb_<name>'` | 按集合导出（第 2.2 节） |
| `export_yup` | `True` | Z-up → Y-up |
| `export_apply` | `True` | 应用修改器 |
| `export_extras` | `True` | 自定义属性 → `userData` |
| `export_cameras` | `True` | 导出 `CAM_` |
| `export_lights` | `False` | 灯光用 `LIGHT_` 标记 |
| `export_materials` | `'EXPORT'` | 保留材质名及 metallic-roughness PBR、Normal、AO、Emissive |
| `export_vertex_color` | `'NAME'` | 按名字导出顶点色 |
| `export_vertex_color_name` | `'mask'` | |
| `export_texcoords` | `True` | |
| `export_normals` | `True` | |
| `export_animations` | 仅在有 Action 时 `True` | |
| `export_gpu_instances` | 方案 A 时 `True` | 第 9 节 |
| `export_draco_mesh_compression_enable` | `False` | 压缩统一交给 `optimize-assets.mjs`（Meshopt） |
| `export_image_format` | `'AUTO'` | 转码统一交给 `optimize-assets.mjs` |

命令：

```bash
blender -b art/blender/fengqiao.blend --python art/scripts/export_glb.py -- --out frontend/public/assets/models/fengqiao
```

---

## 14. 预算

| 项 | 上限 | 检查 |
|---|---|---|
| 每个场景的全部 GLB（压缩后） | ≤ 15 MB | `check-budget` |
| 单张贴图 | ≤ 2048 × 2048 | `check-budget` |
| 每个场景 draw call | < 500 | 运行时 `Debug.ts` 统计 |
| 每个场景三角面（建议） | ≤ 1 M | `validate.py` |
| 单个近景物体三角面（建议） | ≤ 50 k | `validate.py` |
| 每个场景音频（建议） | ≤ 5 MB | `check-budget` |
| 字体子集合计（建议） | ≤ 1 MB | `check-budget` |

- 静态物体（`static: true`）导出后按材质合并。
- 不要"一物一文件、不合并网格"：参考仓库 sakura 就是这样被 draw call（约 10 µs 一次）拖到了 20 fps 左右。
- 面数不是主要瓶颈（设计文档 24.1），超出建议值可以商量，超出上限不行。

---

## 15. 处理流程与校验

### 15.1 流程

```text
art/blender/<scene>.blend
  ← art/scripts/build_*.py         （可选）程序化生成寺庙、桥、舟
↓ art/scripts/validate.py          Blender 端检查（15.2），不通过则停止
↓ art/scripts/export_glb.py        按集合导出 GLB（第 13 节）
↓ art/scripts/bake_terrain.py      地形 → height.png + height.json（第 10 节）
↓ frontend/tools/optimize-assets.mjs        gltf-transform：合并静态网格、Meshopt 压缩、贴图缩到 ≤ 2K 并转 WebP、去重、裁剪
↓ frontend/public/assets/models/<scene>/
↓ frontend/tools/check-contract.mjs         契约检查（15.3）
↓ frontend/tools/check-budget.mjs           预算检查（第 14 节）
↓ 前端加载
```

### 15.2 `validate.py`（Blender 端）

- 物体、材质、集合、顶点色属性名符合第 3 节正则；无点号、无重名。
- 网格缩放已应用，无负缩放。
- 落地物体原点在底面中心：局部包围盒最低点 z ≈ 0（容差 1 cm）。
- 无空材质槽；材质名都在槽位表里；每个物体 ≤ 2 个材质槽。
- 使用 `ink_foliage` / `ink_cloth` 的物体有 `mask` 属性。
- `CAM_` 有 `yuan` 属性，|roll| < 1°；`PLACE_` 有 `asset` 属性。
- 三角面数在预算内。
- `terrain` 物体范围与中心符合 10.4。

### 15.3 `check-contract.mjs`（运行端）

- 每个场景 `timeline.ts` 里引用的 `shot`、`focus`、`from` 所指节点都存在于该场景的 GLB 中。
- 第 16 节列出的必需节点都存在。
- `userData` 中只出现第 5 节定义的属性，取值合法。
- ink 材质名能在 `applyMaterials` 中找到替换；第18.1节 PBR 由 `applyPbrMaterials` 保留 glTF 材质输入。
- `PLACE_` 引用的 `common/<asset>.glb` 存在。
- 每个场景都有 `terrain/<scene>.height.png` 和 `.height.json`，且 PNG 尺寸与 JSON 一致。

---

## 16. 每个场景必须提供的节点（初稿）

> 随 `docs/STORYBOARD.md` 定稿更新；分镜里新增引用时，先在这里登记。

### 16.1 study（书房）

| 节点 | 类型 | 用途 |
|---|---|---|
| `CAM_intro` | 相机 | 开场：烛火亮起时的远景 |
| `CAM_desk` | 相机 | 推近书案 |
| `CAM_book` | 相机 | 俯视打开的书，转场起点 |
| `ANCHOR_page` | 空物体 | 书页中心；局部 +X = 书页宽度方向。属性 `width`、`height`（米） |
| `FOCUS_book` | 空物体 | 书 |
| `LIGHT_candle` | 空物体 | 烛火 |
| `LIGHT_moon_window` | 空物体 | 窗外月光方向 |
| `SFX_candle` | 空物体 | 烛芯声 |
| `book_cover` | 网格 | 书封与装帧（书页由代码生成） |

### 16.2 fengqiao（枫桥夜泊）

| 节点 | 类型 | 用途 |
|---|---|---|
| `CAM_enter` | 相机 | 入境终点（`yuan: "ping"`） |
| `CAM_moonset` | 相机 | 第一句：远眺西山 |
| `CAM_riverbank` | 相机 | 第二句：沿江岸 |
| `CAM_temple` | 相机 | 第三句：穿雾见寺 |
| `CAM_boat` | 相机 | 第四句：客船上，面向寺庙 |
| `FOCUS_temple` / `FOCUS_bell` / `FOCUS_boat` | 空物体 | 焦点 |
| `EMIT_bell` | 空物体 | 钟声波纹圆心（寺前江面上） |
| `SFX_bell` / `SFX_crow` / `SFX_boat` | 空物体 | 声源 |
| `LIGHT_fishfire_01…` | 空物体 | 渔火（配合 `glow` 材质和 `flicker` 行为） |
| `boat_guest` | 网格 | 客船（`behavior: "bob"`） |

约束：`EMIT_bell` 到 `boat_guest` 的水平距离决定钟声延迟（距离 ÷ 340 m/s）。早期分镜提案采用约950m（≈2.8s）；当前scene-v03复用已选紧凑桥寺布局，24秒时实际距离约23m（≈0.07s），不伪造950m延迟。对应`scenes/fengqiao/timeline.ts`在24秒发声，抵达时间按动态节点距离计算；后续改布局须同步复验第四句时间窗。

### 16.3 jiangxue（江雪）

| 节点 | 类型 | 用途 |
|---|---|---|
| `CAM_enter` | 相机 | 入境终点 |
| `CAM_birds` / `CAM_path` / `CAM_fog` / `CAM_boat` | 相机 | 四句机位（均 `yuan: "ping"`） |
| `FOCUS_boat` / `FOCUS_fisherman` | 空物体 | 焦点 |
| `SFX_line` | 空物体 | 钓线声 |
| `PLACE_boat_01` | 空物体 | 复用 `common/boat.glb` |

### 16.4 baidicheng（早发白帝城）

| 节点 | 类型 | 用途 |
|---|---|---|
| `CAM_enter` | 相机 | 入境终点 |
| `CAM_city` | 相机 | 第一句：仰视绝壁（`yuan: "gao"`） |
| `CAM_follow` | 相机 | 第二句：跟随轻舟 |
| `CAM_gorge` | 相机 | 第三句：峡谷纵深（`yuan: "shen"`） |
| `CAM_exit` | 相机 | 第四句：出峡（`yuan: "ping"`） |
| `FOCUS_city` / `FOCUS_boat` | 空物体 | 焦点 |
| `SFX_ape_left` / `SFX_ape_right` | 空物体 | 两岸猿啼 |
| `ANCHOR_seg_in` / `ANCHOR_seg_out` | 空物体 | 每个峡谷段 GLB 的入口和出口，`canyon.ts` 按它们首尾相接 【P0 验证】 |

---

## 17. 变更规则与记录

### 17.1 规则

1. 改契约先改本文件，再改 `validate.py` / `check-contract.mjs`，最后改资产和代码，同一次提交完成。
2. 新增前缀、属性、材质槽位，必须同时更新第 3–6 节的表格和校验脚本。
3. 改名是破坏性变更：在变更记录里写明旧名 → 新名。
4. 标注【P0 验证】的条目，P0 结束时逐条定稿或删除。

### 17.2 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.1 | 2026-09-27 | 初稿：由设计文档第 18、19 章展开；新增 `ANCHOR_`、`PLACE_` 前缀，高度图 `.height.json` 元数据，顶点色按名字导出，各场景必需节点清单 |
| v0.2 | 2026-10-06 | 增加写实材质、PBR/UV/遮罩规则与 quality-sample 清单；旧资产兼容。制作校验、导出、Node 门禁与浏览器加载同步实现 |
| v0.2 兼容扩展 | 2026-10-07 | 增加 pbr_skin、船夫 skin/骨骼/桨挂点与独占 Skeleton 释放约定；小样另存 v02，v01 源和导出保留 |
| v0.2 站姿扩展 | 2026-10-07 | v03 增加掌内接触点、双腿/甲板锚点、等长牵绳及持续浸没的摇橹约束；同步清单、结构校验与运行端，v01/v02保留 |
| v0.2 舟壳扩展 | 2026-10-07 | v04 增加连续厚船壳及首尾封板，支点改为侧舷；清单增加 boat_hull_closed，同步制作/GLB封闭性与实际活动桨穿壳检查，v01–v03保留 |

## 18. v0.2 写实交接与局部质量小样

### 18.1 材质及数据

新增槽位 `pbr_rock`、`pbr_stone`、`pbr_wood`、`pbr_tile`、`pbr_foliage`、`pbr_cloth`、`pbr_metal`、`pbr_skin`，允许 `__变体`，仍最多两槽/物体。foliage/cloth 需要 mask，其余可有遮罩。`pbr_skin` 用于人物皮肤/毛发细节，金属度为0，当前远景人物不要求次表面散射。`glow` 保留真实 Emissive。标准材质由 GLTFLoader 保留，不改写其颜色空间或丢弃任何 PBR 贴图。

- Base Color / Emissive：sRGB；法线 / ORM / AO：非色彩。ORM 的 R=AO、G=Roughness、B=Metallic；切线法线 +Y。
- 摄影 Base Color 可发布为 JPEG；法线/ORM 保持 PNG 等无损数据编码。源 PNG 保留在 art，导出切线用于法线贴图交接。
- 无损优化候选允许 `EXT_texture_webp`：只对8位PNG逐像素核验后转无损WebP，Normal/ORM/遮罩图禁止near-lossless或有损转码；JPEG保持原编码。无PNG回退时扩展必须同时列入used/required。优化保留全部非图像bufferView原字节、节点/层级/属性、accessor、材质输入、相机和skin；尺寸、通道、浏览器固定帧及既有舟约束通过后才替换候选清单，历史GLB不覆盖。
- 有 Base Color 贴图的 PBR 材质必须同时提供 Normal 和 Roughness 输入、UV0、导出的顶点法线；程序化节点不算有效输入。AO 可选，同 UV0；不用 UV1 代替未登记的 UV。
- scene-v01 允许无损 EXT_meshopt_compression：锁定 Meshopt 编码 v0，只用 ATTRIBUTES / INDICES 与 filter=NONE，不量化、不重排索引、不简化。无回退字节时必须同时声明 used/required 和 fallback 占位缓冲；优化器用锁定 Three.js 0.186.1 的解码器逐 bufferView 核对原字节，并检查节点、accessor、材质、相机、skin 不变。契约工具先解码再检查几何，预算仍按实际分发字节计算；历史原始 GLB 保留。
- 不带贴图的金属小件等可用常量 PBR。石/木/瓦金属度为0；湿石粗糙度通过独立纹理/变体表达，不在 Base Color 烘入大片阴影。
- `mask` 仍是行为数据，导出 COLOR_0；加载 PBR 时转存为 `behaviorMask` 属性并关闭 `vertexColors`，防止黑色/红色权重污染表面。0/0.5/1 权重允许8位存储量化误差（±0.01），禁止优化改变语义。校准节点 `mask_probe` 只用于交接验证，运行时隐藏。
- 舟壳子件的原点仍为底面中心；允许普通 EMPTY 根节点 `boat_guest` 携带 bob 及静态属性，子网格以其局部坐标装配。轻摆根节点位于浮动中心，灯火/声音挂点随其移动。第5节 behavior 的适用对象增加普通 EMPTY；标记前缀语义不变。

### 18.2 清单及范围

清单位于 `frontend/public/assets/scenes/fengqiao.sample.json`，路径相对 `assets/`。必填：`contractVersion: "0.2"`、`scene: "fengqiao"`、`scope: "quality-sample"`、`model`（GLB）、`requiredNodes`（唯一名字列表）、`waterLevel`（米）。不支持版本、非法路径、缺文件/节点须明确失败；小样不得冒充正式场景。

可选 `environment` 为 `environments/*.rgba16f.gz` 相对路径：项目原创夜空的预滤波 CubeUV，16字节小端头依次为 ASCII `PRUV`、uint32版本1、宽、高；随后为自底向上的 RGBA16F 半浮点数据，无损 gzip。线性 sRGB、CubeUVReflectionMapping、LinearFilter、无自动 mipmap，尺寸/数据长度必须匹配且单边≤2K；原始预滤波与浏览器恢复效果需对照。声明但缺失/损坏须明确加载失败；未声明的历史小样继续程序生成。分发预算额外计入压缩文件，解码纹理计入显存估计，独占实例退出释放；不包含第三方 HDRI。

小样制作源 `art/blender/fengqiao-sample-v01.blend`，集合 `glb_sample_v01`，发布 `models/fengqiao/sample_v01.glb`。必需节点：`boat_guest`、`CAM_enter`、`CAM_riverbank`、`CAM_boat`、`FOCUS_boat`、`LIGHT_fishfire_01`、`SFX_boat`、`mask_probe`。相机和标记沿用既有规范。小样不要求完整枫桥第16.2节节点和高度图；完整场景验收仍须补齐它们。

划桨修订另存 `fengqiao-sample-v02.blend` / `glb_sample_v02` / `sample_v02.glb`，保留v01。清单指向当前修订，并增加 `rower_rig`、`rower_spine`、`rower_head`、左右 `rower_upper_*` / `rower_fore_*` / `rower_hand_*`、`oar_pivot`、`ANCHOR_oar_hand_left/right`、`ANCHOR_oar_blade`。人物交付glTF skin（JOINTS_0、WEIGHTS_0、inverseBindMatrices）；骨骼名沿用普通节点正则。骨架/桨及人物网格 `static: false`，不合并进舟壳。桨支点是普通EMPTY，网格子件原点仍遵循底面中心，双手挂点是桨子级。前端划桨系统使用全局时钟确定桨姿态，再做双臂IK，使手掌与挂点保持重合；减少动态时固定姿态。释放独占人物实例时同时释放唯一Skeleton及其骨骼纹理。

站姿摇橹修订另存 `fengqiao-sample-v03.blend` / `glb_sample_v03` / `sample_v03.glb`，保留v01/v02。增加左右 `rower_thigh_*`、`rower_shin_*`、`rower_foot_*` 与 `rower_root`；手指骨骼允许符合普通节点命名的细分骨链。`ANCHOR_rower_palm_left/right` 为手骨子级，定义掌内与橹柄接触的点，腕骨原点不必与橹柄重合；`ANCHOR_rower_foot_left/right` 为舟子级，固定脚踝支撑位置。橹上的 `ANCHOR_oar_tether` 与舟上的 `ANCHOR_boat_tether` 定义等长牵绳。清单 requiredNodes 明确列出当前修订需要的锚点，缺失必须失败。运行端依全局t求橹横扫、扭转及等长绳约束，再解双臂和双腿IK；脚部固定在舟坐标，橹叶连续浸没（摇橹不使用普通桨的出水回程门禁）。掌骨挂点误差≤1cm、实际蒙皮掌部中心至柄挂点≤4cm、脚部误差≤1cm、绳长误差≤1mm；runtime牵绳几何独占并释放。模型和纹理许可需独立登记，不将工具程序许可当资产许可。

侧舷修订另存 `fengqiao-sample-v04.blend` / `glb_sample_v04` / `sample_v04.glb`，保留v01–v03。增加必需节点 `boat_hull_closed`：真实连续底/侧面、首尾封板及厚度，父级为 `boat_guest`，不绑定人物 skin；顶部乘员舱保持开放。制作网格不得有非流形边；GLB 在1e-5米位置容差焊接 UV/法线分裂顶点后，每条三角边恰好属于两面。`oar_pivot` 位于侧舷上方，工作桨从船侧伸入水，不跨船尾。桨叶轴从实际挂点取得，不能沿用船尾方向常量。活动 `rowing_oar_shaft` / `rowing_oar_handle` / `rowing_oar_blade` 必須保持整个循环无船壳穿模：至少97个运行时姿态与交付 GLB 三角形重放检查，加连续录像/首尾与侧面目视检查。固定支撑榫、绑扎和牵绳允许设计接触；离散采样不等于连续碰撞证明。继续遵守原掌部/脚部/绳长/浸没门禁。

水面/天空/灯光由运行端系统装配，Blender 预览用物体放在非 glb_ 集合，不导出。新增场景自定义属性 `contractVersion` 仅用于制作记录，不引入未登记的网格属性。

桥寺与自然组件候选清单为scenes/fengqiao.scene-v01.json，仍声明quality-sample，不替代正式地形/演出验收；模型另存scene_v01.glb，源为art/blender/fengqiao-scene-v01.blend。保留v04舟节点与约束，增加第16.2节五机位和钟声挂点；建模复查增加CAM_bridge / CAM_bell / CAM_nature及FOCUS_bridge / FOCUS_bell / FOCUS_nature，以及FOCUS_enter / FOCUS_moonset / FOCUS_riverbank。机位仍遵守第11节。组件参数与日志只存源场景记录及证据，不新增网格属性。

舟航行兼容扩展（2026-10-08）：候选清单可带`boatNavigation`，包含glTF世界水平坐标米制`path: [x,z][]`（至少3个不同点、首点对应`boat_guest`制作位置）、正数`speed`（m/s）与`brakingDistance`（m）。舟的船首为局部+X，船尾为橹与船夫所在负X端；路径沿河中线朝桥前行，末端须为安全泊位。运行系统按全局t重建弧长位置、切线朝向及当前位置水面起伏，临泊位平滑减速，不倒行或跳回；减少动态固定t=0。人物、橹、声光和江面舟壳裁剪跟随同一舟根变换；CAM_boat/CAM_rower近景按制作机位相对舟的变换跟随，环境机位固定。无此字段的历史小样沿用原地轻摆。该扩展只增加运行清单与运动，不改变历史GLB/Blender几何。

近远层级兼容扩展：scene-v02另存`art/blender/fengqiao-scene-v02.blend`、`glb_scene_v02`及`models/fengqiao/scene_v02.glb`，保留scene-v01。清单可增加`distanceLods: [{near, far, distance}]`；名字必须唯一、存在、列入requiredNodes，near/far为互不包含的网格根，distance为正数米。首批对应temple_main/temple_far、bell_tower/bell_far、bridge_main/bridge_far、maple_grove/maple_far、reed_bed/reed_far。近远共享世界变换、PBR材质语义与风动属性，远景是制作端明确简化的几何，不称无损；随后WebP/Meshopt编码仍须相对该修订的原始GLB逐字节/像素核验。主相机到近景静态包围盒中心的距离决定唯一可见层，所有pass共用，不随倒影相机切换；无历史状态，减少动态保留手动近远观察，隐藏层仍纳入分发预算与释放验证。

### 18.3 门禁

scene-v01 的自然组件增加 shore_root / maple_grove / reed_bed，枫枝、枫叶、芦苇三个网格携带已登记的 sway / amp / freq / phase / static 属性及 COLOR_0。运行端以 behaviorMask 的 R 权重固定根部，同一全局时钟和同一顶点位移函数用于主画面、倒影与阴影；减少动态固定风时钟。近景枫树和芦苇原型通过分段检查后才散布、合并，不代表远景 LOD、正式高度图或全场演出已验收。

导出前自动执行 Blender validate；PBR 增加节点连接/图像/UV/颜色空间检查。Node `check-contract` 实际读取清单与 GLB，检查版本、命名、槽位、节点、法线/UV/遮罩与 PBR 通道；坏资产非零退出。`check-budget` 统计 GLB 字节、三角面、材质批次、嵌入贴图尺寸与估计解码内存；单图≤2K、GLB≤15MB，局部小样工作目标≤200k三角面。实际多 pass calls、反射、阴影和50fps仍由真实浏览器测量，不用静态统计替代。

### 18.4 完整夜景交接

新增`scope: "full-scene"`清单，保留原quality-sample行为。完整清单必须包含第16.2节全部节点及已选舟/人物/LOD约束，并声明`terrain`为本地高度图名称（小写字母、数字及连字符）；读取`terrain/<名称>.height.png/.json`，仍遵守第10节RGB8、RG16高度、B引导、1024²及米制范围。可以复用已烘焙的枫桥远景高度图，源与元数据如实保留；近岸/桥拱继续用原GLB。运行远景在主体周围留出局部几何区域，不能用远景高度场盖住近景。

首个完整夜景清单`scenes/fengqiao.scene-v03.json`复用scene-v02模型及其原始挂点/近远层级；月面、天空、高度薄雾与声音由systems/shaders生成，不新增GLB属性。月亮在0–32秒落下，结束后保持；灯光方向与月面同步。高度雾同时接主画面、反射与水面，不替换风动/蒙皮编译回调。音频为明确登记的原创合成风、水、乌啼与钟声，支持用户手势解锁、分轨、暂停/seek/静音/退出，声音拒绝不阻挡导航。

模型与预滤波环境继续执行原15,000,000B门禁；高度图、元数据与音频另行计入完整分发总量和解码内存，并按第14节独立上限检查，不隐去额外资源。正式产品复用同一准备好的Canvas完成火烧揭幕；返回冻结当前帧，只捕获一次供所有翻页条带使用。首版复用现有机位点句切换，复杂自动四句运镜暂缓，不能把手动选句宣称为完整自动分镜。
