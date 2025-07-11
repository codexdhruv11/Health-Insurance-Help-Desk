import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Clone the response
  const response = NextResponse.next()

  // Add security headers
  response.headers.set('x-frame-options', 'DENY')
  response.headers.set('x-content-type-options', 'nosniff')
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  
  // Increase header size limit for Next.js
  response.headers.set('max-http-header-size', '32768') // 32KB

  // Clean up cookies if they're getting too large
  const cookies = request.cookies
  if (cookies.toString().length > 4096) { // If cookies are larger than 4KB
    // Keep only essential cookies
    const essentialCookies = ['next-auth.session-token', '__Secure-next-auth.session-token']
    cookies.getAll().forEach(cookie => {
      if (!essentialCookies.includes(cookie.name)) {
        response.cookies.delete(cookie.name)
      }
    })
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/auth/* (authentication routes)
     * 2. /api/webhooks/* (webhook routes)
     * 3. /_next/* (Next.js internals)
     * 4. /static/* (static files)
     * 5. /*.* (files with extensions)
     */
    '/((?!api/auth|api/webhooks|_next|static|[\\w-]+\\.\\w+).*)',
  ],
} 