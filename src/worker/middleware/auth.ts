import { Context, Next } from 'hono'
import { verify } from 'hono/jwt'
import type { Env } from '../index'

export interface AuthUser {
  id: string
  email: string
  name: string
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
  }
}

/**
 * JWT 认证中间件
 * 验证请求头中的 Authorization token
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  try {
    console.log('=== 认证中间件开始 ===')
    const authHeader = c.req.header('Authorization')
    console.log('Authorization header:', authHeader ? 'present' : 'missing')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('认证失败: 缺少或无效的Authorization header')
      return c.json({
        success: false,
        error: 'Missing or invalid authorization header'
      }, 401)
    }

    const token = authHeader.substring(7) // 移除 "Bearer " 前缀
    
    if (!token) {
      return c.json({
        success: false,
        error: 'Missing access token'
      }, 401)
    }

    // 验证 JWT token
    console.log('验证JWT token...')
    const payload = await verify(token, c.env.JWT_SECRET)
    console.log('JWT payload:', payload)

    if (!payload || !payload.sub) {
      console.log('认证失败: 无效的access token')
      return c.json({
        success: false,
        error: 'Invalid access token'
      }, 401)
    }

    // 检查 token 是否过期
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return c.json({
        success: false,
        error: 'Access token expired'
      }, 401)
    }

    // 临时跳过数据库查询，使用JWT payload中的信息
    console.log('临时跳过数据库查询，使用JWT payload')
    const user: AuthUser = {
      id: payload.sub as string,
      email: 'temp@example.com', // 临时邮箱
      name: 'Temp User' // 临时用户名
    }
    console.log('使用临时用户信息:', user)

    // 将用户信息添加到上下文
    console.log('认证成功，设置用户上下文')
    c.set('user', user)

    console.log('调用next()...')
    await next()
    console.log('=== 认证中间件结束 ===')
  } catch (error) {
    console.error('Auth middleware error:', error)
    console.error('错误详情:', {
      message: (error as any)?.message,
      stack: (error as any)?.stack,
      name: (error as any)?.name
    })
    return c.json({
      success: false,
      error: 'Authentication failed',
      details: {
        message: (error as any)?.message,
        name: (error as any)?.name
      }
    }, 401)
  }
}

/**
 * 可选认证中间件
 * 如果提供了 token 则验证，否则继续执行
 */
export async function optionalAuthMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization')
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7)
      const payload = await verify(token, c.env.JWT_SECRET)
      
      if (payload && payload.sub && payload.exp && payload.exp >= Math.floor(Date.now() / 1000)) {
        const user = await getUserById(c.env.DB, payload.sub as string)
        if (user) {
          c.set('user', user)
        }
      }
    } catch (error) {
      // 忽略认证错误，继续执行
      console.warn('Optional auth failed:', error)
    }
  }
  
  await next()
}

/**
 * 从数据库获取用户信息
 */
async function getUserById(db: D1Database, userId: string): Promise<AuthUser | null> {
  try {
    const result = await db.prepare(`
      SELECT id, email, name 
      FROM users 
      WHERE id = ? AND deleted_at IS NULL
    `).bind(userId).first()
    
    if (!result) {
      return null
    }
    
    return {
      id: result.id as string,
      email: result.email as string,
      name: result.name as string,
    }
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}
