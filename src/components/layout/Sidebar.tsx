import React from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Cloud,
  LayoutDashboard,
  Globe,
  Network,
  Code,
  Settings,
  User
} from 'lucide-react'

const navigation = [
  {
    name: '仪表板',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: '域名管理',
    href: '/domains',
    icon: Globe,
  },
  {
    name: 'DNS 记录',
    href: '/dns',
    icon: Network,
  },
  {
    name: 'API 探索器',
    href: '/api-explorer',
    icon: Code,
  },
  {
    name: '设置',
    href: '/settings',
    icon: Settings,
  },
  {
    name: '个人资料',
    href: '/profile',
    icon: User,
  },
]

export function Sidebar() {
  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow pt-5 bg-white border-r border-gray-200 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-4">
          <div className="flex items-center space-x-2">
            <Cloud className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">CF2DNS</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex-grow flex flex-col">
          <nav className="flex-1 px-2 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        'mr-3 flex-shrink-0 h-5 w-5',
                        isActive
                          ? 'text-primary-600'
                          : 'text-gray-400 group-hover:text-gray-500'
                      )}
                    />
                    {item.name}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            <p>CF2DNS v1.0.0</p>
            <p className="mt-1">
              Powered by{' '}
              <a
                href="https://cloudflare.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-500"
              >
                Cloudflare
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
