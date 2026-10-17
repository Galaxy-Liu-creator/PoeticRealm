# v04 · 侧舷划桨与舟体封闭检查

2026-10-07。依据用户“桨从侧面跨过船边，不跨船尾；船首船尾不能开口”的要求制作。本目录是四元素局部小样证据，完整枫桥、声音及产品内三维入境/返回按 [后续制作计划](../../plan.md) 继续；当前任务状态见根 HANDOFF。

桨支点移到船夫身侧的舷缘上方，重做外侧桨杆、弯桨柄、支撑榫与桨叶轴；保留原人体蒙皮和掌内接触点。连续船壳有底面、侧面、两端封板及实体厚度，乘员舱顶部保持开放。v01–v03源和GLB均保留，校验值记录在 artifact-manifest.json。

- 制作：[repair_fengqiao_boat.py](../../../../../art/scripts/repair_fengqiao_boat.py)，从保存的 v03 开始；源 `art/blender/fengqiao-sample-v04.blend`，发布 `frontend/public/assets/models/fengqiao/sample_v04.glb`。
- 动作：[Rower.ts](../../../../../frontend/src/systems/characters/Rower.ts)，由全局 t 重建 4.8 秒横扫、扭桨、牵绳约束与双臂/双腿 IK；减少动态固定姿态。
- 几何：[oar-clearance.mjs](../../../../../frontend/tools/oar-clearance.mjs)，使用实际 GLB 网格和浏览器局部桨变换，不以挂点距离代替穿模检查。
- 环境：[NightEnvironment.ts](../../../../../frontend/src/systems/materials/NightEnvironment.ts)，恢复原创天空的 RGBA16F CubeUV 原值；源及许可见 environment-source.json / CREDITS。该路径按锁定 Three.js 0.186.1；版本升级须复查 PMREM 格式。

## 验证方法

1. Blender 校验 PBR/UV/坐标及船壳非流形边；独立打开已保存源执行 validate.py，原始日志 blender-source-validation.log。
2. Node 实际解析交付 GLB，位置焊接后检查船壳各边均有两面；18 个破坏夹具覆盖原材质/骨架/锚点、封板删面/父级和环境版本/尺寸。另用故意插入船壳的桨姿态证明碰撞检查会报警。
3. 完整循环 97 点检查掌部、蒙皮掌部中心、脚部、绳长和入水锚点；桨杆/桨柄/桨叶与连续舟壳、既有木构件零三角形相交。支撑榫、绑扎、牵绳为设计接触，不纳入活动桨穿壳检查。离散采样加连续视频目视检查，不宣称连续碰撞证明或整个人物接触面的验证。
4. 原程序 PMREM 与烘焙恢复在 t=2.4 近景逐像素对照；原始 gzip 静态响应与 HTTP 自动解压均检查。声明但缺失的环境必须明确失败；模型/环境加载中离开都不能留下迟到场景。
5. 实际 Chrome/AMD Radeon/D3D11，在 1920×1080/DPR1 连续测三轮各60秒；保持 ≥50fps、P95≤20ms、≤120 calls、首帧准备<3秒。独立原生 Chrome DevTools MCP 检查 DOM、Console、截图和三秒追踪；性能播放与追踪分开。
6. 十次加载/释放检查几何、纹理、上下文和重载基线；键盘、1440×900、固定时间复现、反射/阴影/渔火对照、减少动态、404及取消均检查。身份采用隔离视觉夹具，不创建数据库账号。

最终原始结果见 [browser-verification.json](browser-verification.json)，资产/来源/视频 SHA-256 见 [artifact-manifest.json](artifact-manifest.json)。首次超时、动作越界与未达门槛的诊断保留在忽略的 output/fengqiao-boat-v04 与 output/playwright/fengqiao-boat-v04，最终目录只归档完整通过的修订。

## 观看与复现

[8.4秒侧舷划桨预览](rower-preview.mp4)，原始浏览器录像 [rower-source.webm](rower-source.webm)。预览仅连续裁切，不变速；起、中、末帧分别为 preview-start/mid/end.png。

![侧舷支点及封闭舟体](CAM_boat-1920.png)

从项目根执行构建/单测和 Node 门禁；浏览器专项从 frontend 执行，保持 Vite5187 与既有后端代理。ENVIRONMENT_BASELINE 取保留的原程序环境近景，不能换成新实现自己的截图。

```bash
npm --prefix frontend run build
npm --prefix frontend test
node frontend/tools/test-asset-contract.mjs
cd frontend
ENVIRONMENT_BASELINE=../docs/plans/R2-枫桥场景/assets/sample-v04/environment-procedural-baseline SAMPLE_OUTPUT=../output/playwright/fengqiao-boat-v04/recheck node tools/verify-fengqiao-sample.mjs
```

烘焙基线的独立截图及来源保留在 environment-procedural-baseline；其原始运行有一轮 P95 未达门槛，只作为程序环境的像素参考，不作为性能验收。跨机器复验记录显卡/驱动及像素差异，不能跳过场景几何及性能门禁。
