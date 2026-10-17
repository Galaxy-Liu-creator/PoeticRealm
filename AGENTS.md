# PoeticRealm 项目约定

## 入口与目录

- 当前状态和验证只写HANDOFF.md；阶段计划见docs/plans/README.md，架构见docs/architecture/前后端分离与认证规划.md。旧MEMORY入口已移除，历史可从Git恢复。
- 产品意图以docs/设计文档.md为准，Blender/GLB数据接口以docs/CONTRACT.md为准，字体遵循docs/字体规范.md。
- 前端独立工程在frontend，后端目标在backend；根保留art/docs。从根执行npm --prefix frontend等命令。
- 普通产品网页每次新打开或刷新先展示#/account大帘幕，再在同页进入登录/注册；恢复已有身份不跳过帘幕。保留显式实验lab入口。
- 本地读/搜索/发现与终端必须使用FastCtx，终端为非交互POSIX Bash。遵守会话提供的FastCtx、子代理与Git提交/推送规则。

## 渲染与资产

- 产品仅面向桌面网页端；不新增移动端设计、适配或手机截图验收。
- 诗意文本与首页“循诗入境，展卷见山河”标语共用--font-poetic，不另设独立楷体字体栈；品牌、标题与功能文字保留各自角色。
- 全局通知、加载与失败提示采用顶部紧凑宣纸云纹样式，与导航同高，置于品牌与导航链接之间的空位；普通通知与存储警告约1.5秒收起，加载/失败及确认对话框保留取消/重试/确认行为；多个通知依次排列，转场时保留当前操作提示。
- 保留WebGLRenderer+GLSL和锁定的three.js；场景动画由全局时钟f(t)及种子随机驱动，仿真固定步长重建。现有R1 DOM拉幕Animation/currentTime边界见报告。
- 机位/焦点来自Blender CAM_/FOCUS_，复杂主体用Blender/GLB，自然系统放frontend/src/systems和shaders，scene只组装与编排。
- 资产契约按CONTRACT→校验→资产/加载代码同步改；目录迁移不改米制、节点、材质槽位与高度图编码。
- 发布资产在frontend/public/assets，来源/许可登记CREDITS。frontend/src/assets/ui仅是已登记本地预览副本，不推断发布许可；原稿留docs/design。
- 游客与账号数据隔离，不保存密码到浏览器存储，不把用户名记忆当免登录；UI首版不等于真实三维、后端或性能达标。
- 诗句竖排右起；页面体验遵循已选原图和字体规范，保留总览直达、意象入场和翻页返回目标。不加游戏HUD、宫廷金红、霓虹/玻璃拟态；建筑唐风。新增设计原稿如实记录工具与来源，不以手写占位冒充生成稿。

## 协作

- Blender 制作必须遵守 [AGENT.md](AGENT.md)：分段构建小组件，独立检查后组装主体与场景，禁止一次性生成整体模型；每次修改优先处理受影响组件。
- 使用现有Git身份；提交及PR不加Co-Authored-By或AI协作者署名。提交/推送前按会话规则审查范围、diff和变更大纲，当前用户授权优先。
- 不混入无关修改；通用长期约定写本文件，Blender分段建模专项约束写AGENT.md，任务状态只写HANDOFF.md，不建第二份进度文档。
- 按风险执行单测、浏览器/固定时刻截图及Blender校验；check:contract为空占位，退出成功不算有效契约验证。
- 设计原稿、请求、manifest、来源及验收证据保留，历史阶段标明，不覆盖生成历史。
