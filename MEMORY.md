# MEMORY · 工作进度

> 项目的工作记忆：当前状态、做过什么、定了什么、还没定什么、下一步做什么。
>
> - 每次工作结束后更新"当前状态"和"进度记录"（最新在上）。
> - 这里只记进度和决定；设计内容以 `docs/设计文档.md` 为准，资产规则以 `docs/CONTRACT.md` 为准。

---

## 当前状态（2026-09-28）

| 项 | 状态 |
|---|---|
| 阶段 | **P0 技术验证进行中**（9/28–10/3），分支 `p0-tech-validation` |
| 截止日期 | **2026-10-23**；排期见 `docs/plans/ROADMAP.md` |
| 执行计划 | `docs/plans/`：索引、路线图、P0 任务级计划、ADR 0001–0003 |
| 设计文档 | v2（`docs/设计文档.md`，33 章）；已写入截止日期与阶段日期 |
| 契约 | v0.1 初稿（`docs/CONTRACT.md`），P0 结束时升级 v0.2 |
| `CLAUDE.md` / `CHECKLIST.md` / `CREDITS.md` | 已写初版 |
| `STORYBOARD.md` | 空，P1 写枫桥部分 |
| 代码 | 无；目录骨架全部为空文件 |
| 资产 | 无 |
| 仓库 | https://github.com/Galaxy-Liu-creator/PoeticRealm（`main`） |

---

## 进度记录

### 2026-09-28

- 确定截止日期 2026-10-23，据此压缩排期并预先降级（ADR 0001）：移动端只保证能打开、白帝城降级为穿峡长镜头、去掉 Guided Tour、书房物件只保留最小集。
- 建立 `docs/plans/`（按阶段分目录 + ADR），写入总路线图、P0 任务级计划（T0–T9）、ADR 0001–0003（排期、测试策略、GLSL 加载方式）。
- 写 `CLAUDE.md`、`CHECKLIST.md`、`CREDITS.md` 初版；设计文档 3.1、第 28 章写入日期。
- 删除 `docs/archive/设计文档-v1.md`（v1 见 Git 历史 `a6d79a5`）。

### 2026-09-27

- 按第一轮评审重写设计文档为 v2：
  - 补齐核心转场的技术方案（一张网格、一张遮罩、一镜到底）；
  - 补充水墨渲染方案、Blender ↔ 代码契约、资产流程、验证与交付；
  - 开发顺序改为"核心优先"（P0 技术验证 → P1 只做枫桥的最小完整版），新增砍需求顺序；
  - 统一诗词数据结构（文案 `content/` 与演出 `timeline.ts` 分离）；
  - 修正体验流程（朱砂印入口、竖排、时长预算、防晕）与文化细节（月落、钟声"到"客船、猿声、唐风建筑、三远）；
  - v1 原文存档于 `docs/archive/设计文档-v1.md`（2026-09-28 已删除，见 Git 历史 `a6d79a5`）。
- 按 Blender 路线建立目录骨架（134 个空文件）。
- 初始化 Git 仓库并推送到 GitHub；`.gitignore` 忽略依赖、构建产物、工具输出、Blender 备份等；`.gitattributes` 把 `.blend`、`.psd`、`.wav` 和 `art/` 下源素材交给 Git LFS。
- 开发环境：注册 blender MCP（见"开发环境"），Blender 插件升级到与服务端配套的版本。
- 编写 README 初版、本文件、`CONTRACT.md` v0.1 初稿：
  - 在 Blender 5.1.1 中核对了 glTF 导出参数名；
  - 顶点色改为按名字导出（`export_vertex_color='NAME'`，属性名 `mask`），比"导出 Active"更稳；
  - 新增 `ANCHOR_`（代码挂接点）、`PLACE_`（跨场景复用物件）两个前缀；
  - 高度图增加 `.height.json` 元数据，并写明 PNG 编码、方向和解码方式；
  - 列出各场景必须提供的节点清单（初稿）；
  - 设计文档第 18、19 章同步为摘要，以 CONTRACT 为准。

### 2026-09-26

- 对 v1 设计文档做第一轮评审，对照参考仓库 fanhuayishiy/ai-demo（sakura-station-corner、terra-728、voxel-ramen-stall、sanfang-qixiang-atlas 等）。
- 主要结论：核心转场没有能落地的技术方案；Blender 制作流程缺失；目录按纯代码建模组织，和 Blender 路线对不上；开发顺序和"核心优先"矛盾。

---

## 已定决策

