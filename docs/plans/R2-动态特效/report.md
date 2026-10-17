# R2 首批动态特效实施报告

2026-10-04 首批：首页氛围与三个入境转场已接入现有应用，目标页沿用已选诗境原稿和真实 DOM；页面继续明确显示「静态诗境预览 · 实时场景制作中」。2026-10-05 已追加书页翻回总览，验收见末节；真实三维场景与环境音继续后续制作。

## 实际行为

- 首页标题保持静止，山水区域有低对比慢雾与细水光。卡片整组按同一相位、幅度缓慢浮动；鼠标悬停或键盘焦点进入卡片区域时整组暂停，离开后连续恢复。
- 《枫桥夜泊》使用 1.6 秒炭纸中央点燃、扩口与沿口火舌；《江雪》使用 2.1 秒右上至左下的分层斜雪与蓝灰雾；《早发白帝城》使用 1.5 秒从右侧推进的云水雾。雪、云水在雾层完全覆盖时切换目标，避免裸露切页。火焰加强后的验收见下文，首批证据保留历史版本。
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

当前静态诗境已接曲面翻页返回并恢复滚动/焦点；未来真实 WebGL 场景的翻页快照还需接入。枫桥 GLB 质量、真实材质/灯光/水体/薄雾/铃声，以及江雪/白帝城模型、机位与环境音尚未形成产品闭环。后续以 CONTRACT、Blender CAM_/FOCUS_ 和实际场景固定时刻验收推进，不以静态预览入境代替三维验收。尚需真实后台切换、完整目标硬件/长时间运行和素材发布许可证据。首批已归档并推送 bab5235；后续火焰、翻页、页面会话与 Docker 为未提交修改。

## 枫桥火焰加强 · 2026-10-04

按用户追加要求，前 160ms 保持源纸面闭合，中央出现向上摆动、尖端破碎的三束火苗；随后扩口，火舌沿同一燃烧轮廓持续上升。增加橙红火身、亮芯、炭化与少量火星，避免只有窄暗边的观感。总时长仍为 1.6 秒；目标内容、其他两种入境与账号侧幕不变。采用现有 GLSL 程序火焰，无新纹理、依赖或外部服务，时间仍由统一时钟采样。

`RealmReveal` 与 Shader 同步点燃/扩口的时间映射；新增单测检查点燃期纸面闭合与随后的半径连续增长。Shader 在火缘之外提前退出，点燃结束后不再计算中央火苗；火焰湍流采用算术 hash，原首页/雪/云水的噪声与轮廓保持。先修正火焰过于整齐的形状和 GPU 开销，再以原性能门禁复验。

| 本轮验证 | 结果 / 证据 |
|---|---|
| 类型检查、生产构建 | 通过；[build.txt](assets/fire-v2/verified/build.txt) |
| 单测 | 13 文件、58 项通过；[unit-tests.txt](assets/fire-v2/verified/unit-tests.txt) |
| 新火焰专项 | 6 组通过；[fire-verification.json](assets/fire-v2/verified/fire-verification.json)：真实 WebGL 像素与实际 DOM 遮罩证明开场有变化的火苗且纸面闭合、25/50/75% 四周有火、终点清理及正常播放录像 |
| 动效回归 | 原 10 组通过；[motion-verification.json](assets/fire-v2/regression/motion-verification.json)，含三次入境、取消、失败重试、减少动态与无 WebGL 回退 |
| 原生浏览器 MCP | 本轮直接调用 Chrome DevTools 和 Playwright MCP；[browser-mcp.json](assets/fire-v2/verified/browser-mcp.json)。DOM/CSS、起止、实际截图、Console/网络、追踪、Enter/Esc/焦点、枫桥减少动态、390×844 无横溢与火缘实看通过 |

原生 Chrome 的 1920×1080 未追踪播放采样为 97 帧、1600.2ms，中位数 16.7ms、P95 16.9ms、超过 50ms 为 0，ANGLE / AMD Radeon / D3D11。隔离的自动化正常首次入境为 88 帧、1600.1ms，中位数 16.7ms、P95 33.3ms、超过 50ms 为 1；原 50fps 和 20ms 中位数门禁通过。正常播放使用独立浏览器上下文，与同步 `readPixels` 和固定帧截图的上下文分开；本机测量不代表所有硬件或后续三维负载。原生追踪观察到 CLS 0.00，不将带追踪的播放当作上述未追踪性能。原生 Console 的唯一资源错误来自未启动默认后端的 `/api/v1/auth/session` 502；无 Shader/脚本错误，隔离游客专项无页面异常。

最新可审阅证据以 `fire-v2/verified` 和 `fire-v2/regression` 为准；根目录、`final` 与 `accepted` 内保留前期未通过完整性能门禁的诊断，不是最终验收。原火缘首批证据未覆盖。本轮未重复认证或实库验证。

修正专项工具的渲染器诊断选择器后，再次完整执行 6 组专项，门禁全部通过；[复测摘录](assets/fire-v2/verified/playback-recheck.json)记录实际 AMD / D3D11、95 帧/1600.1ms、中位数 16.7ms、P95 16.9ms、超过 50ms 为 0。此前 `fire-verification.json` 的 renderer 为 null，仅是诊断选择器未命中，不改写原测量记录。

