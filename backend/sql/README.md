# MySQL 初始化 SQL

[create-database.sql](create-database.sql) 用于新环境创建 poeticrealm 数据库，字符集/排序规则为 utf8mb4 / utf8mb4_unicode_ci。IF NOT EXISTS 不会覆盖现有库，也不会更改现有库的字符集。

认证表的唯一维护入口是 [V1__create_auth_tables.sql](../src/main/resources/db/migration/V1__create_auth_tables.sql)，创建 app_users 与 persistent_logins。连接配置和随机持久登录密钥准备好后启动 Spring Boot，由 Flyway 建表并维护 flyway_schema_history；不要把 V1 当作另一份手工初始化脚本重复执行。

首次迁移失败时先查看错误；已有迁移或数据时不修改 V1、不删除表或迁移历史。回退应用保留数据库，结构修正使用后续迁移。

本机凭据只放被忽略的 application-local.properties；数据库名填在 spring.datasource.url，用户名填实际 MySQL 账号。启动方式与配置项见 [后端说明](../README.md)。
