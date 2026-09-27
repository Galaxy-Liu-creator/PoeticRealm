# 诗境 · 一卷山河

**Poetic Realm · A Scroll of Mountains and Rivers**

> 一页纸，生出一片山河。

一款把中国古典诗词的意象转化为可进入的三维山水空间的交互式数字文化作品：从一张文人书案进入古籍，毛笔在宣纸上写下诗句，墨迹洇开、汇成山形，山体从纸面隆起，江河在留白处生成，镜头一镜到底进入诗中的世界。

> **当前阶段：设计阶段。** 设计文档 v2 与 Blender ↔ 代码契约初稿已完成，目录骨架已建立（全部为空文件），**尚无可运行的代码**。进度见 [MEMORY.md](MEMORY.md)。

---

## 核心体验

```text
点击朱砂印入卷 → 烛火亮起，古书打开
→ 毛笔书写诗句 → 墨迹在宣纸上洇开，汇成山水轮廓
→ 纸面隆起，江河、树木、建筑、舟船依次墨显
→ 镜头从书页上方一镜到底进入山河
→ 诗句逐句演出：每一句驱动一段镜头、效果与声音
```

## 三首诗

| | 《枫桥夜泊》张继 | 《江雪》柳宗元 | 《早发白帝城》李白 |
|---|---|---|---|
| 情绪 | 安静、清冷、孤寂 | 空、静、寒、孤 | 轻快、壮阔、自由 |
| 画风 | 夜景：冷蓝 + 渔火暖光 | 水墨留白（马远《寒江独钓图》） | 青绿山水（《千里江山图》） |
| 镜头（郭熙"三远"） | 平远 | 平远 | 高远 · 深远 |
| 核心演出 | 钟声波纹推向客船，波前到达时才响起钟声 | 大面积留白中的一叶孤舟 | 轻舟穿峡，两岸猿声交替，天色从朝霞到暮色 |

## 功能（规划）

- [ ] 入口页：朱砂印"点击入卷"，兼作加载页与音频解锁
- [ ] 书房：烛光、线装书自动打开、竖排标题
- [ ] 逐笔书写：基于笔顺数据的毛笔书写动画
- [ ] 墨扩散：GPU ping-pong 模拟宣纸吸墨
- [ ] 纸面隆起：书页与地形是同一张高度图网格
- [ ] 一镜到底入境：动态 near/far，尺度归一化
- [ ] 水墨渲染：水墨材质、笔线描边、Kuwahara 晕染、宣纸纹理、分场景 LUT
- [ ] 分镜系统：全局时钟可暂停、可跳转（`?scene=fengqiao&t=42`）
- [ ] 三首诗的完整场景与逐句演出
- [ ] 诗与诗之间的墨染切换（可跳过）
- [ ] 文化面板：注释、译文、考据
- [ ] 画质分档（只降不升）与离线包

## 技术栈

| 类别 | 选择 |
|---|---|
| 渲染 | Three.js（WebGLRenderer，锁定版本）+ GLSL |
| 语言 / 构建 | TypeScript + Vite |
| 动画编排 | GSAP timeline（由全局时钟驱动） |
| 音频 | Web Audio API |
| 笔顺数据 | hanzi-writer / Make Me a Hanzi |
| 建模 | Blender 5.1 + Python（程序化建模、导出、烘焙、校验） |
| 资产优化 | gltf-transform（Meshopt + WebP） |
| 验证 / 录制 | Node + Playwright + ffmpeg |

## 运行

> 以下命令为**规划**，代码实现后生效。

```bash
npm install
npm run dev        # 本地开发
npm run build      # 构建到 dist/（相对路径，可离线运行）
```

调试入口（规划）：`?scene=<id>&t=<秒>` 跳到指定时刻，`?q=high|mid|low` 强制画质，`?debug` 打开参数面板；数字键 1/2/3 切换诗，←/→ 切换诗句，空格暂停。

### 制作端（Blender）

```bash
# 导出某个场景的 GLB（按 glb_ 开头的集合导出）
blender -b art/blender/fengqiao.blend --python art/scripts/export_glb.py -- --out public/assets/models/fengqiao

# 压缩与校验
node tools/optimize-assets.mjs
node tools/check-contract.mjs
node tools/check-budget.mjs
```

命名、导出参数、预算等规则见 [docs/CONTRACT.md](docs/CONTRACT.md)。`.blend` 与贴图、音频源文件通过 Git LFS 管理，克隆后请先执行 `git lfs install`。

## 目录

```text
PoeticRealm/
├── docs/          设计文档、契约、分镜、检查清单、署名
├── art/           制作端（浏览器看不到）：.blend、Blender 脚本、源素材
├── public/assets/ 运行端：优化后的 GLB、高度图、贴图、音频、字体子集
├── src/
│   ├── engine/      渲染器、全局时钟、资源、后处理、画质分档
│   ├── app/         流程状态机、场景管理、分镜执行器
│   ├── transition/  书页 → 山河（核心）、墨染切换
│   ├── systems/     墨、地形、水、大气、粒子、镜头、音频、材质、行为
│   ├── scenes/      书房与三首诗：只做组装、分镜和配置
│   ├── content/     诗词文案（纯数据）
│   ├── shaders/     chunks / materials / postfx / sim
│   └── ui/          DOM 层：竖排诗句、注释卡、印章按钮
└── tools/         资产优化、字体子集、契约与预算检查、截图对比、逐帧录制、离线打包
```

完整目录与每个文件的职责见 [设计文档 23.2 节](docs/设计文档.md)。

## 文档

| 文档 | 内容 |
|---|---|
| [docs/设计文档.md](docs/设计文档.md) | 愿景、体验、三个场景、核心转场与渲染方案、架构、计划 |
| [docs/CONTRACT.md](docs/CONTRACT.md) | Blender ↔ 代码契约：坐标、命名、属性、材质槽位、导出参数、预算、校验 |
| [docs/STORYBOARD.md](docs/STORYBOARD.md) | 分镜表（待写） |
| [docs/CHECKLIST.md](docs/CHECKLIST.md) | 分阶段勾选与验收记录（待写） |
| [docs/CREDITS.md](docs/CREDITS.md) | 字体、音频、参考、第三方库的来源与许可（待写） |
| [MEMORY.md](MEMORY.md) | 工作进度、已定决策、待确认事项 |

## 验证与边界

如实记录做到了什么、没做到什么，随进度更新。

**已完成**

- 设计文档 v2：核心转场技术方案、水墨渲染方案、开发阶段与砍需求顺序。
- Blender ↔ 代码契约 v0.1 初稿。
- 目录骨架。

**尚未完成 / 已知风险**

- 尚无任何可运行代码。
- 核心转场（书页 → 山河）尚未做技术验证，是全项目最大的风险；如果效果不可信，将启用降级方案"纸被墨浸透后露出三维场景"（设计文档 13.9）。
- 契约中标注【P0 验证】的条目（实例化方案、跨场景复用、峡谷分段拼接）尚未实测。
- 比赛提交要求、截止日期、团队分工尚未确定（设计文档第 3 章），体积与时长预算暂按默认假设。

## 署名与许可

- 作者：[Galaxy-Liu-creator](https://github.com/Galaxy-Liu-creator)
- 第三方字体、音频、库与数据的来源和许可统一登记在 [docs/CREDITS.md](docs/CREDITS.md)。
- AI 辅助声明与提示词原文：按比赛规则补充。
- 本项目的许可协议待定。
