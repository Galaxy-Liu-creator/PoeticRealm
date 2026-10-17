# 诗境 · 一卷山河

**Poetic Realm · A Scroll of Mountains and Rivers**

> 循诗入境，展卷见山河。

以浮动诗词卡片为入口，通过按意象设计的转场进入有真实材质、光照与自然动态的三维山水；读诗、观景、收藏，再翻页回到诗词总览。

> 前端在 `frontend/`，Spring Boot 后端在 `backend/`。打开页面先登录，刷新保持身份与当前页面；30天记住凭据仍需点击登录。意象入场和书页翻回已实现，三诗场景仍为静态预览。收藏、资料、头像和浏览记录按账号保存在本机。当前状态与验证见 [HANDOFF](HANDOFF.md)。

## 新版目标与阶段

- 登录后进入诗词总览：全宽山水题头、行书“诗境·一卷山河”、绢纸山影与竹叶底景、三张对齐诗卡，以用户指定 v09 原图为准。
- 按诗意入场：中央火烧、右上广域碎雪、云水揭幕；诗境中竖排读诗、观察真实山水。
- 顶部导航：总览、收藏、个人中心；首页无返回，诗境翻页返回总览。
- 按用户原图实现个人中心、登录/注册与全屏幕布入口；认证使用 Spring Boot，个人中心显示真实账号身份，本机资料按游客和账号隔离。
- 已按指定稿开始代码还原；设计归档、当前实现和最终实机验收分别记录。

## 首版三首诗

| 诗词 | 视觉与意境 | 重点 |
|---|---|---|
| 《枫桥夜泊》· 张继 | 蓝灰夜江、木舟、唐风寺、暖渔火 | 月落与钟声“到”客船 |
| 《江雪》· 柳宗元 | 银灰雪山、冷青江水、真实孤舟与蓑衣 | 静、寒、孤与广域碎雪 |
| 《早发白帝城》· 李白 | 青绿峡谷、晨霞、江流、轻舟 | 纵深、两岸猿声与稳定行舟 |

## 技术与边界

Blender + Three.js（WebGLRenderer，three.js 0.186.1 精确锁定）+ GLSL + TypeScript + Vite + GSAP。复杂主体在 Blender 制作；自然环境用可复用 JS / Shader 系统。全局时钟、种子随机、GLB 机位来源与资产许可要求继续保留。

当前资产契约 v0.1 仍有效；写实 PBR 输入等需在后续实施时同步更新 CONTRACT、校验脚本、资产与加载代码，本轮不更改接口。

## 运行 UI 与保留的技术原型

前后端和数据库一键启动：

```bash
node tools/docker.mjs up
```

默认访问 **http://127.0.0.1:5173**，首次自动生成本机密钥并构建三个服务。端口冲突、停止、重启和数据持久化见 [Docker 启动说明](docs/Docker启动.md)。

独立前端开发：

```bash
npm --prefix frontend ci
npm --prefix frontend run dev
npm --prefix frontend run build
npm --prefix frontend test
npm --prefix frontend run check:contract
```

以上命令从仓库根执行，开发端口为 5173，构建输出 `frontend/dist/`。`check:contract` 当前为空占位，退出成功不算有效契约验证。`/api` 开发代理默认指向后端8080；后端离线时账号表单提示连接失败，受保护页面需要登录。登录生命周期验收使用 `node frontend/tools/verify-session.mjs`，只对隔离测试数据库执行。

后端配置与启动见 [backend/README.md](backend/README.md)。先复制本机配置示例、填写 MySQL 连接和随机持久登录密钥，再在 backend 执行 `./mvnw spring-boot:run`。暂未配置数据库时可使用文档中的隔离 H2 测试服务器，H2仅存在于测试依赖中。

登录后，显式 `?scene=<id>&t=<秒>`、`?q=high|mid|low` 或 `?debug` 仍进入独立保留的 P0，保留 `window.__POETIC__`；这些参数也受认证限制。不带这些参数时使用 `#/`、`#/favorites`、`#/profile`、`#/poems/<id>`、`#/account`、`#/login`、`#/register`。