| 决策 | 内容 | 记录位置 |
|---|---|---|
| 技术路线 | Blender 建模 + Three.js（WebGLRenderer）+ GLSL + TypeScript + Vite + GSAP；不用 React | 设计文档第 22 章 |
| 渲染器 | 写死 WebGLRenderer + GLSL，不中途换 WebGPU | 设计文档 14.1 |
| 核心转场 | 书页与地形同一张网格；墨扩散遮罩驱动一切；一镜到底 + 尺度归一化 | 设计文档第 13 章 |
| 首版范围 | 三首诗：枫桥夜泊（主场景）→ 江雪 → 早发白帝城 | 设计文档第 7 章 |
| 开发顺序 | P0 技术验证 → P1 枫桥最小完整版（可答辩）→ P2–P6 | 设计文档第 28 章 |
| 排期与预先降级 | 截止 10/23；P1（10/9）为可答辩底线；预先降级白帝城、移动端、Guided Tour、书房物件 | `docs/plans/decisions/0001-*` |
| 测试策略 | vitest（纯函数）+ Playwright 时间码截图 + validate.py / check-contract | `docs/plans/decisions/0002-*` |
| 永不砍 | 纸 → 山的转场；钟声"到"客船 | 设计文档第 29 章 |
| 动画 | 一律为时间的纯函数 f(t)，随机数带种子，全局时钟可跳转 | 设计文档 16.4 |
| 资产契约 | 命名前缀、自定义属性、材质槽位、顶点色、导出参数、预算 | `docs/CONTRACT.md` |
| 压缩 | 先 Meshopt + WebP，需要省显存时再上 KTX2 | CONTRACT 第 13 节、设计文档 19.2 |
| 字体 | 霞鹜文楷 / 思源宋体 / 马善政（均 OFL），按用字做子集 | 设计文档 20.1 |
| 提交署名 | 仓库唯一贡献者为 Galaxy-Liu-creator，提交中不加任何协作者署名 | 本文件"协作约定" |

---

## 待确认

- [ ] **比赛信息**：~~提交截止日期~~（已定：2026-10-23）；比赛名称、答辩时长、作品体积上限、演示视频要求、是否要求离线运行、AI 生成的声明要求、答辩机配置（设计文档 3.1）。
- [ ] **团队分工**：程序、建模、美术、音频、文案各由谁负责（设计文档 3.2）。
- [ ] **砍需求顺序的中间几项**：评审原文此处缺字，目前按"白帝城降级 → 文化面板深度 → 自动导览"补写（设计文档第 29 章）。
- [ ] **契约中的【P0 验证】条目**：植被实例化选方案 A 还是 B、跨场景复用（`PLACE_`）、峡谷分段拼接（`ANCHOR_seg_in/out`）。
- [ ] **项目许可协议**：尚未选定，仓库暂无 LICENSE。
- [x] `docs/archive/设计文档-v1.md` 是否保留 → 已删除（2026-09-28）。

---

## 下一步

按 `docs/plans/P0-技术验证/plan.md` 执行 T1–T9，10/3 Go/No-Go。

- [x] T0 文档落盘（2026-09-28）
- [ ] T1 工程初始化 → T2 时钟 / 随机 / 调试入口 → T3 Blender 灰模与脚本 → T4 PaperTerrain → T5 InkSim → T6 镜头下降与归一化 → T7 水墨材质与后处理 → T8 契约与 check-contract → T9 编排、录制、验收报告
- [ ] 人工并行线（见 ROADMAP）：比赛规则、枫桥文案、音频素材、目标笔记本型号
- [ ] `docs/STORYBOARD.md`：P1 开始时写枫桥部分
- [ ] `docs/CREDITS.md`：随依赖引入逐条登记（three.js、GSAP、lil-gui、hanzi-writer 与数据、三款字体）

---

## 开发环境

| 工具 | 版本 / 说明 |
|---|---|
| Blender | 5.1.1 |
| MCP for Blender | Blender 插件 v1.7（`blender_mcp.py`）+ 服务端 `mcp-for-blender`（`uvx --python 3.11` 启动），已在 Claude Code 用户级注册，所有会话可用 |
| Node / npm | 24.12.0 / 11.6.2 |
| uv | 0.10.11 |
| ffmpeg | 9.0 |
| Git LFS | 3.7.0 |

使用 blender MCP 前：打开 Blender，在 3D 视图按 `N`，进入 **MCP for Blender** 标签页，点 **Start MCP Server**。同一时间只让一个客户端连接 Blender。

---

## 协作约定

- **提交署名**：仓库唯一贡献者为 Galaxy-Liu-creator。提交使用本机已关联该账号的 Git 身份，提交信息中**不加** `Co-Authored-By` 等任何协作者署名。
- **唯一来源**：设计以 `docs/设计文档.md` 为准；资产规则以 `docs/CONTRACT.md` 为准；两者冲突时以 CONTRACT 为准。
- **改契约**：先改 `CONTRACT.md`，再改校验脚本，最后改资产和代码，同一次提交完成（CONTRACT 第 17 节）。
- **素材**：未在 `docs/CREDITS.md` 登记来源和许可的素材，不得进入 `public/`。
