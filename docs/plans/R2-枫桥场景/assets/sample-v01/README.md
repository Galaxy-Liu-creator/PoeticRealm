# 枫桥四元素小样 · 验证证据

2026-10-06，独立检查页的“湿石岸＋木舟＋江面＋夜间渔火”技术验证。截图由真实 Three.js/WebGL 页面产生，模型由原生 Blender MCP 操作 Blender 5.1.1 制作和导出；不是静态设计稿。

## 查看与复现

本机检查入口：<http://127.0.0.1:5187/?scene=fengqiao&lab=fengqiao>，沿用项目真实登录门禁。检查页支持三个 Blender 机位、拖拽观察、固定时间、暂停及倒影/阴影/渔火对照。它是独立小样入口，不是产品内三维转场入口。

从仓库根执行：

```bash
API_PROXY_TARGET=http://127.0.0.1:5186 npm --prefix frontend run dev -- --host 127.0.0.1 --port 5187 --strictPort
npm --prefix frontend run check:contract
npm --prefix frontend run check:budget
npm --prefix frontend run test:assets
SAMPLE_BASE=http://127.0.0.1:5187 SAMPLE_OUTPUT=output/playwright/fengqiao-sample/recheck node frontend/tools/verify-fengqiao-sample.mjs
```

浏览器脚本用已安装 Chrome、AMD/D3D11 与项目锁定 Playwright；`devtools-client.mjs` 调用安装在用户级缓存中的原生 Chrome DevTools MCP 1.10.1。换机器时须调整该工具的 MCP 可执行文件路径。验证用隔离身份夹具走登录流程，不创建数据库账号，不证明后端认证接口的本轮回归。

Blender 源文件：`art/blender/fengqiao-sample-v01.blend`；发布 GLB：`frontend/public/assets/models/fengqiao/sample_v01.glb`；清单：`frontend/public/assets/scenes/fengqiao.sample.json`。当前模型与视频 SHA-256 见 [artifact-manifest.json](artifact-manifest.json)，浏览器原始路径到本目录的映射如下。

## 证据与测量方法

| 文件 | 方法与范围 |
| --- | --- |
| [browser/verification.json](browser/verification.json) | 最终 v11 完整小样验证，保留原始本机路径和原生 MCP 回包摘要 |
| `browser/CAM_*-1920.png` | 三个 Blender 摄像机，1920×1080、DPR 1、固定 t=8 |
| `browser/timeline-t*.png` | t=0/8/16/24/32，时钟驱动江面、倒影、舟摇和渔火 |
| `browser/determinism-*.png` | t=8→24→8 的两次截图字节相同 |
| `browser/reflection-off.png`、`shadows-off.png`、`fire-off.png` | 与完整画面像素对照，验证效果确实作用于浏览器绘制 |
| `browser/native-devtools-1920.png`、[browser/performance.json.gz](browser/performance.json.gz) | 原生 Chrome DevTools MCP 的真实页面截图和单独三秒追踪 |
| `browser/sample-1440.png` | 1440×900 检查页布局无横向溢出 |
| [asset-checks/](asset-checks/) | Blender 契约、GLB 契约、预算、八个坏资产夹具、构建/单测和独立重建日志 |
| [source.webm](source.webm) | 原始连续录屏，1440×900、25fps VP8、11.92秒，含准备阶段 |
| [sample-preview.mp4](sample-preview.mp4) | 原录像3.2–11.6秒连续剪辑，H.264、1440×900、25fps、8.4秒，未变速、无音轨 |

源目录为 `output/playwright/fengqiao-sample/v11-final`，资产验证源目录为 `output/fengqiao-sample`；归档只复制最终证据，先前失败与诊断保留在忽略的 output 中。原始录像路径为 `video/page@9ba445e2c5ca61820de3dd8c15a4e117.webm`。

三轮性能均在当前开发笔记本、1920×1080、DPR 1 下正常播放60秒，反射1024、月光阴影2048，未同时开启追踪。单独三秒追踪不混入性能门禁数据。浏览器为 HeadlessChrome 154，渲染器为 `ANGLE / AMD Radeon(TM) Graphics / D3D11`，启动指定 `--use-angle=d3d11 --ignore-gpu-blocklist`。测量是页面 RAF 帧间隔和 Three.js 实际累计绘制计数，不是离线渲染速度。

| 测量 | 最终结果 |
| --- | --- |
| 三轮平均帧率 | 59.995 / 59.995 / 59.945 fps |
| 三轮 P95 帧间隔 | 均16.8ms |
| 大于50ms的帧间隔 | 0 / 0 / 1 |
| 多 pass 最大绘制调用 / 三角形 | 20 / 47,744 |
| 小样开始装配至首帧 | 2,093.9ms；导航、登录和模块准备在内的总等待为3,863ms |
| 连续10次加载/释放 | 每次释放几何0、纹理0且上下文关闭；重载资源数稳定 |
| GLB | 9,294,744字节；14,859个资产三角形；7个主 pass primitive |
| 贴图含 mipmap 估算 | 48,933,554字节；最大1K，篷席512 |
| 校验与回归 | Blender零错误/警告；真实 GLB 契约与预算通过；八个破坏夹具拒绝；前端17文件69单测与构建通过 |

还检查了正常模式下键盘切机位/空格暂停、减少动态设置下时钟暂停、缺失 GLB 的失败提示和加载途中离开的迟到清理。正常路径脚本与控制台错误为零。GPU计数是释放证据，不等同于驱动进程总显存测量。

## 视觉范围与来源

小样检验真实 BaseColor/Normal/Roughness、湿石低粗糙度、冷月光与暖渔火、平面倒影加细波扰动，以及摄像机和舟摇接口。反射只适用于当前平静江面；火焰是简化造型和亮度闪烁。石岸排列、木舟风化和火焰形态属于可继续精修的外观，证据不代表整首枫桥已通过艺术验收，也不包含寺、桥、植被、月落、薄雾、钟声或产品内火烧/翻页三维衔接。答辩机尚未确定，本机数据不替代 R4 目标机复验。

木材、岩石、篷席 PBR 图像来自 Poly Haven 的 CC0 资产，作者、原图、裁切、色彩处理与分发尺寸登记在 [CREDITS](../../../../CREDITS.md)。几何为本项目参数化原创，未使用付费模型生成服务。法线/粗糙度保持 lossless PNG；摄影 BaseColor 发布为 JPEG。
