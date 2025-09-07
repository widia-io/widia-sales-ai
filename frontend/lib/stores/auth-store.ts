import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import Cookies from 'js-cookie'

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
  checkAuth: () => Promise<void>
  initializeAuth: () => void
}

// Custom storage that syncs with both localStorage and cookies
const customStorage = {
  getItem: (name: string) => {
    const str = localStorage.getItem(name)
    if (str) {
      // Also set cookie for middleware to read
      Cookies.set(name, str, { expires: 7, sameSite: 'lax' })
    }
    return str
  },
  setItem: (name: string, value: string) => {
    localStorage.setItem(name, value)
    // Also set cookie for middleware to read
    Cookies.set(name, value, { expires: 7, sameSite: 'lax' })
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name)
    Cookies.remove(name)
  },
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
        // Clear the cookie as well
        Cookies.remove('auth-storage')
      },
      
      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }))
      },
      
      checkAuth: async () => {
        const state = useAuthStore.getState()
        if (state.token) {
          // Token exists, user is authenticated
          set({ isAuthenticated: true, isLoading: false })
        } else {
          // No token, user is not authenticated
          set({ isAuthenticated: false, isLoading: false })
        }
      },
      
      initializeAuth: () => {
        // This will be called on app mount to set up the interceptor
        const state = useAuthStore.getState()
        if (state.token) {
          // Token exists in storage after refresh
          set({ isAuthenticated: true })
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => customStorage as any),
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)