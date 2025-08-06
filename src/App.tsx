import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/Toaster'
import { AuthProvider } from '@/lib/auth/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Layout } from '@/components/layout/Layout'

// 页面组件
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { DomainsPage } from '@/pages/domains/DomainsPage'
import { DomainDetailPage } from '@/pages/domains/DomainDetailPage'
import { DNSRecordsPage } from '@/pages/dns/DNSRecordsPage'
import { APIExplorerPage } from '@/pages/api/APIExplorerPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* 公开路由 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* 受保护的路由 */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/domains" element={<DomainsPage />} />
                    <Route path="/domains/:domainId" element={<DomainDetailPage />} />
                    <Route path="/domains/:domainId/dns" element={<DNSRecordsPage />} />
                    <Route path="/api-explorer" element={<APIExplorerPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
        
        {/* 全局通知组件 */}
        <Toaster />
      </div>
    </AuthProvider>
  )
}

export default App
