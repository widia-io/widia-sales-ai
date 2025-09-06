'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { initializeAuth, checkAuth } = useAuthStore()

  useEffect(() => {
    // Initialize auth on mount
    initializeAuth()
    checkAuth()
  }, [initializeAuth, checkAuth])

  return <>{children}</>
}