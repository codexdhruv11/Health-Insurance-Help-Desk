import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit, getRateLimitResponse } from '@/lib/rate-limit';

// Define allowed origins for CORS
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://your-production-domain.com',
];

// Define CSP directives
const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Next.js
    "'unsafe-eval'", // Required for Next.js
    'https://js.stripe.com', // Stripe
    'https://maps.googleapis.com', // Google Maps
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for styled-components
  ],
  'img-src': [
    "'self'",
    'data:',
    'https:',
    'blob:',
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
  ],
  'connect-src': [
    "'self'",
    'https://api.stripe.com',
    'https://maps.googleapis.com',
  ],
  'frame-src': [
    "'self'",
    'https://js.stripe.com',
    'https://maps.googleapis.com',
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'media-src': ["'self'"],
  'manifest-src': ["'self'"],
  'worker-src': [
    "'self'",
    'blob:',
  ],
};

// Build CSP string
const cspString = Object.entries(CSP_DIRECTIVES)
  .map(([key, values]) => `${key} ${values.join(' ')}`)
  .join('; ');

// Define security headers
const securityHeaders = {
  // CORS
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400', // 24 hours

  // Security Headers
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'X-DNS-Prefetch-Control': 'on',
  'X-Download-Options': 'noopen',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()',
    'payment=(self)',
    'usb=()',
    'fullscreen=(self)',
    'display-capture=()',
  ].join(', '),
  'Content-Security-Policy': cspString,
};

// Cookie security options
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 24 * 60 * 60, // 24 hours
};

export async function middleware(request: NextRequest) {
  try {
    // Apply rate limiting
    const ip = request.ip ?? '127.0.0.1';
    const rateLimitInfo = await rateLimit(ip);

    if (!rateLimitInfo.success) {
      return getRateLimitResponse(rateLimitInfo);
    }

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          ...securityHeaders,
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Get origin
    const origin = request.headers.get('origin');
    const isAllowedOrigin = origin && ALLOWED_ORIGINS.includes(origin);

    // Clone the response
    const response = NextResponse.next();

    // Add security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      if (key === 'Access-Control-Allow-Origin' && isAllowedOrigin) {
        response.headers.set(key, origin!);
      } else {
        response.headers.set(key, value);
      }
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitInfo.reset.toString());

    // Clean up cookies if they're getting too large
    const cookies = request.cookies;
    if (cookies.toString().length > 4096) { // If cookies are larger than 4KB
      // Keep only essential cookies
      const essentialCookies = [
        'next-auth.session-token',
        '__Secure-next-auth.session-token',
        '__Host-next-auth.csrf-token',
      ];
      cookies.getAll().forEach(cookie => {
        if (!essentialCookies.includes(cookie.name)) {
          response.cookies.delete(cookie.name);
        } else {
          // Ensure essential cookies have secure settings
          response.cookies.set(cookie.name, cookie.value, COOKIE_OPTIONS);
        }
      });
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
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
     * 6. /_vercel/* (Vercel internals)
     * 7. /favicon.ico, /robots.txt, /sitemap.xml (static files)
     */
    '/((?!api/auth|api/webhooks|_next|_vercel|static|favicon.ico|robots.txt|sitemap.xml|[\\w-]+\\.\\w+).*)',
  ],
};