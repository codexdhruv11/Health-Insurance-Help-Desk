import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/dashboard',
  '/plans',
  '/quote',
  '/hospitals',
  '/compare'
]

// Routes that require specific roles
const ROLE_ROUTES = {
  '/customer': ['CUSTOMER'],
  '/agent': ['AGENT'],
  '/admin': ['ADMIN'],
  '/manager': ['MANAGER']
}

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const path = request.nextUrl.pathname

  // Allow access to public routes without authentication
  if (PUBLIC_ROUTES.some(route => path.startsWith(route))) {
    return NextResponse.next()
  }

  // Check if user is authenticated
  if (!token) {
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', request.url)
    return NextResponse.redirect(signInUrl)
  }

  // Check role-based access for protected routes
  for (const [route, roles] of Object.entries(ROLE_ROUTES)) {
    if (path.startsWith(route)) {
      const userRole = token.role as string
      if (!roles.includes(userRole)) {
        // Redirect to appropriate dashboard based on role
        return NextResponse.redirect(new URL(`/${userRole.toLowerCase()}/dashboard`, request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
} 