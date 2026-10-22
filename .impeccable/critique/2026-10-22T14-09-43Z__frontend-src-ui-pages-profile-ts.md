---
target: 个人中心页面 (frontend/src/ui/pages/Profile.ts)
total_score: 21
max_score: 40
na_heuristics:
p0_count: 1
p1_count: 3
target_identity: "file:/home/liuhan/StudyDir/Math_Media/PoeticRealm/frontend/src/ui/pages/Profile.ts"
target_fingerprint: "sha256:416c266836edb3c150bb8ef63c3fe98f8702432e45e5f7806fb8b107e6760708"
target_path: /home/liuhan/StudyDir/Math_Media/PoeticRealm/frontend/src/ui/pages/Profile.ts
timestamp: 2026-10-22T14-09-43Z
slug: frontend-src-ui-pages-profile-ts
---
⚠️ DEGRADED: single-context (sub-agent spawn failed: Error: Connection stalled repeatedly / Agent turn stopped after repeated resume attempts made no progress; Assessment B completed via sub-agent c37bd37e-1669-4044-86f8-ca64f0f2351b)

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | 底部 `.editor-feedback` 字号小且在右侧 1280px 容器左下角，与右上/右下操作视线割裂；输入框 `:focus` 样式被 `application.css` 覆盖，键盘聚焦几乎无视觉反馈 |
| 2 | Match System / Real World | 1 | 违背设计文档 20.4 节与 `S06-profile-user.png` 的「山水画卷题头 + 宣纸雅集卡片」心智，强行改成 SaaS 后台管理式全屏左树右表，且山水底图横向拉伸 1.62 倍变形 |
| 3 | User Control and Freedom | 3 | 虽有未保存离开确认与「撤销修改」，但把「我的诗境/收藏/足迹」浏览态与「资料/安全/隐私/偏好」表单态塞进同一个 `<form class="editor-main">` 中，心智混杂 |
| 4 | Consistency and Standards | 1 | 双重品牌与双重导航堆叠（顶栏 64px 已有品牌和导航，左栏又重复一遍「诗境 · 一卷山河」与「我的收藏」）；各栏目底部 `.editor-footer` 高度在 53px/39px/42px 间跳变，开关尺寸在 51×27px 与 45×25px 间不一 |
| 5 | Error Prevention | 3 | 注销、清空足迹、退出其他设备均有确认弹窗，但「数据导出」与「注销账号 / 清空历史」整行不可点、仅右侧 25×32px 小箭头可点，极易误触或漏点 |
| 6 | Recognition Rather Than Recall | 2 | 设置行与足迹列表左右跨度达 1246px–1272px，左侧标签与右侧开关/时间之间存在 705px–972px 的巨大视觉死区，视线无法自然对齐 |
| 7 | Flexibility and Efficiency | 2 | 支持方向键与 Home/End 切栏，但 15×15px 清空昵称按钮、21×25px 密码显隐按钮、25×32px 导出/注销按钮远低于 44×44px 交互热区底线 |
| 8 | Aesthetic and Minimalist Design | 1 | 原本为 1062×810 弹窗定制的底图被 `background-size: 405%`（侧栏）和 `135%`（主区）暴力拉伸铺满全屏；表单输入框宽达 622px–1268px，满屏空洞苍白与拉伸糊图并存 |
| 9 | Error Recovery | 3 | 凭据读取失败提供「重新读取」，保存失败保留草稿，但错误提示固定在底部栏左侧，长表单滚动时不够醒目 |
| 10 | Help and Documentation | 3 | 隐私与推荐联动说明较清晰，但 `preferences` 栏说明字号（13px）与 `privacy` 栏（14px）不统一，多处辅助文字仅 12px 且对比度偏低 |
| **Total** | | **21/40** | **Acceptable（处于降级临界点，核心布局与美学严重失衡）** |

#### Design Specificity Verdict

