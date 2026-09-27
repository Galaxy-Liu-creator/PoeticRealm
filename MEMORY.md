# MEMORY · 工作进度

> 项目的工作记忆：当前状态、做过什么、定了什么、还没定什么、下一步做什么。
>
> - 每次工作结束后更新"当前状态"和"进度记录"（最新在上）。
> - 这里只记进度和决定；设计内容以 `docs/设计文档.md` 为准，资产规则以 `docs/CONTRACT.md` 为准。

---

## 当前状态（2026-09-27）

| 项 | 状态 |
|---|---|
| 阶段 | 设计阶段，P0 技术验证尚未开始 |
| 设计文档 | v2 完成（`docs/设计文档.md`，33 章） |
| 契约 | v0.1 初稿（`docs/CONTRACT.md`） |
| README | 完成初版 |
| 代码 | 无；目录骨架已建，全部为空文件（含 `package.json`，暂时不能 `npm install`） |
| 分镜 / 检查清单 / 署名 | `STORYBOARD.md`、`CHECKLIST.md`、`CREDITS.md` 为空，待写 |
| `CLAUDE.md` | 空，待写 |
| 资产 | 无 |
| 仓库 | https://github.com/Galaxy-Liu-creator/PoeticRealm（`main`） |

---

## 进度记录

### 2026-09-27

- 按第一轮评审重写设计文档为 v2：
  - 补齐核心转场的技术方案（一张网格、一张遮罩、一镜到底）；
  - 补充水墨渲染方案、Blender ↔ 代码契约、资产流程、验证与交付；
  - 开发顺序改为"核心优先"（P0 技术验证 → P1 只做枫桥的最小完整版），新增砍需求顺序；
  - 统一诗词数据结构（文案 `content/` 与演出 `timeline.ts` 分离）；
  - 修正体验流程（朱砂印入口、竖排、时长预算、防晕）与文化细节（月落、钟声"到"客船、猿声、唐风建筑、三远）；
  - v1 原文存档于 `docs/archive/设计文档-v1.md`。
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
| 永不砍 | 纸 → 山的转场；钟声"到"客船 | 设计文档第 29 章 |
| 动画 | 一律为时间的纯函数 f(t)，随机数带种子，全局时钟可跳转 | 设计文档 16.4 |
| 资产契约 | 命名前缀、自定义属性、材质槽位、顶点色、导出参数、预算 | `docs/CONTRACT.md` |
| 压缩 | 先 Meshopt + WebP，需要省显存时再上 KTX2 | CONTRACT 第 13 节、设计文档 19.2 |
| 字体 | 霞鹜文楷 / 思源宋体 / 马善政（均 OFL），按用字做子集 | 设计文档 20.1 |
| 提交署名 | 仓库唯一贡献者为 Galaxy-Liu-creator，提交中不加任何协作者署名 | 本文件"协作约定" |

---

## 待确认

- [ ] **比赛信息**：比赛名称、提交截止日期、答辩时长、作品体积上限、演示视频要求、是否要求离线运行、AI 生成的声明要求、答辩机配置（设计文档 3.1）。
- [ ] **团队分工**：程序、建模、美术、音频、文案各由谁负责（设计文档 3.2）。
- [ ] **砍需求顺序的中间几项**：评审原文此处缺字，目前按"白帝城降级 → 文化面板深度 → 自动导览"补写（设计文档第 29 章）。
- [ ] **契约中的【P0 验证】条目**：植被实例化选方案 A 还是 B、跨场景复用（`PLACE_`）、峡谷分段拼接（`ANCHOR_seg_in/out`）。
- [ ] **项目许可协议**：尚未选定，仓库暂无 LICENSE。
- [ ] `docs/archive/设计文档-v1.md` 是否保留（已有 Git 历史，可删）。

---

## 下一步

### P0 · 技术验证（1–2 周）

- [ ] 填好 `package.json`、`vite.config.ts`、`tsconfig.json`，能 `npm run dev` 跑起空白画布。
- [ ] 灰模纸面 + 高度图 + 墨扩散（ping-pong）+ 镜头下降 + 尺度归一化。
- [ ] 拿一个现成 GLB 试水墨材质和后处理。
- [ ] Blender → GLB → three.js 走通一次契约：`CAM_` / `FOCUS_` / userData / 材质名 / 顶点色各一个样例；`check-contract` 雏形。
- [ ] 验收：录 20 秒转场视频给不了解项目的人看，能说出"山从纸里长出来"；目标笔记本 ≥ 50 fps。不达标则启用降级方案（设计文档 13.9）。

### 文档

- [ ] `CLAUDE.md`：给 AI 的硬约束（短），引用 docs/。
- [ ] `docs/STORYBOARD.md`：把设计文档第 8–10 章的逐句演出和 13.8 的时序展开成时间码表。
- [ ] `docs/CHECKLIST.md`：按第 28 章的阶段建立勾选项和验收记录模板。
- [ ] `docs/CREDITS.md`：建立登记表模板，先登记 three.js、GSAP、hanzi-writer 与其数据、三款字体。

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
