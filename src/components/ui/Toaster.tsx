import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Alert } from './Alert'
import { X } from 'lucide-react'

interface Toast {
  id: string
  variant: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    }

    setToasts(prev => [...prev, newToast])

    // 自动移除 toast
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const success = useCallback((message: string, title?: string) => {
    addToast({ variant: 'success', message, title })
  }, [addToast])

  const error = useCallback((message: string, title?: string) => {
    addToast({ variant: 'error', message, title })
  }, [addToast])

  const warning = useCallback((message: string, title?: string) => {
    addToast({ variant: 'warning', message, title })
  }, [addToast])

  const info = useCallback((message: string, title?: string) => {
    addToast({ variant: 'info', message, title })
  }, [addToast])

  const value: ToastContextType = {
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return createPortal(
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
        />
      ))}
    </div>,
    document.body
  )
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  return (
    <div className="animate-slide-down">
      <Alert
        variant={toast.variant}
        title={toast.title}
        onClose={() => onRemove(toast.id)}
        closable
        className="shadow-lg"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {toast.message}
          </div>
          {toast.action && (
            <button
              type="button"
              className="ml-3 text-sm font-medium underline hover:no-underline"
              onClick={toast.action.onClick}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      </Alert>
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// 简化的 Toaster 组件，用于在 App 中使用
export function Toaster() {
  return <ToastProvider>{null}</ToastProvider>
}
