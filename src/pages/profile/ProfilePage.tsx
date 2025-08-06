import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">个人资料</h1>
        <p className="mt-1 text-sm text-gray-600">
          管理您的个人信息和账户设置。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>个人信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500">个人资料页面正在开发中...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
