import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

export function Modal({
  isOpen,
  onClose,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true
}: ModalProps) {
  // 处理ESC键关闭
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // 防止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  }

  // 移除handleOverlayClick函数，改为直接在背景遮罩上处理点击事件

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />

      {/* 模态框容器 */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        {/* 模态框内容 */}
        <div
          className={`relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full ${sizeClasses[size]}`}
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
