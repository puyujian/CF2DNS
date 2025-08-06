import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useDNSRecords } from '@/lib/hooks/useCloudflare'
import { useLocalDNSRecords } from '@/lib/hooks/useLocalData'
import {
  Network,
  Search,
  RefreshCw,
  Plus,
  Filter,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Shield,
  ShieldOff,
  Download,
  Upload
} from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { DNS_RECORD_TYPES, DNS_RECORD_DESCRIPTIONS, TTL_OPTIONS, PROXY_STATUS } from '@/lib/constants'

export function DNSRecordsPage() {
  const { domainId } = useParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [proxiedFilter, setProxiedFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [useLocalData, setUseLocalData] = useState(true)

  // 查询参数
  const queryParams = {
    page: currentPage,
    per_page: 20,
    ...(searchQuery && { name: searchQuery }),
    ...(typeFilter && { type: typeFilter }),
    ...(proxiedFilter && { proxied: proxiedFilter }),
  }

  // 使用本地缓存或实时数据
  const {
    data: localData,
    isLoading: localLoading,
    error: localError,
    refetch: refetchLocal
  } = useLocalDNSRecords(useLocalData ? {
    ...queryParams,
    zone_id: domainId
  } : undefined)

  const {
    data: cloudflareData,
    isLoading: cloudflareLoading,
    error: cloudflareError,
    refetch: refetchCloudflare
  } = useDNSRecords(domainId || '', useLocalData ? undefined : queryParams)

  // 选择数据源
  const data = useLocalData ? localData : cloudflareData
  const isLoading = useLocalData ? localLoading : cloudflareLoading
  const error = useLocalData ? localError : cloudflareError

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    if (useLocalData) {
      refetchLocal()
    } else {
      refetchCloudflare()
    }
  }

  const getTypeColor = (type: string) => {
    const typeColors = {
      A: 'bg-blue-100 text-blue-800',
      AAAA: 'bg-purple-100 text-purple-800',
      CNAME: 'bg-green-100 text-green-800',
      MX: 'bg-orange-100 text-orange-800',
      TXT: 'bg-gray-100 text-gray-800',
      SRV: 'bg-indigo-100 text-indigo-800',
      NS: 'bg-yellow-100 text-yellow-800',
    }
    return typeColors[type as keyof typeof typeColors] || 'bg-gray-100 text-gray-800'
  }

  const getTTLDisplay = (ttl: number) => {
    if (ttl === 1) return '自动'
    if (ttl < 60) return `${ttl}秒`
    if (ttl < 3600) return `${Math.floor(ttl / 60)}分钟`
    if (ttl < 86400) return `${Math.floor(ttl / 3600)}小时`
    return `${Math.floor(ttl / 86400)}天`
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Link to="/domains" className="text-gray-500 hover:text-gray-700">
              域名管理
            </Link>
            <span className="text-gray-400">/</span>
            <h1 className="text-2xl font-bold text-gray-900">DNS 记录管理</h1>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            查看和管理域名的 DNS 记录。
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUseLocalData(!useLocalData)}
          >
            {useLocalData ? '切换到实时数据' : '切换到本地缓存'}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            导出
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            导入
          </Button>
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            添加记录
          </Button>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="搜索记录名称或内容..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-32">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input"
              >
                <option value="">所有类型</option>
                {DNS_RECORD_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <select
                value={proxiedFilter}
                onChange={(e) => setProxiedFilter(e.target.value)}
                className="input"
              >
                <option value="">所有状态</option>
                <option value="true">已代理</option>
                <option value="false">仅 DNS</option>
              </select>
            </div>
            <Button type="submit" variant="outline" size="md">
              <Filter className="h-4 w-4 mr-2" />
              筛选
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => useLocalData ? refetchLocal() : refetchCloudflare()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* DNS 记录列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Network className="h-5 w-5 mr-2" />
            DNS 记录
            {data?.pagination && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({data.pagination.total} 条记录)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="error" className="mb-6">
              {error instanceof Error ? error.message : '获取 DNS 记录失败'}
            </Alert>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gray-600">正在加载 DNS 记录...</span>
            </div>
          ) : data?.records?.length === 0 ? (
            <div className="text-center py-12">
              <Network className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无 DNS 记录</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || typeFilter || proxiedFilter
                  ? '没有找到符合条件的 DNS 记录'
                  : '该域名还没有配置任何 DNS 记录'
                }
              </p>
              {!searchQuery && !typeFilter && !proxiedFilter && (
                <Button variant="primary">
                  <Plus className="h-4 w-4 mr-2" />
                  添加第一条记录
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr className="table-row">
                    <th className="table-head">类型</th>
                    <th className="table-head">名称</th>
                    <th className="table-head">内容</th>
                    <th className="table-head">代理状态</th>
                    <th className="table-head">TTL</th>
                    <th className="table-head">最后更新</th>
                    <th className="table-head">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.records?.map((record: any) => (
                    <tr key={record.record_id || record.id} className="table-row">
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(record.type)}`}>
                          {record.type}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="font-medium text-gray-900">
                          {record.name}
                        </div>
                        {record.comment && (
                          <div className="text-sm text-gray-500 mt-1">
                            {record.comment}
                          </div>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="font-mono text-sm text-gray-900 max-w-xs truncate">
                          {record.content}
                        </div>
                        {record.priority && (
                          <div className="text-sm text-gray-500">
                            优先级: {record.priority}
                          </div>
                        )}
                      </td>
                      <td className="table-cell">
                        {record.proxiable ? (
                          <div className="flex items-center">
                            {record.proxied ? (
                              <div className="flex items-center text-orange-600">
                                <Shield className="h-4 w-4 mr-1" />
                                <span className="text-sm">已代理</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-gray-600">
                                <ShieldOff className="h-4 w-4 mr-1" />
                                <span className="text-sm">仅 DNS</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">不可代理</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className="text-sm text-gray-900">
                          {getTTLDisplay(record.ttl)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm text-gray-500">
                          {record.modified_on ? formatRelativeTime(record.modified_on) :
                           record.last_synced_at ? formatRelativeTime(record.last_synced_at) : '-'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(record.content)}
                            title="复制内容"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="编辑记录"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="删除记录"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 分页 */}
          {data?.pagination && data.pagination.total_pages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                显示第 {((currentPage - 1) * (data.pagination.per_page || 20)) + 1} - {Math.min(currentPage * (data.pagination.per_page || 20), data.pagination.total)} 条，
                共 {data.pagination.total} 条记录
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  上一页
                </Button>
                <span className="text-sm text-gray-700">
                  第 {currentPage} 页，共 {data.pagination.total_pages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= data.pagination.total_pages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
