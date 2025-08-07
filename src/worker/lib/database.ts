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

    console.log('开始创建Cloudflare域名表...')
    // 创建Cloudflare域名表
    const zonesTableResult = await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS cloudflare_zones (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        zone_id TEXT NOT NULL,
        zone_name TEXT NOT NULL,
        status TEXT NOT NULL,
        paused BOOLEAN DEFAULT FALSE,
        type TEXT DEFAULT 'full',
        development_mode INTEGER DEFAULT 0,
        name_servers TEXT,
        original_name_servers TEXT,
        original_registrar TEXT,
        original_dnshost TEXT,
        account_id TEXT,
        account_name TEXT,
        plan_id TEXT,
        plan_name TEXT,
        permissions TEXT,
        meta TEXT,
        owner TEXT,
        created_on DATETIME,
        modified_on DATETIME,
        activated_on DATETIME,
        last_synced_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, zone_id)
      )
    `).run()
    console.log('Cloudflare域名表创建结果:', zonesTableResult)

    console.log('开始创建DNS记录表...')
    // 创建DNS记录表
    const dnsRecordsTableResult = await env.DB.prepare(`
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
        ttl INTEGER DEFAULT 1,
        locked BOOLEAN DEFAULT FALSE,
        meta TEXT,
        comment TEXT,
        tags TEXT,
        priority INTEGER,
        created_on DATETIME,
        modified_on DATETIME,
        last_synced_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (zone_id) REFERENCES cloudflare_zones(zone_id) ON DELETE CASCADE,
        UNIQUE(user_id, record_id)
      )
    `).run()
    console.log('DNS记录表创建结果:', dnsRecordsTableResult)

    // 创建索引
    console.log('开始创建索引...')
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

    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_cloudflare_zones_user_id ON cloudflare_zones(user_id)
    `).run()

    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_cloudflare_zones_zone_name ON cloudflare_zones(zone_name)
    `).run()

    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_dns_records_user_id ON dns_records(user_id)
    `).run()

    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_dns_records_zone_id ON dns_records(zone_id)
    `).run()

    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_dns_records_name_type ON dns_records(name, type)
    `).run()

    console.log('索引创建完成')
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
    // 检查所有必需的表是否存在
    const requiredTables = ['users', 'user_sessions', 'cloudflare_zones', 'dns_records']

    for (const tableName of requiredTables) {
      const result = await env.DB.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name=?
      `).bind(tableName).first()

      if (!result) {
        console.log(`表 ${tableName} 不存在，需要初始化数据库`)
        return false
      }
    }

    console.log('所有必需的表都存在')
    return true
  } catch (error) {
    console.error('检查数据库状态失败:', error)
    return false
  }
}