**LLM assessment**：当前个人中心页面**完全丧失了《诗境 · 一卷山河》应有的东方山水画卷气韵**，变成了「套了一层拉伸水墨底图的通用后台管理系统（Admin Dashboard）」。
对照项目设计文档第 20.4 节明确规定的视觉基准 `S06-profile-user.png` 可以看到，原设计是：**全宽青黛山水题头（`.profile-hero`）+ 居中网格（`.profile-layout`）+ 左侧个人雅士名片与账号信息宣纸卡 + 右侧我的收藏三联小卡、最近浏览时间轴、成就圆章与系统设置宣纸面板（`.paper-panel`）**；而资料编辑原本是一个 **1062×810px 的精致独立宣纸弹窗（`ProfileEditor`）**。
但在最近一次改动中，`Profile.ts` 原有的 `S06` 宣纸卡片布局被彻底删空，直接将原本 1062×810px 的 `ProfileEditor` 弹窗强行撑满 `100vw × calc(100dvh - 64px)` 全屏，并把「我的诗境（总览）、我的收藏、阅读足迹」硬塞进同一个表单容器的前三个 Tab。结果导致：原本为固定比例弹窗绘制的水墨底图被严重横向拉扁，原本紧凑的表单控件在 1280px 宽度下变成近千像素的竹竿输入框与水平死区，既毁掉了 `S06` 原图的山水层次感，也让编辑表单变得空旷难看。

**Deterministic scan**：
- CLI `impeccable detect --json` 扫描 `Profile.ts`、`ProfileEditor.ts`、`ProfileActivity.ts`、`PublicProfile.ts` 退出码为 `0`（JSON 输出 `[]`），因为 HTML 写在 `.ts` 模板字符串中且样式位于 `profile-editor.css`。
- 浏览器无头 Chromium 注入 `detect.js` 及 DOM/CSS 实测捕获到大量定量缺陷：
  1. **背景与封面非等比畸变**：`profile-editor-background-v1.png`（原图 `1436×1096`，宽高比 `1.31:1`）在 `1920×1080` 的 `.editor-main` 中被渲染为 `2187×1032px`（宽高比 `2.12:1`，**横向拉伸 1.617 倍**）；「我的收藏」Tab 下的 `.realm-card-cover`（`405.3×220px`）相比原裁切比例**横向拉伸 1.448 倍**。
  2. **极端水平死区（Dead Space）**：`1920×1080` 下，`.editor-setting-row` 宽 `1246px`，左侧文字与右侧开关之间存在 **`705px–854.4px` 的空白死区**；`visits`（阅读足迹）列表中诗名（宽 `72px`）与右侧时间戳之间存在 **`972.4px` 的空白死区**；`overview` 底部 `.realm-account-strip` 存在 **`846.6px` 死区**。
  3. **畸形超宽输入框**：`security` 栏密码框宽达 **`1101×42px`**；`basic` 栏昵称/性别/生日框宽达 **`622.5×42px`**，60 字上限的个人简介 `textarea` 宽达 **`1268×68px`**。
  4. **微型点击热区与小字号**：清空昵称按钮仅 **`15×15px`**，密码显隐按钮 **`21×25.5px`**，数据导出与注销箭头按钮仅 **`25×32px`**；全页有 **18 处 `<14px` 的小字**。

**Visual overlays**：无用户可见的 `[Human]` 浏览器标签页覆盖层，因为当前在无头 Chromium 中采集多视口几何证据并已停止临时 `live-server`；上文实测截图与精确像素数据已作为完整回退证据。

#### Overall Impression

一句话总结：**把一个为 1062×810 弹窗量身定做的表单，硬生生扒掉外框、拉宽到 1920 全屏，并吞并了原本有山水题头与宣纸卡片的个人中心主页。**
这不仅直接违背了设计文档 20.4 节「资料编辑能力在该构图中另设编辑状态，不恢复旧大表单布局」的红线，还造成了水墨画拉伸变形、顶栏与侧栏双重导航打架、左右两头贴边中间八百像素留白、以及输入框像长竹竿一样的视觉灾难。最大的改进机会是**恢复 `S06`「山水题头 + 宣纸卡片雅集」的主页结构（或重构个人中心的容器尺度与卡片分栏），并将表单与设置宽度收敛到符合人眼阅读舒适区的尺度（680px–880px），彻底消除非等比背景拉伸。**

