import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient, cacheKeys, cacheTTL } from './redis';
import type { Redis } from 'ioredis';

export interface RateLimitConfig {
  windowMs?: number; // Time window in milliseconds
  max?: number; // Maximum number of requests per window
  message?: string; // Custom error message
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  standardHeaders?: boolean; // Return rate limit info in headers
  legacyHeaders?: boolean; // Return rate limit info in legacy headers
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// Default configurations for different endpoint types
export const rateLimitConfigs = {
  auth: {
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5'), // 5 requests per window
    message: 'Too many authentication attempts, please try again later',
  },
  api: {
    windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || '60000'), // 1 minute
    max: parseInt(process.env.RATE_LIMIT_API_MAX || '100'), // 100 requests per window
    message: 'Too many requests, please try again later',
  },
  strict: {
    windowMs: parseInt(process.env.RATE_LIMIT_STRICT_WINDOW_MS || '60000'), // 1 minute
    max: parseInt(process.env.RATE_LIMIT_STRICT_MAX || '10'), // 10 requests per window
    message: 'Rate limit exceeded, please slow down',
  },
};

// Default key generator - uses IP address
const defaultKeyGenerator = (req: NextRequest): string => {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';
  
  return ip;
};

export class RateLimiter {
  private redis: Redis;
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig = {}) {
    this.redis = getRedisClient();
    this.config = {
      windowMs: config.windowMs || 60000, // 1 minute default
      max: config.max || 100, // 100 requests default
      message: config.message || 'Too many requests, please try again later',
      keyGenerator: config.keyGenerator || defaultKeyGenerator,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false,
      standardHeaders: config.standardHeaders !== false, // true by default
      legacyHeaders: config.legacyHeaders || false,
    };
  }

  async checkLimit(req: NextRequest): Promise<RateLimitResult> {
    const identifier = this.config.keyGenerator(req);
    const key = cacheKeys.rateLimit(identifier, this.config.windowMs.toString());
    
    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      
      // Increment the counter and get the new value
      pipeline.incr(key);
      
      // Set expiration on first request
      pipeline.expire(key, Math.ceil(this.config.windowMs / 1000));
      
      // Get TTL to calculate reset time
      pipeline.ttl(key);
      
      const results = await pipeline.exec();
      
      if (!results) {
        // Redis error, fail open
        return {
          success: true,
          limit: this.config.max,
          remaining: this.config.max,
          reset: new Date(Date.now() + this.config.windowMs),
        };
      }
      
      const [[, count], [, ], [, ttl]] = results as [[null, number], [null, number], [null, number]];
      
      const remaining = Math.max(0, this.config.max - count);
      const resetTime = ttl > 0 ? Date.now() + (ttl * 1000) : Date.now() + this.config.windowMs;
      
      return {
        success: count <= this.config.max,
        limit: this.config.max,
        remaining,
        reset: new Date(resetTime),
        retryAfter: count > this.config.max ? Math.ceil(ttl) : undefined,
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow the request if Redis is down
      return {
        success: true,
        limit: this.config.max,
        remaining: this.config.max,
        reset: new Date(Date.now() + this.config.windowMs),
      };
    }
  }

  async reset(req: NextRequest): Promise<void> {
    const identifier = this.config.keyGenerator(req);
    const key = cacheKeys.rateLimit(identifier, this.config.windowMs.toString());
    
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Rate limit reset error:', error);
    }
  }

  middleware() {
    return async (req: NextRequest): Promise<NextResponse | null> => {
      const result = await this.checkLimit(req);
      
      // Create response headers
      const headers = new Headers();
      
      if (this.config.standardHeaders) {
        headers.set('RateLimit-Limit', result.limit.toString());
        headers.set('RateLimit-Remaining', result.remaining.toString());
        headers.set('RateLimit-Reset', result.reset.toISOString());
      }
      
      if (this.config.legacyHeaders) {
        headers.set('X-RateLimit-Limit', result.limit.toString());
        headers.set('X-RateLimit-Remaining', result.remaining.toString());
        headers.set('X-RateLimit-Reset', result.reset.getTime().toString());
      }
      
      if (!result.success) {
        if (result.retryAfter) {
          headers.set('Retry-After', result.retryAfter.toString());
        }
        
        return new NextResponse(
          JSON.stringify({
            error: this.config.message,
            retryAfter: result.retryAfter,
          }),
          {
            status: 429,
            headers,
          }
        );
      }
      
      // Rate limit not exceeded - return null to continue
      return null;
    };
  }
}

// Pre-configured rate limiters
export const authRateLimiter = new RateLimiter(rateLimitConfigs.auth);
export const apiRateLimiter = new RateLimiter(rateLimitConfigs.api);
export const strictRateLimiter = new RateLimiter(rateLimitConfigs.strict);

// Helper function to apply rate limiting to API routes
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: RateLimitConfig
): (req: NextRequest) => Promise<NextResponse> {
  const limiter = config ? new RateLimiter(config) : apiRateLimiter;
  
  return async (req: NextRequest): Promise<NextResponse> => {
    const rateLimitResponse = await limiter.middleware()(req);
    
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    const response = await handler(req);
    
    // Add rate limit headers to successful responses
    const result = await limiter.checkLimit(req);
    
    if (limiter.config.standardHeaders) {
      response.headers.set('RateLimit-Limit', result.limit.toString());
      response.headers.set('RateLimit-Remaining', result.remaining.toString());
      response.headers.set('RateLimit-Reset', result.reset.toISOString());
    }
    
    if (limiter.config.legacyHeaders) {
      response.headers.set('X-RateLimit-Limit', result.limit.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.reset.getTime().toString());
    }
    
    return response;
  };
}

// IP-based rate limiter with custom configuration
export function createIpRateLimiter(config: Omit<RateLimitConfig, 'keyGenerator'>): RateLimiter {
  return new RateLimiter({
    ...config,
    keyGenerator: defaultKeyGenerator,
  });
}

// User-based rate limiter
export function createUserRateLimiter(config: Omit<RateLimitConfig, 'keyGenerator'>): RateLimiter {
  return new RateLimiter({
    ...config,
    keyGenerator: (req: NextRequest) => {
      // Extract user ID from JWT token or session
      // This is a placeholder - actual implementation depends on your auth setup
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        // Extract user ID from token
        return `user:${authHeader.substring(7)}`;
      }
      
      // Fall back to IP-based limiting
      return defaultKeyGenerator(req);
    },
  });
}