import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { serveStatic } from 'hono/cloudflare-workers'

// 路由模块
import { authRoutes } from './routes/auth'
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

// 速率限制
app.use('/api/*', rateLimiter)

// 健康检查端点
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
    version: '1.0.0'
  })
})

// API 路由
app.route('/api/auth', authRoutes)
app.route('/api/zones', zonesRoutes)
app.route('/api/dns', dnsRoutes)
app.route('/api/cloudflare', apiRoutes)

// 需要认证的路由
app.use('/api/user/*', authMiddleware)
app.route('/api/user', userRoutes)

// 静态文件服务 (SPA 支持)
app.get('/assets/*', serveStatic({ root: './', manifest: {} }))
app.get('*', serveStatic({ path: './index.html', manifest: {} }))

// 错误处理
app.onError(errorHandler)

// 404 处理
app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({
      success: false,
      error: 'API endpoint not found',
      path: c.req.path
    }, 404)
  }
  
  // 对于非 API 路径，返回 index.html (SPA 路由)
  return c.env.ASSETS.fetch(c.req.url.replace(c.req.path, '/index.html'))
})

export default app
