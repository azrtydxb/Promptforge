import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { checkRateLimit } from './redis';

// Environment variables for rate limit configuration
const RATE_LIMIT_AUTH_ATTEMPTS = parseInt(process.env.RATE_LIMIT_AUTH_ATTEMPTS || '5');
const RATE_LIMIT_AUTH_WINDOW = parseInt(process.env.RATE_LIMIT_AUTH_WINDOW || '900'); // 15 minutes
const RATE_LIMIT_API_REQUESTS = parseInt(process.env.RATE_LIMIT_API_REQUESTS || '100');
const RATE_LIMIT_API_WINDOW = parseInt(process.env.RATE_LIMIT_API_WINDOW || '60'); // 1 minute
const RATE_LIMIT_PUBLIC_REQUESTS = parseInt(process.env.RATE_LIMIT_PUBLIC_REQUESTS || '30');
const RATE_LIMIT_PUBLIC_WINDOW = parseInt(process.env.RATE_LIMIT_PUBLIC_WINDOW || '60'); // 1 minute

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
  keyPrefix: string;
}

// Rate limit configurations for different endpoints
export const rateLimitConfigs = {
  auth: {
    limit: RATE_LIMIT_AUTH_ATTEMPTS,
    windowSeconds: RATE_LIMIT_AUTH_WINDOW,
    keyPrefix: 'auth',
  },
  api: {
    limit: RATE_LIMIT_API_REQUESTS,
    windowSeconds: RATE_LIMIT_API_WINDOW,
    keyPrefix: 'api',
  },
  public: {
    limit: RATE_LIMIT_PUBLIC_REQUESTS,
    windowSeconds: RATE_LIMIT_PUBLIC_WINDOW,
    keyPrefix: 'public',
  },
} as const;

// Get identifier for rate limiting (IP or user ID)
export async function getRateLimitIdentifier(request: NextRequest): Promise<string> {
  // Try to get user ID from JWT token first
  try {
    const token = await getToken({ req: request as unknown as Parameters<typeof getToken>[0]['req'] });
    if (token?.sub) {
      return `user:${token.sub}`;
    }
  } catch {
    // Ignore token errors and fall back to IP
  }

  // Fall back to IP address
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';
  
  return `ip:${ip}`;
}

// Determine rate limit config based on path
export function getRateLimitConfig(pathname: string): RateLimitConfig | null {
  // Auth endpoints - strictest limits
  if (pathname.startsWith('/api/auth/register') || 
      pathname.startsWith('/api/auth/signin') ||
      pathname.startsWith('/api/auth/callback')) {
    return rateLimitConfigs.auth;
  }
  
  // API endpoints - authenticated API calls
  if (pathname.startsWith('/api/')) {
    return rateLimitConfigs.api;
  }
  
  // Public pages that don't require auth but still need rate limiting
  if (pathname === '/' || 
      pathname.startsWith('/sign-in') || 
      pathname.startsWith('/sign-up')) {
    return rateLimitConfigs.public;
  }
  
  // No rate limiting for other paths (they're handled by auth middleware)
  return null;
}

// Rate limit response headers
export function setRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  resetTime: number
): void {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', resetTime.toString());
}

// Main rate limiting middleware function
export async function rateLimitMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;
  
  // Get rate limit config for this path
  const config = getRateLimitConfig(pathname);
  if (!config) {
    // No rate limiting for this path
    return null;
  }
  
  try {
    // Get identifier for rate limiting
    const identifier = await getRateLimitIdentifier(request);
    const rateLimitKey = `${config.keyPrefix}:${identifier}`;
    
    // Check rate limit
    const rateLimitResult = await checkRateLimit(
      rateLimitKey,
      config.limit,
      config.windowSeconds
    );
    
    // If rate limit exceeded
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again later.`,
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        },
        { status: 429 }
      );
      
      setRateLimitHeaders(response, config.limit, 0, rateLimitResult.resetTime);
      response.headers.set('Retry-After', Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString());
      
      return response;
    }
    
    // Rate limit not exceeded - add headers to the eventual response
    // We'll need to handle this in the main middleware
    return null;
  } catch (error) {
    console.error('Rate limit middleware error:', error);
    // Fail open - don't block requests if rate limiting fails
    return null;
  }
}

// Helper function to apply rate limit headers to a response
export async function applyRateLimitHeaders(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const config = getRateLimitConfig(pathname);
  
  if (!config) {
    return response;
  }
  
  try {
    const identifier = await getRateLimitIdentifier(request);
    const rateLimitKey = `${config.keyPrefix}:${identifier}`;
    
    // Get current rate limit status (without incrementing)
    const { resetTime } = await checkRateLimit(
      rateLimitKey,
      config.limit,
      config.windowSeconds
    );
    
    // Apply headers
    // Note: We subtract 1 from the limit since the current request counts
    setRateLimitHeaders(response, config.limit, Math.max(0, config.limit - 1), resetTime);
  } catch (error) {
    console.error('Error applying rate limit headers:', error);
  }
  
  return response;
}

// Export rate limiter factory for use in API routes
export function createRateLimiter(config: RateLimitConfig) {
  return async function rateLimit(identifier: string): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }> {
    const rateLimitKey = `${config.keyPrefix}:${identifier}`;
    const { allowed, remaining, resetTime } = await checkRateLimit(
      rateLimitKey,
      config.limit,
      config.windowSeconds
    );
    
    return {
      success: allowed,
      limit: config.limit,
      remaining,
      reset: resetTime,
    };
  };
}

// Helper function for API routes to check rate limits
export async function checkApiRateLimit(
  request: NextRequest,
  configType: keyof typeof rateLimitConfigs = 'api'
): Promise<NextResponse | null> {
  const config = rateLimitConfigs[configType];
  const identifier = await getRateLimitIdentifier(request);
  const rateLimiter = createRateLimiter(config);
  
  const { success, limit, reset } = await rateLimiter(identifier);
  
  if (!success) {
    const response = NextResponse.json(
      {
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again later.`,
        retryAfter: Math.ceil((reset - Date.now()) / 1000),
      },
      { status: 429 }
    );
    
    setRateLimitHeaders(response, limit, 0, reset);
    response.headers.set('Retry-After', Math.ceil((reset - Date.now()) / 1000).toString());
    
    return response;
  }
  
  return null;
}