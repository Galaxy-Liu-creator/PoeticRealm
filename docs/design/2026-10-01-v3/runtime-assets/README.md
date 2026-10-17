# UI 运行素材

2026-10-02，内置 `image_gen` 编辑用户指定的 v10 S11 新登录、v07 S13 幕布入口及 v09 S01 总览原图。旧 v07 账号素材保留历史。用于本地 UI 还原，不覆盖原图，不引入字体或图片外部请求。

- `auth-split-background-v1.png`：以 v10 S11 用户原图去除所有 UI，保留左侧山水、金线、竹叶、寺院与舟景，以及右侧连续曲线白面、底部浅山；遮挡区生成补绘。两页共用完整背景，真实表单直接放在留白上，不新增矩形面板。与原图比例一致，可见细节尽量保留，补绘部分不宣称逐像素一致。
- `account-landscape-v1.png`（历史，不再运行引用）：旧 v07 全幅山水，包含竹与侧幕。
- `account-paper-v1.png`（历史，不再运行引用）：旧 v07 空白绢纸面板，含双框、角纹与底部山影。
- `home-background-v1.png`：内置 `image_gen` 编辑 v09 `screens/S01-home-desktop-user.png`，移除文字、印章、三张诗词卡片和页脚文字，保留原稿完整顶部山水、纸纹、两侧竹叶、下方浅山与船景；卡片遮挡区以邻近纸面与浅山补齐。首页顶部与下方纸面从同一张 1536×1024 背景取景；总览、收藏与个人中心共用下方纸面，通过同一页面背景层覆盖全幅与全部滚动高度，列表无托底；原图文件未覆盖。可见原背景尽量保留，遮挡区属于生成补绘，不宣称逐像素完全一致。

- `curtain-background-v1.png`：编辑 v07 `references/S13-curtain-entry-user.png`，去除标题、副标题及两块按钮，保留原稿中央闭合的双帘幕、金边、褶皱、外侧纱帘、流苏、山水与地板反光。文字遮挡处补绘原有帘布；完整图在中心等分为左右两半，静态与拉开转场共用，不再把两侧窄图横向拉宽拼接。

运行时的品牌、宣传语、体验文案、字段、校验、按钮、协议入口均为 DOM。体验插画和输入图标只裁取原图对应的无文字区域。登记见 `docs/CREDITS.md`。原图字形无法从 PNG 确定；最新字体遵循 `docs/字体规范.md` 的品牌行书/结构宋体/诗意文楷/功能黑体分工，仅引用本机字体并提供回退，不下载或分发字体文件。

## 完整提示词

### auth-split-background-v1.png

Use case: precise-object-edit.
Input image: EDIT TARGET, the exact user-approved PoeticRealm login UI, 1672 x 941.
Asset type: clean continuous full-screen background for functional login and registration pages.
Primary request: Remove every UI and lettering element from the image while preserving the entire background illustration. Remove the small brand/title and tagline at top-left, the large title and subtitle around left-center, all four feature rows including circular illustrated icons, texts and divider lines, the top-right login/register segmented control, moon/return-home control, the right welcome heading and subtitle, labels, both input boxes including borders and icons, remember-me checkbox and text, forgot-password text, submit button, and bottom signup text and divider lines.
Inpaint only these removed regions into the existing underlying mountain landscape on the left or the warm-white background on the right.
Invariants: Keep the exact full 1672:941 composition, teal mountains, mist, sun at x830,y180, illuminated temples and bridge, lanterns, dark river, boat and figure near x746,y767, foreground railing at bottom-left, bamboo along upper-left and blurred bamboo along upper-right and bottom curve. Preserve the graceful S-shaped warm-white RIGHT SURFACE boundary centered roughly x880–977, the very fine cream/gold outline along it, original pale ink mountains along the lower-right and the thin curving gold lines across the left illustration. The right-hand 40 percent must remain clean near-white, not an added rectangular card. No outer stage curtains. Do not redesign, simplify, change layout, mirror, recolor or invent new decorative objects. Preserve all visible background details as faithfully as possible; removed UI areas should merge naturally with neighboring material. No text, logo, seal, tabs, forms, buttons, symbols or UI outlines. Output the full original-derived background at the same landscape aspect ratio as the input.

原始输出：`C:/Users/Lenovo/.codex/generated_images/01a0fa76-e770-78d3-b776-a205f64dde46/exec-498b2025-0c57-4609-b937-d7639b119752.png`；项目副本与 SHA-256 见 [v10 manifest](../v10/manifest.json)。

### account-landscape-v1.png

