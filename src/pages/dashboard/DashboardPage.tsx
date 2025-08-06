import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Globe, Dns, Activity, Clock } from 'lucide-react'

export function DashboardPage() {
  // 这里应该从 API 获取真实数据
  const stats = {
    totalZones: 12,
    totalRecords: 156,
    activeZones: 11,
    recentChanges: 8,
  }

  const recentActivities = [
    {
      id: 1,
      type: 'create',
      resource: 'DNS记录',
      name: 'www.example.com',
      time: '2分钟前',
    },
    {
      id: 2,
      type: 'update',
      resource: 'DNS记录',
      name: 'api.example.com',
      time: '15分钟前',
    },
    {
      id: 3,
      type: 'delete',
      resource: 'DNS记录',
      name: 'old.example.com',
      time: '1小时前',
    },
  ]

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">仪表板</h1>
        <p className="mt-1 text-sm text-gray-600">
          欢迎回来！这里是您的 DNS 管理概览。
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总域名数</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalZones}</div>
            <p className="text-xs text-muted-foreground">
              +2 较上月
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DNS 记录数</CardTitle>
            <Dns className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecords}</div>
            <p className="text-xs text-muted-foreground">
              +12 较上周
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃域名</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeZones}</div>
            <p className="text-xs text-muted-foreground">
              91.7% 可用性
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">近期变更</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentChanges}</div>
            <p className="text-xs text-muted-foreground">
              过去24小时
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 最近活动 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>最近活动</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className={`h-2 w-2 rounded-full ${
                      activity.type === 'create' ? 'bg-green-500' :
                      activity.type === 'update' ? 'bg-blue-500' :
                      'bg-red-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.type === 'create' ? '创建' :
                       activity.type === 'update' ? '更新' : '删除'}{' '}
                      {activity.resource}
                    </p>
                    <p className="text-sm text-gray-500">{activity.name}</p>
                  </div>
                  <div className="flex-shrink-0 text-sm text-gray-500">
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="font-medium text-gray-900">添加新域名</div>
                <div className="text-sm text-gray-500">将域名添加到 Cloudflare</div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="font-medium text-gray-900">创建 DNS 记录</div>
                <div className="text-sm text-gray-500">为现有域名添加记录</div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="font-medium text-gray-900">API 探索器</div>
                <div className="text-sm text-gray-500">测试 Cloudflare API</div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