- [火焰入境剪辑](assets/fire-v2/verified/entry-demo.mp4)：1440×900、25fps、3 秒，源录像 2.8–5.8 秒连续片段，未变速。
- [完整源录像](assets/fire-v2/verified/video/page@1cb2991d8ee342840227d49b8267c697.webm)：5.96 秒；[正常开场提取帧](assets/fire-v2/verified/live-ignition.png)、[正常燃烧提取帧](assets/fire-v2/verified/live-burn.png)与固定进度帧均已实看。
- 复现专项：`UI_ORIGIN=http://127.0.0.1:5184 UI_OUTPUT=output/playwright/fire node frontend/tools/verify-fire.mjs`。

## 书页返回、页面会话与 Docker · 2026-10-05

从诗境返回总览时，1.1 秒书页由左向右卷回，真实源页的图片、文字与导航同步弯曲，露出连续纸背及柔和投影。48 个 CSS 三维分栏按同一时钟采样；准备阶段缓存源页滚动位置，提前建立合成层，运行时主要修改 transform/opacity。原生追踪发现的准备阶段重复读写重排已修复，再次 ForcedReflow 检查无问题。目标资源就绪后播放，结束提交路由并恢复总览滚动和入口焦点。

返回按钮、总览导航和浏览器后退共用转场；Esc、加载中取消、快速重复请求、其他路由中断、运行中减少动态及资源清理已验。当前源页为静态预览 DOM，真实 R3 WebGL 内容的快照不在本轮完成范围。

登录入口按用户最新说明执行：新开页面需登录，刷新保留身份和当前页面；30 天凭据预填账号并显示已保存密码状态，仍需明确点击登录。密码不写入浏览器存储，HttpOnly 持久凭据和当前标签页访问令牌分离。关闭通知立即停用访问令牌，保留 15 秒刷新换发窗口；断网或强杀导致通知未送达时由 30 分钟闲置过期兜底。接口与安全边界见 [认证接口](../../api/认证接口.md)。

Docker 实际启动前端、Spring Boot 与独立 MySQL 8.4，健康依赖、命名卷、非 root 应用容器及忽略的随机本机配置均已验证。数据库与后端重启后，原账号和记住凭据保留，点击登录可恢复同一账号；测试结束仅清理本轮六个测试账号，V1 和数据卷保留。宿主机原有服务未终止。启动方法见 [Docker启动](../../Docker启动.md)。

| 本轮验证 | 结果 / 证据 |
|---|---|
| 类型检查、生产构建 | Docker 前端构建通过，后端 Maven package 通过 |
| 前端单测 | 16 文件、65 项通过，含页面存储、令牌恢复及卷曲起止 |
| 后端测试 | 17 项、零失败/错误/跳过，隔离 H2；发布 Jar 无本机配置/H2/测试启动器 |
| 翻页专项 | 10 组通过；[return-verification.json](assets/page-return/return-verification.json) |
| 真实 MySQL 页面会话 | 10 组通过；[session-verification.json](assets/page-return/session-verification.json)，覆盖新开/刷新/记住凭据/关闭撤销/账号资料/退出 |
| 原动效与火焰回归 | 10 + 6 组通过；[motion](assets/page-return/motion-regression.json)、[fire](assets/page-return/fire-regression.json) |
| 原生 Chrome DevTools / Playwright MCP | 实际 DOM、截图、Console、性能、登录/注册检查；[摘录](assets/page-return/native-performance.json) |

1920×1080 原生 Chrome／AMD D3D11 未追踪播放采得 67 帧／1100.2ms，中位数 16.7ms、P95 16.8ms、>50ms 为 0。单独追踪 CLS 0、ForcedReflow 无问题，Console 无错误/警告。自动化正常播放 64 帧／1100.2ms、P95 16.8ms、>50ms 为 1，原至少 50fps 门禁通过。与后端启动重叠的早期性能失败保留，最终在机器空闲时复验，未放宽断言。本机结果不代表未来三维负载或所有硬件。

- [正常翻页录像](assets/page-return/return-demo.mp4)：1440×900、25fps、3 秒、连续剪辑无变速；[源录像](assets/page-return/source-playback.webm)。
- [1920 中途截图](assets/page-return/native-1920-mid.png)、[纸背与阴影](assets/page-return/return-700.png)、[记住凭据登录页](assets/page-return/remembered-login.png)。来源、方法及原始路径映射见 [证据说明](assets/page-return/README.md)。
- 当前本机 Docker 地址为 `http://127.0.0.1:5186`，5173 已有开发服务，因此只在被忽略的 `.env.docker` 覆盖端口；默认启动端口仍为 5173。

```bash
node tools/docker.mjs up
UI_ORIGIN=http://127.0.0.1:5186 UI_OUTPUT=output/page-session/session node frontend/tools/verify-session.mjs
UI_ORIGIN=http://127.0.0.1:5186 UI_OUTPUT=output/page-session/return node frontend/tools/verify-return.mjs
```
