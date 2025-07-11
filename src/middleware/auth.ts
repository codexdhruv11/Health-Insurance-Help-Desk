import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Public paths
    if (path === '/' || path.startsWith('/auth')) {
      return NextResponse.next()
    }

    // No token, redirect to sign in
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }

    // Role-based access
    if (path.startsWith('/customer') && token.role !== UserRole.CUSTOMER) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    if (path.startsWith('/agent') && token.role !== UserRole.AGENT) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    if (path.startsWith('/admin') && token.role !== UserRole.ADMIN) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    if (path.startsWith('/manager') && token.role !== UserRole.MANAGER) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

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