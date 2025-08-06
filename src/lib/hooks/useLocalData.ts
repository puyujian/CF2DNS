import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cloudflareAPI } from '@/lib/api/cloudflareAPI'
import { QUERY_KEYS } from '@/lib/constants'

/**
 * 获取本地缓存的域名列表
 */
export function useLocalZones(params?: {
  page?: number
  per_page?: number
  name?: string
  status?: string
  account_id?: string
}) {
  return useQuery({
    queryKey: ['local-zones', params],
    queryFn: async () => {
      const response = await cloudflareAPI.getLocalZones(params)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch local zones')
      }
      return {
        zones: response.data,
        pagination: response.pagination
      }
    },
  })
}

/**
 * 获取本地缓存的域名详情
 */
export function useLocalZone(zoneId: string) {
  return useQuery({
    queryKey: ['local-zone', zoneId],
    queryFn: async () => {
      const response = await cloudflareAPI.getLocalZone(zoneId)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch local zone')
      }
      return response.data
    },
    enabled: !!zoneId,
  })
}

/**
 * 获取域名的 DNS 记录（本地缓存）
 */
export function useZoneDNSRecords(zoneId: string, params?: {
  page?: number
  per_page?: number
  type?: string
  name?: string
}) {
  return useQuery({
    queryKey: ['zone-dns-records', zoneId, params],
    queryFn: async () => {
      const response = await cloudflareAPI.getZoneDNSRecords(zoneId, params)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch zone DNS records')
      }
      return {
        records: response.data,
        pagination: response.pagination
      }
    },
    enabled: !!zoneId,
  })
}

/**
 * 获取本地缓存的 DNS 记录列表
 */
export function useLocalDNSRecords(params?: {
  page?: number
  per_page?: number
  zone_id?: string
  type?: string
  name?: string
  content?: string
  proxied?: string
}) {
  return useQuery({
    queryKey: ['local-dns-records', params],
    queryFn: async () => {
      const response = await cloudflareAPI.getLocalDNSRecords(params)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch local DNS records')
      }
      return {
        records: response.data,
        pagination: response.pagination
      }
    },
  })
}

/**
 * 获取本地缓存的 DNS 记录详情
 */
export function useLocalDNSRecord(recordId: string) {
  return useQuery({
    queryKey: ['local-dns-record', recordId],
    queryFn: async () => {
      const response = await cloudflareAPI.getLocalDNSRecord(recordId)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch local DNS record')
      }
      return response.data
    },
    enabled: !!recordId,
  })
}

/**
 * 同步域名数据
 */
export function useSyncZone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (zoneId: string) => {
      const response = await cloudflareAPI.syncZone(zoneId)
      if (!response.success) {
        throw new Error(response.error || 'Failed to sync zone')
      }
      return response.data
    },
    onSuccess: (_, zoneId) => {
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: ['local-zones'] })
      queryClient.invalidateQueries({ queryKey: ['local-zone', zoneId] })
      queryClient.invalidateQueries({ queryKey: ['zone-dns-records', zoneId] })
    },
  })
}

/**
 * 获取仪表板统计数据
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: QUERY_KEYS.DASHBOARD_STATS,
    queryFn: async () => {
      // 这里应该调用实际的统计 API
      // 暂时返回模拟数据
      return {
        totalZones: 12,
        totalRecords: 156,
        activeZones: 11,
        recentChanges: 8,
      }
    },
    refetchInterval: 5 * 60 * 1000, // 每5分钟刷新一次
  })
}

/**
 * 获取操作历史
 */
export function useOperationHistory(params?: {
  page?: number
  per_page?: number
  operation_type?: string
  resource_type?: string
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.OPERATION_HISTORY, params],
    queryFn: async () => {
      // 这里应该调用实际的历史记录 API
      // 暂时返回模拟数据
      return {
        operations: [
          {
            id: '1',
            type: 'create',
            resource: 'DNS记录',
            name: 'www.example.com',
            time: '2分钟前',
            status: 'success',
          },
          {
            id: '2',
            type: 'update',
            resource: 'DNS记录',
            name: 'api.example.com',
            time: '15分钟前',
            status: 'success',
          },
          {
            id: '3',
            type: 'delete',
            resource: 'DNS记录',
            name: 'old.example.com',
            time: '1小时前',
            status: 'success',
          },
        ],
        pagination: {
          page: 1,
          per_page: 20,
          total: 3,
          total_pages: 1,
        }
      }
    },
  })
}

/**
 * 获取 API 调用日志
 */
export function useAPICallLogs(params?: {
  page?: number
  per_page?: number
  endpoint?: string
  status_code?: number
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.API_CALL_LOGS, params],
    queryFn: async () => {
      // 这里应该调用实际的 API 日志接口
      // 暂时返回模拟数据
      return {
        logs: [
          {
            id: '1',
            endpoint: '/api/cloudflare/zones',
            method: 'GET',
            status_code: 200,
            response_time: 245,
            timestamp: '2024-12-18T10:30:00Z',
          },
          {
            id: '2',
            endpoint: '/api/cloudflare/dns-records',
            method: 'POST',
            status_code: 201,
            response_time: 189,
            timestamp: '2024-12-18T10:25:00Z',
          },
        ],
        pagination: {
          page: 1,
          per_page: 20,
          total: 2,
          total_pages: 1,
        }
      }
    },
  })
}

/**
 * 搜索功能
 */
export function useSearch(query: string, type: 'zones' | 'dns-records' | 'all' = 'all') {
  return useQuery({
    queryKey: ['search', query, type],
    queryFn: async () => {
      if (!query.trim()) {
        return { zones: [], records: [] }
      }

      // 这里应该调用实际的搜索 API
      // 暂时返回模拟数据
      const mockZones = [
        { id: '1', name: 'example.com', status: 'active' },
        { id: '2', name: 'test.com', status: 'active' },
      ].filter(zone => zone.name.includes(query.toLowerCase()))

      const mockRecords = [
        { id: '1', name: 'www.example.com', type: 'A', content: '192.168.1.1' },
        { id: '2', name: 'api.example.com', type: 'CNAME', content: 'example.com' },
      ].filter(record => 
        record.name.includes(query.toLowerCase()) || 
        record.content.includes(query.toLowerCase())
      )

      return {
        zones: type === 'dns-records' ? [] : mockZones,
        records: type === 'zones' ? [] : mockRecords,
      }
    },
    enabled: query.trim().length > 0,
    staleTime: 30 * 1000, // 30秒内不重新获取
  })
}
