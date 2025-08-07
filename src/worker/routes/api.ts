import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../index'
import { CloudflareAPI } from '../lib/cloudflare'
import { BusinessError, ValidationError } from '../middleware/error'
import { cloudflareRateLimiter } from '../middleware/rateLimit'
import { authMiddleware } from '../middleware/auth'

// 验证模式
const createDNSRecordSchema = z.object({
  type: z.string().min(1, 'DNS记录类型不能为空'),
  name: z.string().min(1, '记录名称不能为空'),
  content: z.string().min(1, '记录内容不能为空'),
  ttl: z.number().optional(),
  proxied: z.boolean().optional(),
  comment: z.string().optional(),
  tags: z.array(z.string()).optional(),
  priority: z.number().optional(),
})

const updateDNSRecordSchema = z.object({
  type: z.string().optional(),
  name: z.string().optional(),
  content: z.string().optional(),
  ttl: z.number().optional(),
  proxied: z.boolean().optional(),
  comment: z.string().optional(),
  tags: z.array(z.string()).optional(),
  priority: z.number().optional(),
})

export const apiRoutes = new Hono<{ Bindings: Env }>()

// 认证中间件已在主应用中应用，这里不需要重复应用
// 临时禁用速率限制以排查问题
// apiRoutes.use('*', cloudflareRateLimiter)

/**
 * 获取用户的 Cloudflare API 客户端
 */
async function getCloudflareClient(db: D1Database, userId: string): Promise<CloudflareAPI> {
  const user = await db.prepare(`
    SELECT cloudflare_api_token, cloudflare_email
    FROM users
    WHERE id = ? AND deleted_at IS NULL
  `).bind(userId).first()

  if (!user || !user.cloudflare_api_token) {
    throw new BusinessError('请先配置 Cloudflare API 令牌', 'CF_TOKEN_REQUIRED', 400)
  }

  return new CloudflareAPI(
    user.cloudflare_api_token as string,
    user.cloudflare_email as string || undefined
  )
}

/**
 * 简单测试端点
 */
