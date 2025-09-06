import apiClient from '../client'

export interface User {
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

export interface CreateUserRequest {
  email: string
  password: string
  name: string
  role: 'admin' | 'agent' | 'viewer'
}

export interface UpdateUserRequest {
  email?: string
  name?: string
  role?: 'admin' | 'agent' | 'viewer'
  is_active?: boolean
}

export interface ResetPasswordRequest {
  password: string
}

export interface UserStats {
  total_users: number
  active_users: number
  users_by_role: {
    owner: number
    admin: number
    agent: number
    viewer: number
  }
  recent_signups: number
}

class UserService {
  // List all users in the tenant
  async listUsers(): Promise<User[]> {
    const response = await apiClient.get<User[]>('/tenant/users')
    return response.data
  }

  // Get user statistics
  async getUserStats(): Promise<UserStats> {
    const response = await apiClient.get<UserStats>('/tenant/users/stats')
    return response.data
  }

  // Get a specific user
  async getUser(userId: string): Promise<User> {
    const response = await apiClient.get<User>(`/tenant/users/${userId}`)
    return response.data
  }

  // Create a new user
  async createUser(data: CreateUserRequest): Promise<User> {
    const response = await apiClient.post<User>('/tenant/users', data)
    return response.data
  }

  // Update a user
  async updateUser(userId: string, data: UpdateUserRequest): Promise<User> {
    const response = await apiClient.patch<User>(`/tenant/users/${userId}`, data)
    return response.data
  }

  // Delete a user
  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/tenant/users/${userId}`)
  }

  // Reset user password (admin action)
  async resetUserPassword(userId: string, password: string): Promise<void> {
    await apiClient.post(`/tenant/users/${userId}/reset-password`, { password })
  }

  // Activate user
  async activateUser(userId: string): Promise<User> {
    return this.updateUser(userId, { is_active: true })
  }

  // Deactivate user
  async deactivateUser(userId: string): Promise<User> {
    return this.updateUser(userId, { is_active: false })
  }

  // Change user role
  async changeUserRole(userId: string, role: 'admin' | 'agent' | 'viewer'): Promise<User> {
    return this.updateUser(userId, { role })
  }
}

export const userService = new UserService()