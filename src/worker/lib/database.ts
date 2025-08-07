import type { Env } from '../index'

/**
 * 初始化数据库表
 */
export async function initializeDatabase(env: Env): Promise<void> {
  try {
    console.log('开始创建用户表...')
    // 创建用户表
    const userTableResult = await env.DB.prepare(`
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
    console.log('用户表创建结果:', userTableResult)

    console.log('开始创建用户会话表...')
    // 创建用户会话表
    const sessionTableResult = await env.DB.prepare(`
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
    console.log('用户会话表创建结果:', sessionTableResult)

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

    console.log('数据库初始化成功完成')
  } catch (error) {
    console.error('=== 数据库初始化失败 ===')
    console.error('错误类型:', (error as any)?.constructor?.name)
    console.error('错误消息:', (error as any)?.message)
    console.error('错误栈:', (error as any)?.stack)
    console.error('完整错误对象:', error)
    console.error('========================')
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
