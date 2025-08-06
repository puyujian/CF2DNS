import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  Code,
  Play,
  Copy,
  Download,
  Book,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

interface APIEndpoint {
  id: string
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  description: string
  category: string
  parameters?: Array<{
    name: string
    type: string
    required: boolean
    description: string
  }>
}

const API_ENDPOINTS: APIEndpoint[] = [
  {
    id: 'list-zones',
    name: '获取域名列表',
    method: 'GET',
    path: '/zones',
    description: '获取账户下的所有域名',
    category: '域名管理',
    parameters: [
      { name: 'page', type: 'number', required: false, description: '页码' },
      { name: 'per_page', type: 'number', required: false, description: '每页数量' },
      { name: 'name', type: 'string', required: false, description: '域名过滤' },
      { name: 'status', type: 'string', required: false, description: '状态过滤' },
    ]
  },
  {
    id: 'get-zone',
    name: '获取域名详情',
    method: 'GET',
    path: '/zones/{zone_id}',
    description: '获取指定域名的详细信息',
    category: '域名管理',
    parameters: [
      { name: 'zone_id', type: 'string', required: true, description: '域名ID' },
    ]
  },
  {
    id: 'list-dns-records',
    name: '获取DNS记录',
    method: 'GET',
    path: '/zones/{zone_id}/dns_records',
    description: '获取域名的DNS记录列表',
    category: 'DNS管理',
    parameters: [
      { name: 'zone_id', type: 'string', required: true, description: '域名ID' },
      { name: 'type', type: 'string', required: false, description: '记录类型' },
      { name: 'name', type: 'string', required: false, description: '记录名称' },
      { name: 'content', type: 'string', required: false, description: '记录内容' },
    ]
  },
  {
    id: 'create-dns-record',
    name: '创建DNS记录',
    method: 'POST',
    path: '/zones/{zone_id}/dns_records',
    description: '为域名创建新的DNS记录',
    category: 'DNS管理',
    parameters: [
      { name: 'zone_id', type: 'string', required: true, description: '域名ID' },
      { name: 'type', type: 'string', required: true, description: '记录类型' },
      { name: 'name', type: 'string', required: true, description: '记录名称' },
      { name: 'content', type: 'string', required: true, description: '记录内容' },
      { name: 'ttl', type: 'number', required: false, description: 'TTL值' },
      { name: 'proxied', type: 'boolean', required: false, description: '是否代理' },
    ]
  },
  {
    id: 'update-dns-record',
    name: '更新DNS记录',
    method: 'PUT',
    path: '/zones/{zone_id}/dns_records/{record_id}',
    description: '更新指定的DNS记录',
    category: 'DNS管理',
    parameters: [
      { name: 'zone_id', type: 'string', required: true, description: '域名ID' },
      { name: 'record_id', type: 'string', required: true, description: '记录ID' },
      { name: 'type', type: 'string', required: false, description: '记录类型' },
      { name: 'name', type: 'string', required: false, description: '记录名称' },
      { name: 'content', type: 'string', required: false, description: '记录内容' },
      { name: 'ttl', type: 'number', required: false, description: 'TTL值' },
      { name: 'proxied', type: 'boolean', required: false, description: '是否代理' },
    ]
  },
  {
    id: 'delete-dns-record',
    name: '删除DNS记录',
    method: 'DELETE',
    path: '/zones/{zone_id}/dns_records/{record_id}',
    description: '删除指定的DNS记录',
    category: 'DNS管理',
    parameters: [
      { name: 'zone_id', type: 'string', required: true, description: '域名ID' },
      { name: 'record_id', type: 'string', required: true, description: '记录ID' },
    ]
  },
]

const CATEGORIES = Array.from(new Set(API_ENDPOINTS.map(endpoint => endpoint.category)))

