-- CF2DNS 初始数据库结构
-- 创建时间: 2024-12-18

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    avatar TEXT,
    cloudflare_api_token TEXT,
    cloudflare_email TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token TEXT,
    password_reset_token TEXT,
    password_reset_expires_at DATETIME,
    last_login_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

-- 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Cloudflare 账户缓存表
CREATE TABLE IF NOT EXISTS cloudflare_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_email TEXT,
    account_type TEXT,
    permissions TEXT, -- JSON 格式存储权限列表
    is_active BOOLEAN DEFAULT TRUE,
    last_synced_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, account_id)
);

-- Cloudflare 域名缓存表
CREATE TABLE IF NOT EXISTS cloudflare_zones (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    zone_id TEXT NOT NULL,
    zone_name TEXT NOT NULL,
    status TEXT NOT NULL,
    paused BOOLEAN DEFAULT FALSE,
    type TEXT NOT NULL,
    development_mode INTEGER DEFAULT 0,
    name_servers TEXT, -- JSON 格式存储 nameservers
    original_name_servers TEXT, -- JSON 格式
    original_registrar TEXT,
    original_dnshost TEXT,
    plan_id TEXT,
    plan_name TEXT,
    permissions TEXT, -- JSON 格式存储权限
    meta_data TEXT, -- JSON 格式存储 meta 信息
    activated_on DATETIME,
    last_synced_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES cloudflare_accounts(account_id) ON DELETE CASCADE,
    UNIQUE(user_id, zone_id)
);

-- DNS 记录缓存表
CREATE TABLE IF NOT EXISTS dns_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    zone_id TEXT NOT NULL,
    record_id TEXT NOT NULL,
    zone_name TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    proxiable BOOLEAN DEFAULT FALSE,
    proxied BOOLEAN DEFAULT FALSE,
    ttl INTEGER NOT NULL,
    locked BOOLEAN DEFAULT FALSE,
    comment TEXT,
    tags TEXT, -- JSON 格式存储标签
    meta_data TEXT, -- JSON 格式存储 meta 信息
    priority INTEGER, -- 用于 MX 记录等
    last_synced_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (zone_id) REFERENCES cloudflare_zones(zone_id) ON DELETE CASCADE,
    UNIQUE(user_id, record_id)
);

-- 操作历史表
CREATE TABLE IF NOT EXISTS operation_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    operation_type TEXT NOT NULL, -- 'create', 'update', 'delete'
    resource_type TEXT NOT NULL, -- 'zone', 'dns_record'
    resource_id TEXT NOT NULL,
    resource_name TEXT NOT NULL,
    old_data TEXT, -- JSON 格式存储操作前的数据
    new_data TEXT, -- JSON 格式存储操作后的数据
    status TEXT NOT NULL, -- 'success', 'failed', 'pending'
    error_message TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- API 调用日志表
CREATE TABLE IF NOT EXISTS api_call_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER, -- 响应时间（毫秒）
    request_size INTEGER, -- 请求大小（字节）
    response_size INTEGER, -- 响应大小（字节）
    ip_address TEXT,
    user_agent TEXT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active, deleted_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_cloudflare_accounts_user_id ON cloudflare_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_cloudflare_zones_user_id ON cloudflare_zones(user_id);
CREATE INDEX IF NOT EXISTS idx_cloudflare_zones_account_id ON cloudflare_zones(account_id);
CREATE INDEX IF NOT EXISTS idx_cloudflare_zones_zone_name ON cloudflare_zones(zone_name);
CREATE INDEX IF NOT EXISTS idx_dns_records_user_id ON dns_records(user_id);
CREATE INDEX IF NOT EXISTS idx_dns_records_zone_id ON dns_records(zone_id);
CREATE INDEX IF NOT EXISTS idx_dns_records_type ON dns_records(type);
CREATE INDEX IF NOT EXISTS idx_dns_records_name ON dns_records(name);
CREATE INDEX IF NOT EXISTS idx_operation_history_user_id ON operation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_history_created_at ON operation_history(created_at);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_user_id ON api_call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_created_at ON api_call_logs(created_at);

-- 创建触发器以自动更新 updated_at 字段
CREATE TRIGGER IF NOT EXISTS update_users_updated_at
    AFTER UPDATE ON users
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_user_sessions_updated_at
    AFTER UPDATE ON user_sessions
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE user_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_cloudflare_accounts_updated_at
    AFTER UPDATE ON cloudflare_accounts
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE cloudflare_accounts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_cloudflare_zones_updated_at
    AFTER UPDATE ON cloudflare_zones
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE cloudflare_zones SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_dns_records_updated_at
    AFTER UPDATE ON dns_records
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE dns_records SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
