import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cloudflareAPI } from '@/lib/api/cloudflareAPI'
import { QUERY_KEYS } from '@/lib/constants'
import { CloudflareZone, DNSRecord, CreateDNSRecordData, UpdateDNSRecordData } from '@/types'

/**
 * 获取 Cloudflare 账户列表
 */
export function useAccounts() {
  return useQuery({
    queryKey: QUERY_KEYS.CF_ACCOUNTS,
    queryFn: async () => {
      const response = await cloudflareAPI.getAccounts()
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch accounts')
      }
      return response.data
    },
  })
}

/**
 * 获取域名列表
 */
export function useZones(params?: {
  page?: number
  per_page?: number
  name?: string
  status?: string
  account_id?: string
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.CF_ZONES, params],
    queryFn: async () => {
      const response = await cloudflareAPI.getZones(params)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch zones')
      }
      return {
        zones: response.data,
        pagination: response.pagination
      }
    },
  })
}

/**
 * 获取域名详情
 */
export function useZone(zoneId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.ZONE_DETAIL(zoneId),
    queryFn: async () => {
      const response = await cloudflareAPI.getZone(zoneId)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch zone')
      }
      return response.data
    },
    enabled: !!zoneId,
  })
}

/**
 * 获取域名设置
 */
export function useZoneSettings(zoneId: string) {
  return useQuery({
    queryKey: ['zone-settings', zoneId],
    queryFn: async () => {
      const response = await cloudflareAPI.getZoneSettings(zoneId)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch zone settings')
      }
      return response.data
    },
    enabled: !!zoneId,
  })
}

/**
 * 获取 DNS 记录列表
 */
export function useDNSRecords(zoneId: string, params?: {
  page?: number
  per_page?: number
  name?: string
  content?: string
  type?: string
  proxied?: boolean
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.CF_DNS_RECORDS(zoneId), params],
    queryFn: async () => {
      const response = await cloudflareAPI.getDNSRecords(zoneId, params)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch DNS records')
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
 * 获取 DNS 记录详情
 */
export function useDNSRecord(zoneId: string, recordId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.DNS_RECORD_DETAIL(recordId),
    queryFn: async () => {
      const response = await cloudflareAPI.getDNSRecord(zoneId, recordId)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch DNS record')
      }
      return response.data
    },
    enabled: !!zoneId && !!recordId,
  })
}

/**
 * 创建 DNS 记录
 */
export function useCreateDNSRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ zoneId, record }: { zoneId: string; record: CreateDNSRecordData }) => {
      const response = await cloudflareAPI.createDNSRecord(zoneId, record)
      if (!response.success) {
        throw new Error(response.error || 'Failed to create DNS record')
      }
      return response.data
    },
    onSuccess: (_, { zoneId }) => {
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CF_DNS_RECORDS(zoneId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DNS_RECORDS })
    },
  })
}

/**
 * 更新 DNS 记录
 */
export function useUpdateDNSRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      zoneId, 
      recordId, 
      record 
    }: { 
      zoneId: string
      recordId: string
      record: UpdateDNSRecordData 
    }) => {
      const response = await cloudflareAPI.updateDNSRecord(zoneId, recordId, record)
      if (!response.success) {
        throw new Error(response.error || 'Failed to update DNS record')
      }
      return response.data
    },
    onSuccess: (_, { zoneId, recordId }) => {
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CF_DNS_RECORDS(zoneId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DNS_RECORD_DETAIL(recordId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DNS_RECORDS })
    },
  })
}

/**
 * 删除 DNS 记录
 */
export function useDeleteDNSRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ zoneId, recordId }: { zoneId: string; recordId: string }) => {
      const response = await cloudflareAPI.deleteDNSRecord(zoneId, recordId)
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete DNS record')
      }
      return response.data
    },
    onSuccess: (_, { zoneId }) => {
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CF_DNS_RECORDS(zoneId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DNS_RECORDS })
    },
  })
}

/**
 * 验证 Cloudflare API 令牌
 */
export function useVerifyToken() {
  return useMutation({
    mutationFn: async ({ apiToken, email }: { apiToken: string; email?: string }) => {
      const response = await cloudflareAPI.verifyToken(apiToken, email)
      if (!response.success) {
        throw new Error(response.error || 'Failed to verify token')
      }
      return response.data
    },
  })
}

/**
 * 更新域名设置
 */
export function useUpdateZoneSetting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      zoneId, 
      settingId, 
      value 
    }: { 
      zoneId: string
      settingId: string
      value: any 
    }) => {
      const response = await cloudflareAPI.updateZoneSetting(zoneId, settingId, value)
      if (!response.success) {
        throw new Error(response.error || 'Failed to update zone setting')
      }
      return response.data
    },
    onSuccess: (_, { zoneId }) => {
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: ['zone-settings', zoneId] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ZONE_DETAIL(zoneId) })
    },
  })
}

/**
 * 导入 DNS 记录
 */
export function useImportDNSRecords() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ zoneId, fileContent }: { zoneId: string; fileContent: string }) => {
      const response = await cloudflareAPI.importDNSRecords(zoneId, fileContent)
      if (!response.success) {
        throw new Error(response.error || 'Failed to import DNS records')
      }
      return response.data
    },
    onSuccess: (_, { zoneId }) => {
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CF_DNS_RECORDS(zoneId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DNS_RECORDS })
    },
  })
}

/**
 * 批量操作 DNS 记录
 */
export function useBatchDNSRecords() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      operation, 
      recordIds, 
      data 
    }: { 
      operation: string
      recordIds: string[]
      data?: any 
    }) => {
      const response = await cloudflareAPI.batchDNSRecords(operation, recordIds, data)
      if (!response.success) {
        throw new Error(response.error || 'Failed to perform batch operation')
      }
      return response.data
    },
    onSuccess: () => {
      // 刷新所有相关查询
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DNS_RECORDS })
      queryClient.invalidateQueries({ queryKey: ['cloudflare', 'zones'] })
    },
  })
}

/**
 * 同步 DNS 记录
 */
export function useSyncDNSRecords() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (zoneId: string) => {
      const response = await cloudflareAPI.syncDNSRecords(zoneId)
      if (!response.success) {
        throw new Error(response.error || 'Failed to sync DNS records')
      }
      return response.data
    },
    onSuccess: (_, zoneId) => {
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CF_DNS_RECORDS(zoneId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DNS_RECORDS })
    },
  })
}
