import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useZones } from '@/lib/hooks/useCloudflare'
import { useLocalZones, useSyncZone } from '@/lib/hooks/useLocalData'
import {
  Globe,
  Search,
  RefreshCw,
  Plus,
  Filter,
  ExternalLink,
  Shield,
  ShieldOff,
  Activity,
  Pause,
  Play
} from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { ZONE_STATUS, ZONE_TYPES, PROXY_STATUS } from '@/lib/constants'

export function DomainsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [useLocalData, setUseLocalData] = useState(true)

  // 查询参数
  const queryParams = {
    page: currentPage,
    per_page: 20,
    ...(searchQuery && { name: searchQuery }),
    ...(statusFilter && { status: statusFilter }),
  }

  // 使用本地缓存或实时数据
  const {
    data: localData,
    isLoading: localLoading,
    error: localError,
    refetch: refetchLocal
  } = useLocalZones(useLocalData ? queryParams : undefined)

  const {
    data: cloudflareData,
    isLoading: cloudflareLoading,
    error: cloudflareError,
    refetch: refetchCloudflare
  } = useZones(useLocalData ? undefined : queryParams)

  const syncZoneMutation = useSyncZone()

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

  const handleSyncZone = async (zoneId: string) => {
    try {
      await syncZoneMutation.mutateAsync(zoneId)
    } catch (error) {
      console.error('Sync zone failed:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: 'bg-success-100 text-success-800',
      pending: 'bg-warning-100 text-warning-800',
      initializing: 'bg-primary-100 text-primary-800',
      moved: 'bg-gray-100 text-gray-800',
      deleted: 'bg-error-100 text-error-800',
      deactivated: 'bg-gray-100 text-gray-800',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusConfig[status as keyof typeof statusConfig] || 'bg-gray-100 text-gray-800'
      }`}>
        {ZONE_STATUS[status as keyof typeof ZONE_STATUS] || status}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">域名管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            管理您的 Cloudflare 域名和区域设置。
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
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            添加域名
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
                  placeholder="搜索域名..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="">所有状态</option>
                <option value="active">活跃</option>
                <option value="pending">待激活</option>
                <option value="initializing">初始化中</option>
                <option value="moved">已迁移</option>
                <option value="deleted">已删除</option>
                <option value="deactivated">已停用</option>
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

      {/* 域名列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            域名列表
            {data?.pagination && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({data.pagination.total} 个域名)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="error" className="mb-6">
              {error instanceof Error ? error.message : '获取域名列表失败'}
            </Alert>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gray-600">正在加载域名列表...</span>
            </div>
          ) : data?.zones?.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无域名</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || statusFilter
                  ? '没有找到符合条件的域名'
                  : '您还没有添加任何域名到 Cloudflare'
                }
              </p>
              {!searchQuery && !statusFilter && (
                <Button variant="primary">
                  <Plus className="h-4 w-4 mr-2" />
                  添加第一个域名
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {data?.zones?.map((zone: any) => (
                <div
                  key={zone.zone_id || zone.id}
                  className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Link
                          to={`/domains/${zone.zone_id || zone.id}`}
                          className="text-lg font-medium text-gray-900 hover:text-primary-600"
                        >
                          {zone.zone_name || zone.name}
                        </Link>
                        {getStatusBadge(zone.status)}
                        {zone.paused && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <Pause className="h-3 w-3 mr-1" />
                            已暂停
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Shield className="h-4 w-4 mr-1" />
                          {ZONE_TYPES[zone.type as keyof typeof ZONE_TYPES] || zone.type}
                        </span>
                        {zone.plan_name && (
                          <span className="flex items-center">
                            <Activity className="h-4 w-4 mr-1" />
                            {zone.plan_name}
                          </span>
                        )}
                        {zone.activated_on && (
                          <span>
                            激活于 {formatDate(zone.activated_on)}
                          </span>
                        )}
                        {zone.last_synced_at && (
                          <span>
                            同步于 {formatRelativeTime(zone.last_synced_at)}
                          </span>
                        )}
                      </div>

                      {zone.record_stats && (
                        <div className="mt-3 flex items-center space-x-4 text-sm text-gray-600">
                          <span>DNS 记录: {zone.record_stats.total_records}</span>
                          <span>代理记录: {zone.record_stats.proxied_records}</span>
                          <span>A 记录: {zone.record_stats.a_records}</span>
                          <span>CNAME 记录: {zone.record_stats.cname_records}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {useLocalData && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncZone(zone.zone_id || zone.id)}
                          disabled={syncZoneMutation.isPending}
                        >
                          <RefreshCw className={`h-4 w-4 mr-1 ${syncZoneMutation.isPending ? 'animate-spin' : ''}`} />
                          同步
                        </Button>
                      )}
                      <Link to={`/domains/${zone.zone_id || zone.id}/dns`}>
                        <Button variant="outline" size="sm">
                          DNS 记录
                        </Button>
                      </Link>
                      <Link to={`/domains/${zone.zone_id || zone.id}`}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          详情
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
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
