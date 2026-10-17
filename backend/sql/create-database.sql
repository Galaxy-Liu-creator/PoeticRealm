-- MySQL 数据库初始化：新环境使用，现有 poeticrealm 库不会被覆盖。
-- 用户名与数据库名是不同配置；连接账号通过本机配置提供，不在 SQL 中保存密码。
CREATE DATABASE IF NOT EXISTS `poeticrealm`
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

-- 认证表由 Spring Boot 启动时的 Flyway V1 迁移创建并登记版本。
-- 不要先手动执行 V1 建表后再启动 Flyway，否则会缺少迁移历史。
-- 建表 SQL：../src/main/resources/db/migration/V1__create_auth_tables.sql
