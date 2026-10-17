# Stitch 源稿校验预览

这里是 **v05 原始 Stitch HTML 的本地浏览器渲染**，不是新 Stitch 出图。Stitch T01/T04 封面修订请求连接失败，原始 PNG 与 HTML 保留在 v05；这些预览解决交付文件中的资源缺失，不接入应用。

| 分镜 | 可审阅预览 | 本地预览源稿 | 原始 Stitch PNG |
|---|---|---|---|
| 中央火烧 | [PNG](T01-fire-reveal.preview.png) | [HTML](T01-fire-reveal.preview.html) | [v05 原稿](../../v05/transitions/T01-fire-reveal.png) |
| 翻书返回 | [PNG](T04-page-return.preview.png) | [HTML](T04-page-return.preview.html) | [v05 原稿](../../v05/transitions/T04-page-return.png) |

## 原稿上的修正

- 缩略总览用 v02 已有的枫桥、江雪、白帝城封面；背景用已存山水图。诗境夜江用 v03 同任务返回的概念景观。全部本地引用，避免损坏图片图标和白帝城误用夜景。
- 翻页卡片的无效 `h-15` 修为明确 60px；分镜紧接标题，补齐 0/25/50/75/100% 标签。
- 火烧焦边沿原源稿的中央多边形遮罩匹配，移除未贴合破口的椭圆边与矩形描边；不改变中央外扩揭幕方向。
- 预览页脚明确标为 Stitch 源稿校验预览；未覆盖原图，没有手工涂改图片像素。

[浏览器检查](preview-verification.json)：Chromium 1600px 桌面视口，火烧 7 张图片、翻页 12 张图片全部加载，无横向溢出，两板百分比标注完整。

此预览只表达静态分镜方向。连续火缘、纸页真实曲率、光照与运行时性能，须在用户确认后用 Three.js / GLSL 的实际动态作品验证。
