import { CloudflareZone, DNSRecord, CreateDNSRecordData, UpdateDNSRecordData, PaginatedResponse } from '@/types'
import { API_ENDPOINTS, STORAGE_KEYS } from '@/lib/constants'

interface APIResponse<T = any> {
  success: boolean
  message?: string
  error?: string
  data?: T
  pagination?: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

class CloudflareAPIClient {
  private baseURL: string

  constructor() {
    // 如果环境变量已经包含完整URL，直接使用；否则使用默认的 /api
    const envBaseURL = import.meta.env.VITE_API_BASE_URL
    if (envBaseURL && envBaseURL.includes('://')) {
      // 完整URL，移除末尾的 /api（如果存在）
      this.baseURL = envBaseURL.replace(/\/api$/, '')
    } else {
      // 相对路径或未设置，使用默认值
      this.baseURL = '/api'
    }
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // 添加认证头
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    if (accessToken) {
      defaultHeaders['Authorization'] = `Bearer ${accessToken}`
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json() as APIResponse<T>

      if (!response.ok) {
        throw new Error((data as any).error || `HTTP ${response.status}`)
      }

      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  /**
   * 验证 Cloudflare API 令牌
   */
  async verifyToken(apiToken: string, email?: string): Promise<APIResponse> {
    return this.request('/cloudflare/verify-token', {
      method: 'POST',
      body: JSON.stringify({ apiToken, email }),
    })
  }

  /**
   * 获取 Cloudflare 账户列表
   */
  async getAccounts(): Promise<APIResponse<any[]>> {
    return this.request('/cloudflare/accounts')
  }

  /**
   * 获取域名列表
   */
  async getZones(params?: {
    page?: number
    per_page?: number
    name?: string
    status?: string
    account_id?: string
  }): Promise<APIResponse<CloudflareZone[]>> {
    const searchParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }

    const endpoint = `/cloudflare/zones${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    return this.request<CloudflareZone[]>(endpoint)
  }

  /**
   * 获取域名详情
   */
  async getZone(zoneId: string): Promise<APIResponse<CloudflareZone>> {
    return this.request<CloudflareZone>(`/cloudflare/zones/${zoneId}`)
  }

  /**
   * 获取域名设置
   */
  async getZoneSettings(zoneId: string): Promise<APIResponse<any[]>> {
    return this.request<any[]>(`/cloudflare/zones/${zoneId}/settings`)
  }

  /**
   * 更新域名设置
   */
  async updateZoneSetting(zoneId: string, settingId: string, value: any): Promise<APIResponse> {
    return this.request(`/cloudflare/zones/${zoneId}/settings/${settingId}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    })
  }

  /**
   * 获取 DNS 记录列表
   */
  async getDNSRecords(zoneId: string, params?: {
    page?: number
    per_page?: number
    name?: string
    content?: string
    type?: string
    proxied?: boolean
  }): Promise<APIResponse<DNSRecord[]>> {
    const searchParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }

    const endpoint = `/cloudflare/zones/${zoneId}/dns-records${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    return this.request<DNSRecord[]>(endpoint)
  }

  /**
   * 获取 DNS 记录详情
   */
  async getDNSRecord(zoneId: string, recordId: string): Promise<APIResponse<DNSRecord>> {
    return this.request<DNSRecord>(`/cloudflare/zones/${zoneId}/dns-records/${recordId}`)
  }

  /**
   * 创建 DNS 记录
   */
  async createDNSRecord(zoneId: string, record: CreateDNSRecordData): Promise<APIResponse<DNSRecord>> {
    return this.request<DNSRecord>(`/cloudflare/zones/${zoneId}/dns-records`, {
      method: 'POST',
      body: JSON.stringify(record),
    })
  }

  /**
   * 更新 DNS 记录
   */
  async updateDNSRecord(zoneId: string, recordId: string, record: UpdateDNSRecordData): Promise<APIResponse<DNSRecord>> {
    return this.request<DNSRecord>(`/cloudflare/zones/${zoneId}/dns-records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(record),
    })
  }

  /**
   * 删除 DNS 记录
   */
  async deleteDNSRecord(zoneId: string, recordId: string): Promise<APIResponse> {
    return this.request(`/cloudflare/zones/${zoneId}/dns-records/${recordId}`, {
      method: 'DELETE',
    })
  }

  /**
   * 导出 DNS 记录
   */
  async exportDNSRecords(zoneId: string): Promise<Blob> {
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    const response = await fetch(`${this.baseURL}/cloudflare/zones/${zoneId}/dns-records/export`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to export DNS records')
    }

    return response.blob()
  }

  /**
   * 导入 DNS 记录
   */
  async importDNSRecords(zoneId: string, fileContent: string): Promise<APIResponse> {
    return this.request(`/cloudflare/zones/${zoneId}/dns-records/import`, {
      method: 'POST',
      body: JSON.stringify({ fileContent }),
    })
  }

  /**
   * 批量操作 DNS 记录
   */
  async batchDNSRecords(operation: string, recordIds: string[], data?: any): Promise<APIResponse> {
    return this.request('/dns/records/batch', {
      method: 'POST',
      body: JSON.stringify({
        operation,
        record_ids: recordIds,
        data,
      }),
    })
  }

  /**
   * 同步 DNS 记录
   */
  async syncDNSRecords(zoneId: string): Promise<APIResponse> {
    return this.request('/dns/sync', {
      method: 'POST',
      body: JSON.stringify({ zone_id: zoneId }),
    })
  }

  /**
   * 获取本地缓存的域名列表
   */
  async getLocalZones(params?: {
    page?: number
    per_page?: number
    name?: string
    status?: string
    account_id?: string
  }): Promise<APIResponse<any[]>> {
    const searchParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }

    const endpoint = `/zones${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    return this.request<any[]>(endpoint)
  }

  /**
   * 获取本地缓存的域名详情
   */
  async getLocalZone(zoneId: string): Promise<APIResponse<any>> {
    return this.request<any>(`/zones/${zoneId}`)
  }

  /**
   * 同步域名数据
   */
  async syncZone(zoneId: string): Promise<APIResponse> {
    return this.request(`/zones/${zoneId}/sync`, {
      method: 'POST',
    })
  }

  /**
   * 获取域名的 DNS 记录（本地缓存）
   */
  async getZoneDNSRecords(zoneId: string, params?: {
    page?: number
    per_page?: number
    type?: string
    name?: string
  }): Promise<APIResponse<any[]>> {
    const searchParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }

    const endpoint = `/zones/${zoneId}/dns-records${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    return this.request<any[]>(endpoint)
  }

  /**
   * 获取本地缓存的 DNS 记录列表
   */
  async getLocalDNSRecords(params?: {
    page?: number
    per_page?: number
    zone_id?: string
    type?: string
    name?: string
    content?: string
    proxied?: string
  }): Promise<APIResponse<any[]>> {
    const searchParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }

    const endpoint = `/dns/records${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    return this.request<any[]>(endpoint)
  }

  /**
   * 获取本地缓存的 DNS 记录详情
   */
  async getLocalDNSRecord(recordId: string): Promise<APIResponse<any>> {
    return this.request<any>(`/dns/records/${recordId}`)
  }
}

export const cloudflareAPI = new CloudflareAPIClient()
