import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

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

export interface Tenant {
  id: string
  slug: string
  name: string
  domain?: string
  settings?: any
  subscription_status: string
  subscription_ends_at?: string
  created_at: string
  updated_at: string
}

interface AuthState {
  // State
  user: User | null
  tenant: Tenant | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  setUser: (user: User) => void
  setTenant: (tenant: Tenant) => void
  setTokens: (token: string, refreshToken: string) => void
  setLoading: (loading: boolean) => void
  login: (data: { user: User; tenant: Tenant; token: string; refresh_token: string }) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      tenant: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      
      // Actions
      setUser: (user) => set({ user, isAuthenticated: true }),
      
      setTenant: (tenant) => set({ tenant }),
      
      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      login: ({ user, tenant, token, refresh_token }) => {
        set({
          user,
          tenant,
          token,
          refreshToken: refresh_token,
          isAuthenticated: true,
          isLoading: false,
        })
      },
      
      logout: () => {
        set({
          user: null,
          tenant: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        })
      },
      
      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }))
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
)