建模源文件和导出模型（`.blend`、`.glb`、`.gltf`、`.fbx`、`.obj`）在 Windows / Ubuntu 本机保留，由 `.gitignore` 排除，不提交 GitHub。克隆代码后，运行三维场景前需从原工程或本地备份复制 `frontend/public/assets/models/`；继续建模时还需复制 `art/blender/` 及 `art/references/` 中的本地模型。场景清单、高度图和环境资源仍随代码入库。制作端命名、导出、预算见 [CONTRACT](docs/CONTRACT.md)。

## 文档与目录

| 入口 | 内容 |
|---|---|
| [设计文档 v3](docs/设计文档.md) | 页面、交互、视觉、技术边界 |
| [UI 设计与审批](docs/design/README.md) | brief、提示词、参考、实际生成状态、审批表 |
| [分镜](docs/STORYBOARD.md) | 火 / 雪 / 云水 / 翻页与诗境分镜草案 |
| [验收清单](docs/CHECKLIST.md) | 区分设计审批和运行时验证 |
| [计划索引](docs/plans/README.md) | R1A 认证及 R2–R4 后续阶段 |
| [来源与许可](docs/CREDITS.md) | 库、素材、参考与生成声明 |
| [前后端与认证规划](docs/architecture/前后端分离与认证规划.md) | 目录、API、会话、Spring Boot 创建配置 |
| [认证接口](docs/api/认证接口.md) | 请求、错误、CSRF、持久登录与数据边界 |
| [项目约定](AGENTS.md) | 长期协作、素材、验证规则 |

`frontend/` 是独立前端工程，`frontend/src/` 保留 UI/引擎/场景分层；`frontend/public/assets/` 存契约资产。运行 UI 图片在 `frontend/src/assets/ui/`，副本来源可追溯，发布限制仍有效。`art/` 和 `docs/` 保留根目录；`backend/` 是独立 Maven 工程，保留用户创建的 com.demo.backend 包名。

## 验证与已知限制

- 既有进度记录：P0 T1–T5 已完成，包括工程 / 时钟 / 随机、灰模导出、高度图与 GPU 墨扩散测试；本轮回归现有单测和查询入口，未重跑全部 Blender 制作、视觉与目标机性能验收。
- R1 UI 验证与 R1A 认证验证分别见阶段报告，当前结果见 HANDOFF。Blender 制作端的既有校验不代表本轮重制资产。
- 三诗是明确标注的静态预览，意象入场与翻页已实现，写实场景继续在 R3 完成；通知、推荐、密码找回与云同步未开放。注册不会自动登录；“记住我”使用服务端可撤销的30天凭据，密码不进入浏览器存储。
- 页面沿用原图的青黛山水与绢纸构图；字体、完整无文字分层背景与精细装饰仍需收敛。当前图片仅获本地还原用途，构建包包含预览原图，许可与资源优化完成前不发布。
- 设计图：已通过 Stitch MCP 完成总览、三首诗境、收藏、个人中心、关键状态与四类转场分镜，仅桌面网页。原稿、请求、概念素材与来源记录存于 docs/design；火烧、翻页另附明确标注的源稿资源校验预览。设计审批不代表运行时功能已实现。
- 比赛截止为 **2026-10-23**；其余比赛规则、答辩机与团队分工仍需确认。
- 原 P0 T6–T9 暂停按旧目标执行；现有代码和资产保留，不丢弃技术实验。

## 署名与许可

作者：[Galaxy-Liu-creator](https://github.com/Galaxy-Liu-creator)。项目许可尚未确定；外部资源按 CREDITS 单独登记。AI 设计输入见 [prompts.md](docs/design/2026-10-01-v3/prompts.md)，已执行的首页任务和原图来源见 [generation-log.md](docs/design/2026-10-01-v3/generation-log.md)。
