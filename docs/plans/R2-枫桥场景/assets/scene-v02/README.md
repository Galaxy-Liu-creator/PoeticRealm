# 远近层级与渲染检查证据

本目录保存独立scene-v02候选的实际原始报告与校验值，范围为quality-sample；当前任务状态只维护在根HANDOFF.md。

制作源：art/blender/fengqiao-scene-v02.blend。远景分段源码：art/scripts/components/fengqiao/{distance_lod,frame_lod,roof_lod}.py。components包含历次检查，最终选择以artifact-manifest.json的selectedFarReports为准；早期减面尖角与无效屋面候选保留为非导出历史。

Blender重导出仅有船夫皮肤一项切线值漂移，restore-lod-near-tangents.mjs在压缩前恢复原发布流；严格compare-lod-near.mjs核对全部原命名近景节点、顶点字节、材质、贴图与绑定。远景是新制作的简化几何；其后的PNG/WebP/Meshopt编码才是无损步骤。

runs保存早期性能失败、矩阵与水面优化之后的完整门禁，以及最终资产和旧小样回归。frames为真实机位、距离阈值、时间线和缩窗截图，scene-preview.webm为未变速的原始连续录像；video-review包含三处实际提取帧。静态合并有少量Float32边缘舍入，另两项渲染优化及切线恢复前后均要求逐像素一致。

复验：从frontend运行真实契约/预算及compare-lod-near.mjs；以SAMPLE_MANIFEST=public/assets/scenes/fengqiao.scene-v02.json运行verify-fengqiao-sample.mjs。完整脚本保留3秒、三轮60秒≥50fps/P95≤20ms、十次释放等门禁。--diagnose-load仅继续采证，不改变失败结果。制作与发布方法以AGENT.md、CONTRACT及modeling计划为准，后续另存新修订，不覆盖此目录。
