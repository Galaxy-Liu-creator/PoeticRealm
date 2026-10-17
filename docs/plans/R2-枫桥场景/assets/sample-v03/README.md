# 枫桥小样 v03 · 船夫精修与船尾摇橹

用户要求：「建模稍有点粗糙，应该再精细一点，真正贴近船夫划船，或者你可以去github等查找类似的模型学习复刻一下」。本轮沿用 v01/v02 舟体和材质小样，在独立 v03 文件中替换简化人物与工作桨；历史 blend/GLB 的 SHA-256 保持不变。

人物基础来自 [MakeHuman Community MPFB2](https://github.com/makehumancommunity/mpfb2/tree/d0a32e57a7f915cb2f2b95410e2117648c7bbb7e) 的 CC0 hm08 数据，固定 commit、原始文件、许可和逐文件校验值保存在 `art/references/mpfb-hm08-d0a32e5/source.json`。只采用人体、眼睛、宏变形和53骨骼权重；未复制 GPL 程序代码，也不导出 helper cubes 或无关身体部件。布衣使用 [Poly Haven Rough Linen](https://polyhaven.com/a/rough_linen) 的 CC0 BaseColor/Normal/Roughness，工作原图和8位发布处理记录在 `art/textures/fengqiao-v03/source.json`。来源与项目改造见 [CREDITS](../../../../CREDITS.md)。

动作学习 [大澳文化协会的摇橹说明](https://www.taioca.org/about-3)：固定船尾支点、弯柄、甲板牵绳、双手握柄、V字站姿、重心与肩肘配合、橹叶在水下换向。只参考其结构与动作，未下载或再发布照片；不以现代参考证明唐代船型或服饰考据。本项目制作了衣领、衣摆、腰带、袖口、鞋、斗笠和橹结构，并修正衣摆/裤腰穿插。

`Rower.ts` 从全局 t 重建4.8秒摇橹循环：先求橹姿态和等长牵绳，再求双臂与双腿IK；手掌锚点与腕骨分开，手指弯曲握柄，脚部固定甲板，船体另随江面轻摆。`rowing-t*.png` 是五个姿态的原始浏览器截图；JSON另记录整个循环97采样点的掌部、实际蒙皮手部、脚、绳和橹叶约束。普通划桨的入水/出水要求仍保留在旧模型验证分支，摇橹采用持续浸没门禁。

完整验证使用当前开发笔记本、Chrome154/AMD Radeon D3D11、1920×1080/DPR1：三轮各60秒未追踪播放，原50fps/P95≤20ms/≤120调用/首帧<3秒门禁保持；另验固定时刻画面字节复现、反射/阴影/渔火像素对照、键盘与1440×900视口、十次加载/释放、减少动态、GLB缺失与加载中离开。身份使用隔离视觉夹具，不创建数据库账号，不替代认证专项。原生 Chrome DevTools MCP检查真实DOM、截图、Console，并单独录制三秒追踪。完整结果见 `browser-verification.json`，本机指标不替代答辩机R4复验。

首帧计时从小样模块开始准备，包含模型、环境、装配、着色器/贴图预热和第一次完整绘制。环境在模型下载期间生成，`loadPhases.environment` 与 `asset` 重叠；`textureUpload` 是 `compile` 子项，不可直接累加。含导航与隔离登录准备的等待另记 `firstLoadMs`。倒影1024、阴影2048、天空512×256均保留。

文件对应关系：

- `browser-verification.json`、`native-devtools-1920.png`、`performance.json.gz`：完整验证、原生截图和独立追踪。
- `CAM_*-1920.png`、`rowing-t*.png`、`timeline-t*.png`、开关对照和1440截图：实际浏览器原始画面。
- `blender-validation.json`、`node-contract.log`、`node-budget.log`、`asset-tests.log`：制作端、真实GLB契约/预算、14个坏资产夹具结果。
- `build.log`、`unit-tests.log`：最终构建/类型检查与单测原始日志。
- `rower-source.webm`、`rower-preview.mp4`、`preview-{start,mid,end}.png`：原始录制、末段连续剪辑及起/中/末提取帧。未变速；原片时长、裁切起点、预览时长与SHA-256在 `artifact-manifest.json`。

从仓库根复验与归档：

```bash
npm --prefix frontend run build
npm --prefix frontend test
npm --prefix frontend run check:contract
npm --prefix frontend run check:budget
npm --prefix frontend run test:assets
SAMPLE_BASE=http://127.0.0.1:5187 SAMPLE_OUTPUT=output/playwright/fengqiao-rower-v03/recheck node frontend/tools/verify-fengqiao-sample.mjs
python art/scripts/archive_rower_evidence.py output/playwright/fengqiao-rower-v03/recheck
```

模型制作从保存的 v02 场景开始执行 `art/scripts/refine_fengqiao_rower.py`，输出 `art/blender/fengqiao-sample-v03.blend` 与 `frontend/public/assets/models/fengqiao/sample_v03.glb`。本证据只覆盖局部小样及船夫精修；完整寺/桥/岸线/植被、声音、诗句镜头、产品内三维入境与返回仍待后续。v01/v02证据保留，失败和中间诊断在忽略的 `output/playwright/fengqiao-rower-v03`。