apiRoutes.get('/test', async (c) => {
  try {
    console.log('=== API测试端点 ===')
    const user = c.get('user')
    console.log('用户:', user)

    return c.json({
      success: true,
      message: 'API测试成功',
      data: {
        userId: user?.id,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('API测试错误:', error)
    return c.json({
      success: false,
      error: 'API测试失败',
      details: {
        message: (error as any)?.message,
        name: (error as any)?.name
      }
    }, 500)
  }
})

/**
 * 检查用户配置状态
 */
apiRoutes.get('/status', async (c) => {
  try {
    console.log('=== 检查用户配置状态 ===')
    const user = c.get('user')
    console.log('当前用户:', user)

    // 确保数据库已初始化
    const { initializeDatabase, isDatabaseInitialized } = await import('../lib/database')
    const isInitialized = await isDatabaseInitialized(c.env)

    if (!isInitialized) {
      await initializeDatabase(c.env)
    }

    // 查询用户的 Cloudflare 配置
    const userConfig = await c.env.DB.prepare(`
      SELECT cloudflare_api_token, cloudflare_email
      FROM users
      WHERE id = ? AND deleted_at IS NULL
    `).bind(user.id).first()

    console.log('用户配置:', {
      hasToken: !!userConfig?.cloudflare_api_token,
      hasEmail: !!userConfig?.cloudflare_email
    })

    return c.json({
      success: true,
      data: {
        userId: user.id,
        hasCloudflareToken: !!userConfig?.cloudflare_api_token,
        hasCloudflareEmail: !!userConfig?.cloudflare_email,
        databaseInitialized: isInitialized
      }
    })
  } catch (error) {
    console.error('检查用户配置状态错误:', error)
    return c.json({
      success: false,
      error: '检查配置状态失败',
      details: {
        message: (error as any)?.message,
        name: (error as any)?.name
      }
    }, 500)
  }
})

/**
 * 验证当前用户的 Cloudflare API 令牌
 */
apiRoutes.get('/verify-token', async (c) => {
  try {
    console.log('=== 验证用户的Cloudflare API令牌 ===')
    const user = c.get('user')
    console.log('当前用户:', user)

    // 确保数据库已初始化
    const { initializeDatabase, isDatabaseInitialized } = await import('../lib/database')
    const isInitialized = await isDatabaseInitialized(c.env)

    if (!isInitialized) {
      await initializeDatabase(c.env)
    }

    // 获取用户的 Cloudflare 配置
    const userConfig = await c.env.DB.prepare(`
      SELECT cloudflare_api_token, cloudflare_email
      FROM users
      WHERE id = ? AND deleted_at IS NULL
    `).bind(user.id).first()

    if (!userConfig || !userConfig.cloudflare_api_token) {
      return c.json({
        success: false,
        error: '请先配置 Cloudflare API 令牌'
      }, 400)
    }

    console.log('用户API令牌前缀:', (userConfig.cloudflare_api_token as string).substring(0, 10) + '...')

    // 创建 Cloudflare API 客户端并验证令牌
    const cfAPI = new CloudflareAPI(
      userConfig.cloudflare_api_token as string,
      userConfig.cloudflare_email as string || undefined
    )

    const tokenInfo = await cfAPI.verifyToken()

    return c.json({
      success: true,
      message: 'API 令牌验证成功',
      data: tokenInfo
    })
  } catch (error) {
    console.error('验证Cloudflare令牌错误:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'API 令牌验证失败',
      details: {
        message: (error as any)?.message,
        name: (error as any)?.name,
        stack: (error as any)?.stack
      }
    }, 400)
  }
})

/**
 * 手动验证 Cloudflare API 令牌
 */
apiRoutes.post('/verify-token', async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()
    const { apiToken, email } = body

    if (!apiToken) {
      throw new BusinessError('API 令牌不能为空', 'INVALID_INPUT', 400)
    }

    const cfAPI = new CloudflareAPI(apiToken, email)
    const tokenInfo = await cfAPI.verifyToken()

    return c.json({
      success: true,
      message: 'API 令牌验证成功',
      data: tokenInfo
    })
  } catch (error) {
    console.error('Verify Cloudflare token error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'API 令牌验证失败'
    }, 400)
  }
})

/**
 * 获取 Cloudflare 账户列表
 */
