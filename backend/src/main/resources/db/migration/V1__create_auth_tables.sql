-- Flyway 管理的认证表迁移；在 datasource 指定的数据库中执行。
-- 请由应用启动时的 Flyway 执行并登记版本，不要先手工建表再重复迁移。
CREATE TABLE app_users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(32) NOT NULL,
    username_key VARCHAR(64) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    birthday DATE,
    gender VARCHAR(8) NOT NULL,
    agreement_version VARCHAR(32) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT uk_app_users_username_key UNIQUE (username_key)
);

CREATE TABLE persistent_logins (
    username VARCHAR(64) NOT NULL,
    series VARCHAR(64) PRIMARY KEY,
    token VARCHAR(64) NOT NULL,
    last_used TIMESTAMP(6) NOT NULL
);
CREATE INDEX ix_persistent_logins_username ON persistent_logins (username);
