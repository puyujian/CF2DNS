import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
// import { serveStatic } from 'hono/cloudflare-workers'

// 路由模块
import { authRoutes } from './routes/auth'
import { authTestRoutes } from './routes/auth-test'
import { zonesRoutes } from './routes/zones'
import { dnsRoutes } from './routes/dns'
import { apiRoutes } from './routes/api'
import { userRoutes } from './routes/user'

// 中间件
import { authMiddleware } from './middleware/auth'
import { errorHandler } from './middleware/error'
import { rateLimiter } from './middleware/rateLimit'

// 类型定义
export interface Env {
  DB: D1Database
  SESSIONS: KVNamespace
  ASSETS: Fetcher
  JWT_SECRET: string
  ENVIRONMENT: string
  CORS_ORIGIN: string
}

// 创建 Hono 应用实例
const app = new Hono<{ Bindings: Env }>()

// 全局中间件
app.use('*', logger())
app.use('*', prettyJSON())

// CORS 配置
app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.CORS_ORIGIN === '*' ? '*' : [c.env.CORS_ORIGIN],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
  return corsMiddleware(c, next)
})

// 临时禁用全局速率限制以排查问题
// app.use('/api/*', rateLimiter)

// 健康检查端点
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
    version: '1.0.0'
  })
})

// 调试端点 - 检查请求头
app.get('/debug/headers', (c) => {
  const headers = Object.fromEntries(c.req.raw.headers.entries())
  return c.json({
    success: true,
    headers,
    url: c.req.url,
    method: c.req.method,
    timestamp: new Date().toISOString()
  })
})

// 数据库初始化端点（不需要认证，仅用于调试）
app.post('/debug/init-db', async (c) => {
  try {
    console.log('=== 调试：强制初始化数据库 ===')
    const { initializeDatabase } = await import('./lib/database')

    await initializeDatabase(c.env)

    return c.json({
      success: true,
      message: '数据库初始化完成'
    })
  } catch (error) {
    console.error('数据库初始化错误:', error)
    return c.json({
      success: false,
      error: '数据库初始化失败',
      details: {
        message: (error as any)?.message,
        name: (error as any)?.name,
        stack: (error as any)?.stack
      }
    }, 500)
  }
})

