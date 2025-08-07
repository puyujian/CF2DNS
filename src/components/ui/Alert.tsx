import React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'error' | 'warning' | 'info' | 'destructive'
  title?: string
  children: React.ReactNode
  onClose?: () => void
  closable?: boolean
}

const variantConfig = {
  success: {
    containerClass: 'bg-green-50 border-green-200 text-green-800',
    iconClass: 'text-green-600',
    icon: CheckCircle,
  },
  error: {
    containerClass: 'bg-red-50 border-red-200 text-red-800',
    iconClass: 'text-red-600',
    icon: AlertCircle,
  },
  destructive: {
    containerClass: 'bg-red-50 border-red-200 text-red-800',
    iconClass: 'text-red-600',
    icon: AlertCircle,
  },
  warning: {
    containerClass: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    iconClass: 'text-yellow-600',
    icon: AlertTriangle,
  },
  info: {
    containerClass: 'bg-blue-50 border-blue-200 text-blue-800',
    iconClass: 'text-blue-600',
    icon: Info,
  },
}

export function Alert({
  variant = 'info',
  title,
  children,
  onClose,
  closable = false,
  className,
  ...props
}: AlertProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'relative rounded-lg border p-4',
        config.containerClass,
        className
      )}
      {...props}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={cn('h-5 w-5', config.iconClass)} />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1">
              {title}
            </h3>
          )}
          <div className="text-sm">
            {children}
          </div>
        </div>
        {(closable || onClose) && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                className={cn(
                  'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                  variant === 'success' && 'text-green-500 hover:bg-green-100 focus:ring-green-600',
                  (variant === 'error' || variant === 'destructive') && 'text-red-500 hover:bg-red-100 focus:ring-red-600',
                  variant === 'warning' && 'text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600',
                  variant === 'info' && 'text-blue-500 hover:bg-blue-100 focus:ring-blue-600'
                )}
                onClick={onClose}
              >
                <span className="sr-only">关闭</span>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
