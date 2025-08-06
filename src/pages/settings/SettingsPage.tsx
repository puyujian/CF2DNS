import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">设置</h1>
        <p className="mt-1 text-sm text-gray-600">
          管理您的应用设置和偏好。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>应用设置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500">设置页面正在开发中...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