#### What's Working

1. **真实业务功能与状态保护闭环完整**：头像文件头校验与 Canvas 缩放裁剪、30 天记住凭据同步、登录设备列表与一键踢出其他设备、公开主页范围控制、JSON 数据导出、历史清空、账号注销以及未保存离开拦截（`confirmLeave`）全部真实跑通。
2. **纸卷确认框（`PaperPopup`）细节克制**：二次确认与设备列表弹窗沿用了宣纸云纹与墨绿描边风格，比主界面的全屏拉伸后台风更有古风质感。
3. **偏好设置即时预览体验自然**：切换深色模式、字号大小或动态效果时能立即在页面上预览效果，点击「撤销修改」又能干净地还原到已保存状态。

#### Priority Issues

- **[P0] What：违背设计文档 20.4 节，用全屏拉伸的后台管理式表单取代了 `S06` 山水题头与宣纸卡片布局**
  - **Why it matters**：设计文档 20.4 明确规定以 `S06-profile-user.png`（全宽山水题头 + 左栏圆形头像/名片/账号信息 + 右栏收藏/足迹/成就/设置宣纸卡片）为视觉基准，且明确指出「不恢复旧大表单布局」。现在 `Profile.ts` 只剩一个 `<main class="profile-editor">`，把整个页面变成了 `300px` 侧栏 + `1620px` 白底主区的后台管理界面，与「诗词总览」「我的收藏」的山水画卷气质完全割裂。
  - **Fix**：有两种明确路径：（A）**回归 `S06` 雅集卡片架构**：恢复全宽 `.profile-hero` 山水题头与 `.profile-layout` 宣纸卡片看板，将详细资料/安全/隐私/偏好编辑收回到固定比例（1062×810）的宣纸雅集弹窗或同构的居中宣纸卷轴卡片中；（B）**若保留七合一侧栏架构**：去掉全屏无边界后台感，在外围露出 `.landscape-background` 宣纸山水底纹，将主工作区改为居中悬浮的宣纸画卷容器（`max-width: 1200px–1320px`），并把内容按宣纸卡片（`.paper-panel`）分块组织，而不是铺满 1920px 全屏。
  - **Suggested command**：`$impeccable layout`

- **[P1] What：水墨背景图与收藏封面图被强制非等比拉伸（横向拉宽 45%–62%）**
  - **Why it matters**：`profile-editor.css` 第 9 行与第 27 行写了 `.editor-sidebar { background: var(--editor-art) left -4px top -8px / 405% calc(100% + 16px) }` 与 `.editor-main { background: var(--editor-art) right -8px top -8px / 135% calc(100% + 16px) }`。当容器随视口宽高任意变化时，原本 `1436×1096` 的水墨亭台与远山竹叶被强行拉扁（1920×1080 下横向拉伸 `1.617×`），边缘发虚且比例失真；同时「我的收藏」Tab 下 `.realm-card-cover` 固定 `height: 220px` 却随列宽撑到 `405px`，导致利用百分比 `background-size` 定位的封面画作横向变形 `1.448×`。
  - **Why it looks ugly**：水墨画最讲究笔墨比例，非等比拉伸会瞬间产生廉价的「贴图拉伸感」。
  - **Fix**：禁止使用 `135% calc(100% + 16px)` 或 `405% calc(100% + 16px)` 这种破坏宽高比的百分比双轴背景尺寸；改用 `background-size: cover` 或基于 `aspect-ratio` 的等比取景容器。`.realm-card-cover` 去掉硬编码 `height: 220px`，统一复用首页 `.card-cover` 的 `aspect-ratio: 1.65`（或原裁切比 `1.27`）。
  - **Suggested command**：`$impeccable polish`

