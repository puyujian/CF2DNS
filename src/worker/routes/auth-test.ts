import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { z } from 'zod'
import type { Env } from '../index'
import { generateId } from '../../lib/utils'
import { BusinessError, ValidationError } from '../middleware/error'
import { authRateLimiter } from '../middleware/rateLimit'

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

export const authTestRoutes = new Hono<{ Bindings: Env }>()

// 应用速率限制
authTestRoutes.use('*', authRateLimiter)

/**
 * 测试用户注册 (不使用数据库)
 */
authTestRoutes.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const validatedData = registerSchema.parse(body)

    // 模拟检查邮箱是否已存在
    if (validatedData.email === 'test@example.com') {
      throw new BusinessError('该邮箱已被注册', 'EMAIL_ALREADY_EXISTS', 409)
    }

    // 生成用户 ID 和模拟数据
    const userId = generateId()
    const emailVerificationToken = generateId()

    // 生成 JWT tokens
    const { accessToken, refreshToken } = await generateTokens(c.env.JWT_SECRET, userId)

    return c.json({
      success: true,
      message: '注册成功 (测试模式)',
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
    if (error instanceof z.ZodError) {
      throw new ValidationError('输入数据验证失败', formatZodErrors(error))
    }
    throw error
  }
})

/**
 * 测试用户登录 (不使用数据库)
 */
authTestRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const validatedData = loginSchema.parse(body)

    // 模拟用户验证
    if (validatedData.email !== 'test@example.com' || validatedData.password !== 'Test123456') {
      throw new BusinessError('邮箱或密码错误', 'INVALID_CREDENTIALS', 401)
    }

    // 生成模拟用户数据
    const userId = generateId()

    // 生成 JWT tokens
    const { accessToken, refreshToken } = await generateTokens(c.env.JWT_SECRET, userId)

    return c.json({
      success: true,
      message: '登录成功 (测试模式)',
      data: {
        user: {
          id: userId,
          email: validatedData.email,
          name: 'Test User',
          emailVerified: true,
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

// 工具函数
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
