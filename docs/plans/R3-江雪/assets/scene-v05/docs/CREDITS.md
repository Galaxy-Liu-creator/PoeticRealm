# CREDITS · 来源与许可登记

> 规则（设计文档第 26 章）：**未在本文件登记来源和许可的素材，不得进入 `frontend/public/`**。R1 经用户授权用于本地还原的预览素材另列下方；预览授权不推断为对外发布许可。
> 古曲公版 ≠ 录音公版；古画公版 ≠ 博物馆高清图可随意使用（只作定调参考，不直接做贴图）。

---

## 第三方库

| 名称 | 版本 | 来源 | 许可 | 用途 | 备注 |
|---|---|---|---|---|---|
| three.js | 0.186.1 | https://github.com/mrdoob/three.js | MIT | 渲染 | 含 GLTFLoader、EffectComposer、MeshSurfaceSampler 等 examples 模块；Meshopt 解码器（MIT，zeux/meshoptimizer）随 three 分发 |
| GSAP | 3.15.0 | https://gsap.com | GSAP Standard "No Charge" License | 分镜动画编排 | 2024 年起全部插件免费，允许商用；许可禁止用于与 Webflow 竞争的产品，本项目不涉及 |
| lil-gui | 0.21.0 | https://github.com/georgealways/lil-gui | MIT | `?debug` 参数面板 | 仅调试模式动态加载 |

## 字体

| 名称 | 来源 | 许可 | 用途 | 备注 |
|---|---|---|---|---|
| 本机华文行楷 | 浏览器本机字体 | 仅引用已安装字体，不拷贝或分发字体文件 | 品牌字标、品牌主视觉与幕布题字 | 缺失时回退楷体；字体规范限定品牌用途 |
| 本机 Noto Serif SC / 思源宋体 | 浏览器本机字体 | 同上；未新增字体文件或字体外链 | 页面/章节/诗卡标题、昵称及主按钮 | 本机实测 Noto Serif SC；缺失回退 Songti SC / 宋体 |
| 本机 KaiTi / 楷体 | 浏览器本机字体 | 同上 | 诗文、宣传语、副标题、签名及纸卷提示 | 2026-10-09 用户确认统一为首页标语实际字形；CDP实测KaiTi，共用--font-poetic，不再优先选择未安装的文楷 |
| 本机 Noto Sans SC / 思源黑体 | 浏览器本机字体 | 同上 | 导航、表单、数据、设置、功能信息 | 本机实测 Noto Sans SC；缺失回退微软雅黑 |

## 数据

| 名称 | 来源 | 许可 | 用途 | 备注 |
|---|---|---|---|---|
| 三首唐诗原文 | 《枫桥夜泊》《江雪》《早发白帝城》原诗 | 古典原文 | 四列 DOM 诗文 | 译文、简注为本项目释义，不复制现代出版译本 |

## R1 本地 UI 预览素材

2026-10-01 用户授权代码还原。2026-10-02 前端迁移后，以下实际使用图片以字节一致的运行副本放 frontend/src/assets/ui，映射记录见该目录 sources.json；原稿仍留 docs/design，不覆盖、不搬入 frontend/public。Vite 构建会打包这些图片至 frontend/dist，**该预览构建不可直接对外发布**。工具条款、用户图发布权及比赛 AI 声明仍待核实，迁移不改变许可。

