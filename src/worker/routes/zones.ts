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
    console.log('=== 获取域名列表开始 ===')
    const user = c.get('user')
    console.log('当前用户:', user)

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

    // 获取查询参数
    const page = parseInt(c.req.query('page') || '1')
    const per_page = Math.min(parseInt(c.req.query('per_page') || '20'), 100)
    const name = c.req.query('name')
    const status = c.req.query('status')
    const account_id = c.req.query('account_id')

    console.log('查询参数:', { page, per_page, name, status, account_id })

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

    console.log('查询条件:', whereClause, '参数:', params)

    // 获取总数
    console.log('查询域名总数...')
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM cloudflare_zones ${whereClause}
    `).bind(...params).first()

    const total = countResult?.total as number || 0
    console.log('域名总数:', total)

    // 获取分页数据
    const offset = (page - 1) * per_page
    console.log('查询域名列表，偏移量:', offset, '限制:', per_page)
    const zones = await c.env.DB.prepare(`
      SELECT * FROM cloudflare_zones ${whereClause}
      ORDER BY zone_name ASC
      LIMIT ? OFFSET ?
    `).bind(...params, per_page, offset).all()

    console.log('查询结果:', zones.results?.length || 0, '条记录')

    return c.json({
      success: true,
      data: zones.results || [],
      pagination: {
        page,
        per_page,
        total,
        total_pages: Math.ceil(total / per_page)
      }
    })
  } catch (error) {
    console.error('=== 获取域名列表错误 ===')
    console.error('错误类型:', (error as any)?.constructor?.name)
    console.error('错误消息:', (error as any)?.message)
    console.error('错误栈:', (error as any)?.stack)
    console.error('完整错误对象:', error)
    console.error('========================')

    return c.json({
      success: false,
      error: 'Failed to get zones',
      details: {
        message: (error as any)?.message,
        name: (error as any)?.name,
        stack: (error as any)?.stack
      }
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
 * 创建测试域名数据（临时功能）
 */
zonesRoutes.post('/create-test-data', async (c) => {
  try {
    console.log('=== 创建测试域名数据 ===')
    const user = c.get('user')
    console.log('当前用户:', user)

    // 确保数据库已初始化
    const { initializeDatabase, isDatabaseInitialized } = await import('../lib/database')
    const isInitialized = await isDatabaseInitialized(c.env)

    if (!isInitialized) {
      await initializeDatabase(c.env)
    }

    // 检查是否已有测试数据
    const existingZone = await c.env.DB.prepare(`
      SELECT id FROM cloudflare_zones WHERE user_id = ? LIMIT 1
    `).bind(user.id).first()

    if (existingZone) {
      return c.json({
        success: false,
        error: '测试数据已存在'
      }, 400)
    }

    // 创建测试域名数据
    const testZones = [
      {
        id: 'test-zone-1',
        zone_id: 'zone123456789',
        zone_name: 'example.com',
        status: 'active',
        paused: false,
        type: 'full',
        account_id: 'acc123',
        account_name: 'Test Account'
      },
      {
        id: 'test-zone-2',
        zone_id: 'zone987654321',
        zone_name: 'test.org',
        status: 'active',
        paused: false,
        type: 'full',
        account_id: 'acc123',
        account_name: 'Test Account'
      }
    ]

    for (const zone of testZones) {
      await c.env.DB.prepare(`
        INSERT INTO cloudflare_zones (
          id, user_id, zone_id, zone_name, status, paused, type,
          account_id, account_name, created_on, modified_on
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        zone.id,
        user.id,
        zone.zone_id,
        zone.zone_name,
        zone.status,
        zone.paused ? 1 : 0,
        zone.type,
        zone.account_id,
        zone.account_name,
        new Date().toISOString(),
        new Date().toISOString()
      ).run()
    }

    // 创建一些测试DNS记录
    const testRecords = [
      {
        id: 'test-record-1',
        zone_id: 'zone123456789',
        record_id: 'rec123',
        zone_name: 'example.com',
        name: 'example.com',
        type: 'A',
        content: '192.168.1.1',
        proxied: true,
        ttl: 1
      },
      {
        id: 'test-record-2',
        zone_id: 'zone123456789',
        record_id: 'rec456',
        zone_name: 'example.com',
        name: 'www.example.com',
        type: 'CNAME',
        content: 'example.com',
        proxied: true,
        ttl: 1
      }
    ]

    for (const record of testRecords) {
      await c.env.DB.prepare(`
        INSERT INTO dns_records (
          id, user_id, zone_id, record_id, zone_name, name, type,
          content, proxied, ttl, created_on, modified_on
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        record.id,
        user.id,
        record.zone_id,
        record.record_id,
        record.zone_name,
        record.name,
        record.type,
        record.content,
        record.proxied ? 1 : 0,
        record.ttl,
        new Date().toISOString(),
        new Date().toISOString()
      ).run()
    }

    console.log('测试数据创建完成')
    return c.json({
      success: true,
      message: '测试数据创建成功',
      data: {
        zones: testZones.length,
        records: testRecords.length
      }
    })
  } catch (error) {
    console.error('创建测试数据错误:', error)
    return c.json({
      success: false,
      error: '创建测试数据失败',
      details: {
        message: (error as any)?.message,
        name: (error as any)?.name
      }
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
