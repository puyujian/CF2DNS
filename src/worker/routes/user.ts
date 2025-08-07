import { Hono } from 'hono'
import type { Env } from '../index'

export const userRoutes = new Hono<{ Bindings: Env }>()

/**
 * 获取用户资料
 */
userRoutes.get('/profile', async (c) => {
  try {
    console.log('=== 获取用户资料开始 ===')
    const user = c.get('user')
    console.log('当前用户:', user)

    if (!user) {
      console.log('用户未找到')
      return c.json({
        success: false,
        error: 'User not found'
      }, 401)
    }

    // 确保数据库已初始化
    console.log('检查数据库初始化状态...')
    const { initializeDatabase, isDatabaseInitialized } = await import('../lib/database')
    const isInitialized = await isDatabaseInitialized(c.env)
    console.log('数据库初始化状态:', isInitialized)

    if (!isInitialized) {
      console.log('开始初始化数据库...')
      await initializeDatabase(c.env)
      console.log('数据库初始化完成')
    }

    // 从数据库获取完整的用户信息
    console.log('从数据库查询用户信息...')
    const userProfile = await c.env.DB.prepare(`
      SELECT id, email, name, avatar, cloudflare_api_token, cloudflare_email, cloudflare_account_id,
             email_verified, last_login_at, created_at, updated_at
      FROM users
      WHERE id = ? AND deleted_at IS NULL
    `).bind(user.id).first()

    console.log('数据库查询结果:', userProfile)

    if (!userProfile) {
      console.log('用户资料不存在')
      return c.json({
        success: false,
        error: 'User profile not found'
      }, 404)
    }

    const responseData = {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      avatar: userProfile.avatar,
      emailVerified: userProfile.email_verified,
      hasCloudflareToken: !!userProfile.cloudflare_api_token,
      cloudflareEmail: userProfile.cloudflare_email,
      cloudflareAccountId: userProfile.cloudflare_account_id,
      lastLoginAt: userProfile.last_login_at,
      createdAt: userProfile.created_at,
      updatedAt: userProfile.updated_at,
    }

    console.log('返回用户资料:', responseData)
    return c.json({
      success: true,
      data: responseData
    })
  } catch (error) {
    console.error('=== 获取用户资料错误 ===')
    console.error('错误类型:', (error as any)?.constructor?.name)
    console.error('错误消息:', (error as any)?.message)
    console.error('错误栈:', (error as any)?.stack)
    console.error('完整错误对象:', error)
    console.error('========================')

    return c.json({
      success: false,
      error: 'Failed to get user profile',
      details: {
        message: (error as any)?.message,
        name: (error as any)?.name,
        stack: (error as any)?.stack
      }
    }, 500)
  }
})

/**
 * 更新用户资料
 */
userRoutes.put('/profile', async (c) => {
  try {
    console.log('=== 更新用户资料开始 ===')
    const user = c.get('user')
    console.log('当前用户:', user)

    const body = await c.req.json()
    console.log('请求数据:', body)

    const { name, avatar, cloudflareApiToken, cloudflareEmail, cloudflareAccountId } = body

    // 处理 undefined 值，转换为 null（D1 数据库要求）
    const safeValues = {
      name: name || null,
      avatar: avatar || null,
      cloudflareApiToken: cloudflareApiToken || null,
      cloudflareEmail: cloudflareEmail || null,
      cloudflareAccountId: cloudflareAccountId || null
    }

    console.log('处理后的安全值:', safeValues)

    // 确保数据库已初始化
    console.log('检查数据库初始化状态...')
    const { initializeDatabase, isDatabaseInitialized } = await import('../lib/database')
    const isInitialized = await isDatabaseInitialized(c.env)
    console.log('数据库初始化状态:', isInitialized)

    if (!isInitialized) {
      console.log('开始初始化数据库...')
      await initializeDatabase(c.env)
      console.log('数据库初始化完成')
    }

    // 更新用户信息
    console.log('执行数据库更新...')
    const updateResult = await c.env.DB.prepare(`
      UPDATE users
      SET name = ?, avatar = ?, cloudflare_api_token = ?, cloudflare_email = ?, cloudflare_account_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      safeValues.name,
      safeValues.avatar,
      safeValues.cloudflareApiToken,
      safeValues.cloudflareEmail,
      safeValues.cloudflareAccountId,
      user.id
    ).run()

    console.log('数据库更新结果:', updateResult)

    // 获取更新后的用户信息
    console.log('获取更新后的用户信息...')
    const updatedUser = await c.env.DB.prepare(`
      SELECT id, email, name, avatar, email_verified, cloudflare_api_token, cloudflare_email,
             last_login_at, created_at, updated_at
      FROM users
      WHERE id = ? AND deleted_at IS NULL
    `).bind(user.id).first()

    console.log('更新后的用户信息:', updatedUser)

    return c.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        emailVerified: updatedUser.email_verified,
        hasCloudflareToken: !!updatedUser.cloudflare_api_token,
        cloudflareEmail: updatedUser.cloudflare_email,
        lastLoginAt: updatedUser.last_login_at,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
      }
    })
  } catch (error) {
    console.error('=== 更新用户资料错误 ===')
    console.error('错误类型:', (error as any)?.constructor?.name)
    console.error('错误消息:', (error as any)?.message)
    console.error('错误栈:', (error as any)?.stack)
    console.error('完整错误对象:', error)
    console.error('========================')

    return c.json({
      success: false,
      error: 'Failed to update profile',
      details: {
        message: (error as any)?.message,
        name: (error as any)?.name,
        stack: (error as any)?.stack
      }
    }, 500)
  }
})

/**
 * 获取用户设置
 */
userRoutes.get('/settings', async (c) => {
  try {
    const user = c.get('user')
    
    // 这里可以从数据库或KV存储获取用户设置
    // 暂时返回默认设置
    const settings = {
      theme: 'light',
      language: 'zh-CN',
      notifications: {
        email: true,
        browser: true,
        dns_changes: true,
        api_errors: true,
      },
      dashboard: {
        refresh_interval: 30,
        show_inactive_zones: false,
      }
    }

    return c.json({
      success: true,
      data: settings
    })
  } catch (error) {
    console.error('Get user settings error:', error)
    return c.json({
      success: false,
      error: 'Failed to get settings'
    }, 500)
  }
})

/**
 * 更新用户设置
 */
userRoutes.put('/settings', async (c) => {
  try {
    const user = c.get('user')
    const settings = await c.req.json()
    
    // 这里应该将设置保存到数据库或KV存储
    // 暂时只返回成功响应
    
    return c.json({
      success: true,
      message: 'Settings updated successfully'
    })
  } catch (error) {
    console.error('Update user settings error:', error)
    return c.json({
      success: false,
      error: 'Failed to update settings'
    }, 500)
  }
})
