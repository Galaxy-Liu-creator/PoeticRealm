# CLAUDE.md

项目长期约定见 [AGENTS.md](AGENTS.md)，当前进度与验证见 [HANDOFF.md](HANDOFF.md)。不要建立第二份进度记录。

## 先读

| 要做什么 | 读哪里 |
|---|---|
| 了解当前进度、下一步 | `HANDOFF.md` |
| 当前阶段的任务 | `docs/plans/README.md` → 当前阶段的 `plan.md` |
| 设计意图 | `docs/设计文档.md` |
| 碰到 GLB、Blender、命名、导出 | `docs/CONTRACT.md`（与设计文档冲突时以它为准） |

前后端结构与后端创建配置见 [架构规划](docs/architecture/前后端分离与认证规划.md)。项目体验、渲染、素材和协作规则统一维护在 AGENTS，当前阶段授权以用户会话和 HANDOFF 为准。

## 命令

```bash
npm --prefix frontend run dev
npm --prefix frontend run build
npm --prefix frontend test
```

调试：`?scene=<id>&t=<秒>` 跳转，`?q=high|mid|low` 画质，`?debug` 参数面板；`window.__POETIC__` 提供 `seek` / `step`。

Blender 使用 `D:/Blender/blender.exe -b <file> --python <script>`；从仓库根导出到 frontend/public/assets，来源与编码遵循 CONTRACT。
