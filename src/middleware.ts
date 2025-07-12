import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { rateLimit } from '@/lib/rate-limit'

// Security headers
const securityHeaders = {
  'Content-Security-Policy':
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self' https://api.stripe.com; " +
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com; " +
    "object-src 'none';",
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

// API routes that need rate limiting
const RATE_LIMITED_PATHS = [
  '/api/quote',
  '/api/compare',
  '/api/customer/tickets',
  '/api/auth/register',
]

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  prefix: 'api:',
}

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/dashboard',
  '/plans',
  '/quote',
  '/hospitals',
  '/compare',
  '/auth',
]

// Routes that require specific roles
const ROLE_ROUTES = {
  '/customer': ['CUSTOMER'],
  '/agent': ['AGENT'],
  '/admin': ['ADMIN'],
  '/manager': ['MANAGER'],
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // 1. Add security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // 2. Rate limiting for API routes
  if (RATE_LIMITED_PATHS.some(path => request.nextUrl.pathname.startsWith(path))) {
    const token = await getToken({ req: request })
    const identifier = token?.id || request.ip || 'anonymous'
    const { success } = await rateLimit(identifier, RATE_LIMIT_CONFIG)

    if (!success) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(response.headers),
          },
        }
      )
    }
  }

  // 3. Authentication and authorization
  const path = request.nextUrl.pathname
  const token = await getToken({ req: request })

  // Allow access to public routes without authentication
  if (PUBLIC_ROUTES.some(route => path.startsWith(route))) {
    return response
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

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}