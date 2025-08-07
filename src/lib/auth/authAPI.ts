import { LoginCredentials, RegisterData, User, UpdateProfileData } from '@/types'
import { API_ENDPOINTS, STORAGE_KEYS } from '@/lib/constants'

interface APIResponse<T = any> {
  success: boolean
  message?: string
  error?: string
  data?: T
}

interface AuthResponse {
  user: User
  tokens: {
    accessToken: string
    refreshToken: string
    expiresAt: number
  }
}

class AuthAPI {
  private baseURL: string

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // 添加认证头
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    if (accessToken) {
      defaultHeaders['Authorization'] = `Bearer ${accessToken}`
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json() as APIResponse<T>

      if (!response.ok) {
        throw new Error((data as any).error || `HTTP ${response.status}`)
      }

      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  /**
   * 用户登录
   */
  async login(credentials: LoginCredentials): Promise<APIResponse<AuthResponse>> {
    return this.request<AuthResponse>(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  }

  /**
   * 用户注册
   */
  async register(data: RegisterData): Promise<APIResponse<AuthResponse>> {
    return this.request<AuthResponse>(API_ENDPOINTS.REGISTER, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * 用户登出
   */
  async logout(refreshToken: string): Promise<APIResponse> {
    return this.request(API_ENDPOINTS.LOGOUT, {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(refreshToken: string): Promise<APIResponse<AuthResponse>> {
    return this.request<AuthResponse>(API_ENDPOINTS.REFRESH, {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  }

  /**
   * 获取用户资料
   */
  async getProfile(accessToken?: string): Promise<User> {
    const headers: Record<string, string> = {}
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const response = await this.request<User>(API_ENDPOINTS.USER_PROFILE, {
      method: 'GET',
      headers,
    })

    if (!response.success || !response.data) {
      throw new Error(response.error || '获取用户资料失败')
    }

    return response.data
  }

  /**
   * 更新用户资料
   */
  async updateProfile(data: UpdateProfileData): Promise<User> {
    const response = await this.request<User>(API_ENDPOINTS.USER_PROFILE, {
      method: 'PUT',
      body: JSON.stringify(data),
    })

    if (!response.success || !response.data) {
      throw new Error(response.error || '更新用户资料失败')
    }

    return response.data
  }

  /**
   * 发送邮箱验证
   */
  async sendEmailVerification(): Promise<APIResponse> {
    return this.request(API_ENDPOINTS.VERIFY_EMAIL, {
      method: 'POST',
    })
  }

  /**
   * 验证邮箱
   */
  async verifyEmail(token: string): Promise<APIResponse> {
    return this.request(API_ENDPOINTS.VERIFY_EMAIL, {
      method: 'PUT',
      body: JSON.stringify({ token }),
    })
  }

  /**
   * 发送密码重置邮件
   */
  async forgotPassword(email: string): Promise<APIResponse> {
    return this.request(API_ENDPOINTS.FORGOT_PASSWORD, {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  /**
   * 重置密码
   */
  async resetPassword(token: string, password: string, confirmPassword: string): Promise<APIResponse> {
    return this.request(API_ENDPOINTS.RESET_PASSWORD, {
      method: 'POST',
      body: JSON.stringify({ token, password, confirmPassword }),
    })
  }

  /**
   * 修改密码
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<APIResponse> {
    return this.request('/api/user/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  }

  /**
   * 获取用户设置
   */
  async getSettings(): Promise<APIResponse<Record<string, any>>> {
    return this.request(API_ENDPOINTS.USER_SETTINGS, {
      method: 'GET',
    })
  }

  /**
   * 更新用户设置
   */
  async updateSettings(settings: Record<string, any>): Promise<APIResponse> {
    return this.request(API_ENDPOINTS.USER_SETTINGS, {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  }

  /**
   * 获取 API 令牌列表
   */
  async getAPITokens(): Promise<APIResponse<any[]>> {
    return this.request(API_ENDPOINTS.USER_API_TOKENS, {
      method: 'GET',
    })
  }

  /**
   * 创建 API 令牌
   */
  async createAPIToken(name: string, permissions: string[]): Promise<APIResponse<any>> {
    return this.request(API_ENDPOINTS.USER_API_TOKENS, {
      method: 'POST',
      body: JSON.stringify({ name, permissions }),
    })
  }

  /**
   * 删除 API 令牌
   */
  async deleteAPIToken(tokenId: string): Promise<APIResponse> {
    return this.request(`${API_ENDPOINTS.USER_API_TOKENS}/${tokenId}`, {
      method: 'DELETE',
    })
  }

  /**
   * 检查令牌是否有效
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await this.request('/api/auth/validate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      return response.success
    } catch {
      return false
    }
  }
}

export const authAPI = new AuthAPI()
