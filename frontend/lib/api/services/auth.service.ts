import apiClient from '../client'
import { User, Tenant } from '@/lib/stores/auth-store'

export interface LoginRequest {
  email: string
  password: string
  tenant_slug: string
}

export interface LoginResponse {
  user: User
  tenant: Tenant
  token: string
  refresh_token: string
}

export interface RegisterRequest {
  tenant_name: string
  tenant_slug: string
  email: string
  password: string
  name: string
}

export interface RegisterResponse extends LoginResponse {}

export interface RefreshTokenRequest {
  refresh_token: string
}

export interface RefreshTokenResponse {
  token: string
  refresh_token: string
}

class AuthService {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', data)
    return response.data
  }
  
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/auth/register', data)
    return response.data
  }
  
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    })
    return response.data
  }
  
  async logout(refreshToken: string): Promise<void> {
    try {
      await apiClient.post('/auth/logout', {
        refresh_token: refreshToken,
      })
    } catch (error) {
      // Ignore logout errors
      console.error('Logout error:', error)
    }
  }
  
  async forgotPassword(email: string, tenantSlug: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', {
      email,
      tenant_slug: tenantSlug,
    })
  }
  
  async resetPassword(token: string, password: string): Promise<void> {
    await apiClient.post('/auth/reset-password', {
      token,
      password,
    })
  }
  
  async validateToken(): Promise<boolean> {
    try {
      await apiClient.get('/auth/validate')
      return true
    } catch {
      return false
    }
  }
}

export const authService = new AuthService()