export function APIExplorerPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [parameters, setParameters] = useState<Record<string, string>>({})
  const [requestBody, setRequestBody] = useState('')
  const [response, setResponse] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const filteredEndpoints = selectedCategory
    ? API_ENDPOINTS.filter(endpoint => endpoint.category === selectedCategory)
    : API_ENDPOINTS

  const handleParameterChange = (name: string, value: string) => {
    setParameters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleExecuteRequest = async () => {
    if (!selectedEndpoint) return

    setIsLoading(true)
    setError('')
    setResponse(null)

    try {
      // 构建请求URL
      let url = `/api/cloudflare${selectedEndpoint.path}`

      // 替换路径参数
      Object.entries(parameters).forEach(([key, value]) => {
        url = url.replace(`{${key}}`, value)
      })

      // 添加查询参数
      const queryParams = new URLSearchParams()
      selectedEndpoint.parameters?.forEach(param => {
        if (!selectedEndpoint.path.includes(`{${param.name}}`) && parameters[param.name]) {
          queryParams.append(param.name, parameters[param.name])
        }
      })

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`
      }

      // 构建请求配置
      const config: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cf2dns_access_token')}`,
        },
      }

      // 添加请求体
      if (['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method) && requestBody) {
        config.body = requestBody
      }

      const startTime = Date.now()
      const response = await fetch(url, config)
      const endTime = Date.now()
      const responseData = await response.json()

      setResponse({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        responseTime: endTime - startTime,
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败')
    } finally {
      setIsLoading(false)
    }
  }

  const getMethodColor = (method: string) => {
    const colors = {
      GET: 'bg-blue-100 text-blue-800',
      POST: 'bg-green-100 text-green-800',
      PUT: 'bg-yellow-100 text-yellow-800',
      DELETE: 'bg-red-100 text-red-800',
      PATCH: 'bg-purple-100 text-purple-800',
    }
    return colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600'
    if (status >= 400 && status < 500) return 'text-yellow-600'
    if (status >= 500) return 'text-red-600'
    return 'text-gray-600'
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">API 探索器</h1>
        <p className="mt-1 text-sm text-gray-600">
          测试和探索 Cloudflare API 功能，实时查看请求和响应。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：API 端点列表 */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Book className="h-5 w-5 mr-2" />
                API 端点
              </CardTitle>
              <div className="mt-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input w-full"
                >
                  <option value="">所有分类</option>
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredEndpoints.map(endpoint => (
                  <div
                    key={endpoint.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedEndpoint?.id === endpoint.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedEndpoint(endpoint)
                      setParameters({})
                      setRequestBody('')
                      setResponse(null)
                      setError('')
                    }}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getMethodColor(endpoint.method)}`}>
                        {endpoint.method}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {endpoint.name}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {endpoint.path}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {endpoint.description}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：请求配置和响应 */}
        <div className="lg:col-span-2 space-y-6">
          {selectedEndpoint ? (
            <>
              {/* 请求配置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    请求配置
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 端点信息 */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${getMethodColor(selectedEndpoint.method)}`}>
                        {selectedEndpoint.method}
                      </span>
                      <span className="font-mono text-sm text-gray-900">
                        {selectedEndpoint.path}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{selectedEndpoint.description}</p>
                  </div>

                  {/* 参数配置 */}
                  {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">参数</h4>
                      <div className="space-y-3">
                        {selectedEndpoint.parameters.map(param => (
                          <div key={param.name}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {param.name}
                              {param.required && <span className="text-red-500 ml-1">*</span>}
                              <span className="text-xs text-gray-500 ml-2">({param.type})</span>
                            </label>
                            <Input
                              type={param.type === 'number' ? 'number' : 'text'}
                              placeholder={param.description}
                              value={parameters[param.name] || ''}
                              onChange={(e) => handleParameterChange(param.name, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 请求体 */}
                  {['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        请求体 (JSON)
                      </label>
                      <textarea
                        className="input min-h-[120px] font-mono text-sm"
                        placeholder="输入 JSON 格式的请求体..."
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                      />
                    </div>
                  )}

                  {/* 执行按钮 */}
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="primary"
                      onClick={handleExecuteRequest}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          执行中...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          执行请求
                        </>
                      )}
                    </Button>
                    {response && (
                      <Button
                        variant="outline"
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(response, null, 2))}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        复制响应
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 错误信息 */}
              {error && (
                <Alert variant="error">
                  <AlertCircle className="h-4 w-4" />
                  <span className="ml-2">{error}</span>
                </Alert>
              )}

              {/* 响应结果 */}
              {response && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Code className="h-5 w-5 mr-2" />
                        响应结果
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {response.responseTime}ms
                        </div>
                        <div className={`flex items-center ${getStatusColor(response.status)}`}>
                          {response.status >= 200 && response.status < 300 ? (
                            <CheckCircle className="h-4 w-4 mr-1" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-1" />
                          )}
                          {response.status} {response.statusText}
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 响应头 */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">响应头</h4>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <pre className="text-xs text-gray-700 font-mono">
                            {Object.entries(response.headers).map(([key, value]) => (
                              <div key={key}>{key}: {value}</div>
                            ))}
                          </pre>
                        </div>
                      </div>

                      {/* 响应体 */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">响应体</h4>
                        <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                          <pre className="text-sm text-green-400 font-mono">
                            {JSON.stringify(response.data, null, 2)}
                          </pre>
                        </div>
                      </div>

                      {/* 请求信息 */}
                      <div className="text-xs text-gray-500">
                        请求时间: {new Date(response.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">选择 API 端点</h3>
                <p className="text-gray-500">
                  从左侧列表中选择一个 API 端点开始测试
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
