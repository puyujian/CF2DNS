import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { authAPI } from '@/lib/auth/authAPI'
import { User, Shield, Eye, EyeOff, ExternalLink } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  name: string
  avatar?: string
  emailVerified: boolean
  hasCloudflareToken: boolean
  cloudflareEmail?: string
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showToken, setShowToken] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    cloudflareApiToken: '',
    cloudflareEmail: '',
    cloudflareAccountId: ''
  })

  // 获取用户资料
  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const response = await authAPI.getProfile()
      setProfile(response)
      setFormData({
        name: response.name,
        cloudflareApiToken: '',
        cloudflareEmail: response.cloudflareEmail || '',
        cloudflareAccountId: (response as any).cloudflareAccountId || ''
      })
    } catch (err) {
      setError('获取用户资料失败')
      console.error('Load profile error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // 清除消息
    if (error) setError('')
    if (success) setSuccess('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      setError('姓名不能为空')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      await authAPI.updateProfile({
        name: formData.name,
        cloudflareApiToken: formData.cloudflareApiToken || undefined,
        cloudflareEmail: formData.cloudflareEmail || undefined,
        cloudflareAccountId: formData.cloudflareAccountId || undefined
      })

      setSuccess('个人资料更新成功')
      await loadProfile() // 重新加载资料
    } catch (err: any) {
      setError(err.message || '更新失败')
      console.error('Update profile error:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">个人资料</h1>
        <p className="mt-1 text-sm text-gray-600">
          管理您的个人信息和 Cloudflare API 配置。
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          {success}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邮箱地址
              </label>
              <Input
                type="email"
                value={profile?.email || ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                邮箱地址不可修改
                {profile?.emailVerified ? (
                  <span className="text-green-600 ml-2">✓ 已验证</span>
                ) : (
                  <span className="text-orange-600 ml-2">⚠ 未验证</span>
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                姓名
              </label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="请输入您的姓名"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Cloudflare API 配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Cloudflare API 配置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                如何获取 Cloudflare API 令牌？
              </h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>登录 <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center">Cloudflare Dashboard <ExternalLink className="h-3 w-3 ml-1" /></a></li>
                <li>点击右上角头像 → "My Profile" → "API Tokens"</li>
                <li>点击 "Create Token" → 选择 "Custom token"</li>
                <li>设置权限：Zone:Zone:Read, Zone:DNS:Edit</li>
                <li>选择要管理的域名，然后创建令牌</li>
              </ol>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API 令牌状态
              </label>
              <div className="flex items-center space-x-2">
                {profile?.hasCloudflareToken ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ 已配置
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    ✗ 未配置
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cloudflare API 令牌
              </label>
              <div className="relative">
                <Input
                  type={showToken ? "text" : "password"}
                  name="cloudflareApiToken"
                  value={formData.cloudflareApiToken}
                  onChange={handleInputChange}
                  placeholder={profile?.hasCloudflareToken ? "输入新令牌以更新" : "请输入您的 Cloudflare API 令牌"}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                令牌将被安全加密存储，用于访问 Cloudflare API
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cloudflare 邮箱 (可选)
              </label>
              <Input
                type="email"
                name="cloudflareEmail"
                value={formData.cloudflareEmail}
                onChange={handleInputChange}
                placeholder="your@email.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                某些 API 操作可能需要邮箱地址
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cloudflare 账户 ID
              </label>
              <Input
                type="text"
                name="cloudflareAccountId"
                value={formData.cloudflareAccountId}
                onChange={handleInputChange}
                placeholder="3d2c0d85f533b167a332ff1ea2cf98ae"
              />
              <p className="text-xs text-gray-500 mt-1">
                在 Cloudflare Dashboard 右侧边栏可以找到账户 ID，用于 API Token 验证
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 保存按钮 */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="min-w-32"
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                保存中...
              </>
            ) : (
              '保存更改'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
