# R2 首批动态特效实施报告

2026-10-04。首页氛围与三个入境转场已接入现有应用，目标页沿用已选诗境原稿和真实 DOM；页面继续明确显示「静态诗境预览 · 实时场景制作中」。本报告验收公共动效与入境流程，真实三维场景、环境音和曲面翻页返回仍需后续制作。

## 实际行为

- 首页标题保持静止，山水区域有低对比慢雾与细水光。卡片整组按同一相位、幅度缓慢浮动；鼠标悬停或键盘焦点进入卡片区域时整组暂停，离开后连续恢复。
- 《枫桥夜泊》使用 1.6 秒炭纸中央扩口与窄火缘；《江雪》使用 2.1 秒右上至左下的分层斜雪与蓝灰雾；《早发白帝城》使用 1.5 秒从右侧推进的云水雾。雪、云水在雾层完全覆盖时切换目标，避免裸露切页。
- 入境前等待目标图片解码、字体和效果首帧。原页面保留；失败显示重试/取消，Esc 可取消并恢复入口焦点，加载中取消后迟到响应不再入境。快速点击只保留一个事务；浏览器导航取消在途转场。只有播放完成后才提交路由。
- 系统「减少动态」或项目动态偏好关闭时，首页停止装饰运动，目标准备完成后直接进入。WebGL 不可用时保留静态首页，并以 CSS 过渡确保诗境可达。

## 代码与工具

`Application.ts` 编排路由与偏好，`MotionLoop` 复用现有 `Clock`，`OverviewMotion` 管理可见性、暂停与清理。`EffectPlane` 使用锁定的 Three.js 0.186.1 / WebGLRenderer / GLSL，单一透明平面不依赖新纹理。首页与入境由统一时间采样，Shader 使用固定 hash 常量；未引入以帧数或无种子随机数驱动画面的方法。绘制尺寸限制为 1920×1080、DPR 不超过 1.25。

`RealmReveal` 管理准备、播放、失败和取消，DOM 遮罩与火缘共用同一轮廓。完成/取消会释放几何、材质、渲染器和上下文；首页重绘会断开观察器与监听。`window.__POETIC_MOTION__` 提供 pause/play/seek/transition/cancel 调试接口，与保留的 P0 `__POETIC__` 分开。SideCurtain v6、账号/MySQL业务、GLB契约与依赖版本保留。

使用 direct-frontend-design 路由，沿用项目文档作为唯一视觉权威；结合 ai-ui-ux-motion-engine、web-animation-design、threejs 与 optimize-web-animations。第三方 API 通过 Context7 查官方文档并在项目锁定版本中构建验证。实际调用全局 Chrome DevTools MCP 1.10.1 检查 DOM/CSS、Console、网络、截图与性能，Playwright MCP 验证键盘/取消/减少动态；项目既有 Playwright 1.63.0 负责专项回归和录像。当前对话未暴露两个浏览器 MCP 的直接工具句柄，因此通过本机 stdio JSON-RPC 桥接调用已注册的原生服务，证据保留实际服务名/版本。未新增依赖或使用付费素材服务。

## 验证与修复

| 验证 | 结果 / 证据 |
|---|---|
| TypeScript 与生产构建 | 通过；[build.log](assets/accepted/build.log) |
| 单元测试 | 13 文件、57 项通过；[unit-tests.log](assets/accepted/unit-tests.log)，新增覆盖时钟取消/恢复/seek及扩口起止/初期连续性 |
| 动效专项 | 10 组通过；[motion-verification.json](assets/accepted/motion-verification.json) |
| 既有 UI 回归 | 16 组通过；[verification.json](assets/regression/verification.json)，包含收藏/资料/偏好/账号/原侧幕/路由与 1920、1024、390 无横溢 |
| Chrome DevTools | 1920×1080、1440×900 DOM/CSS及截图，三种入境 0/25/50/75/100% 固定帧、可重复时间采样与离屏暂停；[结果](assets/devtools/project-verified-final-verification.json) |
| Playwright MCP | Enter 入境、Esc 取消后焦点恢复、减少动态；[结果](assets/devtools/project-playwright-mcp.json) |
| UI 扫描 | 6 组、36 条原稿/字体/语义线索，新增 motion.css 无命中；[扫描](assets/visual-scan.json) |