- **[P1] What：1280px 超宽单列容器导致 705px–972px 水平视觉死区与 1101px 畸形长输入框**
  - **Why it matters**：在 `1920×1080` 下，`.editor-body section` 被设为 `max-width: 1280px`。这导致：
    1. `privacy` 和 `preferences` 栏的每一行设置项宽达 `1246px`，左侧文字仅占 `200–350px`，右侧开关仅 `51–82px`，中间横亘着 **705px 到 854px 的空白地带**，用户眼睛左看标题、右找开关极度疲劳；
    2. `visits`（阅读足迹）单行宽 `1272px`，左侧诗名与右侧浏览时间之间隔了 **972.4px**；
    3. `security` 栏三个密码输入框被 `1fr` 撑到 **1101px 宽**，`basic` 栏 60 字简介框撑到 **1268px 宽**，昵称/性别/生日框各 **622.5px 宽**。
  - **Fix**：为表单型与列表型内容建立合理的阅读网格（Measure）：
    - 修改密码表单最大宽度限制在 `520px–600px`（输入框宽 `360px–420px`），或与右侧「登录与验证」并排成双栏卡片；
    - 基本资料表单字段限制在 `760px–860px`；
    - 隐私与偏好设置改为**双列宣纸卡片网格**（左列「公开范围 / 界面体验」、右列「数据与隐私 / 内容偏好」，每列宽约 `520px–580px`），既能在 1920/1440 下完美一屏展示，又能把标签与开关的距离缩短到舒适的 `40px–120px`。
  - **Suggested command**：`$impeccable layout`

- **[P1] What：双重导航栏、双重品牌与双重「我的收藏」造成严重的信息架构冲突**
  - **Why it matters**：页面顶部已经有 64px 高的深青色全局导航栏（左有 `← 返回总览` 和 `诗境 · 一卷山河 [雅集]`，右有 `诗词总览 / 我的收藏 / 个人中心`）。但紧接着在下方左侧边栏顶部，又放了一个一模一样的 `诗境 · 一卷山河` 品牌标题（相距仅几十像素），侧栏菜单里又有一个 `我的收藏`（切页内 Tab），与顶栏的 `我的收藏`（跳 `#/favorites` 独立页）同名不同效；主区右上角还有第三处位置标签 `我的诗境`，底部除了侧栏版权外还有常驻的 `.editor-footer` 同步提示条。
  - **Fix**：
    - 移除 `.editor-sidebar` 顶部重复的 `.editor-brand`（「诗境 · 一卷山河」），直接以精致的个人身份名片（头像、昵称、雅号、简介）作为侧栏视觉起点；
    - 明确区分或统一「收藏」入口（例如侧栏专注于个人中心概览与四项账号设置，或将页内收藏重命名为「藏诗雅集」并与顶栏行为协调）；
    - 在只读浏览栏目（`overview`、`favorites`、`visits`）且无未保存草稿时，彻底隐藏底部的 `.editor-footer` 占位条，释放宝贵的纵向空间（同时修复 `1920×1080` 下 `overview` 因这 `53px` 底部条而产生的 `15px` 尴尬滚动条）。
  - **Suggested command**：`$impeccable distill`

- **[P2] What：栏目间底部栏跳变、双栏卡片错位、微型热区与聚焦样式失效**
  - **Why it matters**：
    1. `profile-editor.css` 第 86–89 行对 `privacy` 和 `preferences` 做了生硬的像素特判（抹掉 `border-top`、把 `.editor-footer` 高度从 `53px` 压到 `39px/42px`、改小 `.editor-main` 下边距），导致切换 Tab 时底部保存按钮上下跳动 `11px–25px`；
    2. `overview` 栏下方左列「我的收藏」每行高 `109px`（封面 `112×78` 且带「入境 >」），右列「最近浏览」每行高 `89px`（封面 `68×58` 且强行隐藏了「重访 >」），两列并排时底部高低不齐，上方 `.realm-stats` 前三格是数字而第四格是进度条，缺乏卡片容器包裹，显得松散；
    3. 数据导出 `[data-export]` 与注销 `[data-danger]` 只有右侧 `25×32px` 箭头是 `<button>`，点击整行文字毫无反应；清空昵称按钮仅 `15×15px`。
  - **Fix**：删除针对特定 Tab 的 `.editor-footer` 高度/边框 hack，统一底部操作栏高度与内边距；统一 `overview` 左右两列的行高、封面比例与操作链接；将导出与注销改为整行可点击或明确的 `.editor-button` 按钮；扩大清空昵称与密码显隐按钮热区至 `36×36px` 以上。
  - **Suggested command**：`$impeccable polish`

