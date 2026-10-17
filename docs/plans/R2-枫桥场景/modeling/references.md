# 参考研究 · 方法、形制与使用边界

[返回建模目录](README.md)

以下方法资料于2026-10-07通过用户指定GitHub插件只读研究；唐风身份补查UNESCO官方页面。项目建模方案是本项目的制作决策，不把参考项目称为已实现枫桥的成品。发布来源与许可统一登记CREDITS。

## 建筑与桥舟

| 主来源 | 可借鉴内容 | 边界 |
|---|---|---|
| [ACA-Builder README](https://github.com/ppddry/ACA-Builder/blob/main/README.md#L3-L25)、[buildRoof.py](https://github.com/ppddry/ACA-Builder/blob/main/buildRoof.py) | 台基、柱网、梁架、椽架、瓦面及UV分模块；屋顶标高与父子层级 | 清代北方官式体系。学习生成组织，唐风比例单独校准；许可未核实，未安装或复制模板 |
| [YingzaoFashi](https://github.com/lilacsky824/YingzaoFashi-Blender-Procedural-Model) | 模数、柱体收分与分段卷杀参数 | 宋制参考，依赖定制Blender；许可与5.1兼容未核实 |
| [bpyhullgen](https://github.com/edzop/bpyhullgen)、[blender_boat_nodes](https://github.com/edzop/blender_boat_nodes) | 船壳截面、外皮与肋骨/纵骨分离 | 自建船型与组件，许可未核实，未复制代码或模型 |
| [UNESCO五台山](https://whc.unesco.org/en/list/1279/) | 佛光寺东大殿的现存唐代木构身份 | 官方说明不是构件测绘图，柱径、出檐、斗栱等仍须可靠图像/测绘校准；不下载摄影图或声称复原寒山寺原貌 |

定向检索未找到足以作为唐代寒山寺或枫桥石拱桥定稿依据的GitHub成品。石桥的拱轴线、内外拱圈、分块石、桥台和桥面是本项目的自建方案；古建参考不替代形制核查。

## 自然与环境

| 主来源 | 可借鉴内容 | 边界 |
|---|---|---|
| [tree-gen Acer参数](https://github.com/friggog/tree-gen/blob/master/parametric/tree_params/acer.py)、[gen.py](https://github.com/friggog/tree-gen/blob/master/parametric/gen.py)、[leaf.py](https://github.com/friggog/tree-gen/blob/master/leaf.py) | 主干/枝条层级，枝数/长度/分叉/叶尺寸分开控制；叶原型朝向、弯曲、UV与合并 | 程序GPLv3；[README](https://github.com/friggog/tree-gen/blob/master/README.md)对生成模型另有直接售卖限制，不称CC0。叶片LOD删叶不代表完整树干LOD；未安装或导入生成资产 |
| [cliffgenerator README](https://github.com/marcueberall/blender.cliffgenerator/blob/master/README.md#L15-L61) | 宏微岩块、Bezier岸壁、发射形状/容积边界/地面切割，LOD和几何清理 | 输出需要补UV；[LICENSE](https://github.com/marcueberall/blender.cliffgenerator/blob/master/LICENSE)确认程序GPLv3，生成资产/外部资源未另核实条款，限方法参考 |
| [Procedural Chinese Landscape README](https://github.com/IRCSS/Procedural-Chinese-Landscape-Painting-Blender-3D/blob/master/README.md) | 可编辑基础平面、固定种子、分段命名节点与程序材质组织 | [程序MIT](https://github.com/IRCSS/Procedural-Chinese-Landscape-Painting-Blender-3D/blob/master/LICENSE)，验证版本3.5；README记录桥交叉问题。自建布局，未运行或导入模型/画风材质，不推断外部资源许可 |
| [Three.js Water](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Water.js) | WebGL镜像相机、裁剪面、细波法线、雾和反射成本 | dev示例只作原理参考，API/GLSL以锁定0.186.1为准；沿用现有NightRiver路线，不迁移WebGPU |

## 已核验的文件快照

下列为GitHub文件blob标识，用于定位研究内容，不代表已经导入代码或获得所有资源授权。

| 项目 / 文件 | blob SHA |
|---|---|
| ACA README.md | 86176ef836b9eb7af1b914dbc247216813accfe9 |
| ACA buildRoof.py | e3e96b0834a3bdb2dc4169a2f235360cf1086a21 |
| ACA build.py | 2c15d88a763e82a2e4c0cbc532b70c4d30493819 |
| tree-gen parametric/tree_params/acer.py | 85e3390d3c2ac2319b58f25735ee849bf68a9627 |
| tree-gen parametric/gen.py | 170dcdcfd4436fed84e678debb5f5cdb97df9eb0 |
| tree-gen leaf.py | 0b81533ce62bad6385a283440dbafe4f2df072e7 |
| cliffgenerator LICENSE | f288702d2fa16d3cdf0035b15a9fcbc552cd88e7 |
| Chinese Landscape README.md | 8fd97ccbfe061b18a9c821b229eeaf589ee52005 |
| Chinese Landscape LICENSE | 4ba88d9676ab81765297945b0069e321de4c63e1 |
