# scene-v03 夜景与产品流程证据

本包对应2026-10-08的本地版本快照。当前任务状态只维护在根目录HANDOFF.md；本文件说明证据的来源、方法与适用范围。

用户请求：完成月落、薄雾、声音和三维转场，时间紧时暂缓复杂四句镜头。正常产品入口为`http://127.0.0.1:5187/#/poems/fengqiao`；从总览“入境”可看到火光揭开真实三维画面。四句点击/键盘切换已制作的机位，没有新增复杂自动运镜。

## 最终功能证据

- [完整报告](accepted-flow/verification.json)：11组产品流程通过，真实Chrome154、AMD Radeon/D3D11；身份隔离夹具，未操作实库账号。
- [月落起点](accepted-flow/moon-t0.png)、[中段](accepted-flow/moon-t16.png)、[终点](accepted-flow/moon-t32.png)、[薄雾开启](accepted-flow/fog-on.png)与[关闭对照](accepted-flow/fog-off.png)均为真实WebGL截图，固定时刻重放像素一致。
- [1920](accepted-flow/product-1920.png)、[1440](accepted-flow/product-1440.png)、[390](accepted-flow/product-390.png)布局及[原生DevTools截图](accepted-flow/native-product.png)已检查；原生DOM/Console保存在完整报告中，正常Console/脚本错误0。
- [火光入境中段](accepted-flow/entry-p0.5.png)、[翻页中段](accepted-flow/return-p0.5.png)；进入同一Canvas，返回仅读回一次，48条带共用同一PNG。包含Esc、捕获失败、全屏、模型404、取消与重试的真实检查。
- [原始流程录像](accepted-flow/video/page@342f906d8e34c1a185f0a4d507cec9a0.webm)：107.84秒、1440×810、25fps VP8，未裁切/变速；包括自动化seek、暂停、取消和失败注入，不作为连续32秒月落或性能证据。7/50/90秒提取帧已目视检查。Playwright录像不含声音。
- 音频试听证据：[风](accepted-flow/audio/wind.wav)、[水](accepted-flow/audio/water.wav)、[乌啼](accepted-flow/audio/crow.wav)、[钟](accepted-flow/audio/bell.wav)。由当前浏览器模块原始PCM导出，24kHz单声道；不是外部采样或现场录音。实际WebAudio输出RMS0.01319，空间位置、暂停/静音/seek尾音经过浏览器验证，人的听感审阅仍开放。voice/music仅是预留总线，没有旁白/配乐内容。
- [构建含类型检查](accepted-flow/build.log)、[21文件88单测](accepted-flow/tests.log)、[真实Node契约](accepted-flow/contract.log)、[预算](accepted-flow/budget.log)均通过。`check:contract`旧占位命令没有充当有效验证。

## 性能证据与失败范围

保留原3秒首帧、至少50fps、P95≤20ms门禁，未以录屏开销、平均帧率或功能通过覆盖失败。

| 证据 | 实际方法/结果 | 范围 |
| --- | --- | --- |
| [product-final-perf](diagnostics/product-final-perf/verification.json) | 正常产品路由、声音开启、无录屏；月落/船夫/寺院各60秒；58.9456/55.729/58.1121fps，P95为16.8/33.3/16.9ms | 当前所选薄雾v2，船夫P95失败 |
| [cold-load-final](diagnostics/cold-load-final.json) | 五个独立新Chrome进程，3289.9/3178.3/2528.6/2559.2/2422.7ms | 2/5超3秒，不是磁盘重启冷态 |
| [full](diagnostics/full/verification.json) | 早期薄雾v1；八机位、LOD、摇橹97点、十次释放等均完成，三轮60秒58.75–59.46fps/P95 16.8ms | 首帧3119.2ms整轮失败；不是最终产品路由性能报告 |
| [rower-final](diagnostics/rower-final/verification.json) | 降varying的薄雾v3试验：40.83fps/P95 33.5ms | 未选用，已恢复所测v2 |

[早期cold-load](diagnostics/cold-load.json)、initial/quick、product、product-final、product-complete、product-perf各原始失败报告也保留。product-complete录屏影响性能；product-final早期音频分析器选错上下文导致误判，之后独立accepted-flow测真实running场景输出。product-final目录曾发生中断重跑，不能作为不可变的最终包。最终功能证据独立放在accepted-flow，性能失败仍如实存在。

[原生3秒DevTools追踪](diagnostics/full/performance.json.gz)对应早期完整lab检查，不替代无追踪的正常产品60秒采样。模拟visibilitychange已验，真实最小化与答辩机/离线包未用自动化结果冒充。

## 资产与复现

scene-v03是新完整清单与运行自然/声音系统，复用已含正式节点的scene-v02源/GLB。没有创建假Blender版本或覆盖原模型。模型+环境14,982,076B满足原15MB门禁；高度图/元数据另计2,212,184B，全分发17,194,260B，不宣称全包小于15MB。原高度图保持，远山高度/近区平滑是运行时显示处理。

[artifact-manifest.json](artifact-manifest.json)登记每份复制文件的来源、字节与SHA，12项历史源/GLB保护值、当前高度图SHA、原视频规格及未通过门禁。[source](source/)保留本次具体运行/检查/接口源码快照；这些是证据副本，不是另一个运行入口。旧sample/scene-v01/scene-v02证据未覆盖。

从`frontend`执行：

```bash
npm run build
npm test
node tools/check-contract.mjs public/assets/scenes/fengqiao.scene-v03.json
node tools/check-budget.mjs public/assets/scenes/fengqiao.scene-v03.json
UI_OUTPUT=../output/playwright/fengqiao-scene-v03/new-flow node tools/verify-fengqiao-scene.mjs
UI_OUTPUT=../output/playwright/fengqiao-scene-v03/new-perf node tools/verify-fengqiao-scene.mjs --perf
SAMPLE_ASSET=scenes/fengqiao.scene-v03.json COLD_OUTPUT=../output/playwright/fengqiao-scene-v03/new-cold.json node tools/check-fengqiao-cold-load.mjs
```

检查工具使用本机Chrome及Vite5187。重测换新的输出路径保留历史；归档脚本逐项核对副本SHA并拒绝覆盖本包。不含付费生成、外部发布或数据库改动。
