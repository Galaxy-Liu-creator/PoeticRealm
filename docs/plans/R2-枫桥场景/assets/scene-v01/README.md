# 桥寺与河岸组件候选证据

本目录归档独立 scene-v01 的制作与实际浏览器证据，范围为 quality-sample。原始门禁结果及资产校验值见 artifact-manifest.json；性能与生命周期报告分别保留，后者不能替代前者。当前任务状态只维护在根 HANDOFF.md。

源文件：art/blender/fengqiao-scene-v01.blend；分段源码：art/scripts/components/fengqiao；候选清单：frontend/public/assets/scenes/fengqiao.scene-v01.json。

components 保存独立组件几何检查；compression 保存逐像素/逐原字节无损核验；frames 为实际1920/1440/390截图，scene-preview.webm 为原始连续录制，未变速或补帧。performance 与 lifecycle 内的 verification.json 为完整原始报告，包含实际硬件与严格门禁结果。

复验：先运行 Node 资产契约/预算工具，再按 HANDOFF.md 的候选清单与输出参数运行 verify-fengqiao-sample.mjs。--diagnose-load 只继续采集失败后证据，不修改最终3秒门禁。保留非导出组件与历史小样，按 AGENT.md 分段修改。
