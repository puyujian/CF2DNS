// 用户相关类型
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

// Cloudflare API 相关类型
export interface CloudflareAccount {
  id: string
  name: string
  email: string
  type: string
  settings: {
    enforce_twofactor: boolean
  }
}

export interface CloudflareZone {
  id: string
  name: string
  status: 'active' | 'pending' | 'initializing' | 'moved' | 'deleted' | 'deactivated'
  paused: boolean
  type: 'full' | 'partial'
  development_mode: number
  name_servers: string[]
  original_name_servers: string[]
  original_registrar: string
  original_dnshost: string
  modified_on: string
  created_on: string
  activated_on: string
  meta: {
    step: number
    wildcard_proxiable: boolean
    custom_certificate_quota: number
    page_rule_quota: number
    phishing_detected: boolean
    multiple_railguns_allowed: boolean
  }
  owner: {
    id: string
    type: string
    email: string
  }
  account: {
    id: string
    name: string
  }
  permissions: string[]
  plan: {
    id: string
    name: string
    price: number
    currency: string
    frequency: string
    is_subscribed: boolean
    can_subscribe: boolean
    legacy_id: string
    legacy_discount: boolean
    externally_managed: boolean
  }
}

export interface DNSRecord {
  id: string
  zone_id: string
  zone_name: string
  name: string
  type: DNSRecordType
  content: string
  proxiable: boolean
  proxied: boolean
  ttl: number
  locked: boolean
  meta: {
    auto_added: boolean
    managed_by_apps: boolean
    managed_by_argo_tunnel: boolean
    source: string
  }
  comment?: string
  tags?: string[]
  created_on: string
  modified_on: string
}

export type DNSRecordType = 
  | 'A' 
  | 'AAAA' 
  | 'CNAME' 
  | 'MX' 
  | 'TXT' 
  | 'SRV' 
  | 'NS' 
  | 'PTR' 
  | 'CAA' 
  | 'CERT' 
  | 'DNSKEY' 
  | 'DS' 
  | 'NAPTR' 
  | 'SMIMEA' 
  | 'SSHFP' 
  | 'TLSA' 
  | 'URI'

export interface CreateDNSRecordData {
  type: DNSRecordType
  name: string
  content: string
  ttl?: number
  proxied?: boolean
  comment?: string
  tags?: string[]
  priority?: number // for MX records
}

export interface UpdateDNSRecordData extends Partial<CreateDNSRecordData> {
  id: string
}

// API 响应类型
export interface CloudflareAPIResponse<T = any> {
  success: boolean
  errors: Array<{
    code: number
    message: string
  }>
  messages: Array<{
    code: number
    message: string
  }>
  result: T
  result_info?: {
    page: number
    per_page: number
    count: number
    total_count: number
    total_pages: number
  }
}

// 应用状态类型
export interface AppState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// 通知类型
export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// 分页类型
export interface PaginationParams {
  page: number
  per_page: number
  order?: 'asc' | 'desc'
  direction?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    per_page: number
    count: number
    total_count: number
    total_pages: number
  }
}

// 过滤器类型
export interface DNSRecordFilters {
  type?: DNSRecordType
  name?: string
  content?: string
  proxied?: boolean
}

export interface ZoneFilters {
  status?: CloudflareZone['status']
  name?: string
}

// 统计数据类型
export interface DashboardStats {
  totalZones: number
  totalRecords: number
  activeZones: number
  recentChanges: number
}

// 操作历史类型
export interface OperationHistory {
  id: string
  type: 'create' | 'update' | 'delete'
  resource: 'zone' | 'dns_record'
  resourceId: string
  resourceName: string
  details: Record<string, any>
  userId: string
  timestamp: string
}
