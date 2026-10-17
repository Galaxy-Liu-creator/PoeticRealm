# Docker 启动

在仓库根目录执行。需要 Docker Desktop（Linux containers）和 Node.js；无需在宿主机另装 Java、Maven 或 MySQL。

```bash
node tools/docker.mjs up
```

首次启动自动生成被 Git 忽略的 `.env.docker`，随机填写数据库密码、root 密码和持久凭据密钥，再构建并启动 MySQL、Spring Boot 和 Nginx 前端。数据库健康后启动后端，后端健康后启动前端。完成后打印实际访问地址，默认为 **http://127.0.0.1:5173**。

该命令会尝试启动 Docker Desktop；Linux 上请先启动 Docker daemon。首次构建需要联网拉取官方镜像、npm 和 Maven 依赖，之后使用缓存。Dockerfile 的 `frontend` 和 `backend` 两个目标分别生成前后端镜像，后端构建运行测试，前端执行类型检查和生产构建。

如果 5173 已被 Vite 占用，先关闭该开发服务，或在 `.env.docker` 中将 `POETIC_PORT` 改为 5186，再执行同一启动命令。Bash 中也可以临时指定：

```bash
POETIC_PORT=5186 node tools/docker.mjs up
```

## 常用命令

```bash
node tools/docker.mjs status
node tools/docker.mjs logs
node tools/docker.mjs stop
node tools/docker.mjs up
node tools/docker.mjs down
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
| db | MySQL 8.4 / Flyway V1 / 账号与持久凭据 | 仅容器网络 3306 |

`poeticrealm_mysql-data` 保存 MySQL 数据；该数据库独立于宿主机已有 MySQL。收藏、头像、昵称和足迹继续按账号保存在浏览器，尚未云同步。后端重启会使当前标签页令牌失效，但账号和 30 天凭据保留，需回登录页点击登录。

每次新打开页面先登录；记住凭据会显示账号及已保存密码状态，仍需点击登录。密码本身不存入浏览器：30 天凭据为 HttpOnly Cookie。当前标签页的访问令牌和刷新凭据只存在内存与 sessionStorage；刷新验证后保留当前 hash 页面。关闭通知到达后，访问令牌立即停用，15 秒刷新窗口仅供同标签页凭据换发令牌；断网或进程强杀无法可靠发送关闭通知，服务端另设 30 分钟闲置过期。

## 维护与回退

密钥、数据库卷和浏览器的个人资料都应按实际需要备份。`.env.docker` 不提交到 Git，不在聊天或日志中打印；`.dockerignore` 排除该文件、宿主机数据库配置、构建产物与原稿。前后端容器使用非 root 身份。

代码更新后再次执行 `up`。回退到已验证的代码或镜像时保留 `.env.docker` 和数据库卷；当前只使用既有 V1 建表，无新增迁移或数据删除。后续数据库结构变更采用新的前向迁移，不修改已执行的 V1。此配置用于本机验收；当前预览图片的公开发布许可边界仍按 CREDITS 执行。
