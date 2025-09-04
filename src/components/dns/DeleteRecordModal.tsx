import React from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useDeleteDNSRecord } from '@/lib/hooks/useCloudflare'
import { AlertTriangle, X } from 'lucide-react'
import { toast } from 'sonner'

interface DNSRecord {
  id: string
  type: string
  name: string
  content: string
}

interface DeleteRecordModalProps {
  isOpen: boolean
  onClose: () => void
  zoneId: string
  record: DNSRecord | null
}

export function DeleteRecordModal({ 
  isOpen, 
  onClose, 
  zoneId, 
  record 
}: DeleteRecordModalProps) {
  const deleteMutation = useDeleteDNSRecord()

  const handleDelete = async () => {
    if (!record) return

    try {
      await deleteMutation.mutateAsync({
        zoneId,
        recordId: record.id
      })
      
      toast.success('DNS记录删除成功')
      onClose()
    } catch (error) {
      console.error('Delete DNS record error:', error)
      toast.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  if (!record) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-900">
                删除DNS记录
              </h2>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={deleteMutation.isPending}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            您确定要删除以下DNS记录吗？此操作无法撤销。
          </p>

          {/* 记录信息 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">类型:</span>
                <span className="text-sm text-gray-900">{record.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">名称:</span>
                <span className="text-sm text-gray-900">{record.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">内容:</span>
                <span className="text-sm text-gray-900 break-all">{record.content}</span>
              </div>
            </div>
          </div>

          {/* 错误提示 */}
          {deleteMutation.error && (
            <Alert variant="error" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <span>
                {deleteMutation.error.message || '删除失败'}
              </span>
            </Alert>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={deleteMutation.isPending}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <LoadingSpinner size="sm" className="mr-2" />}
              确认删除
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
