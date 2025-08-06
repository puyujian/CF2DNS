import React from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export function DomainDetailPage() {
  const { domainId } = useParams()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">域名详情</h1>
        <p className="mt-1 text-sm text-gray-600">
          域名 ID: {domainId}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>域名信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500">域名详情页面正在开发中...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
