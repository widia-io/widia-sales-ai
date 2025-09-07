'use client'

import { useAuthStore } from '@/lib/stores/auth-store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

type UserRole = 'owner' | 'admin' | 'agent' | 'viewer'

interface PermissionGuardProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  requireOwner?: boolean
  requireAdmin?: boolean
  fallback?: React.ReactNode
  redirectTo?: string
}

export function PermissionGuard({
  children,
  allowedRoles = [],
  requireOwner = false,
  requireAdmin = false,
  fallback,
  redirectTo = '/dashboard',
}: PermissionGuardProps) {
  const router = useRouter()
  const { user } = useAuthStore()

  const hasPermission = () => {
    if (!user) return false

    // Check specific role requirements
    if (requireOwner && user.role !== 'owner') {
      return false
    }

    if (requireAdmin && user.role !== 'admin' && user.role !== 'owner') {
      return false
    }

    // Check allowed roles list
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role as UserRole)) {
      return false
    }

    return true
  }

  useEffect(() => {
    if (user && !hasPermission() && redirectTo) {
      router.push(redirectTo)
    }
  }, [user, redirectTo])

  if (!user || !hasPermission()) {
    if (fallback) {
      return <>{fallback}</>
    }
    return null
  }

  return <>{children}</>
}

// Hook for checking permissions programmatically
export function usePermission() {
  const { user } = useAuthStore()

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role
  }

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return roles.includes(user?.role as UserRole)
  }

  const isOwner = (): boolean => {
    return user?.role === 'owner'
  }

  const isAdmin = (): boolean => {
    return user?.role === 'admin' || user?.role === 'owner'
  }

  const isAgent = (): boolean => {
    return user?.role === 'agent'
  }

  const isViewer = (): boolean => {
    return user?.role === 'viewer'
  }

  const canManageUsers = (): boolean => {
    return isAdmin()
  }

  const canManageTenant = (): boolean => {
    return isOwner()
  }

  const canManageConversations = (): boolean => {
    return isAdmin() || isAgent()
  }

  const canViewReports = (): boolean => {
    return !isViewer() // Everyone except viewers
  }

  return {
    user,
    hasRole,
    hasAnyRole,
    isOwner,
    isAdmin,
    isAgent,
    isViewer,
    canManageUsers,
    canManageTenant,
    canManageConversations,
    canViewReports,
  }
}