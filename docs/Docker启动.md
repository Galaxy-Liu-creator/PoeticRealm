# Docker 启动

在仓库根目录执行。Ubuntu 需要已启动的 Docker Desktop，或 Docker Engine 与 Compose 插件；宿主机无需另装 Node.js、Java、Maven 或 MySQL。

```bash
./tools/docker.sh up
```

Windows 或已安装 Node.js 的环境也可以继续使用 `node tools/docker.mjs up`，两种入口共用同一份 Compose 配置与数据库卷。

首次启动自动生成被 Git 忽略的 `.env.docker`，随机填写数据库密码、root 密码和持久凭据密钥，再构建并启动 MySQL、Spring Boot 和 Nginx 前端。数据库健康后启动后端，后端健康后启动前端。完成后打印实际访问地址，默认为 **http://127.0.0.1:5173**。

Ubuntu 上请先启动 Docker Desktop 或 Docker daemon；Node.js 入口还会尝试启动 Docker Desktop。首次构建需要联网拉取官方镜像、npm 和 Maven 依赖，之后使用缓存。Dockerfile 的 `frontend` 和 `backend` 两个目标分别生成前后端镜像，后端构建运行测试，前端执行类型检查和生产构建。

如果 5173 已被 Vite 占用，先关闭该开发服务，或在 `.env.docker` 中将 `POETIC_PORT` 改为 5186，再执行同一启动命令。Bash 中也可以临时指定：

```bash
POETIC_PORT=5186 ./tools/docker.sh up
```

## 常用命令

```bash
./tools/docker.sh status
./tools/docker.sh logs
./tools/docker.sh stop
./tools/docker.sh up
./tools/docker.sh down
```

`stop` 停止服务；`down` 删除本项目容器和网络，**保留数据库持久卷**。再次 `up` 会沿用账号和记住凭据。不要删除 `.env.docker` 或使用 `down -v` 作为日常重启方法：前者会丢失与已有数据库匹配的密码，后者会删除账号数据。修改已有数据库密码须同时更新数据库账号，单独修改环境变量不会重置 MySQL 持久卷。

直接使用 Compose 的等效启动命令（先由启动助手生成 `.env.docker`）：

```bash
docker compose --env-file .env.docker up -d --build --wait --wait-timeout 240
```

## 服务与数据

| 服务 | 用途 | 暴露端口 |
|---|---|---|
| frontend | Nginx 静态前端，`/api` 同源转发 | 仅本机 127.0.0.1:5173，允许覆盖 |
| backend | Java 21 / Spring Boot 认证 | 仅容器网络 8080 |
| db | MySQL 8.4 / Flyway V1、V2 / 账号、资料与持久凭据 | 仅容器网络 3306 |

`poeticrealm_mysql-data` 保存 MySQL 数据；该数据库独立于宿主机已有 MySQL。账号保存在 `app_users`，持久凭据保存在 `persistent_logins`，收藏、头像、昵称、足迹及偏好等资料保存在 `account_settings`，浏览器保留按账号隔离的缓存。后端重启会使当前标签页令牌失效，但账号和 30 天凭据保留，需回登录页点击登录。

每次新打开页面先登录；记住凭据会显示账号及已保存密码状态，仍需点击登录。密码本身不存入浏览器：30 天凭据为 HttpOnly Cookie。当前标签页的访问令牌和刷新凭据只存在内存与 sessionStorage；刷新验证后保留当前 hash 页面。关闭通知到达后，访问令牌立即停用，15 秒刷新窗口仅供同标签页凭据换发令牌；断网或进程强杀无法可靠发送关闭通知，服务端另设 30 分钟闲置过期。

## 维护与回退

密钥、数据库和浏览器缓存都应按实际需要备份。`.env.docker` 不提交到 Git，不在聊天或日志中打印；`.dockerignore` 排除该文件、宿主机数据库配置、构建产物与原稿。前后端容器使用非 root 身份。

Windows 数据库迁移采用先备份、再逻辑导出和导入的方式。原库完整物理备份、逐文件 SHA-256 清单、`poeticrealm` SQL 备份和核对结果保存在本机 `runtime/backups/`；该目录由 Git 与 Docker 构建上下文排除。导入仅针对 Ubuntu 数据库执行一次，日常 `up` 沿用持久卷，不会重复恢复旧快照。具体迁移结果见 `HANDOFF.md`。

代码更新后再次执行 `up`。回退到已验证的代码或镜像时保留 `.env.docker` 和数据库卷；当前使用既有 V1、V2 迁移，无新增迁移或数据删除。后续数据库结构变更采用新的前向迁移，不修改已执行的历史版本。此配置用于本机验收；当前预览图片的公开发布许可边界仍按 CREDITS 执行。
