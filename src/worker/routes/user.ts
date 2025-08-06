import { Hono } from 'hono'
import type { Env } from '../index'

export const userRoutes = new Hono<{ Bindings: Env }>()

/**
 * 获取用户资料
 */
userRoutes.get('/profile', async (c) => {
  try {
    const user = c.get('user')
    
    if (!user) {
      return c.json({
        success: false,
        error: 'User not found'
      }, 401)
    }

    // 从数据库获取完整的用户信息
    const userProfile = await c.env.DB.prepare(`
      SELECT id, email, name, avatar, cloudflare_api_token, cloudflare_email, 
             email_verified, last_login_at, created_at, updated_at
      FROM users 
      WHERE id = ? AND deleted_at IS NULL
    `).bind(user.id).first()

    if (!userProfile) {
      return c.json({
        success: false,
        error: 'User profile not found'
      }, 404)
    }

    return c.json({
      success: true,
      data: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        avatar: userProfile.avatar,
        emailVerified: userProfile.email_verified,
        hasCloudflareToken: !!userProfile.cloudflare_api_token,
        cloudflareEmail: userProfile.cloudflare_email,
        lastLoginAt: userProfile.last_login_at,
        createdAt: userProfile.created_at,
        updatedAt: userProfile.updated_at,
      }
    })
  } catch (error) {
    console.error('Get user profile error:', error)
    return c.json({
      success: false,
      error: 'Failed to get user profile'
    }, 500)
  }
})

/**
 * 更新用户资料
 */
userRoutes.put('/profile', async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()
    
    const { name, avatar, cloudflareApiToken, cloudflareEmail } = body

    // 更新用户信息
    await c.env.DB.prepare(`
      UPDATE users 
      SET name = ?, avatar = ?, cloudflare_api_token = ?, cloudflare_email = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(name, avatar, cloudflareApiToken, cloudflareEmail, user.id).run()

    return c.json({
      success: true,
      message: 'Profile updated successfully'
    })
  } catch (error) {
    console.error('Update user profile error:', error)
    return c.json({
      success: false,
      error: 'Failed to update profile'
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
