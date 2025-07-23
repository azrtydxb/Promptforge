# Rate Limiting Implementation

This document describes the rate limiting implementation for the Promptforge application.

## Overview

Rate limiting is implemented using Redis to track request counts across different time windows. The implementation provides protection against abuse while allowing legitimate users to access the application normally.

## Configuration

Rate limits are configured through environment variables in `.env`:

```env
# Auth endpoints: Maximum number of authentication attempts
RATE_LIMIT_AUTH_ATTEMPTS=5
# Auth endpoints: Time window in seconds (900 = 15 minutes)
RATE_LIMIT_AUTH_WINDOW=900

# API endpoints: Maximum number of requests for authenticated users
RATE_LIMIT_API_REQUESTS=100
# API endpoints: Time window in seconds (60 = 1 minute)
RATE_LIMIT_API_WINDOW=60

# Public endpoints: Maximum number of requests for non-authenticated users
RATE_LIMIT_PUBLIC_REQUESTS=30
# Public endpoints: Time window in seconds (60 = 1 minute)
RATE_LIMIT_PUBLIC_WINDOW=60
```

## Rate Limit Categories

### 1. Auth Endpoints (5 attempts per 15 minutes)
- `/api/auth/register`
- `/api/auth/signin`
- `/api/auth/callback`

### 2. API Endpoints (100 requests per minute)
- All `/api/*` endpoints (except auth)
- Applies to authenticated users

### 3. Public Endpoints (30 requests per minute)
- `/` (home page)
- `/sign-in`
- `/sign-up`

## Implementation Details

### Middleware Integration

The rate limiting is integrated into the Next.js middleware (`middleware.ts`) and applies to all matching routes automatically.

### Identification Strategy

1. **Authenticated Users**: Rate limited by user ID from JWT token
2. **Anonymous Users**: Rate limited by IP address (supports `X-Forwarded-For` and `X-Real-IP` headers)

### Response Headers

When rate limited, responses include these headers:
- `X-RateLimit-Limit`: Maximum number of requests allowed
- `X-RateLimit-Remaining`: Number of requests remaining
- `X-RateLimit-Reset`: Unix timestamp when the rate limit resets
- `Retry-After`: Seconds until the rate limit resets (only on 429 responses)

### Error Response

When rate limit is exceeded:
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 300
}
```

## Usage in API Routes

For custom API routes that need different rate limits, you can use the `checkApiRateLimit` helper:

```typescript
import { checkApiRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Check rate limit for auth endpoints
  const rateLimitResponse = await checkApiRateLimit(request, 'auth');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Your API logic here
}
```

## Custom Rate Limiters

You can create custom rate limiters for specific use cases:

```typescript
import { createRateLimiter } from '@/lib/rate-limit';

const customLimiter = createRateLimiter({
  limit: 10,
  windowSeconds: 300, // 5 minutes
  keyPrefix: 'custom',
});

// Use in your code
const result = await customLimiter('user:123');
if (!result.success) {
  // Handle rate limit exceeded
}
```

## Monitoring

Rate limit keys in Redis follow this pattern:
- `rate:auth:user:{userId}:{window}`
- `rate:auth:ip:{ipAddress}:{window}`
- `rate:api:user:{userId}:{window}`
- `rate:public:ip:{ipAddress}:{window}`

You can monitor rate limiting through Redis commands:
```bash
# Check all rate limit keys
redis-cli KEYS "rate:*"

# Check specific user's rate limit
redis-cli GET "rate:api:user:123:60"
```

## Fail-Open Design

If Redis is unavailable, the rate limiting fails open (allows requests) to ensure the application remains accessible. This is logged but doesn't block users.