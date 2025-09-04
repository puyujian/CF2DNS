import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useCreateDNSRecord, useUpdateDNSRecord } from '@/lib/hooks/useCloudflare'
import { DNSRecord, CreateDNSRecordData, DNSRecordType } from '@/types'
import { DNS_RECORD_TYPES } from '@/lib/constants'
import { X, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface DNSRecordModalProps {
  isOpen: boolean
  onClose: () => void
  zoneId: string
  zoneName: string
  record?: DNSRecord | null
  mode: 'create' | 'edit' | 'copy'
}

const PROXIABLE_TYPES = ['A', 'AAAA', 'CNAME']

export function DNSRecordModal({ 
  isOpen, 
  onClose, 
  zoneId, 
  zoneName,
  record, 
  mode 
}: DNSRecordModalProps) {
  const [formData, setFormData] = useState<CreateDNSRecordData>({
    type: 'A' as DNSRecordType,
    name: '',
    content: '',
    ttl: 1,
    proxied: false,
    comment: '',
    priority: undefined
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const createMutation = useCreateDNSRecord()
  const updateMutation = useUpdateDNSRecord()

  const isLoading = createMutation.isPending || updateMutation.isPending

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      if (record && (mode === 'edit' || mode === 'copy')) {
        setFormData({
          type: record.type,
          name: record.name,
          content: record.content,
          ttl: record.ttl || 1,
          proxied: record.proxied || false,
          comment: record.comment || '',
          priority: record.priority
        })
      } else {
        // 重置为默认值
        setFormData({
          type: 'A' as DNSRecordType,
          name: '',
          content: '',
          ttl: 1,
          proxied: false,
          comment: '',
          priority: undefined
        })
      }
      setErrors({})
    }
  }, [isOpen, record, mode])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.type) {
      newErrors.type = '请选择记录类型'
    }

    if (!formData.name.trim()) {
      newErrors.name = '请输入记录名称'
    }

    if (!formData.content.trim()) {
      newErrors.content = '请输入记录内容'
    }

    // 验证TTL
    if (formData.ttl && (formData.ttl < 1 || formData.ttl > 86400)) {
      newErrors.ttl = 'TTL值必须在1-86400之间'
    }

    // 验证MX记录的优先级
    if (formData.type === 'MX' && (!formData.priority || formData.priority < 0)) {
      newErrors.priority = 'MX记录必须设置优先级'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      const recordData = {
        type: formData.type,
        name: formData.name,
        content: formData.content,
        ttl: formData.ttl,
        proxied: PROXIABLE_TYPES.includes(formData.type) ? formData.proxied : false,
        comment: formData.comment || undefined,
        priority: formData.type === 'MX' ? formData.priority : undefined
      }

      if (mode === 'edit' && record?.id) {
        await updateMutation.mutateAsync({
          zoneId,
          recordId: record.id,
          record: recordData
        })
        toast.success('DNS记录更新成功')
      } else {
        await createMutation.mutateAsync({
          zoneId,
          record: recordData
        })
        toast.success('DNS记录创建成功')
      }

      onClose()
    } catch (error) {
      console.error('DNS record operation error:', error)
      toast.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  const handleInputChange = (field: keyof CreateDNSRecordData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const getModalTitle = () => {
    switch (mode) {
      case 'create':
        return '添加DNS记录'
      case 'edit':
        return '编辑DNS记录'
      case 'copy':
        return '复制DNS记录'
      default:
        return 'DNS记录'
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {getModalTitle()}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 记录类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              记录类型 *
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className={`input ${errors.type ? 'border-red-500' : ''}`}
              disabled={isLoading}
            >
              {DNS_RECORD_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {errors.type && (
              <p className="mt-1 text-sm text-red-600">{errors.type}</p>
            )}
          </div>

          {/* 记录名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              名称 *
            </label>
            <div className="flex">
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="www"
                className={`flex-1 ${errors.name ? 'border-red-500' : ''}`}
                disabled={isLoading}
              />
              <span className="ml-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-500">
                .{zoneName}
              </span>
            </div>
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* 记录内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              内容 *
            </label>
            <Input
              type="text"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder={formData.type === 'A' ? '192.168.1.1' : 
                          formData.type === 'CNAME' ? 'example.com' :
                          formData.type === 'TXT' ? '文本内容' : '记录内容'}
              className={errors.content ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600">{errors.content}</p>
            )}
          </div>

          {/* TTL和代理状态 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                TTL (秒)
              </label>
              <Input
                type="number"
                value={formData.ttl}
                onChange={(e) => handleInputChange('ttl', parseInt(e.target.value) || 1)}
                min="1"
                max="86400"
                className={errors.ttl ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.ttl && (
                <p className="mt-1 text-sm text-red-600">{errors.ttl}</p>
              )}
            </div>

            {PROXIABLE_TYPES.includes(formData.type) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  代理状态
                </label>
                <div className="flex items-center space-x-4 mt-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="proxied"
                      checked={!formData.proxied}
                      onChange={() => handleInputChange('proxied', false)}
                      className="mr-2"
                      disabled={isLoading}
                    />
                    <span className="text-sm text-gray-700">仅DNS</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="proxied"
                      checked={formData.proxied}
                      onChange={() => handleInputChange('proxied', true)}
                      className="mr-2"
                      disabled={isLoading}
                    />
                    <span className="text-sm text-gray-700">已代理</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* MX记录优先级 */}
          {formData.type === 'MX' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                优先级 *
              </label>
              <Input
                type="number"
                value={formData.priority || ''}
                onChange={(e) => handleInputChange('priority', parseInt(e.target.value) || undefined)}
                min="0"
                max="65535"
                placeholder="10"
                className={errors.priority ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.priority && (
                <p className="mt-1 text-sm text-red-600">{errors.priority}</p>
              )}
            </div>
          )}

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              备注
            </label>
            <Input
              type="text"
              value={formData.comment}
              onChange={(e) => handleInputChange('comment', e.target.value)}
              placeholder="可选的备注信息"
              disabled={isLoading}
            />
          </div>

          {/* 错误提示 */}
          {(createMutation.error || updateMutation.error) && (
            <Alert variant="error">
              <AlertCircle className="h-4 w-4" />
              <span>
                {createMutation.error?.message || updateMutation.error?.message || '操作失败'}
              </span>
            </Alert>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
            >
              {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
              {mode === 'edit' ? '更新记录' : '创建记录'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