| 来源 | 本地用途 | 许可状态 |
|---|---|---|
| v09 S01 主页用户原图 | 三卡封面、首页背景提取来源 | 用户指定本地还原；对外发布待核实 |
| v09 S05 收藏用户原图 | 归档视觉参考；运行背景与总览共用 | 同上 |
| v07 S06 个人中心用户原图 | 无文字题头、示例默认插画头像 | 同上，不自动上传头像 |
| v10 S11 登录用户原图 | 四项体验插画、用户名/密码/显隐/月亮图标的无文字局部 | 同上 |
| v10 S12 注册用户原图 | 三项体验插画、莲花品牌及日历图标的无文字局部 | 同上 |
| image_gen · auth-split-background-v1 | v10 登录原图去 UI 后的完整山水与曲线白面；登录与注册共用 | 用户原图衍生，本地预览；补绘遮挡区，原图未覆盖，对外发布待核实 |
| image_gen · account-landscape-v1 / account-paper-v1 | v07 账号旧背景与绢纸，仅保留历史，不再运行引用 | 用户原图衍生，本地预览；对外发布许可与比赛 AI 声明待核实 |
| image_gen · home-background-v1 | v09 首页原图提取的全幅无文字背景；总览、收藏与个人中心共用纸纹、竹叶与底部船景，首页另用顶部山水；原卡片遮挡处生成补绘 | 用户原图衍生，本地预览；原图未覆盖，对外发布待核实 |
| v07 S13 幕布用户原图 | 完整双帘幕背景提取来源与构图基准 | 同上；文字按钮由 DOM 实现 |
| image_gen · curtain-background-v1 | S13 去文字后的完整闭合双帘幕；中心等分用于静态入口及拉开转场 | 用户原图衍生，本地预览；原图未覆盖，对外发布待核实 |
| image_gen · profile-editor-background-v1 | 用户资料编辑原图去 UI 后的薄荷侧栏、绢纸、山水与竹叶；四栏目共用 | 原图衍生、遮挡区补绘，仅本地预览；原稿与完整提示词见 [资料编辑参考](design/2026-10-06-profile-editor/README.md) |
| 纸卷云纹、墨环及弹窗框 | [PaperPopup.ts](../frontend/src/ui/components/PaperPopup.ts)与CSS；Codex直接编写SVG/CSS，复用已登记纸面背景 | 项目原创界面矢量；用户截图仅作视觉参考，不是image_gen输出，既有背景发布边界不变 |
| v03 三诗概念 JPEG、v02 overview-landscape | 静态诗文页与低对比山水底景 | 既有 Stitch 概念素材，仅开发预览，正式许可待核实 |

截图证据在 docs/plans/R1-UI还原/assets，来源是本地 Chromium 实际页面；不标为新的 Stitch 输出或真实三维渲染。代码没有外部素材请求、字体下载或账号数据上传。

## 模型与贴图

