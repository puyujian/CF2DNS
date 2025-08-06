import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Env } from '../index'

/**
 * 全局错误处理中间件
 */
export function errorHandler(err: Error, c: Context<{ Bindings: Env }>) {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: c.req.url,
    method: c.req.method,
    headers: Object.fromEntries(c.req.raw.headers.entries()),
    timestamp: new Date().toISOString(),
  })

  // HTTP 异常处理
  if (err instanceof HTTPException) {
    return c.json({
      success: false,
      error: err.message,
      code: err.status,
    }, err.status)
  }

  // 自定义业务异常
  if (err instanceof BusinessError) {
    return c.json({
      success: false,
      error: err.message,
      code: err.code,
      details: err.details,
    }, err.statusCode as any)
  }

  // Cloudflare API 错误
  if (err instanceof CloudflareAPIError) {
    return c.json({
      success: false,
      error: 'Cloudflare API error',
      message: err.message,
      code: err.code,
      details: err.errors,
    }, err.statusCode as any)
  }

  // 数据库错误
  if (err.message.includes('D1_ERROR') || err.message.includes('SQLITE')) {
    return c.json({
      success: false,
      error: 'Database error occurred',
      message: c.env.ENVIRONMENT === 'development' ? err.message : 'Internal server error',
    }, 500)
  }

  // JWT 相关错误
  if (err.message.includes('JWT') || err.message.includes('token')) {
    return c.json({
      success: false,
      error: 'Authentication error',
      message: 'Invalid or expired token',
    }, 401)
  }

  // 验证错误
  if (err instanceof ValidationError) {
    return c.json({
      success: false,
      error: 'Validation error',
      message: err.message,
      details: err.details,
    }, 400)
  }

  // 默认服务器错误
  return c.json({
    success: false,
    error: 'Internal server error',
    message: c.env.ENVIRONMENT === 'development' ? err.message : 'Something went wrong',
    ...(c.env.ENVIRONMENT === 'development' && { stack: err.stack }),
  }, 500)
}

/**
 * 业务逻辑错误类
 */
export class BusinessError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message)
    this.name = 'BusinessError'
  }
}

/**
 * Cloudflare API 错误类
 */
export class CloudflareAPIError extends Error {
  constructor(
    message: string,
    public code: number,
    public statusCode: number = 500,
    public errors?: any[]
  ) {
    super(message)
    this.name = 'CloudflareAPIError'
  }
}

/**
 * 验证错误类
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * 创建标准化的错误响应
 */
export function createErrorResponse(
  message: string,
  code?: string,
  statusCode: number = 500,
  details?: any
) {
  return {
    success: false,
    error: message,
    ...(code && { code }),
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  }
}

/**
 * 异步错误包装器
 * 用于包装异步函数，自动捕获和处理错误
 */
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error(String(error))
    }
  }
}