// 数据库状态检查端点（不需要认证，仅用于调试）
app.get('/debug/db-status', async (c) => {
  try {
    console.log('=== 调试：检查数据库状态 ===')

    // 检查外键约束状态
    const foreignKeysStatus = await c.env.DB.prepare('PRAGMA foreign_keys').first()

    // 检查表是否存在
    const tables = await c.env.DB.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `).all()

    // 检查各表的记录数
    const userCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first()
    const accountCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM cloudflare_accounts').first()
    const zoneCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM cloudflare_zones').first()
    const dnsCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM dns_records').first()

    // 检查孤立记录
    const orphanedDNS = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM dns_records dr
      LEFT JOIN cloudflare_zones cz ON dr.zone_id = cz.zone_id
      WHERE cz.zone_id IS NULL
    `).first()

    const orphanedZones = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM cloudflare_zones cz
      LEFT JOIN cloudflare_accounts ca ON cz.account_id = ca.account_id
      WHERE ca.account_id IS NULL
    `).first()

    return c.json({
      success: true,
      data: {
        foreignKeysEnabled: foreignKeysStatus?.foreign_keys === 1,
        tables: tables.results?.map((t: any) => t.name) || [],
        recordCounts: {
          users: userCount?.count || 0,
          accounts: accountCount?.count || 0,
          zones: zoneCount?.count || 0,
          dnsRecords: dnsCount?.count || 0
        },
        orphanedRecords: {
          dnsRecords: orphanedDNS?.count || 0,
          zones: orphanedZones?.count || 0
        }
      }
    })
  } catch (error) {
    console.error('数据库状态检查错误:', error)
    return c.json({
      success: false,
      error: '数据库状态检查失败',
      details: {
        message: (error as any)?.message,
        name: (error as any)?.name,
        stack: (error as any)?.stack
      }
    }, 500)
  }
})

// 设置用户令牌端点（不需要认证，仅用于调试）
app.post('/debug/set-token', async (c) => {
  try {
    console.log('=== 调试：设置用户令牌 ===')
    const body = await c.req.json()
    const { email, apiToken, cloudflareEmail, accountId } = body

    if (!email || !apiToken) {
      return c.json({
        success: false,
        error: '邮箱和API令牌不能为空'
      }, 400)
    }

    // 更新用户的Cloudflare配置
    const updateResult = await c.env.DB.prepare(`
      UPDATE users
      SET cloudflare_api_token = ?, cloudflare_email = ?, cloudflare_account_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE email = ?
    `).bind(apiToken, cloudflareEmail, accountId, email).run()

    if (updateResult.meta.changes === 0) {
      return c.json({
        success: false,
        error: '用户不存在'
      }, 404)
    }

    return c.json({
      success: true,
      message: '令牌设置成功',
      data: {
        email,
        tokenLength: apiToken.length,
        tokenPrefix: apiToken.substring(0, 10) + '...',
        cloudflareEmail,
        accountId
      }
    })
  } catch (error) {
    console.error('设置用户令牌错误:', error)
    return c.json({
      success: false,
      error: '设置令牌失败',
      details: {
        message: (error as any)?.message,
        name: (error as any)?.name,
        stack: (error as any)?.stack
      }
    }, 500)
  }
})

// 重置Cloudflare数据端点（不需要认证，仅用于调试）
app.post('/debug/reset-cf-data', async (c) => {
  try {
    console.log('=== 调试：重置Cloudflare数据 ===')

    // 尝试删除表并重新创建（这样可以绕过外键约束）
    console.log('删除并重新创建表...')

    // 删除表（按依赖顺序）
    await c.env.DB.prepare('DROP TABLE IF EXISTS dns_records').run()
    await c.env.DB.prepare('DROP TABLE IF EXISTS cloudflare_zones').run()
    await c.env.DB.prepare('DROP TABLE IF EXISTS cloudflare_accounts').run()

    // 重新创建表
    await c.env.DB.prepare(`
      CREATE TABLE cloudflare_accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        account_name TEXT NOT NULL,
        account_email TEXT,
        account_type TEXT,
        settings TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, account_id)
      )
    `).run()

    await c.env.DB.prepare(`
      CREATE TABLE cloudflare_zones (
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
        meta_data TEXT,
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

    await c.env.DB.prepare(`
      CREATE TABLE dns_records (
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
        meta_data TEXT,
        comment TEXT,
        tags TEXT,
        priority INTEGER,
        created_on DATETIME,
        modified_on DATETIME,
        last_synced_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, record_id)
      )
    `).run()

    return c.json({
      success: true,
      message: 'Cloudflare数据表重置完成'
    })
  } catch (error) {
    console.error('重置Cloudflare数据错误:', error)
    return c.json({
      success: false,
      error: '重置数据失败',
      details: {
        message: (error as any)?.message,
        name: (error as any)?.name,
        stack: (error as any)?.stack
      }
    }, 500)
  }
})

// 不需要认证的API路由
app.route('/api/auth', authRoutes)
app.route('/api/auth-test', authTestRoutes)

// 需要认证的API路由 - 先应用认证中间件
app.use('/api/zones/*', authMiddleware)
app.use('/api/dns/*', authMiddleware)
app.use('/api/cloudflare/*', authMiddleware)
app.use('/api/user/*', authMiddleware)

// 然后注册路由
app.route('/api/zones', zonesRoutes)
app.route('/api/dns', dnsRoutes)
app.route('/api/cloudflare', apiRoutes)
app.route('/api/user', userRoutes)

// 静态文件服务 (使用 ASSETS 绑定)
app.get('/assets/*', async (c) => {
  try {
    return await c.env.ASSETS.fetch(c.req.raw)
  } catch (error) {
    return c.notFound()
  }
})

// 错误处理
app.onError(errorHandler)

// 404 处理
app.notFound(async (c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({
      success: false,
      error: 'API endpoint not found',
      path: c.req.path
    }, 404)
  }

  // 对于非 API 路径，返回 index.html (SPA 路由支持)
  try {
    const url = new URL(c.req.url)
    url.pathname = '/index.html'
    return await c.env.ASSETS.fetch(url.toString())
  } catch (error) {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CF2DNS</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <div id="root">
            <h1>CF2DNS</h1>
            <p>应用正在加载中...</p>
            <p>请确保静态资源已正确部署。</p>
          </div>
        </body>
      </html>
    `)
  }
})

export default app
