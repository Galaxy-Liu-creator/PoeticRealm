# P0 · 技术验证：任务级计划

> 日期：2026-09-28 – 10-03　·　分支：`p0-tech-validation`　·　状态：进行中
>
> 目标：用灰模验证全项目风险最大的部分——书页 → 山河的转场（设计文档第 13 章）、水墨渲染（第 14 章）、Blender ↔ 代码契约（`docs/CONTRACT.md`）。10/3 做 Go/No-Go 判定。

---

## 约定

- 每个任务一次提交，提交身份 `xxy-lh`，**不加任何 Co-Authored-By**（MEMORY.md 协作约定）。
- 关口通过后合并回 `main`；推送到 GitHub 前先征得同意。
- 测试策略见 [ADR 0002](../decisions/0002-测试策略.md)：纯函数先写 vitest 测试；渲染类功能用 Playwright 在固定时间码截图验收；Blender 脚本用 `validate.py` 自检。
- Blender：`D:/Blender/blender.exe`（5.1.1），一律 `-b` 无头运行。
- 执行中逐项勾选；偏离计划的地方在本文件末尾"偏差记录"里写明。

---

## 任务

### T0 · 文档落盘与收尾（9/28）

- [x] 建立 `docs/plans/`：README、ROADMAP、本文件、ADR 0001–0003
- [x] `CLAUDE.md`：给 AI 的硬约束（短），引用 docs/
- [x] `docs/CHECKLIST.md`：阶段骨架 + P0 验收模板
- [x] `docs/CREDITS.md`：登记表模板
- [x] 设计文档：3.1 填截止日期；第 28 章加日期并链接 ROADMAP；删去对 `docs/archive/` 的引用（v1 见 Git 历史 `a6d79a5`）
- [x] MEMORY.md：当前状态、待确认项、下一步
- [x] 提交（含 v1 存档的删除）

### T1 · 工程初始化（9/28）

- [x] `package.json`：three 精确锁定（不带 `^`）；gsap、lil-gui、typescript、vite、vite-plugin-glsl、vitest、playwright、@gltf-transform/core、@gltf-transform/functions、meshoptimizer；脚本 `dev` / `build` / `preview` / `test` / `check:contract`
- [x] `vite.config.ts`（`base: './'`，GLSL `#include`）、`tsconfig.json`（strict）、`index.html`、`src/main.ts`
- [x] 验收：`npm run dev` 出现画布；`npm run build` 通过；`npm test` 能跑
- [x] CREDITS 登记 three.js、GSAP、lil-gui

### T2 · 全局时钟、种子随机与调试入口（9/28–9/29）

- [x] `src/utils/random.ts`：`createRng(seed: number): () => number`（mulberry32）
- [x] `src/engine/Clock.ts` + `Engine.ts`：renderer、主循环、resize；时钟 `time` / `pause()` / `play()` / `seek(t)` / `step(dt)`；`onUpdate(fn: (t, dt) => void)`
- [x] `src/engine/Debug.ts`：`parseDebugParams(search)` → `{ scene?, t?, q?, debug }`；`window.__POETIC__ = { seek, step, state }`；空格暂停；`?debug` 时动态加载 lil-gui
- [x] vitest：同种子同序列；`seek` / `step` 后时间正确；URL 解析边界

### T3 · Blender 灰模与制作端脚本（9/29）

- [ ] `art/scripts/build_greybox.py`：生成 `art/blender/fengqiao.blend`
  - `terrain` 集合：1500 × 1500 m 的 `terrain` 网格，山体 + 中间一条江谷
  - `glb_main`：`CAM_enter` / `CAM_boat`（`yuan: "ping"`、Sensor Fit = Vertical、roll = 0）、`FOCUS_bell`、`EMIT_bell`、`SFX_bell`、`LIGHT_fishfire_01`、`boat_guest`（`ink_wood`、顶点色 `mask`、`behavior: "bob"`）、寺庙体块（`ink_tile` + `ink_wood`、`reveal`）、`PLACE_boat_01`
  - `glb_foliage`：单株灰模树 × 20（验证实例化方案 A）
  - 同时生成 `art/blender/props.blend`（`boat`，导出到 `common/`）
- [ ] `validate.py`：CONTRACT 15.2 全部检查，违规时以非零码退出
- [ ] `export_glb.py`：CONTRACT 第 13 节参数，按 `glb_` 集合导出
- [ ] `bake_terrain.py`：CONTRACT 第 10 节 → `fengqiao.height.png`（1024²，RGB 无 alpha）+ `fengqiao.height.json`
- [ ] 验收：三个脚本无头跑通；validate 通过；故意改坏名字（`tree.001`）时 validate 报错

### T4 · 高度图解码与 PaperTerrain（9/30）

