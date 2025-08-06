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
    const authHeader = c.req.header('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
    const payload = await verify(token, c.env.JWT_SECRET)
    
    if (!payload || !payload.sub) {
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

    // 从数据库获取用户信息
    const user = await getUserById(c.env.DB, payload.sub as string)
    
    if (!user) {
      return c.json({
        success: false,
        error: 'User not found'
      }, 401)
    }

    // 将用户信息添加到上下文
    c.set('user', user)
    
    await next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.json({
      success: false,
      error: 'Authentication failed'
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
