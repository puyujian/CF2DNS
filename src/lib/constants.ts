// DNS 记录类型定义
export const DNS_RECORD_TYPES = [
  'A',
  'AAAA', 
  'CNAME',
  'MX',
  'TXT',
  'SRV',
  'NS',
  'PTR',
  'CAA',
  'CERT',
  'DNSKEY',
  'DS',
  'NAPTR',
  'SMIMEA',
  'SSHFP',
  'TLSA',
  'URI'
] as const

// DNS 记录类型描述
export const DNS_RECORD_DESCRIPTIONS = {
  A: 'IPv4 地址记录',
  AAAA: 'IPv6 地址记录',
  CNAME: '别名记录',
  MX: '邮件交换记录',
  TXT: '文本记录',
  SRV: '服务记录',
  NS: '名称服务器记录',
  PTR: '指针记录',
  CAA: '证书颁发机构授权记录',
  CERT: '证书记录',
  DNSKEY: 'DNS 密钥记录',
  DS: '委托签名记录',
  NAPTR: '命名权威指针记录',
  SMIMEA: 'S/MIME 证书关联记录',
  SSHFP: 'SSH 指纹记录',
  TLSA: 'TLS 关联记录',
  URI: 'URI 记录'
} as const

// TTL 预设值
export const TTL_OPTIONS = [
  { value: 1, label: '自动' },
  { value: 60, label: '1 分钟' },
  { value: 300, label: '5 分钟' },
  { value: 900, label: '15 分钟' },
  { value: 1800, label: '30 分钟' },
  { value: 3600, label: '1 小时' },
  { value: 7200, label: '2 小时' },
  { value: 18000, label: '5 小时' },
  { value: 43200, label: '12 小时' },
  { value: 86400, label: '1 天' },
] as const

// Cloudflare 区域状态
export const ZONE_STATUS = {
  active: '活跃',
  pending: '待激活',
  initializing: '初始化中',
  moved: '已迁移',
  deleted: '已删除',
  deactivated: '已停用'
} as const

// Cloudflare 区域类型
export const ZONE_TYPES = {
  full: '完整设置',
  partial: '部分设置'
} as const

// 代理状态
export const PROXY_STATUS = {
  true: '已代理',
  false: '仅 DNS'
} as const

// 操作类型
export const OPERATION_TYPES = {
  create: '创建',
  update: '更新',
  delete: '删除'
} as const

// 资源类型
export const RESOURCE_TYPES = {
  zone: '域名',
  dns_record: 'DNS 记录'
} as const

// 操作状态
export const OPERATION_STATUS = {
  success: '成功',
  failed: '失败',
  pending: '进行中'
} as const

// API 端点
export const API_ENDPOINTS = {
  // 认证相关
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  LOGOUT: '/api/auth/logout',
  REFRESH: '/api/auth/refresh',
  VERIFY_EMAIL: '/api/auth/verify-email',
  FORGOT_PASSWORD: '/api/auth/forgot-password',
  RESET_PASSWORD: '/api/auth/reset-password',
  
  // 用户相关
  USER_PROFILE: '/api/user/profile',
  USER_SETTINGS: '/api/user/settings',
  USER_API_TOKENS: '/api/user/api-tokens',
  
  // Cloudflare 相关
  CF_ACCOUNTS: '/api/cloudflare/accounts',
  CF_ZONES: '/api/cloudflare/zones',
  CF_DNS_RECORDS: '/api/cloudflare/dns-records',
  CF_ZONE_SETTINGS: '/api/cloudflare/zone-settings',
  
  // 域名管理
  ZONES: '/api/zones',
  ZONE_DETAIL: '/api/zones/:id',
  ZONE_SYNC: '/api/zones/:id/sync',
  
  // DNS 记录管理
  DNS_RECORDS: '/api/dns/records',
  DNS_RECORD_DETAIL: '/api/dns/records/:id',
  DNS_BULK_OPERATIONS: '/api/dns/bulk',
  
  // 统计和历史
  DASHBOARD_STATS: '/api/dashboard/stats',
  OPERATION_HISTORY: '/api/history/operations',
  API_CALL_LOGS: '/api/history/api-calls',
} as const

// 本地存储键名
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'cf2dns_access_token',
  REFRESH_TOKEN: 'cf2dns_refresh_token',
  USER_PREFERENCES: 'cf2dns_user_preferences',
  THEME: 'cf2dns_theme',
  LANGUAGE: 'cf2dns_language',
} as const

// 默认分页配置
export const DEFAULT_PAGINATION = {
  page: 1,
  per_page: 20,
  max_per_page: 100,
} as const

// 查询配置
export const QUERY_KEYS = {
  // 用户相关
  USER_PROFILE: ['user', 'profile'],
  USER_SETTINGS: ['user', 'settings'],
  
  // 域名相关
  ZONES: ['zones'],
  ZONE_DETAIL: (id: string) => ['zones', id],
  ZONE_DNS_RECORDS: (id: string) => ['zones', id, 'dns-records'],
  
  // DNS 记录相关
  DNS_RECORDS: ['dns-records'],
  DNS_RECORD_DETAIL: (id: string) => ['dns-records', id],
  
  // Cloudflare API
  CF_ACCOUNTS: ['cloudflare', 'accounts'],
  CF_ZONES: ['cloudflare', 'zones'],
  CF_DNS_RECORDS: (zoneId: string) => ['cloudflare', 'zones', zoneId, 'dns-records'],
  
  // 统计数据
  DASHBOARD_STATS: ['dashboard', 'stats'],
  OPERATION_HISTORY: ['history', 'operations'],
  API_CALL_LOGS: ['history', 'api-calls'],
} as const

// 错误代码
export const ERROR_CODES = {
  // 认证错误
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // 验证错误
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_DOMAIN: 'INVALID_DOMAIN',
  INVALID_IP: 'INVALID_IP',
  
  // 业务错误
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  ZONE_NOT_FOUND: 'ZONE_NOT_FOUND',
  DNS_RECORD_NOT_FOUND: 'DNS_RECORD_NOT_FOUND',
  
  // Cloudflare API 错误
  CF_API_ERROR: 'CF_API_ERROR',
  CF_UNAUTHORIZED: 'CF_UNAUTHORIZED',
  CF_RATE_LIMITED: 'CF_RATE_LIMITED',
  CF_ZONE_NOT_FOUND: 'CF_ZONE_NOT_FOUND',
  
  // 系统错误
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const

// 通知类型
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const

// 主题配置
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const

// 语言配置
export const LANGUAGES = {
  ZH_CN: 'zh-CN',
  EN_US: 'en-US',
} as const

// 文件类型
export const FILE_TYPES = {
  JSON: 'application/json',
  CSV: 'text/csv',
  TXT: 'text/plain',
  XML: 'application/xml',
} as const

// 正则表达式
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  DOMAIN: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  IPV6: /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
} as const
