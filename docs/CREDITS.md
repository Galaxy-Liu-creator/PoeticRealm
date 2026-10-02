# CREDITS · 来源与许可登记

> 规则（设计文档第 26 章）：**未在本文件登记来源和许可的素材，不得进入 `public/`**。R1 经用户授权用于本地还原的预览素材另列下方；预览授权不推断为对外发布许可。
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
| 本机华文行楷 / 楷体回退 | 浏览器 CSS 字体回退 | 仅引用已安装字体，不拷贝或分发字体文件 | 全站标题、正文、诗文、表单与控件 | 字形随设备变化；正式发布仍需补授权行书字体 |

## 数据

| 名称 | 来源 | 许可 | 用途 | 备注 |
|---|---|---|---|---|
| 三首唐诗原文 | 《枫桥夜泊》《江雪》《早发白帝城》原诗 | 古典原文 | 四列 DOM 诗文 | 译文、简注为本项目释义，不复制现代出版译本 |

## R1 本地 UI 预览素材

2026-10-01 用户授权代码还原。以下原图通过源码 URL 引用与 CSS 无文字区域裁切用于本地开发，原文件不改写、不搬入 public；Vite 构建会将被引用的原图打入 dist，**该预览构建不可直接对外发布**。生成工具条款、用户图发布权和比赛 AI 声明仍待核实。

| 来源 | 本地用途 | 许可状态 |
|---|---|---|
| v09 S01 主页用户原图 | 三卡封面、首页背景提取来源 | 用户指定本地还原；对外发布待核实 |
| v09 S05 收藏用户原图 | 归档视觉参考；运行背景与总览共用 | 同上 |
| v07 S06 个人中心用户原图 | 无文字题头、示例默认插画头像 | 同上，不自动上传头像 |
| v07 S11 登录用户原图 | 体验插画、输入图标与绢纸角纹的无文字局部 | 同上 |
| v07 S12 注册用户原图 | 生日输入的日历图标 | 同上 |
| image_gen · account-landscape-v1 / account-paper-v1 | 完整无文字山水与独立空白绢纸纹理 | 用户原图衍生，本地预览；对外发布许可与比赛 AI 声明待核实 |
| image_gen · home-background-v1 | v09 首页原图提取的全幅无文字背景；总览、收藏与个人中心共用纸纹、竹叶与底部船景，首页另用顶部山水；原卡片遮挡处生成补绘 | 用户原图衍生，本地预览；原图未覆盖，对外发布待核实 |
| v07 S13 幕布用户原图 | 两侧无文字帘布作为独立幕幅 | 同上；文字按钮由 DOM 实现 |
| v03 三诗概念 JPEG、v02 overview-landscape | 静态诗文页与低对比山水底景 | 既有 Stitch 概念素材，仅开发预览，正式许可待核实 |

截图证据在 docs/plans/R1-UI还原/assets，来源是本地 Chromium 实际页面；不标为新的 Stitch 输出或真实三维渲染。代码没有外部素材请求、字体下载或账号数据上传。

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
| 用户供个人中心、登录、注册、幕布入口四张 PNG | 2026-10-01 本次对话附件；作者、制作工具和发布许可未提供 | 原样保存于 [v07/references](design/2026-10-01-v3/v07/README.md)，作为用户指定还原基准；原附件与副本 SHA-256 一致，不推断为 Stitch/本轮 AI 输出，不直接发布 |

详见 [设计参考记录](design/2026-10-01-v3/references.md)。用户参考原图仅归档 docs/design；没有新增图片或字体进入 public。Stitch 与本轮 image_gen 生成图单列于下方。具体字体许可尚未核验，不把“候选”写成“可发布”。

## AI 生成声明

2026-10-01 最新用户供主页与收藏页两张 PNG 原样保存于 [v09](design/2026-10-01-v3/v09/README.md)，作为用户指定视觉基准。与附件逐字节一致；作者、制作工具与发布许可未提供，不登记为本轮 Stitch/image_gen 输出，不进入 public。

按比赛规则补充；实际生成后保留工具、模型、提示词、任务标识、原始文件及人工修改，生成内容不自动等于 CC0。

| 日期 | 工具 / 用途 | 状态 | 记录 |
|---|---|---|---|
| 2026-10-01 | Stitch · S01 首页 v01 / v02 | 已生成并下载；私有项目 `11329297360365535924`；请求模型 `GEMINI_3_8_FLASH`；输出条款 / 比赛 AI 声明待核实，仅设计参考，不得直接发布 | [生成记录](design/2026-10-01-v3/generation-log.md)、[v02 原图](design/2026-10-01-v3/v02/screens/S01-home-desktop.png) |
| 2026-10-01 | Stitch · 三诗封面与总览背景概念图 | 同一修订任务返回四张 JPEG，1376×768；AI 意象非摄影实录 / 历史复原；未批准进入 public | [素材说明](design/2026-10-01-v3/v02/assets/README.md)、[来源清单](design/2026-10-01-v3/v02/stitch-manifest.json) |
| 2026-10-01 | Stitch MCP · v03–v06 桌面续稿与转场原稿 | 沿用用户认可风格；同一私有项目；请求模型 GEMINI_3_8_FLASH；原始 PNG、HTML、请求与 manifest 保留；后续页面与修订稿待审批 | [桌面设计入口](design/README.md)、[实际生成记录](design/2026-10-01-v3/generation-log.md)、[v03 概念素材](design/2026-10-01-v3/v03/assets/README.md) |
| 2026-10-01 | Stitch 源稿 · 本地浏览器资源校验预览 | v05 分镜源稿复制后修复本地封面引用、未生效尺寸类与百分比标注，由 Chromium 导出；原图未覆盖，不标为新的 Stitch 出图或已实现动画 | [预览目录](design/2026-10-01-v3/v06/previews/README.md) |
| 2026-10-01 | 内置 image_gen · v07 S01 总览与 S04 白帝城图片编辑 | 基于旧 PNG 编辑；S01 两轮、S04 一轮，输出原始 PNG 与完整提示词保存；未提供模型名或服务任务 id，不猜测；仅设计待复审，未进 public | [v07 说明](design/2026-10-01-v3/v07/README.md)、[manifest](design/2026-10-01-v3/v07/manifest.json)、[实际生成记录](design/2026-10-01-v3/generation-log.md) |
| 2026-10-01 | 内置 image_gen · v08 S01 下区背景减法编辑 | 以 v07 S01 PNG 编辑；角落竹叶与简洁云雾替代山河楼阁，原始输出及完整提示词保存；模型与服务任务 id 未提供；仅设计待复审，未进 public | [v08 说明](design/2026-10-01-v3/v08/README.md)、[manifest](design/2026-10-01-v3/v08/manifest.json) |
| 2026-10-02 | 内置 image_gen · 登录山水去文字与绢纸提取 | 基于用户 S11 原图两次编辑；未改变原图文件；用作本地运行素材，未进 public；具体模型与服务任务 id 未提供 | [素材、完整提示词及用途](design/2026-10-01-v3/runtime-assets/README.md) |
| 2026-10-02 | 内置 image_gen · v09 首页完整背景提取 | 基于用户 S01 原图移除文字及卡片，保留可见背景并补绘遮挡区；原图未覆盖，未进 public；具体模型与服务任务 id 未提供 | [素材、完整提示词及原始输出](design/2026-10-01-v3/runtime-assets/README.md) |

未审批的生成稿只存 `docs/design/`；未实际产生的图不得填写作者、许可或任务 id。