专项覆盖悬停整组暂停、真实离屏停止/恢复、三个入境连续完成及资源清理、键盘与取消、图片失败重试、请求等待中取消/迟到响应、快速重复点击/路由中断、运行时减少动态和无 WebGL 回退。隐藏暂停使用明确标注的模拟 `document.hidden` / `visibilitychange` 条件，验证应用 RAF 真正取消以及恢复不追赶时间；自动化浏览器切换页签/最小化未产生真实 hidden 状态，因此**原生桌面后台切换仍待人工核验**，未将其计作已通过。

实看实际页面固定帧及录像提取帧后，修复了目标导航高于雾层导致穿透、火缘最初极小负半径引起回缩、取消准备时帧/计时器未及时释放的问题。扩口多边形降至 96 点并仅在运动中预提升目标合成层，改善播放性能；原遮挡、火缘和雪层效果保留。

### 本机播放性能

实际 Chrome，1920×1080，ANGLE / AMD Radeon(TM) Graphics / D3D11。以下为目标已解码、未开追踪的首次入境；准备时长不包含在播放时长内。

| 效果 | 采样帧间隔数 | 播放时长 | 帧间隔中位数 | P95 | 超过 50ms |
|---|---:|---:|---:|---:|---:|
| 炭纸 | 94 | 1600.2ms | 16.7ms | 17.0ms | 0 |
| 雪雾 | 127 | 2100.2ms | 16.7ms | 16.9ms | 0 |
| 云水 | 92 | 1516.8ms | 16.7ms | 17.1ms | 0 |

首页追踪采样 120 帧间隔，中位数 16.7ms、P95 16.8ms、超过 50ms 为 0；[原始追踪](assets/devtools/project-verified-final-performance.json.gz)保留。转场开启追踪会增加开销，早期带追踪火缘记录出现长帧；最终用未追踪首次播放另行测量，未把追踪与实际播放混为同一结果。连续路由后首页保持 1 个画布、0 个遗留转场。上述数据只证明本机当前公共动效，不代表后续真实三维负载或所有硬件恒定 60fps。

原生 DevTools Console 留有 favicon.ico 404 和未启动默认 8080 后端导致的 auth/session 502，网络记录已逐条确认；没有新增 Shader 或未捕获脚本错误。隔离游客 API 的动效/UI 自动回归无页面异常或非故障注入的资源失败。本轮未操作真实数据库。

## 审阅与复现

- [三次入境剪辑](assets/accepted/entry-demo.mp4)：1440×900、10.4 秒、25fps，源录像中第 4.0–14.4 秒的连续片段，未变速。
- [完整源录像](assets/accepted/video/page@74cd3cb9f060165d224d472d3d3caa5c.webm)：23.4 秒、25fps VP8；专项 JSON 中 timeline 为测试程序墙钟记录，录像时间轴以视频帧为准。
- `assets/devtools/` 保存两档首页截图和三种入境各五进度截图；`assets/accepted/frames/` 保存录像提取的首页、火缘、雪雾、云水与终点帧。前期诊断文件保留，不用旧失败报告替代 accepted/devtools 的最终证据。

从项目根运行：

```bash
npm --prefix frontend run dev -- --host 127.0.0.1 --port 5184 --strictPort
UI_ORIGIN=http://127.0.0.1:5184 UI_OUTPUT=output/playwright/motion node frontend/tools/verify-motion.mjs
npm --prefix frontend test
npm --prefix frontend run build
```

## 后续边界

回程目前仍使用已有返回与滚动/焦点恢复；真实曲面翻页需要单独完成。枫桥 GLB 质量、真实材质/灯光/水体/薄雾/铃声，以及江雪/白帝城模型、机位与环境音尚未形成产品闭环。后续以 CONTRACT、Blender CAM_/FOCUS_ 和实际场景固定时刻验收推进，不以本轮静态预览入境代替三维验收。尚需真实后台切换、完整目标硬件/长时间运行和素材发布许可证据。未提交、推送或部署。
