import apiClient from '../client'

export interface Profile {
  id: string
  tenant_id: string
  email: string
  name: string
  role: 'owner' | 'admin' | 'agent' | 'viewer'
  is_active: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
}

export interface UpdateProfileRequest {
  name?: string
  email?: string
}

export interface ChangePasswordRequest {
  old_password: string
  new_password: string
}

export interface ForgotPasswordRequest {
  email: string
  tenant_slug: string
}

export interface ResetPasswordRequest {
  token: string
  new_password: string
}

export interface ValidateResetTokenResponse {
  valid: boolean
  message?: string
  error?: string
}

class ProfileService {
  // Get current user profile
  async getProfile(): Promise<Profile> {
    const response = await apiClient.get<Profile>('/profile')
    return response.data
  }

  // Update current user profile
  async updateProfile(data: UpdateProfileRequest): Promise<Profile> {
    const response = await apiClient.patch<Profile>('/profile', data)
    return response.data
  }

  // Change current user password
  async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/profile/change-password', data)
    return response.data
  }

  // Request password reset (forgot password)
  async forgotPassword(data: ForgotPasswordRequest): Promise<{ message: string; reset_token?: string; reset_url?: string }> {
    const response = await apiClient.post<{ message: string; reset_token?: string; reset_url?: string }>('/auth/forgot-password', data)
    return response.data
  }

  // Validate reset token
  async validateResetToken(token: string): Promise<ValidateResetTokenResponse> {
    const response = await apiClient.get<ValidateResetTokenResponse>(`/auth/reset-password/validate?token=${token}`)
    return response.data
  }

  // Reset password with token
  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/reset-password', data)
    return response.data
  }

  // Update profile name
  async updateName(name: string): Promise<Profile> {
    return this.updateProfile({ name })
  }

  // Update profile email
  async updateEmail(email: string): Promise<Profile> {
    return this.updateProfile({ email })
  }
}

export const profileService = new ProfileService()