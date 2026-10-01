# 参考来源与使用边界

> 核查日期：2026-10-01。本文件只收集外部参考链接，**未下载博物馆图片、未确定最终背景或字体、未向 public 添加素材**。后来生成并保存的 Stitch UI 与概念图另见 [generation-log.md](generation-log.md)。

## 已核查的背景参考入口

| 来源 | URL | 本轮核查 | 用途与限制 |
|---|---|---|---|
| The Met · Open Access | https://www.metmuseum.org/zh/hubs/open-access | 浏览器读到公共领域作品图像与数据采用 CC0；OA 图像有专门标记 | 作为查找许可明确山水资源的入口；不能据此认为全馆图像都开放 |
| The Met · 中国山水 / 开放图像检索 | https://www.metmuseum.org/art/collection/search?q=landscape&geolocation=China&showOnly=openAccess | 浏览器读到 China / Has Open Access image 筛选与山水作品结果 | 候选池，逐件复核再用；不把检索缩略图直接打包 |
| Huang Yue · River and landscape（1825，手卷） | https://www.metmuseum.org/art/collection/search/931206 | 作品页有 Public Domain 与 Download Image；文字说明是纸本水墨山水，并提示从右向左观看 | 可参考长卷的横向山川组织；当前未下载。只借山水层次，不将清代画中建筑作为唐风建筑考据 |

## 应用于新设计

- 题头参考横向山川展开和前后层次，而不是把整卷直接裁成看不清的横条。
- 下部背景保持更低对比与更多留白，给三张浮动诗卡让位；未来用自制 / 合法素材分层配合 Shader 水纹、雾与流光，不单靠移动一张平面图。
- 古画参考服务构图；写实寺、桥、舟和材料仍需独立建模与实机验证。

## 尚未核实 / 未采用

- 具体可分发行书字体尚未选定。生成字形只供方向审批，不能代替字体许可和实际字形检查。
- WebSearch 返回服务限流，部分 WebFetch 请求失败；没有把失败请求作为已核查来源。
- 未下载网络“国风壁纸”、未选音频 / HDRI / 真实材质包；不得把这些记成已获许可。

## 进入发布资产前

1. 在 CREDITS 记录具体作品 / 文件、作者、来源页、许可、下载日期、用途和修改。
2. 验证可嵌入 / 可分发条件，而非只看“免费”或搜索缩略图。
3. 保存原始来源证据，优化后才放 public；UI 设计图仍留 docs/design。
4. 生成内容另记实际工具、任务标识、输入与输出；AI 生成不自动等于 CC0。
