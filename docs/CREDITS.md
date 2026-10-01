# CREDITS · 来源与许可登记

> 规则（设计文档第 26 章）：**未在本文件登记来源和许可的素材，不得进入 `public/`**。第三方库、字体、音频、模型、贴图、数据、参考图都要登记。
> 古曲公版 ≠ 录音公版；古画公版 ≠ 博物馆高清图可随意使用（只作定调参考，不直接做贴图）。

---

## 第三方库

| 名称 | 版本 | 来源 | 许可 | 用途 | 备注 |
|---|---|---|---|---|---|
| three.js | 0.186.1 | https://github.com/mrdoob/three.js | MIT | 渲染 | 含 GLTFLoader、EffectComposer、MeshSurfaceSampler 等 examples 模块；Meshopt 解码器（MIT，zeux/meshoptimizer）随 three 分发 |
| GSAP | 3.15.0 | https://gsap.com | GSAP Standard "No Charge" License | 分镜动画编排 | 2024 年起全部插件免费，允许商用；许可禁止用于与 Webflow 竞争的产品，本项目不涉及 |
| lil-gui | 0.21.0 | https://github.com/georgealways/lil-gui | MIT | `?debug` 参数面板 | 仅调试模式动态加载 |

## 字体

| 名称 | 来源 | 许可 | 用途 | 备注 |
|---|---|---|---|---|

## 数据

| 名称 | 来源 | 许可 | 用途 | 备注 |
|---|---|---|---|---|

## 模型与贴图

| 名称 | 来源 | 作者 | 许可 | 用途 | 备注 |
|---|---|---|---|---|---|

## 音频

| 名称 | 来源 | 作者 / 演奏者 | 许可 | 用途 | 备注 |
|---|---|---|---|---|---|

## 参考（不进入 `public/`）

| 名称 | 来源 | 用途 |
|---|---|---|
| The Met Open Access | https://www.metmuseum.org/zh/hubs/open-access | 2026-10-01 用浏览器核查 CC0 开放图像政策；逐作品核实，不代表馆藏所有图像均可用 |
| The Met 中国山水开放图像检索 | https://www.metmuseum.org/art/collection/search?q=landscape&geolocation=China&showOnly=openAccess | 新首页山水背景候选入口；未下载或选定正式背景 |
| Huang Yue · River and landscape（1825） | https://www.metmuseum.org/art/collection/search/931206 | 2026-10-01 作品页核查有 Public Domain 标记；仅作横向山水层次参考，未下载，不用其建筑作为唐风考据 |

详见 [设计参考记录](design/2026-10-01-v3/references.md)。当前未引入外部参考图片或字体发布文件；后续 Stitch 生成图单列于下方。具体字体许可尚未核验，不把“候选”写成“可发布”。

## AI 生成声明

按比赛规则补充；实际生成后保留工具、模型、提示词、任务标识、原始文件及人工修改，生成内容不自动等于 CC0。

| 日期 | 工具 / 用途 | 状态 | 记录 |
|---|---|---|---|
| 2026-10-01 | Stitch · S01 首页 v01 / v02 | 已生成并下载；私有项目 `11329297360365535924`；请求模型 `GEMINI_3_8_FLASH`；输出条款 / 比赛 AI 声明待核实，仅设计参考，不得直接发布 | [生成记录](design/2026-10-01-v3/generation-log.md)、[v02 原图](design/2026-10-01-v3/v02/screens/S01-home-desktop.png) |
| 2026-10-01 | Stitch · 三诗封面与总览背景概念图 | 同一修订任务返回四张 JPEG，1376×768；AI 意象非摄影实录 / 历史复原；未批准进入 public | [素材说明](design/2026-10-01-v3/v02/assets/README.md)、[来源清单](design/2026-10-01-v3/v02/stitch-manifest.json) |
| 2026-10-01 | Stitch MCP · v03–v06 桌面续稿与转场原稿 | 沿用用户认可风格；同一私有项目；请求模型 GEMINI_3_8_FLASH；原始 PNG、HTML、请求与 manifest 保留；后续页面与修订稿待审批 | [桌面设计入口](design/README.md)、[实际生成记录](design/2026-10-01-v3/generation-log.md)、[v03 概念素材](design/2026-10-01-v3/v03/assets/README.md) |
| 2026-10-01 | Stitch 源稿 · 本地浏览器资源校验预览 | v05 分镜源稿复制后修复本地封面引用、未生效尺寸类与百分比标注，由 Chromium 导出；原图未覆盖，不标为新的 Stitch 出图或已实现动画 | [预览目录](design/2026-10-01-v3/v06/previews/README.md) |

未审批的生成稿只存 `docs/design/`；未实际产生的图不得填写作者、许可或任务 id。
