import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, AuthTokens, LoginCredentials, RegisterData } from '@/types'
import { authAPI } from './authAPI'
import { STORAGE_KEYS } from '@/lib/constants'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  // 初始化时检查本地存储的令牌
  useEffect(() => {
    const initAuth = async () => {
      try {
        const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
        const refreshTokenValue = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)

        if (accessToken && refreshTokenValue) {
          // 尝试使用访问令牌获取用户信息
          try {
            const userProfile = await authAPI.getProfile(accessToken)
            setUser(userProfile)
          } catch (error) {
            // 访问令牌可能过期，尝试刷新
            try {
              await refreshToken()
            } catch (refreshError) {
              // 刷新失败，清除本地存储
              clearAuthData()
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        clearAuthData()
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true)
      const response = await authAPI.login(credentials)
      
      if (response.success && response.data) {
        const { user: userData, tokens } = response.data as any
        
        // 保存令牌到本地存储
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken)
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken)
        
        // 设置用户状态
        setUser(userData)
      } else {
        throw new Error(response.error || '登录失败')
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true)
      const response = await authAPI.register(data)
      
      if (response.success && response.data) {
        const { user: userData, tokens } = response.data as any
        
        // 保存令牌到本地存储
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken)
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken)
        
        // 设置用户状态
        setUser(userData)
      } else {
        throw new Error(response.error || '注册失败')
      }
    } catch (error) {
      console.error('Register error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      const refreshTokenValue = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
      
      if (refreshTokenValue) {
        // 通知服务器登出
        await authAPI.logout(refreshTokenValue)
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // 无论服务器响应如何，都清除本地状态
      clearAuthData()
      setUser(null)
    }
  }

  const refreshToken = async () => {
    try {
      const refreshTokenValue = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
      
      if (!refreshTokenValue) {
        throw new Error('No refresh token available')
      }

      const response = await authAPI.refreshToken(refreshTokenValue)
      
      if (response.success && response.data) {
        const { user: userData, tokens } = response.data as any
        
        // 更新本地存储的访问令牌
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken)
        
        // 如果返回了新的刷新令牌，也要更新
        if (tokens.refreshToken !== refreshTokenValue) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken)
        }
        
        // 更新用户状态
        setUser(userData)
      } else {
        throw new Error(response.error || '令牌刷新失败')
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      clearAuthData()
      setUser(null)
      throw error
    }
  }

  const clearAuthData = () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
  }

  // 设置自动刷新令牌
  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(async () => {
      try {
        await refreshToken()
      } catch (error) {
        console.error('Auto refresh token failed:', error)
        // 自动刷新失败时不做任何操作，让用户在下次请求时处理
      }
    }, 50 * 60 * 1000) // 50分钟刷新一次

    return () => clearInterval(interval)
  }, [isAuthenticated])

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