| 名称 | 来源 | 作者 | 许可 | 用途 | 备注 |
|---|---|---|---|---|---|
| Wood Planks | [Poly Haven](https://polyhaven.com/a/wood_planks) | Amal Kumar | CC0 | 木舟船板、肋骨、舷缘、桨 | Blender MCP 下载 2K；发布 1K BaseColor/JPEG、Normal 与 Roughness/PNG；BaseColor 在线性域提亮 ×1.8 以保留夜间暗部层次，UV 沿构件长轴，原图覆盖 1.5m |
| Rock 01 | [Poly Haven](https://polyhaven.com/a/rock_01) | Rob Tuytel | CC0 | 岸石干/湿两组材质 | Blender MCP 下载 2K，发布 1K；湿面 BaseColor ×0.58，Roughness ×0.34 后限制 0.13–0.30，法线共源；原图覆盖 1.5m |
| Tatami Mat 的纯草编区域 | [Poly Haven](https://polyhaven.com/a/tatami_mat) | Charlotte Baglioni | CC0 | 船篷编织细节 | 从 2K 的 x=512:1280、y=160:928 裁出无装饰边的草编面，再缩到 512；不使用榻榻米造型或花边，0.675m 物理平铺 |
| 枫桥四元素小样几何 | [参数化建模脚本](../art/scripts/build_fengqiao_sample.py) | 本项目；Codex 经 Blender MCP 执行 | 项目原创几何；第三方纹理按上述 CC0 | 舟壳、船篷、岸石、灯笼骨架及 CAM_/FOCUS_ | 源文件 art/blender/fengqiao-sample-v01.blend；发布 frontend/public/assets/models/fengqiao/sample_v01.glb，不标为摄影扫描或完整历史复原 |
| 坐姿划桨船夫及工作桨 | [人物追加脚本](../art/scripts/add_fengqiao_rower.py) | 本项目；Codex 经 Blender MCP 建模 | 项目原创几何；斗笠草编与木桨纹理沿用上述 CC0 | 交领布衣、斗笠、人体/手部、15骨骼蒙皮与双手挂点 | 源 art/blender/fengqiao-sample-v02.blend，发布 sample_v02.glb；简化远景人物，无真人扫描、付费生成或精确服饰考据声明，v01保留 |
| hm08 人体、男性年龄变形、game_engine 骨架及权重 | [MPFB2 官方仓库](https://github.com/makehumancommunity/mpfb2/tree/d0a32e57a7f915cb2f2b95410e2117648c7bbb7e)；[资产许可](https://github.com/makehumancommunity/mpfb2/blob/d0a32e57a7f915cb2f2b95410e2117648c7bbb7e/LICENSE.md) | MakeHuman Community；Data Collection AB、Joel Palmius、Jonas Hauquier 等 | 数据资产 CC0 1.0；MPFB 程序 GPLv3，本项目未复制其程序 | v03 成人船夫面部、手指、身体比例和53骨骼蒙皮 | 固定 commit d0a32e57a7f915cb2f2b95410e2117648c7bbb7e，原始 OBJ、JSON、target.gz 与许可保存在 art/references/mpfb-hm08-d0a32e5；只发布改造后人物，不导出 helper cubes 或无关人体部件 |
| Rough Linen | [Poly Haven](https://polyhaven.com/a/rough_linen) | Rico Cilliers、colormass | CC0 | v03 船夫布衣 BaseColor、法线和粗糙度 | Blender MCP 下载并保存 1K 原图，0.270708×0.2713m 物理织纹；发布图统一1024px、Normal RGB8 PNG、Roughness L8 PNG，BaseColor饱和度×0.58、亮度×0.65后JPEG 93；处理脚本 prepare_rower_textures.py，工作图 art/textures/fengqiao-v03，GLB 内嵌 |
| 船尾摇橹、布衣和斗笠改造 | [精修脚本](../art/scripts/refine_fengqiao_rower.py) | 本项目；Codex 经 Blender MCP 制作 | 项目原创改造，人体/织纹基础按上述 CC0 | 弯橹柄、橹榫、缠结、等长牵绳、交领衣与固定双脚 | 源 fengqiao-sample-v03.blend，发布 sample_v03.glb；采用传统摇橹的结构与动作参考，不声称唐代服饰或船型的精确历史复原；v01/v02保留 |
| 连续厚舟壳、首尾封板与侧舷工作桨 | [修舟脚本](../art/scripts/repair_fengqiao_boat.py) | 本项目；Codex 经 Blender MCP 制作 | 新增几何原创；人物、木材与草编沿用上述 CC0 | v04 船首/尾封闭、侧舷支点、折弯桨柄与水下桨叶 | 源 fengqiao-sample-v04.blend，发布 sample_v04.glb；遵循用户指定侧舷划桨，不宣称历史船型精确复原；v01–v03保留 |
| 夜景预滤波天空环境 v01 | [烘焙工具](../frontend/tools/bake-fengqiao-environment.mjs)；原始渐变见 scenes/FengqiaoScene.ts | 本项目；锁定 Three.js 0.186.1 PMREMGenerator 烘焙 | 原创天空；Three.js MIT，不含第三方 HDRI | v04 PBR 环境照明；RGBA16F CubeUV 原值无损保存 | frontend/public/assets/environments/fengqiao-night-v01.rgba16f.gz；384×512，源512×256渐变；格式、尺寸与SHA见同目录JSON。动态水面倒影及实时阴影仍独立运行 |
| 桥寺、钟楼与河岸植物组件 v01 | [分段制作源码](../art/scripts/components/fengqiao/) | 本项目；Codex 经 Blender MCP 逐件制作、检查后组装 | 新增几何及常量 PBR 原创；舟、人物与既有纹理沿用上述 CC0 来源 | 台基、柱梁、斗拱、椽架、四坡瓦顶、门窗、悬钟撞木、石拱桥、河岸岩块、枫枝叶及芦苇 | 源 art/blender/fengqiao-scene-v01.blend，组件库 architecture-v02.blend / nature-v02.blend / roof-v02.blend，发布 scene_v01.glb；未复制外部建模插件程序或生成模型，保留 v01–v04 小样。唐风按可靠参考校准，五开间场景建筑不声称寒山寺或佛光寺测绘复原 |
| 桥寺唐风构造参考 | [广东工业大学建筑史课程](https://courses.gdut.edu.cn/mod/page/view.php?id=2069)、[UNESCO 佛光寺申遗材料](https://whc.unesco.org/en/tentativelists/5803/) | 对应资料提供者 | 只读参考；未下载或分发摄影图 | 宽檐、浅四坡屋面、柱梁斗拱层次与鸱尾轮廓 | 2026-10-07 核查；尺寸按当前米制构图重新设计，未作为精确古建复原证据 |
| 无损 WebP / Meshopt 候选优化 | [优化器](../frontend/tools/optimize-assets.mjs)、[Khronos EXT_meshopt_compression](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Vendor/EXT_meshopt_compression/README.md) | 本项目处理；Sharp 与 Meshoptimizer、Three.js 的既有依赖 | 工具各按上游许可；素材许可沿用原记录 | scene-v01 与独立 boat_v04_lossless 候选；PNG 精确像素及几何原字节核验 | 仅无损 WebP 与 EXT 编码 v0 / filter NONE，不使用量化、near-lossless、有损法线或网格简化；原始导出与精确比较报告保留在 output/fengqiao-scene-v01 |
| 桥寺与植物远景层级 v02 | [组件源码](../art/scripts/components/fengqiao/distance_lod.py)、[参数屋面](../art/scripts/components/fengqiao/roof_lod.py)、[参数木构](../art/scripts/components/fengqiao/frame_lod.py) | 本项目；Codex 经 Blender MCP 分件检查与组装 | 原创几何的远景修订；纹理及舟人物沿用上述来源 | 寺/钟楼、石桥、枫枝叶与芦苇的近远层级 | 源 fengqiao-scene-v02.blend、发布 scene_v02.glb；近景保留，远景明确简化。瓦顶及木构按共享参数重建，石/钟/植物采用受控简化；[切线恢复工具](../frontend/tools/restore-lod-near-tangents.mjs)在压缩前恢复重导出时漂移的原船夫皮肤切线流，原命名近景节点与全部几何/材质/绑定数据另做严格字节核对；编码阶段仍逐像素及逐原字节无损核验，scene-v01与舟v01–v04保留 |
| 夜景月盘、江雾与远山 v03 | [月落](../frontend/src/systems/nature/MoonFall.ts)、[高度雾](../frontend/src/systems/nature/HeightFog.ts)、[远山](../frontend/src/systems/nature/DistantTerrain.ts) | 本项目代码 | 原创程序纹理、Shader 与地形数据，无外部照片 | 32秒月落、近水薄雾与远山轮廓 | 月盘为128px程序纹理；远山复用2026-09-29由 art/blender/fengqiao.blend 烘焙的1024px RG16/B高度图，仅运行时压低远景轮廓，原高度数据未改；场景v03清单沿用scene_v02.glb，未新增整场模型 |

上述三套材质于 2026-10-06 核对 [Poly Haven 资产许可](https://polyhaven.com/license)，网站将资产以 CC0 提供，允许修改与再分发。PNG 工作图保存在 `art/textures/fengqiao-v01`，GLB 内嵌发布贴图；Normal/Roughness 为 Non-Color，BaseColor 为 sRGB。材质小样不改变上方 UI 预览素材的发布边界。

### 江雪模型 v01 · 2026-10-10

| 名称 | 来源与许可 | 用途与处理 |
|---|---|---|
| 孤舟、雪岸、枯木与钓具 | [分组件脚本](../art/scripts/components/jiangxue/)；项目原创几何，舟壳复制本项目既有 v04，木材/岩石沿用上表 Poly Haven CC0 | 独立源 art/blender/jiangxue-scene-v01.blend；舟去篷、岸石与真实厚度雪冠、分枝枯木、弯竹竿和闭合钓线；不声称精确历史船型或服饰复原 |
| 立姿蓑笠翁 | 同表固定 commit 的 hm08 CC0 人体、年龄变形、53 骨骼与权重；原创姿态、布衣裁片、蓑衣、草纤维与斗笠 | 不复制 MPFB GPL 程序；Rough Linen / Tatami 草编纹理沿用已登记 CC0，双手持竿与脚底落位单独复查 |
| 雪 PBR 三贴图 | [boat_snow.py](../art/scripts/components/jiangxue/boat_snow.py)固定种子 31027 的原创微高度、梯度法线和粗糙度；无第三方雪照片 | art/textures/jiangxue-v01，512² RGB8；BaseColor sRGB、Normal/Roughness Non-Color，GLB 内嵌；原创数值纹理，无 image_gen / 付费素材生成 |
| 远山高度场与预览环境 | [terrain.py](../art/scripts/components/jiangxue/terrain.py)、terrain_refine.py、既有 bake_terrain.py、[SnowTerrain](../frontend/src/systems/nature/SnowTerrain.ts)、[QuietSnow](../frontend/src/systems/nature/QuietSnow.ts)；项目原创 | 600×600m、1024² RG16/B 编码，米制高度不变换；冷色日光、坡向积雪、种子细雪与既有水面用于实验入口。发布 terrain/jiangxue-v01.height.* |
| 江雪 GLB 无损打包 | 既有 optimize-assets.mjs；上述素材许可保留 | 发布 models/jiangxue/scene_v01.glb，Meshopt 原字节及 WebP 原像素无损核验；原始 GLB 和检查报告保存在 output/jiangxue-model-v01。当前是 quality-sample 建模候选 |

### 江雪模型 v02 · 2026-10-12

| 名称 | 来源与许可 | 用途与处理 |
|---|---|---|
| 曲线江岸、分层岩块与贴面雪体 | [v02 分段脚本](../art/scripts/components/jiangxue/v02/)；本项目原创几何，沿用已登记 Rock 01 CC0 干/湿纹理与 v01 原创雪 PBR | 独立 jiangxue-scene-v02.blend / scene_v02.glb；14 块受控变形岩石，岩雪每块 321 个支撑样本，雪帽边界限制朝上岩面；不是摄影扫描模型，不导入外部自然模型 |
| 弯曲枯木与细枝 | tree_helpers.py / tree_core.py / tree_twigs.py；原创 Catmull–Rom 路径及渐细管体，沿用已登记 Wood Planks CC0 | 四条主路径、30 处细枝；UV 沿枝条长度，独立闭合雪条；保留第一版及本轮初稿组件 |
| 远山表面与寒江预览 | [v02 高度场](../art/scripts/components/jiangxue/v02/terrain.py)、[SnowTerrain](../frontend/src/systems/nature/SnowTerrain.ts)、[WinterDaylight](../frontend/src/systems/nature/WinterDaylight.ts)；原创代码与高度数据 | 600m 高度场保持米制与 RG16/B；坡向、固定函数噪声和法线主方向投影混合已有岩雪 BaseColor，不新增照片。江雪 v02 降低既有水面细波对比，不改变枫桥默认参数 |

### 江雪模型 v04 · 2026-10-19

| 资产 | 工具与来源 | 修改与使用 |
|---|---|---|
| 十四块柔边岩雪体 | Blender 5.2.2；[v04 分组件脚本](../art/scripts/components/jiangxue/v04/rock_snow.py)，本项目原创数值几何 | 从现有 v03 另存 v04；先单块检查再制作其余雪体。连续边界、圆弧雪冠、岩面取样与三角面内净距修正。沿用 v01 原创雪 PBR 原像素及已登记岩石纹理；无新增外部模型、照片或付费生成。舟体、人体、岸山、枯木及 v03 航线沿用原来源 |

### 江雪模型 v05 · 2026-10-20

| 资产 | 工具与来源 | 修改与使用 |
|---|---|---|
| 岩块连续干湿水线及贴坡岸雪 | Blender 5.2.2；[v05 分组件脚本](../art/scripts/components/jiangxue/v05/)，本项目原创几何修订 | 岩块原表面不位移，沿0.22m高程切分并插值既有UV，使用已登记干/湿Rock 01 CC0纹理。岸雪在实际岸坡网格上取样并收薄圆弧雪缘，沿用v01原创雪PBR原像素；未新增外部模型、照片、生成素材或依赖 |
| v02 无损交接与证据 | 既有 optimize-assets.mjs；模型、纹理许可沿用上述登记 | 独立清单/GLB/高度图；无损 WebP 原像素及 Meshopt 原字节校验。Poly Haven 扩展本轮禁用，未改变用户设置、下载自然资产或调用付费生成服务；浏览器截图/短片为实际本地 WebGL 运行，不标为生成概念图 |

## 音频

| 名称 | 来源 | 作者 / 演奏者 | 许可 | 用途 | 备注 |
|---|---|---|---|---|---|
| Web Audio 五声音阶拨弦与短提示音 | 项目 AudioPreferences.ts 程序合成 | 本项目代码 | 无第三方录音 | 偏好设置的背景音乐与操作音效 | 原创短循环；用户启用后播放，后台暂停；不标为真实古琴录音 |
| 枫桥风、水、乌啼与模态钟声 | [fengqiaoSound.ts](../frontend/src/systems/audio/fengqiaoSound.ts)、[AudioEngine.ts](../frontend/src/systems/audio/AudioEngine.ts) | 本项目代码 | 原创程序合成，无采样录音 | 环境循环、HRTF空间定位、夜半钟声传播延迟 | 24kHz单声道运行缓冲；风水为种子噪声、乌啼为风格化调频、钟声为衰减模态叠加，不宣称寒山寺现场录音；无外部音频下载、版权曲目或额外分发音频文件 |

## 参考（不进入 `frontend/public/`）

| 名称 | 来源 | 用途 |
|---|---|---|
| The Met Open Access | https://www.metmuseum.org/zh/hubs/open-access | 2026-10-01 用浏览器核查 CC0 开放图像政策；逐作品核实，不代表馆藏所有图像均可用 |
| 大澳文化协会 · 櫓 Yuloh | https://www.taioca.org/about-3 | 2026-10-07 参考固定船尾支点、曲柄、甲板牵绳、双手与 V 字站姿、前倾/后仰和水下换向；只学习结构和动作，不下载或发布该页照片 |
| edzop · bpyhullgen / blender_boat_nodes | [bpyhullgen](https://github.com/edzop/bpyhullgen)、[blender_boat_nodes](https://github.com/edzop/blender_boat_nodes) | GitHub 插件只读学习外壳/肋骨、参数化截面及外皮封闭方法；公开许可未核实，未复制代码或模型 |
| ACA-Builder / YingzaoFashi | [ACA](https://github.com/ppddry/ACA-Builder)、[YingzaoFashi](https://github.com/lilacsky824/YingzaoFashi-Blender-Procedural-Model) | 学习柱网、椽距和屋架模块/标高组织；分别是清式、宋制参考，不能作为唐风形制定稿；许可未核实，未运行插件/复制模板 |
| tree-gen / cliffgenerator | [tree-gen](https://github.com/friggog/tree-gen)、[cliffgenerator](https://github.com/marcueberall/blender.cliffgenerator) | 学习枝干曲线/叶片朝向和岸壁宏微结构；tree-gen 程序GPLv3，生成模型另有README限制；2026-10-07补查cliffgenerator LICENSE确认程序GPLv3，未证实生成模型/外部资源的独立条款。未复制程序或导入生成资产，详见枫桥计划第12节 |
| IRCSS · Procedural Chinese Landscape | [README](https://github.com/IRCSS/Procedural-Chinese-Landscape-Painting-Blender-3D/blob/master/README.md)、[LICENSE](https://github.com/IRCSS/Procedural-Chinese-Landscape-Painting-Blender-3D/blob/master/LICENSE) | 2026-10-07通过GitHub插件学习可编辑轮廓、固定种子和分段节点组织；程序MIT，Blender3.5示例，未运行或复制模型/材质，未推断外部资源许可；已知桥交叉问题提醒需独立检查布局 |
| 佛光寺东大殿 · 唐代木构参考 | [UNESCO五台山](https://whc.unesco.org/en/list/1279/) | 核验现存唐代遗构身份，后续用可靠图像/测绘校准唐风柱梁屋面；页面不是尺寸测绘资料，不下载或发布其摄影图，不声称复原唐代寒山寺原貌 |
| The Met 中国山水开放图像检索 | https://www.metmuseum.org/art/collection/search?q=landscape&geolocation=China&showOnly=openAccess | 新首页山水背景候选入口；未下载或选定正式背景 |
| Huang Yue · River and landscape（1825） | https://www.metmuseum.org/art/collection/search/931206 | 2026-10-01 作品页核查有 Public Domain 标记；仅作横向山水层次参考，未下载，不用其建筑作为唐风考据 |
| 用户供个人中心、登录、注册、幕布入口四张 PNG | 2026-10-01 本次对话附件；作者、制作工具和发布许可未提供 | 原样保存于 [v07/references](design/2026-10-01-v3/v07/README.md)，作为用户指定还原基准；原附件与副本 SHA-256 一致，不推断为 Stitch/本轮 AI 输出，不直接发布 |
| 用户供新登录、注册两张 PNG | 2026-10-02 本次对话附件；作者、制作工具和发布许可未提供 | 原样保存于 [v10/references](design/2026-10-01-v3/v10/README.md)，替换当前 S11/S12 参考；与原附件 SHA-256 一致 |
| 用户供 SideCurtain v6 HTML | 2026-10-03 对话提供的本机 HTML；作者与制作工具未提供 | 原样保存于 [curtain-v6](design/2026-10-03-curtain-v6/README.md)，SHA-256 一致；移植运动参数和层叠 CSS，嵌入图片仅作参考，不作为新增运行素材或推断发布许可 |
| 用户供纸卷加载提示网页截图 | 当前对话附件；作者、制作工具和发布许可未提供 | 原样保存于[纸卷参考](design/2026-10-09-paper-popup/README.md)，附件与副本SHA-256一致；参考宣纸、云纹和按钮构图，不将截图作为运行素材 |

详见 [设计参考记录](design/2026-10-01-v3/references.md)。用户参考原图仅归档 docs/design；没有新增图片或字体进入 public。Stitch 与本轮 image_gen 生成图单列于下方。具体字体许可尚未核验，不把“候选”写成“可发布”。

## AI 生成声明

2026-10-01 最新用户供主页与收藏页两张 PNG 原样保存于 [v09](design/2026-10-01-v3/v09/README.md)，作为用户指定视觉基准。与附件逐字节一致；作者、制作工具与发布许可未提供，不登记为本轮 Stitch/image_gen 输出，不进入 public。

按比赛规则补充；实际生成后保留工具、模型、提示词、任务标识、原始文件及人工修改，生成内容不自动等于 CC0。

| 日期 | 工具 / 用途 | 状态 | 记录 |
|---|---|---|---|
| 2026-10-01 | Stitch · S01 首页 v01 / v02 | 已生成并下载；私有项目 `11329297360365535924`；请求模型 `GEMINI_3_8_FLASH`；输出条款 / 比赛 AI 声明待核实，仅设计参考，不得直接发布 | [生成记录](design/2026-10-01-v3/generation-log.md)、[v02 原图](design/2026-10-01-v3/v02/screens/S01-home-desktop.png) |
| 2026-10-01 | Stitch · 三诗封面与总览背景概念图 | 同一修订任务返回四张 JPEG，1376×768；AI 意象非摄影实录 / 历史复原；未批准进入 public | [素材说明](design/2026-10-01-v3/v02/assets/README.md)、[来源清单](design/2026-10-01-v3/v02/stitch-manifest.json) |
| 2026-10-01 | Stitch MCP · v03–v06 桌面续稿与转场原稿 | 沿用用户认可风格；同一私有项目；请求模型 GEMINI_3_8_FLASH；原始 PNG、HTML、请求与 manifest 保留；后续页面与修订稿待审批 | [桌面设计入口](design/README.md)、[实际生成记录](design/2026-10-01-v3/generation-log.md)、[v03 概念素材](design/2026-10-01-v3/v03/assets/README.md) |
| 2026-10-01 | Stitch 源稿 · 本地浏览器资源校验预览 | v05 分镜源稿复制后修复本地封面引用、未生效尺寸类与百分比标注，由 Chromium 导出；原图未覆盖，不标为新的 Stitch 出图或已实现动画 | [预览目录](design/2026-10-01-v3/v06/previews/README.md) |
| 2026-10-01 | 内置 image_gen · v07 S01 总览与 S04 白帝城图片编辑 | 基于旧 PNG 编辑；S01 两轮、S04 一轮，输出原始 PNG 与完整提示词保存；未提供模型名或服务任务 id，不猜测；仅设计待复审，未进 public | [v07 说明](design/2026-10-01-v3/v07/README.md)、[manifest](design/2026-10-01-v3/v07/manifest.json)、[实际生成记录](design/2026-10-01-v3/generation-log.md) |
| 2026-10-01 | 内置 image_gen · v08 S01 下区背景减法编辑 | 以 v07 S01 PNG 编辑；角落竹叶与简洁云雾替代山河楼阁，原始输出及完整提示词保存；模型与服务任务 id 未提供；仅设计待复审，未进 public | [v08 说明](design/2026-10-01-v3/v08/README.md)、[manifest](design/2026-10-01-v3/v08/manifest.json) |
| 2026-10-02 | 内置 image_gen · 登录山水去文字与绢纸提取 | 基于用户 S11 原图两次编辑；未改变原图文件；用作本地运行素材，未进 public；具体模型与服务任务 id 未提供 | [素材、完整提示词及用途](design/2026-10-01-v3/runtime-assets/README.md) |
| 2026-10-02 | 内置 image_gen · v09 首页完整背景提取 | 基于用户 S01 原图移除文字及卡片，保留可见背景并补绘遮挡区；原图未覆盖，未进 public；具体模型与服务任务 id 未提供 | [素材、完整提示词及原始输出](design/2026-10-01-v3/runtime-assets/README.md) |
| 2026-10-02 | 内置 image_gen · S13 完整双帘幕去文字 | 去除原标题、副标题和按钮，保留中央闭合帘布及原始构图；原图未覆盖，未进 public；具体模型与服务任务 id 未提供 | [素材、完整提示词及原始输出](design/2026-10-01-v3/runtime-assets/README.md) |
| 2026-10-02 | 内置 image_gen · v10 登录完整背景去 UI | 去除品牌、文案、图标与表单，保留山水、竹叶、舟景及右侧曲线白面，遮挡区补绘；原图未覆盖，未进 public；具体模型与服务任务 id 未提供 | [素材与完整提示词](design/2026-10-01-v3/runtime-assets/README.md)、[v10 manifest](design/2026-10-01-v3/v10/manifest.json) |
| 2026-10-06 | 内置 image_gen · 资料编辑背景提取 | 用户四张图为布局权威；以基本资料图一次编辑去 UI，遮挡区补绘，模型与服务任务 id 未提供，未进 public | [原图、提示词与 manifest](design/2026-10-06-profile-editor/README.md) |

未审批的生成稿只存 `docs/design/`；未实际产生的图不得填写作者、许可或任务 id。
