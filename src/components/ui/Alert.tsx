import React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  children: React.ReactNode
  onClose?: () => void
  closable?: boolean
}

const variantConfig = {
  success: {
    containerClass: 'bg-success-50 border-success-200 text-success-800',
    iconClass: 'text-success-600',
    icon: CheckCircle,
  },
  error: {
    containerClass: 'bg-error-50 border-error-200 text-error-800',
    iconClass: 'text-error-600',
    icon: AlertCircle,
  },
  warning: {
    containerClass: 'bg-warning-50 border-warning-200 text-warning-800',
    iconClass: 'text-warning-600',
    icon: AlertTriangle,
  },
  info: {
    containerClass: 'bg-primary-50 border-primary-200 text-primary-800',
    iconClass: 'text-primary-600',
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
                  variant === 'success' && 'text-success-500 hover:bg-success-100 focus:ring-success-600',
                  variant === 'error' && 'text-error-500 hover:bg-error-100 focus:ring-error-600',
                  variant === 'warning' && 'text-warning-500 hover:bg-warning-100 focus:ring-warning-600',
                  variant === 'info' && 'text-primary-500 hover:bg-primary-100 focus:ring-primary-600'
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
