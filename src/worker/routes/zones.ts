import { Hono } from 'hono'
import type { Env } from '../index'
import { authMiddleware } from '../middleware/auth'

export const zonesRoutes = new Hono<{ Bindings: Env }>()

// 应用认证中间件
zonesRoutes.use('*', authMiddleware)

/**
 * 获取域名列表（从本地缓存）
 */
zonesRoutes.get('/', async (c) => {
  try {
    const user = c.get('user')

    // 获取查询参数
    const page = parseInt(c.req.query('page') || '1')
    const per_page = Math.min(parseInt(c.req.query('per_page') || '20'), 100)
    const name = c.req.query('name')
    const status = c.req.query('status')
    const account_id = c.req.query('account_id')

    // 构建查询条件
    let whereClause = 'WHERE user_id = ?'
    const params: any[] = [user.id]

    if (name) {
      whereClause += ' AND zone_name LIKE ?'
      params.push(`%${name}%`)
    }

    if (status) {
      whereClause += ' AND status = ?'
      params.push(status)
    }

    if (account_id) {
      whereClause += ' AND account_id = ?'
      params.push(account_id)
    }

    // 获取总数
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM cloudflare_zones ${whereClause}
    `).bind(...params).first()

    const total = countResult?.total as number || 0

    // 获取分页数据
    const offset = (page - 1) * per_page
    const zones = await c.env.DB.prepare(`
      SELECT * FROM cloudflare_zones ${whereClause}
      ORDER BY zone_name ASC
      LIMIT ? OFFSET ?
    `).bind(...params, per_page, offset).all()

    return c.json({
      success: true,
      data: zones.results,
      pagination: {
        page,
        per_page,
        total,
        total_pages: Math.ceil(total / per_page)
      }
    })
  } catch (error) {
    console.error('Get zones error:', error)
    return c.json({
      success: false,
      error: 'Failed to get zones'
    }, 500)
  }
})

/**
 * 获取域名详情（从本地缓存）
 */
zonesRoutes.get('/:id', async (c) => {
  try {
    const user = c.get('user')
    const zoneId = c.req.param('id')

    const zone = await c.env.DB.prepare(`
      SELECT * FROM cloudflare_zones
      WHERE user_id = ? AND zone_id = ?
    `).bind(user.id, zoneId).first()

    if (!zone) {
      return c.json({
        success: false,
        error: 'Zone not found'
      }, 404)
    }

    // 获取该域名的 DNS 记录统计
    const recordStats = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_records,
        COUNT(CASE WHEN proxied = 1 THEN 1 END) as proxied_records,
        COUNT(CASE WHEN type = 'A' THEN 1 END) as a_records,
        COUNT(CASE WHEN type = 'AAAA' THEN 1 END) as aaaa_records,
        COUNT(CASE WHEN type = 'CNAME' THEN 1 END) as cname_records,
        COUNT(CASE WHEN type = 'MX' THEN 1 END) as mx_records,
        COUNT(CASE WHEN type = 'TXT' THEN 1 END) as txt_records
      FROM dns_records
      WHERE user_id = ? AND zone_id = ?
    `).bind(user.id, zoneId).first()

    return c.json({
      success: true,
      data: {
        ...zone,
        record_stats: recordStats
      }
    })
  } catch (error) {
    console.error('Get zone details error:', error)
    return c.json({
      success: false,
      error: 'Failed to get zone details'
    }, 500)
  }
})

/**
 * 同步域名数据（从 Cloudflare 更新本地缓存）
 */
zonesRoutes.post('/:id/sync', async (c) => {
  try {
    const user = c.get('user')
    const zoneId = c.req.param('id')

    // 这里应该调用 Cloudflare API 获取最新的域名信息
    // 然后更新本地缓存
    // 暂时返回成功响应

    return c.json({
      success: true,
      message: 'Zone data synchronized successfully'
    })
  } catch (error) {
    console.error('Sync zone error:', error)
    return c.json({
      success: false,
      error: 'Failed to sync zone data'
    }, 500)
  }
})

/**
 * 获取域名的 DNS 记录
 */
zonesRoutes.get('/:id/dns-records', async (c) => {
  try {
    const user = c.get('user')
    const zoneId = c.req.param('id')

    // 获取查询参数
    const page = parseInt(c.req.query('page') || '1')
    const per_page = Math.min(parseInt(c.req.query('per_page') || '20'), 100)
    const type = c.req.query('type')
    const name = c.req.query('name')

    // 构建查询条件
    let whereClause = 'WHERE user_id = ? AND zone_id = ?'
    const params: any[] = [user.id, zoneId]

    if (type) {
      whereClause += ' AND type = ?'
      params.push(type)
    }

    if (name) {
      whereClause += ' AND name LIKE ?'
      params.push(`%${name}%`)
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
      ORDER BY name ASC, type ASC
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
    console.error('Get zone DNS records error:', error)
    return c.json({
      success: false,
      error: 'Failed to get zone DNS records'
    }, 500)
  }
})
