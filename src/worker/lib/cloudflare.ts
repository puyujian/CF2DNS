import { CloudflareAPIError } from '../middleware/error'
import type { CloudflareAPIResponse, CloudflareZone, DNSRecord, CloudflareAccount } from '../../types'

/**
 * Cloudflare API 客户端
 */
export class CloudflareAPI {
  private baseURL = 'https://api.cloudflare.com/client/v4'
  private apiToken: string
  private email?: string

  constructor(apiToken: string, email?: string) {
    this.apiToken = apiToken
    this.email = email
  }

  /**
   * 发送 API 请求
   */
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<CloudflareAPIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiToken}`,
    }

    // 注意：使用 API Token 时不需要 X-Auth-Email 头
    // X-Auth-Email 只在使用 Global API Key 时才需要

    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    }

    console.log('=== Cloudflare API 请求调试 ===')
    console.log('URL:', url)
    console.log('方法:', config.method || 'GET')
    console.log('请求头:', config.headers)
    console.log('API Token 前缀:', this.apiToken.substring(0, 10) + '...')
    console.log('==============================')

    try {
      const response = await fetch(url, config)
      console.log('Cloudflare API 响应状态:', response.status)
      console.log('Cloudflare API 响应头:', Object.fromEntries(response.headers.entries()))

      const data = await response.json() as CloudflareAPIResponse<T>
      console.log('Cloudflare API 响应数据:', data)

      if (!data.success) {
        console.error('Cloudflare API 错误详情:', data.errors)
        throw new CloudflareAPIError(
          data.errors?.[0]?.message || 'Cloudflare API error',
          data.errors?.[0]?.code || response.status,
          response.status,
          data.errors
        )
      }

      return data
    } catch (error) {
      if (error instanceof CloudflareAPIError) {
        throw error
      }

      console.error('Cloudflare API 请求失败:', error)
      throw new CloudflareAPIError(
        'Failed to communicate with Cloudflare API',
        0,
        500
      )
    }
  }

  /**
   * 验证 API 令牌
   */
  async verifyToken(): Promise<{ id: string; status: string }> {
    console.log('=== 验证API令牌 ===')
    console.log('请求端点: /user/tokens/verify')
    console.log('API令牌前缀:', this.apiToken.substring(0, 10) + '...')

    const response = await this.request('/user/tokens/verify')
    console.log('验证响应:', response)
    return response.result
  }

  /**
   * 获取账户列表
   */
  async getAccounts(): Promise<CloudflareAccount[]> {
    const response = await this.request<CloudflareAccount[]>('/accounts')
    return response.result
  }

  /**
   * 获取用户信息
   */
  async getUser(): Promise<any> {
    const response = await this.request('/user')
    return response.result
  }

  /**
   * 获取域名列表
   */
  async getZones(params?: {
    page?: number
    per_page?: number
    order?: 'name' | 'status' | 'account.name'
    direction?: 'asc' | 'desc'
    match?: 'any' | 'all'
    name?: string
    account?: { id: string }
    status?: 'active' | 'pending' | 'initializing' | 'moved' | 'deleted' | 'deactivated'
  }): Promise<{ zones: CloudflareZone[]; result_info: any }> {
    const searchParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (typeof value === 'object') {
            searchParams.append(key, JSON.stringify(value))
          } else {
            searchParams.append(key, String(value))
          }
        }
      })
    }

    const endpoint = `/zones${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    const response = await this.request<CloudflareZone[]>(endpoint)
    
    return {
      zones: response.result,
      result_info: response.result_info || {}
    }
  }

  /**
   * 获取域名详情
   */
  async getZone(zoneId: string): Promise<CloudflareZone> {
    const response = await this.request<CloudflareZone>(`/zones/${zoneId}`)
    return response.result
  }

  /**
   * 获取 DNS 记录列表
   */
  async getDNSRecords(zoneId: string, params?: {
    page?: number
    per_page?: number
    order?: 'type' | 'name' | 'content' | 'ttl' | 'proxied'
    direction?: 'asc' | 'desc'
    match?: 'any' | 'all'
    name?: string
    content?: string
    type?: string
    proxied?: boolean
  }): Promise<{ records: DNSRecord[]; result_info: any }> {
    const searchParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }

    const endpoint = `/zones/${zoneId}/dns_records${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    const response = await this.request<DNSRecord[]>(endpoint)
    
    return {
      records: response.result,
      result_info: response.result_info || {}
    }
  }

  /**
   * 获取 DNS 记录详情
   */
  async getDNSRecord(zoneId: string, recordId: string): Promise<DNSRecord> {
    const response = await this.request<DNSRecord>(`/zones/${zoneId}/dns_records/${recordId}`)
    return response.result
  }

  /**
   * 创建 DNS 记录
   */
  async createDNSRecord(zoneId: string, record: {
    type: string
    name: string
    content: string
    ttl?: number
    proxied?: boolean
    comment?: string
    tags?: string[]
    priority?: number
  }): Promise<DNSRecord> {
    const response = await this.request<DNSRecord>(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify(record),
    })
    return response.result
  }

  /**
   * 更新 DNS 记录
   */
  async updateDNSRecord(zoneId: string, recordId: string, record: {
    type?: string
    name?: string
    content?: string
    ttl?: number
    proxied?: boolean
    comment?: string
    tags?: string[]
    priority?: number
  }): Promise<DNSRecord> {
    const response = await this.request<DNSRecord>(`/zones/${zoneId}/dns_records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(record),
    })
    return response.result
  }

  /**
   * 删除 DNS 记录
   */
  async deleteDNSRecord(zoneId: string, recordId: string): Promise<{ id: string }> {
    const response = await this.request<{ id: string }>(`/zones/${zoneId}/dns_records/${recordId}`, {
      method: 'DELETE',
    })
    return response.result
  }

  /**
   * 批量创建 DNS 记录
   */
  async createDNSRecordsBatch(zoneId: string, records: Array<{
    type: string
    name: string
    content: string
    ttl?: number
    proxied?: boolean
    comment?: string
    tags?: string[]
    priority?: number
  }>): Promise<DNSRecord[]> {
    const response = await this.request<DNSRecord[]>(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify(records),
    })
    return response.result
  }

  /**
   * 导出 DNS 记录
   */
  async exportDNSRecords(zoneId: string): Promise<string> {
    const response = await fetch(`${this.baseURL}/zones/${zoneId}/dns_records/export`, {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
      },
    })

    if (!response.ok) {
      throw new CloudflareAPIError(
        'Failed to export DNS records',
        response.status,
        response.status
      )
    }

    return response.text()
  }

  /**
   * 导入 DNS 记录
   */
  async importDNSRecords(zoneId: string, file: string): Promise<{ timing: any }> {
    const formData = new FormData()
    formData.append('file', new Blob([file], { type: 'text/plain' }))

    const response = await fetch(`${this.baseURL}/zones/${zoneId}/dns_records/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
      },
      body: formData,
    })

    const data = await response.json() as CloudflareAPIResponse<{ timing: any }>

    if (!data.success) {
      throw new CloudflareAPIError(
        data.errors?.[0]?.message || 'Failed to import DNS records',
        data.errors?.[0]?.code || response.status,
        response.status,
        data.errors
      )
    }

    return data.result
  }

  /**
   * 获取域名设置
   */
  async getZoneSettings(zoneId: string): Promise<any[]> {
    const response = await this.request<any[]>(`/zones/${zoneId}/settings`)
    return response.result
  }

  /**
   * 更新域名设置
   */
  async updateZoneSetting(zoneId: string, settingId: string, value: any): Promise<any> {
    const response = await this.request<any>(`/zones/${zoneId}/settings/${settingId}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    })
    return response.result
  }

  /**
   * 清除缓存
   */
  async purgeCache(zoneId: string, options?: {
    purge_everything?: boolean
    files?: string[]
    tags?: string[]
    hosts?: string[]
  }): Promise<{ id: string }> {
    const response = await this.request<{ id: string }>(`/zones/${zoneId}/purge_cache`, {
      method: 'POST',
      body: JSON.stringify(options || { purge_everything: true }),
    })
    return response.result
  }
}
