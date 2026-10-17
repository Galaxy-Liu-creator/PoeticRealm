CREATE TABLE account_settings (
    user_id BIGINT PRIMARY KEY,
    document LONGTEXT NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);
