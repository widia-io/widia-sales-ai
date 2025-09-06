'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function AuthGuard({ 
  children, 
  requireAuth = true,
  redirectTo = '/auth/login'
}: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()

  useEffect(() => {
    const verifyAuth = async () => {
      // Check if we have a valid session
      await checkAuth()
    }

    verifyAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !isAuthenticated) {
        // Save the current path to redirect back after login
        const redirectPath = encodeURIComponent(pathname)
        router.push(`${redirectTo}?redirect=${redirectPath}`)
      } else if (!requireAuth && isAuthenticated) {
        // If user is authenticated but on a public-only page (like login)
        router.push('/dashboard')
      }
    }
  }, [isAuthenticated, isLoading, requireAuth, router, pathname, redirectTo])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Don't render children if authentication doesn't match requirements
  if (requireAuth && !isAuthenticated) {
    return null
  }

  if (!requireAuth && isAuthenticated) {
    return null
  }

  return <>{children}</>
}