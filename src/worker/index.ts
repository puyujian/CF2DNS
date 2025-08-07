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
