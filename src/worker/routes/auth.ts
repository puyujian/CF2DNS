import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'
import { z } from 'zod'
import type { Env } from '../index'
import { generateId } from '../../lib/utils'
import { BusinessError, ValidationError } from '../middleware/error'
import { authRateLimiter } from '../middleware/rateLimit'
import { initializeDatabase, isDatabaseInitialized } from '../lib/database'

// 验证模式
const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少需要6个字符'),
})

const registerSchema = z.object({
  name: z.string().min(2, '姓名至少需要2个字符').max(50, '姓名不能超过50个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(8, '密码至少需要8个字符')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码必须包含大小写字母和数字'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
})

const forgotPasswordSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1, '重置令牌不能为空'),
  password: z.string().min(8, '密码至少需要8个字符')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码必须包含大小写字母和数字'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
})

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, '刷新令牌不能为空'),
})

export const authRoutes = new Hono<{ Bindings: Env }>()

// 临时禁用速率限制以排查问题
// authRoutes.use('*', authRateLimiter)

/**
 * 用户注册
 */
authRoutes.post('/register', async (c) => {
  try {
    console.log('=== 开始注册流程 ===')

    // 确保数据库已初始化
    console.log('检查数据库初始化状态...')
    const isInitialized = await isDatabaseInitialized(c.env)
    console.log('数据库初始化状态:', isInitialized)

    if (!isInitialized) {
      console.log('开始初始化数据库...')
      await initializeDatabase(c.env)
      console.log('数据库初始化完成')
    }

    console.log('解析请求数据...')
    const body = await c.req.json()
    console.log('请求体:', body)

    const validatedData = registerSchema.parse(body)
    console.log('数据验证通过:', validatedData)

    // 检查邮箱是否已存在
    console.log('检查邮箱是否已存在:', validatedData.email)
    const existingUser = await c.env.DB.prepare(`
      SELECT id FROM users WHERE email = ? AND deleted_at IS NULL
    `).bind(validatedData.email).first()
    console.log('查询结果:', existingUser)

    if (existingUser) {
      console.log('邮箱已存在，返回错误')
      throw new BusinessError('该邮箱已被注册', 'EMAIL_ALREADY_EXISTS', 409)
    }

    // 生成用户 ID 和密码哈希
    console.log('生成用户数据...')
    const userId = generateId()
    console.log('用户ID:', userId)

    const passwordHash = await hashPassword(validatedData.password)
    console.log('密码哈希生成完成')

    const emailVerificationToken = generateId()
    console.log('邮箱验证令牌:', emailVerificationToken)

    // 创建用户
    console.log('插入用户数据到数据库...')
    const insertResult = await c.env.DB.prepare(`
      INSERT INTO users (id, email, name, password_hash, email_verification_token)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      userId,
      validatedData.email,
      validatedData.name,
      passwordHash,
      emailVerificationToken
    ).run()
    console.log('用户插入结果:', insertResult)

    // 生成 JWT tokens
    console.log('生成JWT令牌...')
    const { accessToken, refreshToken } = await generateTokens(c.env.JWT_SECRET, userId)
    console.log('JWT令牌生成完成')

    // 保存刷新令牌到数据库
    console.log('保存刷新令牌到数据库...')
    await saveRefreshToken(c.env.DB, userId, refreshToken, c.req.header('CF-Connecting-IP'), c.req.header('User-Agent'))
    console.log('刷新令牌保存完成')

    console.log('注册流程完成，返回响应')
    return c.json({
      success: true,
      message: '注册成功',
      data: {
        user: {
          id: userId,
          email: validatedData.email,
          name: validatedData.name,
          emailVerified: false,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24小时
        },
      },
    })
  } catch (error) {
    console.error('=== 注册流程错误 ===')
    console.error('错误类型:', (error as any)?.constructor?.name)
    console.error('错误消息:', (error as any)?.message)
    console.error('错误栈:', (error as any)?.stack)
    console.error('完整错误对象:', error)
    console.error('==================')

    if (error instanceof z.ZodError) {
      console.log('Zod验证错误:', error.errors)
      throw new ValidationError('输入数据验证失败', formatZodErrors(error))
    }
    throw error
  }
})

/**
 * 用户登录
 */
authRoutes.post('/login', async (c) => {
  try {
    // 确保数据库已初始化
    const isInitialized = await isDatabaseInitialized(c.env)
    if (!isInitialized) {
      await initializeDatabase(c.env)
    }

    const body = await c.req.json()
    const validatedData = loginSchema.parse(body)

    // 查找用户
    const user = await c.env.DB.prepare(`
      SELECT id, email, name, password_hash, is_active, email_verified
      FROM users 
      WHERE email = ? AND deleted_at IS NULL
    `).bind(validatedData.email).first()

    if (!user) {
      throw new BusinessError('邮箱或密码错误', 'INVALID_CREDENTIALS', 401)
    }

    // 检查用户是否被禁用
    if (!user.is_active) {
      throw new BusinessError('账户已被禁用，请联系管理员', 'ACCOUNT_DISABLED', 403)
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(validatedData.password, user.password_hash as string)
    if (!isPasswordValid) {
      throw new BusinessError('邮箱或密码错误', 'INVALID_CREDENTIALS', 401)
    }

    // 生成 JWT tokens
    const { accessToken, refreshToken } = await generateTokens(c.env.JWT_SECRET, user.id as string)

    // 保存刷新令牌到数据库
    await saveRefreshToken(c.env.DB, user.id as string, refreshToken, c.req.header('CF-Connecting-IP'), c.req.header('User-Agent'))

    // 更新最后登录时间
    await c.env.DB.prepare(`
      UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(user.id).run()

    return c.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.email_verified,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24小时
        },
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('输入数据验证失败', formatZodErrors(error))
    }
    throw error
  }
})

