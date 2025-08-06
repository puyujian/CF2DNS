import { Context, Next } from 'hono'
import type { Env } from '../index'

interface RateLimitConfig {
  windowMs: number // 时间窗口（毫秒）
  maxRequests: number // 最大请求数
  keyGenerator?: (c: Context) => string // 自定义键生成器
  skipSuccessfulRequests?: boolean // 是否跳过成功请求
  skipFailedRequests?: boolean // 是否跳过失败请求
}

interface RateLimitInfo {
  count: number
  resetTime: number
  firstRequest: number
}

/**
 * 速率限制中间件
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = config

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const key = keyGenerator(c)
    const now = Date.now()
    const windowStart = now - windowMs

    try {
      // 从 KV 获取当前限制信息
      const rateLimitData = await c.env.SESSIONS.get(`ratelimit:${key}`)
      let info: RateLimitInfo

      if (rateLimitData) {
        info = JSON.parse(rateLimitData)
        
        // 如果窗口已过期，重置计数
        if (info.firstRequest < windowStart) {
          info = {
            count: 1,
            resetTime: now + windowMs,
            firstRequest: now,
          }
        } else {
          info.count += 1
        }
      } else {
        info = {
          count: 1,
          resetTime: now + windowMs,
          firstRequest: now,
        }
      }

      // 检查是否超过限制
      if (info.count > maxRequests) {
        // 设置响应头
        c.header('X-RateLimit-Limit', maxRequests.toString())
        c.header('X-RateLimit-Remaining', '0')
        c.header('X-RateLimit-Reset', Math.ceil(info.resetTime / 1000).toString())
        c.header('Retry-After', Math.ceil((info.resetTime - now) / 1000).toString())

        return c.json({
          success: false,
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil((info.resetTime - now) / 1000)} seconds.`,
          retryAfter: Math.ceil((info.resetTime - now) / 1000),
        }, 429)
      }

      // 设置响应头
      c.header('X-RateLimit-Limit', maxRequests.toString())
      c.header('X-RateLimit-Remaining', Math.max(0, maxRequests - info.count).toString())
      c.header('X-RateLimit-Reset', Math.ceil(info.resetTime / 1000).toString())

      // 执行下一个中间件
      await next()

      // 根据配置决定是否计入请求
      const shouldCount = !((skipSuccessfulRequests && c.res.status < 400) ||
                           (skipFailedRequests && c.res.status >= 400))

      if (shouldCount) {
        // 更新 KV 中的限制信息
        const ttl = Math.ceil((info.resetTime - now) / 1000)
        await c.env.SESSIONS.put(
          `ratelimit:${key}`,
          JSON.stringify(info),
          { expirationTtl: ttl }
        )
      }

    } catch (error) {
      console.error('Rate limit middleware error:', error)
      // 如果速率限制出错，允许请求通过
      await next()
    }
  }
}

/**
 * 默认键生成器 - 基于 IP 地址
 */
function defaultKeyGenerator(c: Context): string {
  // 尝试获取真实 IP
  const forwarded = c.req.header('CF-Connecting-IP') ||
                   c.req.header('X-Forwarded-For') ||
                   c.req.header('X-Real-IP')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  // 回退到连接信息
  return 'unknown'
}

/**
 * 基于用户的键生成器
 */
export function userKeyGenerator(c: Context): string {
  const user = c.get('user')
  if (user) {
    return `user:${user.id}`
  }
  return defaultKeyGenerator(c)
}

/**
 * 基于 API 端点的键生成器
 */
export function endpointKeyGenerator(c: Context): string {
  const ip = defaultKeyGenerator(c)
  const endpoint = c.req.path
  return `${ip}:${endpoint}`
}

// 预定义的速率限制配置
export const rateLimitConfigs = {
  // 通用 API 限制
  general: {
    windowMs: 15 * 60 * 1000, // 15分钟
    maxRequests: 100,
  },
  
  // 认证相关限制
  auth: {
    windowMs: 15 * 60 * 1000, // 15分钟
    maxRequests: 5, // 登录尝试限制
    keyGenerator: defaultKeyGenerator,
  },
  
  // DNS 操作限制
  dns: {
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 30,
    keyGenerator: userKeyGenerator,
  },
  
  // Cloudflare API 代理限制
  cloudflareProxy: {
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 60,
    keyGenerator: userKeyGenerator,
  },
}

// 导出预配置的中间件
export const rateLimiter = createRateLimiter(rateLimitConfigs.general)
export const authRateLimiter = createRateLimiter(rateLimitConfigs.auth)
export const dnsRateLimiter = createRateLimiter(rateLimitConfigs.dns)
export const cloudflareRateLimiter = createRateLimiter(rateLimitConfigs.cloudflareProxy)
