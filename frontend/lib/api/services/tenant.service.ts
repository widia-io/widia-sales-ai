import apiClient from '../client'

export interface Tenant {
  id: string
  slug: string
  name: string
  domain?: string
  settings?: Record<string, any>
  subscription_status: string
  subscription_ends_at?: string
  created_at: string
  updated_at: string
}

export interface UpdateTenantRequest {
  name?: string
  domain?: string
  settings?: Record<string, any>
}

export interface TenantStats {
  user_count: number
  active_users: number
  storage_used: number
  api_calls_month: number
  messages_sent: number
  days_remaining: number
  subscription_status: string
  subscription_ends_at: string
  created_at: string
}

class TenantService {
  // Get current tenant information
  async getCurrentTenant(): Promise<Tenant> {
    const response = await apiClient.get<Tenant>('/tenant')
    return response.data
  }

  // Update tenant information
  async updateTenant(data: UpdateTenantRequest): Promise<Tenant> {
    const response = await apiClient.patch<Tenant>('/tenant', data)
    return response.data
  }

  // Get tenant statistics
  async getTenantStats(): Promise<TenantStats> {
    const response = await apiClient.get<TenantStats>('/tenant/stats')
    return response.data
  }

  // Update tenant name
  async updateTenantName(name: string): Promise<Tenant> {
    return this.updateTenant({ name })
  }

  // Update tenant domain
  async updateTenantDomain(domain: string): Promise<Tenant> {
    return this.updateTenant({ domain })
  }

  // Update tenant settings
  async updateTenantSettings(settings: Record<string, any>): Promise<Tenant> {
    const currentTenant = await this.getCurrentTenant()
    const mergedSettings = { ...currentTenant.settings, ...settings }
    return this.updateTenant({ settings: mergedSettings })
  }

  // Check if user has admin privileges
  async canManageTenant(): Promise<boolean> {
    try {
      await this.getTenantStats()
      return true
    } catch {
      return false
    }
  }
}

export const tenantService = new TenantService()