/**
 * 刷新访问令牌
 */
authRoutes.post('/refresh', async (c) => {
  try {
    const body = await c.req.json()
    const validatedData = refreshTokenSchema.parse(body)

    // 验证刷新令牌
    const session = await c.env.DB.prepare(`
      SELECT s.id, s.user_id, s.expires_at, u.email, u.name, u.is_active
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.refresh_token = ? AND s.is_active = TRUE AND u.deleted_at IS NULL
    `).bind(validatedData.refreshToken).first()

    if (!session) {
      throw new BusinessError('无效的刷新令牌', 'INVALID_REFRESH_TOKEN', 401)
    }

    // 检查令牌是否过期
    if (new Date(session.expires_at as string) < new Date()) {
      // 删除过期的会话
      await c.env.DB.prepare(`
        UPDATE user_sessions SET is_active = FALSE WHERE id = ?
      `).bind(session.id).run()
      
      throw new BusinessError('刷新令牌已过期', 'REFRESH_TOKEN_EXPIRED', 401)
    }

    // 检查用户是否被禁用
    if (!session.is_active) {
      throw new BusinessError('账户已被禁用', 'ACCOUNT_DISABLED', 403)
    }

    // 生成新的访问令牌
    const accessToken = await sign(
      {
        sub: session.user_id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1小时
      },
      c.env.JWT_SECRET
    )

    return c.json({
      success: true,
      message: '令牌刷新成功',
      data: {
        user: {
          id: session.user_id,
          email: session.email,
          name: session.name,
        },
        tokens: {
          accessToken,
          refreshToken: validatedData.refreshToken,
          expiresAt: Date.now() + 60 * 60 * 1000, // 1小时
        },
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('输入数据验证失败', formatZodErrors(error))
    }
    throw error
  }
})

/**
 * 用户登出
 */
authRoutes.post('/logout', async (c) => {
  try {
    const body = await c.req.json()
    const { refreshToken } = body

    if (refreshToken) {
      // 使刷新令牌失效
      await c.env.DB.prepare(`
        UPDATE user_sessions SET is_active = FALSE WHERE refresh_token = ?
      `).bind(refreshToken).run()
    }

    return c.json({
      success: true,
      message: '登出成功',
    })
  } catch (error) {
    // 即使出错也返回成功，因为登出应该总是成功的
    return c.json({
      success: true,
      message: '登出成功',
    })
  }
})

// 工具函数
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

async function generateTokens(secret: string, userId: string) {
  const now = Math.floor(Date.now() / 1000)
  
  const accessToken = await sign(
    {
      sub: userId,
      iat: now,
      exp: now + 60 * 60, // 1小时
    },
    secret
  )

  const refreshToken = generateId()

  return { accessToken, refreshToken }
}

async function saveRefreshToken(
  db: D1Database,
  userId: string,
  refreshToken: string,
  ipAddress?: string,
  userAgent?: string
) {
  const sessionId = generateId()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天

  await db.prepare(`
    INSERT INTO user_sessions (id, user_id, refresh_token, expires_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(sessionId, userId, refreshToken, expiresAt.toISOString(), ipAddress, userAgent).run()
}

function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {}
  
  error.errors.forEach((err) => {
    const path = err.path.join('.')
    if (!formatted[path]) {
      formatted[path] = []
    }
    formatted[path].push(err.message)
  })
  
  return formatted
}