#### Persona Red Flags

- **Alex（追求效率的资深用户）**：
  - 在「个人资料」修改昵称后切到「隐私设置」想点「数据导出」，点击「数据导出」四个字或说明文字完全没反应，必须精确瞄准右侧 `1246px` 远处那个 `25×32px` 的小箭头图标才能触发下载。
  - 顶栏有一个「我的收藏」，左侧栏也有一个「我的收藏」，点击顶栏会跳出个人中心去 `#/favorites`，点击侧栏则是切换当前页 Tab，两套收藏界面长相和卡片比例完全不同。

- **Jordan（首次体验的诗境访客）**：
  - 从气势恢宏的《枫桥夜泊》《早发白帝城》3D 山水诗境点进「个人中心」，期待看到如首页或 `S06` 原图那样的山水雅集画卷，结果迎面而来的是一个像路由器后台一样的左树右表全屏白框，且右侧水墨山水画被拉宽变形了 60%。
  - 初次进入「我的诗境（overview）」时，屏幕下半部分左右并排两个高达 `270px` 的空白占位块，里面各放一个几乎一模一样的书本图标和「去诗词总览」深色按钮，视觉重复单调。

- **Sam（键盘与辅助技术用户）**：
  - 使用 `Tab` 键在「个人资料」或「账号安全」的输入框之间切换时，由于 `application.css` 第 20 行 `input:focus, select:focus, textarea:focus { outline: none; box-shadow: none; }` 覆盖了聚焦轮廓，且 `profile-editor.css` 的聚焦阴影透明度仅 `0.11`，输入框聚焦时几乎看不出任何边框变化，极易迷失当前光标位置。
  - 个人简介字数统计 `0 / 60` 等 `12px` 浅灰文字（`#93a1a5` 叠在半透明宣纸底图上）对比度不足 `3.2:1`，低于 WCAG AA `4.5:1` 标准。

#### Minor Observations

- **开关组件分裂**：`security` 和 `privacy` 中的 `.switch-track` 是 `51×27px` 无文字，而 `preferences` 中的 `.switch-track` 被单独写死为 `45×25px` 且右侧多了「开启/关闭」文字（`.switch-word`），同一页面内两种开关规格。
- **字号层级不一致**：`privacy` 栏设置说明 `<small>` 为 `14px`，而 `preferences` 栏被 `.editor-preferences-box small` 覆写为 `13px`。
- **侧栏姓名截断过窄**：`.editor-identity strong` 的 `max-width` 写死为 `112px`，而侧栏在 1920 下宽达 `300px`，6 个汉字的昵称就会被截断出省略号 `...`，旁边却留着大片空白。
- **公开主页（`PublicProfile.ts`）过于简陋**：点击「查看已保存的主页 →」进入 `#/profiles/<账号>` 后，收藏和足迹只渲染成 `34px` 高的纯文字小胶囊按钮（`.small-button`），没有封面图或诗句，页面下半部分留出约 `500px` 空洞。

#### Questions to Consider

- 「个人中心」究竟应该是一幅展示旅人诗境足迹的**山水雅集画卷（如 `S06` 原图）**，还是一个把所有表单平铺开的**全屏系统设置后台**？
- 如果将「隐私设置」与「偏好设置」从 1246px 的单列竹竿行改为**双列宣纸卡片网格**，不仅能消灭 800px 的中间死区，还能让所有设置项在一屏内尽收眼底，是否更符合桌面端审美？
- 当用户只是在浏览「我的诗境 / 收藏 / 足迹」且没有任何未保存修改时，底部的 `.editor-footer` 状态栏是否应该完全退场，把空间还给诗画？