Use case: precise-object-edit. This local image is the EDIT TARGET, not inspiration. Extract a clean reusable full-screen background wallpaper for this exact website. Preserve the exact 1672:941 wide composition, mountains, moon, temples, lantern lights, lake, boat and human silhouette, bamboo, teal stage curtains and gold edging, lighting and original colors. Remove ALL text, logos, seals, titles, navigation text, vertical Chinese writing, all four feature rows with their round icons and dark strips, and the entire cream login panel on the right with all its controls and decoration. Seamlessly inpaint only the removed areas with the existing mountain mist and lake landscape consistent with surroundings. No text, no interface, no new objects, no changes of layout, do not reinterpret or redesign the landscape. Output just the clean landscape background, landscape aspect ratio same as input. Keep the temple complex and exact boat placement unchanged.

### account-paper-v1.png

Use case: background-extraction / precise-object-edit. Input is the edit target. Extract ONLY the cream paper login panel on the right, from original pixel bounds approximately x974,y169,width578,height694. Return a tightly cropped portrait image of this panel, aspect ratio 578:694, with real transparent pixels outside its slightly rounded corners. Remove ALL internal content: welcome title, decorative lines next to title, subtitle, login/register tabs, all field labels, form inputs, user/lock/eye icons, checkboxes and option text, submit button, bottom text and horizontal separators. Inpaint these removed parts with the matching fine warm off-white paper texture. Preserve the exact original paper color, subtle fine fibers, thin double frame, four delicate traditional corner ornaments, tiny pale ink mountains along bottom edge, rounded corners and small shadow. No wording, no icons, no inputs, no controls, no background landscape outside panel. Do not exaggerate grain; it is a clean warm cream panel. This is a blank reusable surface for live HTML controls, not a redesigned UI.

### home-background-v1.png

Use case: precise-object-edit.
Input image: edit target, the user's exact PoeticRealm homepage UI reference (1536 x 1024).
Asset type: clean continuous full-page illustrated website background, with every UI element removed.
Primary request: Remove ONLY the text, seals, section-heading marker and ornament, the three complete rectangular poem cards (including their images, bookmark tabs, borders, drop shadows, captions and buttons), and the footer lettering/rules. Inpaint those occupied regions as a natural uninterrupted continuation of the original pale ivory rice-paper landscape.
Constraints/invariants: Preserve the original image composition, coordinates, dimensions, colors, contrast, paper grain and every visible background illustration as faithfully as possible. Keep the top dark teal mountain-and-lake panorama, moon, distant birds, boat, pavilions, rocks and trees in their original positions. Keep the irregular brushy transition to pale paper at about y=270–300. Keep the bamboo branches along both left and right edges and the large bottom-left bamboo, the pale misty mountains across the paper region, the river at the bottom, the birds around the lower center, and the small sailboat/pavilions around the bottom right. The lower 70 percent must remain the same light warm paper rather than dark landscape. Fill where cards were with subtle connected pale mountains and paper, matching adjoining regions. Flat image, no new panel, no rectangle behind future cards, no framing or mockup. No text, no symbols, no cards, no buttons, no UI, no new decorative objects. Do not redesign, recolor, replace or simplify the background. Output exactly the original 1536:1024 aspect ratio.

原始输出：`C:/Users/Lenovo/.codex/generated_images/01a0fa76-e770-78d3-b776-a205f64dde46/exec-679b0fe1-ab67-4f47-9383-be1c4c81e36e.png`，项目使用本目录副本。

### curtain-background-v1.png

Use case: precise-object-edit.
Input image: EDIT TARGET, the exact user-approved PoeticRealm curtain entrance design, 1672:941 aspect ratio.
Asset type: clean full-screen curtain background for a functional website.
Primary request: Remove ONLY the large Chinese title around x505–1170,y310–404, the subtitle and its horizontal rules around x525–1140,y430–468, and both complete login/register button panels around x586–1084,y535–608. Replace these removed UI regions with seamlessly continued original embroidered dark teal fabric, preserving its folds and printed mountain motifs.
Invariants: Preserve the exact original full image composition, aspect ratio, palette, positions, texture and illumination. Especially preserve the two CLOSED central teal curtain panels from top to bottom, their subtle natural meeting fold at x836 and fine original gold embroidered trim, heavy fabric folds, and lower gold floral hem. Preserve both swept-back sheer outer curtains, tassels, jade pendants, the moon on the upper right, mountains, temples, lantern boat on lower left, mist and reflective dark wood floor. This is removal of existing UI, not a redesign. Do not crop, mirror, stretch or enlarge the side regions. Do not replace the central closed curtains with an open landscape. No new sharp central dividing stripe, no mismatched brightness across center, no artificial border. Keep the subtle physical gold seam already in the original curtain design.
Avoid: all lettering, logos, buttons, input fields, new objects, new artwork, changes outside the removed UI. Output only the seamless original-derived background, same landscape aspect ratio as source.

原始输出：`C:/Users/Lenovo/.codex/generated_images/01a0fa76-e770-78d3-b776-a205f64dde46/exec-cb2170cb-2d2b-423d-85b6-c2e8e03c1a6b.png`，项目使用本目录副本。

工具未提供具体模型名称与服务任务 ID，不猜测。生成输出原文件仍保留在 Codex generated_images；项目引用的是本目录副本。
