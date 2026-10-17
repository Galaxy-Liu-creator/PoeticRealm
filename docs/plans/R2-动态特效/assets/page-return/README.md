# 翻页返回与页面会话验收 · 2026-10-05

本目录是当前 Docker 生产构建的验收证据。翻页使用现有诗境 DOM 和已登记背景，CSS 三维分栏形变、纸背与阴影由统一时钟计算；没有新增生成素材、付费服务或依赖。当前诗境仍为静态预览，未来真实 WebGL 场景需要单独接入快照。

- `source.png`、`return-000/150/300/500/700/900/1000.png`：1440×900 实际页面固定进度，起点、纸面曲率、背面、阴影与终点。
- `native-1920-mid.png`：原生 Chrome DevTools MCP 的 1920×1080 实际中途截图。
- `return-verification.json`：翻页 10 组验收的原始报告，首帧差异约 0.927%，滚动恢复 170px；1920 正常播放 64 帧／1100.2ms、P95 16.8ms。
- `source-playback.webm`：上述报告 `video` 指向的原始录像副本。报告保留当时 output 路径，不改写测量记录。
- `return-demo.mp4`：源录像最后 3 秒连续片段，1440×900、25fps，无变速；FFmpeg 转为 H.264/yuv420p。
- `native-performance.json`：直接调用原生 MCP 的结果摘录。未追踪正常播放 67 帧／1100.2ms、P95 16.8ms、无 >50ms 帧；另一次 DevTools 追踪 CLS 0，ForcedReflow 无问题，Console 无错误或警告。两个采样不混用。
- `session-verification.json`、`remembered-login.png`：真实 MySQL／后端的 10 组页面会话验收与记住凭据的登录状态。截图密码栏是空值与圆点占位，不含密码。关闭生命周期检查明确发送 pagehide，并验证访问立即被撤销和刷新窗口过期；自动化关闭目标不保证发送浏览器生命周期事件。
- `motion-regression.json`、`fire-regression.json`：既有动效 10 组及火焰 6 组在同一生产构建上的复验。其录像保留在被忽略的 output，此前可审阅火焰源录像仍在 `../fire-v2/verified`。

生成命令和测试账号记录保留在被忽略的 `output/page-session`；日志不包含真实密码、Cookie 或访问令牌。失败尝试保留原位置，未放宽性能阈值。原生截图、固定帧及正常录像已实看；后台切换、未来三维负载和所有设备的性能不在本次结论内。
