import { NextResponse } from 'next/server';

// Simple in-memory store for rate limiting
const store = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  prefix: string;
}

interface RateLimitInfo {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function rateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitInfo> {
  const now = Date.now();
  const fullKey = `${config.prefix}${key}`;
  
  // Clean up expired entries
  for (const [storedKey, value] of store.entries()) {
    if (value.resetTime <= now) {
      store.delete(storedKey);
    }
  }

  // Get or create rate limit info
  let info = store.get(fullKey);
  if (!info || info.resetTime <= now) {
    info = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    store.set(fullKey, info);
  }

  // Increment count
  info.count++;

  return {
    success: info.count <= config.maxRequests,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - info.count),
    reset: info.resetTime,
  };
}

/**
 * Generate rate limit response
 */
export function getRateLimitResponse(info: RateLimitInfo): NextResponse {
  return new NextResponse(
    'Too many requests. Please try again later.',
    {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((info.reset - Date.now()) / 1000).toString(),
        'X-RateLimit-Limit': info.limit.toString(),
        'X-RateLimit-Remaining': info.remaining.toString(),
        'X-RateLimit-Reset': info.reset.toString(),
      },
    }
  );
} 