- [ ] `src/engine/Assets.ts`：`loadHeightmap(scene)`（`createImageBitmap` + `colorSpaceConversion: 'none'` + `premultiplyAlpha: 'none'`）→ Float32 高度纹理 + 引导遮罩；`loadGLB(url)`（GLTFLoader + MeshoptDecoder）
- [ ] 纯函数 `decodeHeight(r, g, hMin, hMax)`，vitest 覆盖端点与中值
- [ ] `src/systems/terrain/PaperTerrain.ts` + `terrainGrow.{vert,frag}.glsl` + `chunks/{noise,fbm,paper}.glsl`：细分平面；`height × uGrow × smoothstep(a, b, inkMask) × edgeFade`；有限差分法线；纸 → 墨 → 场景色；水位以下随 `uGrow` 淡入
- [ ] 验收：`?debug` 可拖 `uGrow`；截取 uGrow = 0 / 0.5 / 1 三张图

### T5 · 墨扩散 InkSim（10/1）

- [ ] `src/systems/ink/InkSim.ts` + `sim/inkDiffuse.frag.glsl`：HalfFloat ping-pong（不支持则降级并记录）；R 水分 / G 流动墨 / B 沉积墨；速度 = 基础 × 纤维噪声 × 引导遮罩；湿边积墨；固定步长；`seekTo(t)` 从 0 快进
- [ ] 临时墨源：Canvas 竖排写首句（BrushWriter 在 P1 做）
- [ ] `inkMask` 接入 PaperTerrain
- [ ] 验收：墨沿山体轮廓汇聚、江谷留白；两次 `seek(12)` 截图逐像素一致

### T6 · 镜头下降与尺度归一化（10/2）

- [ ] `src/transition/PaperToWorld.ts`：世界根缩放 `s = 0.3 / 1500`；镜头沿曲线从书页上方降到 `CAM_enter`；`near = k × 离地高度`、`far = near × R`；雾吞没书页边界后同一帧恢复缩放为 1，镜头与 near/far 同比换算
- [ ] 书房用灰色桌面代替
- [ ] 验收：归一化前后两帧截图差异低于阈值；无深度冲突闪烁；录屏人工检查

### T7 · 水墨材质、后处理与行为（10/2）

- [ ] `InkMaterial.ts`（`onBeforeCompile`：色阶量化、顶点色 G 积墨、`inkReveal` 墨显）+ `applyMaterials.ts`（按材质名替换）
- [ ] `PostFX.ts`：深度描边 → 宣纸纹理 → 调色 → Kuwahara（半分辨率，可开关）
- [ ] `systems/behaviors/`：按 `userData.behavior` 挂 bob / sway / flicker，全部 f(t)
- [ ] 灰模 + 一个 Poly Haven CC0 模型试水墨效果，登记 CREDITS
- [ ] 验收：开 / 关后处理截图对比；Debug 面板显示 draw call

### T8 · 契约走通与 check-contract 雏形（10/3）

- [ ] `tools/optimize-assets.mjs`：合并静态网格、Meshopt、去重、裁剪
- [ ] `tools/check-contract.mjs`：必需节点、userData 白名单与取值、材质槽位、`PLACE_` 引用、高度图 PNG 与 JSON 一致
- [ ] 验收：`npm run check:contract` 通过；删掉一个 `FOCUS_` 后报错
- [ ] 【P0 验证】实例化方案 A（是否还原为 InstancedMesh、draw call 数）；`PLACE_` 实例化 `common/boat.glb`；`ANCHOR_seg` 推迟到 P5（记 ADR）
- [ ] CONTRACT 升级 v0.2，写变更记录

### T9 · 编排、录制与 Go/No-Go（10/3）

- [ ] 按设计文档 13.8 把 0–26 s 串在全局时钟上
- [ ] `tools/shoot.mjs`（按时间码截图）、`tools/record.mjs`（`__POETIC__.step(1/60)` 逐帧截图 → ffmpeg 20 s 1080p60）
- [ ] 目标笔记本测帧率
- [ ] 写 `report.md`：截图、帧率、体积、未解决问题、Go/No-Go 结论
- [ ] 更新 CHECKLIST、MEMORY、README"验证与边界"
- [ ] **停下**：由负责人找不了解项目的人看视频，共同做 Go/No-Go 判定，再细化 P1

---

## 端到端验证

1. `npm test`：vitest 全部通过（随机、时钟、URL 解析、高度解码）。
2. Blender 端：build → validate → export → bake 依次无报错。
3. `npm run check:contract` 通过；故意破坏后能报错。
4. `npm run build && npm run preview`，`?scene=fengqiao&t=0` 到 `t=26` 完整看到转场，任意 `t` 可跳转、可复现。
5. `tools/record.mjs` 产出 20 秒视频；目标笔记本 ≥ 50 fps。
6. 最终验收由负责人判定。

---

## 偏差记录

| 日期 | 任务 | 偏差 | 原因 |
|---|---|---|---|
| 9/28 | T1 | 另装 `@types/node`、`pngjs`（tools 读写 PNG）；`tools/shoot.mjs` 提前到 T1 写出基础版 | 各任务验收都要截图 |
| 9/28 | T1 | vite 8 用 rolldown/oxc，vite-plugin-glsl 无需 esbuild；vitest 配置写在 `vite.config.ts`（`vitest/config`） | 版本现状 |
| 9/28 | T2 | 时钟拆为 `engine/Clock.ts`、URL 解析拆为 `engine/debugParams.ts`（纯函数，可在 node 下测试）；`Quality.ts` 提前写出初始档位 | 可测试性；后续任务要按档位取分辨率 |
