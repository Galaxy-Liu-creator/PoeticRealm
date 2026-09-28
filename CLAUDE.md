# CLAUDE.md

《诗境 · 一卷山河》：Blender 建模 + Three.js（WebGLRenderer）+ GLSL + TypeScript + Vite + GSAP 的交互式诗词山水作品。**截止 2026-10-23。**

## 先读

| 要做什么 | 读哪里 |
|---|---|
| 了解当前进度、下一步 | `MEMORY.md` |
| 当前阶段的任务 | `docs/plans/README.md` → 当前阶段的 `plan.md` |
| 设计意图 | `docs/设计文档.md` |
| 碰到 GLB、Blender、命名、导出 | `docs/CONTRACT.md`（与设计文档冲突时以它为准） |

## 硬约束

**渲染与动画**

- 只用 WebGLRenderer + GLSL，不换 WebGPU / TSL。three.js 版本精确锁定，不升级。
- 所有动画都是全局时钟的纯函数 f(t)。禁止 `Math.random()`、`Date.now()`、`performance.now()` 驱动画面，随机数用 `src/utils/random.ts` 的带种子生成器。
- 不能写成纯函数的仿真（InkSim）按固定步长推进，跳转时从 0 快进。

**场景与资产**

- 机位来自 Blender 的 `CAM_`，焦点来自 `FOCUS_`，代码里不写死坐标。
- 场景目录只做组装、分镜和配置；几何放进 GLB，不在代码里建模。
- GLB 节点名、材质名、userData 属性以 CONTRACT 为准。改契约的顺序：先改 CONTRACT → 再改校验脚本 → 最后改资产和代码，同一次提交完成。
- 未在 `docs/CREDITS.md` 登记来源和许可的素材，不得进入 `public/`。

**体验**

- 禁止游戏化 UI、HUD、发光大按钮、玻璃拟态；禁止龙凤祥云、明清彩画、宫廷金红；建筑统一唐风。
- 诗句竖排（`writing-mode: vertical-rl`），右起。
- 首次入境必须走完整的"书 → 墨 → 纸 → 山水"；诗与诗之间用 InkWipe 切换，不直接切场景。

## 工作方式

- 纯函数先写 vitest 测试；渲染类功能用 Playwright 按时间码截图验收（`docs/plans/decisions/0002-测试策略.md`）。
- Blender 脚本用 `D:/Blender/blender.exe -b <file> --python <script>` 无头运行。
- 提交身份用现有 git 配置；**提交信息和 PR 中不加 `Co-Authored-By` 或任何 AI 协作者署名。**
- 每次工作结束更新 `MEMORY.md`；计划偏差记进当前阶段 `plan.md` 的"偏差记录"。

## 命令

```bash
npm run dev             # 开发
npm run build           # 构建到 dist/
npm test                # vitest
npm run check:contract  # GLB 契约检查
```

调试：`?scene=<id>&t=<秒>` 跳转，`?q=high|mid|low` 画质，`?debug` 参数面板；`window.__POETIC__` 提供 `seek` / `step`。
