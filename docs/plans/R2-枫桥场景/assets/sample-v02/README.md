# 枫桥小样 v02 · 船夫与划桨证据

用户要求：「船后面的石头是什么？以及船上没有人啊，船上应该有人划桨的」。石块是小样的干湿石岸、入水基座，用于观察材质和倒影；当前规整形态不作为完整自然岸线的艺术定稿。

v02 在保留 v01 源文件与导出的基础上，增加原创坐姿船夫、斗笠、交领布衣、15 骨骼蒙皮和工作桨。人物是适合场景远景的简化模型，不标为真人扫描或精确服饰考据。源文件为 `art/blender/fengqiao-sample-v02.blend`，发布模型为 `frontend/public/assets/models/fengqiao/sample_v02.glb`。追加脚本为 `art/scripts/add_fengqiao_rower.py`；材质与来源见 [CREDITS](../../../../CREDITS.md)。

划桨由全局时钟确定桨姿态，再通过双臂 IK 跟随桨柄挂点。验证同时检查骨骼与实际蒙皮手部顶点，避免只验证挂点而遗漏蒙皮错误。`rowing-t*.png` 覆盖 0、1.2、2.4、3.6、4.8 秒；JSON 记录双手误差和桨叶入水／出水位置。减少动态固定船夫姿态；独占实例退出时释放骨骼纹理。

真实浏览器验证使用当前开发笔记本、Chrome 154、AMD Radeon D3D11、1920×1080/DPR 1。`browser-verification.json` 是完整结果：三轮各 60 秒未追踪播放、五时刻划桨、固定时间画面复现、真实反射／阴影／渔火像素对照、键盘、1440×900 缩窗、十次加载／释放、减少动态、缺失 GLB 与加载中离开。正常路径通过隔离视觉身份进入，不创建数据库账号，不替代认证专项。原生 Chrome DevTools MCP 检查 DOM、截图和控制台，并单独录制三秒性能追踪。

首帧门禁包含模型装配、环境准备、着色器／贴图预热及第一次完整绘制，保持小于 3 秒。`loadPhases.environment` 是 assembly 的子项，`textureUpload` 是 compile 的子项，不能重复相加；包含导航与隔离登录的等待另记为 `firstLoadMs`。预热覆盖环境、反射的线性色彩输出、阴影与主画面程序，未降低 1024 倒影或 2048 阴影分辨率。

文件对应关系：

- `browser-verification.json`、`native-devtools-1920.png`、`performance.json.gz`：完整浏览器结果、原生截图与独立追踪。
- `CAM_*-1920.png`、`rowing-t*.png`、`timeline-t*.png` 及开关对照：真实浏览器固定帧，原图未修饰。
- `blender-validation.json`、`rebuild.log`：原生制作端语义校验和隔离的独立脚本重建。语义重建不保证与 MCP 导出字节相同。
- `node-contract.log`、`node-budget.log`、`asset-tests.log`：真实 GLB 契约、预算及破坏夹具检查。
- `build.log`、`unit-tests.log`：最终构建／类型检查和前端单测原始日志。
- `rower-source.webm`、`rower-preview.mp4`：真实浏览器源录制与连续截取，截取时间、编码信息及 SHA-256 见 `artifact-manifest.json`，未变速。

验证命令从仓库根执行：

```bash
npm --prefix frontend run build
npm --prefix frontend test
npm --prefix frontend run check:contract
npm --prefix frontend run check:budget
npm --prefix frontend run test:assets
SAMPLE_BASE=http://127.0.0.1:5187 SAMPLE_OUTPUT=output/playwright/fengqiao-rower/recheck node frontend/tools/verify-fengqiao-sample.mjs
```

本证据仅覆盖四元素局部小样及新增人物，不代表完整枫桥、目标答辩机、声音或三维转场验收。v01 历史证据保留在相邻 `sample-v01`，失败诊断保留在忽略的 `output/playwright/fengqiao-rower`，不覆盖原记录。