apiRoutes.get('/accounts', async (c) => {
  try {
    const user = c.get('user')
    const cfAPI = await getCloudflareClient(c.env.DB, user.id)

    const accounts = await cfAPI.getAccounts()

    // 缓存账户信息到数据库
    for (const account of accounts) {
      await c.env.DB.prepare(`
        INSERT OR REPLACE INTO cloudflare_accounts
        (id, user_id, account_id, account_name, account_email, account_type, permissions, last_synced_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        `${user.id}-${account.id}`,
        user.id,
        account.id,
        account.name,
        account.email || null,
        account.type || null,
        JSON.stringify([]), // 权限信息需要单独获取
      ).run()
    }

    return c.json({
      success: true,
      data: accounts
    })
  } catch (error) {
    console.error('Get Cloudflare accounts error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '获取账户列表失败'
    }, 500)
  }
})

/**
 * 获取 Cloudflare 域名列表
 */
apiRoutes.get('/zones', async (c) => {
  try {
    console.log('=== 获取Cloudflare域名列表开始 ===')
    console.log('请求URL:', c.req.url)
    console.log('请求方法:', c.req.method)
    console.log('请求头:', Object.fromEntries(c.req.raw.headers.entries()))

    const user = c.get('user')
    console.log('当前用户:', user)

    if (!user) {
      console.log('用户未找到')
      return c.json({
        success: false,
        error: 'User not found'
      }, 401)
    }

    console.log('开始获取Cloudflare客户端...')
    const cfAPI = await getCloudflareClient(c.env.DB, user.id)
    console.log('Cloudflare客户端获取成功')

    // 获取查询参数
    const page = parseInt(c.req.query('page') || '1')
    const per_page = parseInt(c.req.query('per_page') || '20')
    const name = c.req.query('name')
    const status = c.req.query('status') as any
    const order = c.req.query('order') as any
    const direction = c.req.query('direction') as any

    const { zones, result_info } = await cfAPI.getZones({
      page,
      per_page,
      ...(name && { name }),
      ...(status && { status }),
      ...(order && { order }),
      ...(direction && { direction }),
    })

    // 缓存域名信息到数据库
    for (const zone of zones) {
      await c.env.DB.prepare(`
        INSERT OR REPLACE INTO cloudflare_zones
        (id, user_id, account_id, zone_id, zone_name, status, paused, type, development_mode,
         name_servers, original_name_servers, original_registrar, original_dnshost,
         plan_id, plan_name, permissions, meta_data, activated_on, last_synced_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        `${user.id}-${zone.id}`,
        user.id,
        zone.account.id,
        zone.id,
        zone.name,
        zone.status,
        zone.paused,
        zone.type,
        zone.development_mode,
        JSON.stringify(zone.name_servers),
        JSON.stringify(zone.original_name_servers),
        zone.original_registrar,
        zone.original_dnshost,
        zone.plan.id,
        zone.plan.name,
        JSON.stringify(zone.permissions),
        JSON.stringify(zone.meta),
        zone.activated_on
      ).run()
    }

    console.log('域名列表获取成功，返回数据')
    return c.json({
      success: true,
      data: zones,
      pagination: result_info
    })
  } catch (error) {
    console.error('=== 获取Cloudflare域名列表错误 ===')
    console.error('错误类型:', (error as any)?.constructor?.name)
    console.error('错误消息:', (error as any)?.message)
    console.error('错误栈:', (error as any)?.stack)
    console.error('完整错误对象:', error)
    console.error('========================')

    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '获取域名列表失败',
      details: {
        message: (error as any)?.message,
        name: (error as any)?.name,
        stack: (error as any)?.stack
      }
    }, 500)
  }
})

/**
 * 获取域名详情
 */
apiRoutes.get('/zones/:zoneId', async (c) => {
  try {
    const user = c.get('user')
    const zoneId = c.req.param('zoneId')
    const cfAPI = await getCloudflareClient(c.env.DB, user.id)

    const zone = await cfAPI.getZone(zoneId)

    return c.json({
      success: true,
      data: zone
    })
  } catch (error) {
    console.error('Get zone details error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '获取域名详情失败'
    }, 500)
  }
})

/**
 * 获取域名设置
 */
apiRoutes.get('/zones/:zoneId/settings', async (c) => {
  try {
    const user = c.get('user')
    const zoneId = c.req.param('zoneId')
    const cfAPI = await getCloudflareClient(c.env.DB, user.id)

    const settings = await cfAPI.getZoneSettings(zoneId)

    return c.json({
      success: true,
      data: settings
    })
  } catch (error) {
    console.error('Get zone settings error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '获取域名设置失败'
    }, 500)
  }
})

/**
 * 更新域名设置
 */
apiRoutes.patch('/zones/:zoneId/settings/:settingId', async (c) => {
  try {
    const user = c.get('user')
    const zoneId = c.req.param('zoneId')
    const settingId = c.req.param('settingId')
    const body = await c.req.json()
    const cfAPI = await getCloudflareClient(c.env.DB, user.id)

    const setting = await cfAPI.updateZoneSetting(zoneId, settingId, body.value)

    return c.json({
      success: true,
      data: setting,
      message: '设置更新成功'
    })
  } catch (error) {
    console.error('Update zone setting error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '更新域名设置失败'
    }, 500)
  }
})

