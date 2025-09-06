import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require authentication
const publicRoutes = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
]

// Routes that should redirect to dashboard if already authenticated
const authRoutes = [
  '/auth/login',
  '/auth/register',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if it's a public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  // Check if it's an auth route (login/register)
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  
  // Get auth token from cookies
  const authStorage = request.cookies.get('auth-storage')
  let isAuthenticated = false
  
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage.value)
      isAuthenticated = !!parsed?.state?.token && !!parsed?.state?.isAuthenticated
    } catch {
      // Invalid JSON in cookie
      isAuthenticated = false
    }
  }
  
  // Redirect to login if accessing protected route without auth
  if (!isPublicRoute && !isAuthenticated) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // Redirect to dashboard if accessing auth routes while authenticated
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  // Redirect root to dashboard or login
  if (pathname === '/') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}