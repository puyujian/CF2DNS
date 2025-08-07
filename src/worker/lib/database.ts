import type { Env } from '../index'

/**
 * 初始化数据库表
 */
export async function initializeDatabase(env: Env): Promise<void> {
  try {
    // 创建用户表
    await env.DB.prepare(`
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
      )
    `).run()

    // 创建用户会话表
    await env.DB.prepare(`
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
      )
    `).run()

    // 创建索引
    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `).run()

    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active, deleted_at)
    `).run()

    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)
    `).run()

    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, expires_at)
    `).run()

    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
    throw error
  }
}

/**
 * 检查数据库是否已初始化
 */
export async function isDatabaseInitialized(env: Env): Promise<boolean> {
  try {
    const result = await env.DB.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='users'
    `).first()
    return !!result
  } catch (error) {
    console.error('Failed to check database status:', error)
    return false
  }
}
