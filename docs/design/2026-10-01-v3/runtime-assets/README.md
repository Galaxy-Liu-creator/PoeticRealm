# UI 运行素材

2026-10-02，内置 `image_gen` 编辑用户指定的 v07 `references/S11-login-user.png`。用于本地 UI 还原，不覆盖原图，不引入字体或图片外部请求。

- `account-landscape-v1.png`：去除导航、品牌文字、左侧体验行和右侧表单后的全幅山水。保留山、月、寺院、灯光、湖、舟、人影、竹与侧幕。
- `account-paper-v1.png`：提取右侧空白绢纸面板，去除标题、字段、按钮和所有表单文字，保留纸纹、双框、角纹与浅色底部山影。外围透明；CSS 取中间纸面，框线和角纹按原图还原。
- `home-background-v1.png`：内置 `image_gen` 编辑 v09 `screens/S01-home-desktop-user.png`，移除文字、印章、三张诗词卡片和页脚文字，保留原稿完整顶部山水、纸纹、两侧竹叶、下方浅山与船景；卡片遮挡区以邻近纸面与浅山补齐。首页顶部与下方纸面从同一张 1536×1024 背景取景；总览、收藏与个人中心共用下方纸面，通过同一页面背景层覆盖全幅与全部滚动高度，列表无托底；原图文件未覆盖。可见原背景尽量保留，遮挡区属于生成补绘，不宣称逐像素完全一致。

运行时的品牌、宣传语、体验文案、字段、校验、按钮、协议入口均为 DOM。体验插画和输入图标只裁取原图对应的无文字区域。登记见 `docs/CREDITS.md`。原图字形无法从 PNG 确定；全站统一引用本机华文行楷，回退楷体，不下载或分发字体文件。

## 完整提示词

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

工具未提供具体模型名称与服务任务 ID，不猜测。生成输出原文件仍保留在 Codex generated_images；项目引用的是本目录副本。
