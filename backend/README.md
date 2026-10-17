# 认证后端

Spring Boot 4.1.1 / Java21 / Maven Wrapper。保留用户创建的 com.demo.backend 包与工程名。

前后端与独立 MySQL 一键启动：从仓库根执行 `node tools/docker.mjs up`。数据库使用 Docker 命名卷，Nginx 同源代理，健康检查按顺序拉起服务；详情见 [Docker启动](../docs/Docker启动.md)。

## 本机 MySQL 启动

1. 准备独立的 MySQL 数据库 poeticrealm 与连接账号；应用不会自动创建数据库。新环境可执行 [建库SQL](sql/create-database.sql)，已有库无需重建。数据库名在URL中，username必须填写实际MySQL登录账号。
2. 复制 src/main/resources/application-local.properties.example 为同目录 application-local.properties，填写数据库连接、账号、密码与至少32字符的随机持久登录密钥。该本机文件已忽略，勿将真实值写入示例或聊天。
3. 在 backend 运行 `./mvnw spring-boot:run`；IDE直接运行 BackendApplication 使用同一配置。默认8080，前端从仓库根运行 `npm --prefix frontend run dev`，5173的/api代理到8080。

也可用 DB_URL、DB_USERNAME、DB_PASSWORD、REMEMBER_ME_KEY、COOKIE_SECURE 环境变量。后端不自动读取前端.env。HTTPS环境设置COOKIE_SECURE=true，持久登录和会话Cookie均使用Secure；部署以同站点反向代理提供前端与/api。

Flyway首次启动按 [V1认证建表SQL](src/main/resources/db/migration/V1__create_auth_tables.sql) 创建 app_users、persistent_logins 及迁移历史，随后应用 V2 新增 account_settings 并校验既有版本；JPA只validate，不自动update。不要先手动执行V1建表后再启动Flyway，避免缺少迁移历史。生产Jar排除application-local.properties，也不含H2或测试启动器；运行Jar时通过环境变量或Spring外部配置提供凭据。开发测试约定不等于正式发布协议，见 [接口与边界](../docs/api/认证接口.md)。

## 测试与隔离联调

在 backend 执行：

```bash
./mvnw test
# 启动仅存在于test classpath的H2内存测试服务器，重启后账号清空
./mvnw spring-boot:test-run -Dspring-boot.run.arguments=--server.port=8081
```

在另一个终端从仓库根执行：

```bash
API_PROXY_TARGET=http://127.0.0.1:8081 npm --prefix frontend run dev
UI_ORIGIN=http://127.0.0.1:5173 node frontend/tools/verify-session.mjs
```

后端测试使用application-test.properties，覆盖本机导入与数据源；测试密钥只用于测试。verify-session会注册随机测试账号，应只对隔离测试环境运行。旧R1游客夹具属于历史验收；当前动效回归使用明确的已登录UI夹具，真实登录门禁、刷新、记住凭据、关闭和退出由verify-session验证。

## 数据与回滚

V1只新增认证表，未对已有业务表执行删除/更新。回退应用代码不会自动撤销数据库迁移；有账号后保留表和数据，后续使用新的前向迁移修正。确认空测试库可整体重建，勿对有用户数据的库直接drop或修改已执行的V1。MySQL连接及迁移需在用户补齐配置后实测。

当前昵称、头像、生日、收藏、足迹、隐私和偏好同步到新增的 account_settings 表；本机仍保存按账号隔离的缓存。接口见 [个人资料与账号](../docs/api/个人资料与账号.md)。密码恢复后续实现。标签页访问令牌为单实例内存，重启失效；记住凭据保存在数据库，密钥和数据库保持时可在登录页点击登录。JSESSIONID和记住凭据Cookie均不能单独访问受保护API。刷新通过同标签页token/lease续接，关闭通知立即停用访问令牌；异常关闭有30分钟闲置过期。完整流程见接口契约。登录节流为单实例内存策略，多实例部署前需统一限流和标签页凭据存储；数据库定期清理留待运维配置。
