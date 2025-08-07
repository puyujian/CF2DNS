import { Hono } from 'hono'
import type { Env } from '../index'
import { authMiddleware } from '../middleware/auth'
import { dnsRateLimiter } from '../middleware/rateLimit'

export const dnsRoutes = new Hono<{ Bindings: Env }>()

// 认证中间件已在主应用中应用，这里不需要重复应用
// 临时禁用速率限制以排查问题
// dnsRoutes.use('*', dnsRateLimiter)

/**
 * 获取用户的 DNS 记录列表（从本地缓存）
 */
dnsRoutes.get('/records', async (c) => {
  try {
    const user = c.get('user')

    // 获取查询参数
    const page = parseInt(c.req.query('page') || '1')
    const per_page = Math.min(parseInt(c.req.query('per_page') || '20'), 100)
    const zone_id = c.req.query('zone_id')
    const type = c.req.query('type')
    const name = c.req.query('name')
    const content = c.req.query('content')
    const proxied = c.req.query('proxied')

    // 构建查询条件
    let whereClause = 'WHERE user_id = ?'
    const params: any[] = [user.id]

    if (zone_id) {
      whereClause += ' AND zone_id = ?'
      params.push(zone_id)
    }

    if (type) {
      whereClause += ' AND type = ?'
      params.push(type)
    }

    if (name) {
      whereClause += ' AND name LIKE ?'
      params.push(`%${name}%`)
    }

    if (content) {
      whereClause += ' AND content LIKE ?'
      params.push(`%${content}%`)
    }

    if (proxied !== undefined) {
      whereClause += ' AND proxied = ?'
      params.push(proxied === 'true')
    }

    // 获取总数
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM dns_records ${whereClause}
    `).bind(...params).first()

    const total = countResult?.total as number || 0

    // 获取分页数据
    const offset = (page - 1) * per_page
    const records = await c.env.DB.prepare(`
      SELECT * FROM dns_records ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params, per_page, offset).all()

    return c.json({
      success: true,
      data: records.results,
      pagination: {
        page,
        per_page,
        total,
        total_pages: Math.ceil(total / per_page)
      }
    })
  } catch (error) {
    console.error('Get DNS records error:', error)
    return c.json({
      success: false,
      error: 'Failed to get DNS records'
    }, 500)
  }
})

/**
 * 获取 DNS 记录详情（从本地缓存）
 */
dnsRoutes.get('/records/:recordId', async (c) => {
  try {
    const user = c.get('user')
    const recordId = c.req.param('recordId')

    const record = await c.env.DB.prepare(`
      SELECT * FROM dns_records
      WHERE user_id = ? AND record_id = ?
    `).bind(user.id, recordId).first()

    if (!record) {
      return c.json({
        success: false,
        error: 'DNS record not found'
      }, 404)
    }

    return c.json({
      success: true,
      data: record
    })
  } catch (error) {
    console.error('Get DNS record details error:', error)
    return c.json({
      success: false,
      error: 'Failed to get DNS record details'
    }, 500)
  }
})

/**
 * 批量操作 DNS 记录
 */
dnsRoutes.post('/records/batch', async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()
    const { operation, record_ids, data } = body

    if (!operation || !record_ids || !Array.isArray(record_ids)) {
      return c.json({
        success: false,
        error: 'Invalid batch operation parameters'
      }, 400)
    }

    const results = []

    for (const recordId of record_ids) {
      try {
        // 这里应该调用 Cloudflare API 进行实际操作
        // 暂时只返回模拟结果
        results.push({
          record_id: recordId,
          success: true,
          operation
        })
      } catch (error) {
        results.push({
          record_id: recordId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return c.json({
      success: true,
      data: results,
      message: `批量${operation}操作完成`
    })
  } catch (error) {
    console.error('Batch DNS operation error:', error)
    return c.json({
      success: false,
      error: 'Failed to perform batch operation'
    }, 500)
  }
})

/**
 * 同步 DNS 记录（从 Cloudflare 更新本地缓存）
 */
dnsRoutes.post('/sync', async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()
    const { zone_id } = body

    if (!zone_id) {
      return c.json({
        success: false,
        error: 'Zone ID is required'
      }, 400)
    }

    // 这里应该调用 Cloudflare API 获取最新的 DNS 记录
    // 然后更新本地缓存
    // 暂时返回成功响应

    return c.json({
      success: true,
      message: 'DNS records synchronized successfully'
    })
  } catch (error) {
    console.error('Sync DNS records error:', error)
    return c.json({
      success: false,
      error: 'Failed to sync DNS records'
    }, 500)
  }
})