/**
 * 获取 DNS 记录列表
 */
apiRoutes.get('/zones/:zoneId/dns-records', async (c) => {
  try {
    const user = c.get('user')
    const zoneId = c.req.param('zoneId')
    const cfAPI = await getCloudflareClient(c.env.DB, user.id)

    // 获取查询参数
    const page = parseInt(c.req.query('page') || '1')
    const per_page = parseInt(c.req.query('per_page') || '20')
    const name = c.req.query('name')
    const content = c.req.query('content')
    const type = c.req.query('type')
    const proxied = c.req.query('proxied') === 'true' ? true : c.req.query('proxied') === 'false' ? false : undefined
    const order = c.req.query('order') as any
    const direction = c.req.query('direction') as any

    const { records, result_info } = await cfAPI.getDNSRecords(zoneId, {
      page,
      per_page,
      ...(name && { name }),
      ...(content && { content }),
      ...(type && { type }),
      ...(proxied !== undefined && { proxied }),
      ...(order && { order }),
      ...(direction && { direction }),
    })

    // 缓存 DNS 记录到数据库
    for (const record of records) {
      await c.env.DB.prepare(`
        INSERT OR REPLACE INTO dns_records
        (id, user_id, zone_id, record_id, zone_name, name, type, content, proxiable, proxied,
         ttl, locked, comment, tags, meta_data, priority, last_synced_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        `${user.id}-${record.id}`,
        user.id,
        record.zone_id,
        record.id,
        record.zone_name,
        record.name,
        record.type,
        record.content,
        record.proxiable,
        record.proxied,
        record.ttl,
        record.locked,
        record.comment,
        JSON.stringify(record.tags || []),
        JSON.stringify(record.meta),
        null // priority 字段在某些记录类型中使用
      ).run()
    }

    return c.json({
      success: true,
      data: records,
      pagination: result_info
    })
  } catch (error) {
    console.error('Get DNS records error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '获取 DNS 记录失败'
    }, 500)
  }
})

/**
 * 获取 DNS 记录详情
 */
apiRoutes.get('/zones/:zoneId/dns-records/:recordId', async (c) => {
  try {
    const user = c.get('user')
    const zoneId = c.req.param('zoneId')
    const recordId = c.req.param('recordId')
    const cfAPI = await getCloudflareClient(c.env.DB, user.id)

    const record = await cfAPI.getDNSRecord(zoneId, recordId)

    return c.json({
      success: true,
      data: record
    })
  } catch (error) {
    console.error('Get DNS record details error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '获取 DNS 记录详情失败'
    }, 500)
  }
})

/**
 * 创建 DNS 记录
 */
apiRoutes.post('/zones/:zoneId/dns-records', async (c) => {
  try {
    const user = c.get('user')
    const zoneId = c.req.param('zoneId')
    const body = await c.req.json()
    const validatedData = createDNSRecordSchema.parse(body)
    const cfAPI = await getCloudflareClient(c.env.DB, user.id)

    const record = await cfAPI.createDNSRecord(zoneId, validatedData)

    // 记录操作历史
    await c.env.DB.prepare(`
      INSERT INTO operation_history
      (id, user_id, operation_type, resource_type, resource_id, resource_name, new_data, status)
      VALUES (?, ?, 'create', 'dns_record', ?, ?, ?, 'success')
    `).bind(
      crypto.randomUUID(),
      user.id,
      record.id,
      record.name,
      JSON.stringify(record)
    ).run()

    return c.json({
      success: true,
      data: record,
      message: 'DNS 记录创建成功'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('输入数据验证失败', formatZodErrors(error))
    }
    console.error('Create DNS record error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '创建 DNS 记录失败'
    }, 500)
  }
})

/**
 * 更新 DNS 记录
 */
apiRoutes.put('/zones/:zoneId/dns-records/:recordId', async (c) => {
  try {
    const user = c.get('user')
    const zoneId = c.req.param('zoneId')
    const recordId = c.req.param('recordId')
    const body = await c.req.json()
    const validatedData = updateDNSRecordSchema.parse(body)
    const cfAPI = await getCloudflareClient(c.env.DB, user.id)

    // 获取原记录用于历史记录
    const oldRecord = await cfAPI.getDNSRecord(zoneId, recordId)

    const record = await cfAPI.updateDNSRecord(zoneId, recordId, validatedData)

    // 记录操作历史
    await c.env.DB.prepare(`
      INSERT INTO operation_history
      (id, user_id, operation_type, resource_type, resource_id, resource_name, old_data, new_data, status)
      VALUES (?, ?, 'update', 'dns_record', ?, ?, ?, ?, 'success')
    `).bind(
      crypto.randomUUID(),
      user.id,
      record.id,
      record.name,
      JSON.stringify(oldRecord),
      JSON.stringify(record)
    ).run()

    return c.json({
      success: true,
      data: record,
      message: 'DNS 记录更新成功'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('输入数据验证失败', formatZodErrors(error))
    }
    console.error('Update DNS record error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '更新 DNS 记录失败'
    }, 500)
  }
})

/**
 * 删除 DNS 记录
 */
apiRoutes.delete('/zones/:zoneId/dns-records/:recordId', async (c) => {
  try {
    const user = c.get('user')
    const zoneId = c.req.param('zoneId')
    const recordId = c.req.param('recordId')
    const cfAPI = await getCloudflareClient(c.env.DB, user.id)

    // 获取记录信息用于历史记录
    const record = await cfAPI.getDNSRecord(zoneId, recordId)

    const result = await cfAPI.deleteDNSRecord(zoneId, recordId)

    // 记录操作历史
    await c.env.DB.prepare(`
      INSERT INTO operation_history
      (id, user_id, operation_type, resource_type, resource_id, resource_name, old_data, status)
      VALUES (?, ?, 'delete', 'dns_record', ?, ?, ?, 'success')
    `).bind(
      crypto.randomUUID(),
      user.id,
      recordId,
      record.name,
      JSON.stringify(record)
    ).run()

    // 从本地缓存中删除记录
    await c.env.DB.prepare(`
      DELETE FROM dns_records WHERE user_id = ? AND record_id = ?
    `).bind(user.id, recordId).run()

    return c.json({
      success: true,
      data: result,
      message: 'DNS 记录删除成功'
    })
  } catch (error) {
    console.error('Delete DNS record error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '删除 DNS 记录失败'
    }, 500)
  }
})

/**
 * 导出 DNS 记录
 */
apiRoutes.get('/zones/:zoneId/dns-records/export', async (c) => {
  try {
    const user = c.get('user')
    const zoneId = c.req.param('zoneId')
    const cfAPI = await getCloudflareClient(c.env.DB, user.id)

    const exportData = await cfAPI.exportDNSRecords(zoneId)

    return new Response(exportData, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="dns-records-${zoneId}.txt"`,
      },
    })
  } catch (error) {
    console.error('Export DNS records error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '导出 DNS 记录失败'
    }, 500)
  }
})

/**
 * 导入 DNS 记录
 */
apiRoutes.post('/zones/:zoneId/dns-records/import', async (c) => {
  try {
    const user = c.get('user')
    const zoneId = c.req.param('zoneId')
    const body = await c.req.json()
    const { fileContent } = body
    const cfAPI = await getCloudflareClient(c.env.DB, user.id)

    if (!fileContent) {
      throw new BusinessError('文件内容不能为空', 'INVALID_INPUT', 400)
    }

    const result = await cfAPI.importDNSRecords(zoneId, fileContent)

    return c.json({
      success: true,
      data: result,
      message: 'DNS 记录导入成功'
    })
  } catch (error) {
    console.error('Import DNS records error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '导入 DNS 记录失败'
    }, 500)
  }
})

// 工具函数
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
