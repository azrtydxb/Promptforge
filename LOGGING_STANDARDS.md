# Logging Standards

This document outlines the logging standards and practices for the Promptforge application.

## Overview

We use Winston for structured logging throughout the application. All console.log, console.error, and console.warn calls have been replaced with structured logging using our custom logger configuration.

## Logger Configuration

The logger is configured in `src/lib/logger.ts` with the following features:

- **Structured JSON logging** in production
- **Human-readable colored output** in development
- **Request ID tracking** for distributed tracing
- **Context preservation** using AsyncLocalStorage
- **Different log levels** based on environment

## Log Levels

Use the appropriate log level for your messages:

### Error
Use for errors that need immediate attention:
```typescript
logger.error('Database connection failed', error, { 
  userId, 
  operation: 'createPrompt' 
});
```

### Warn
Use for potentially problematic situations:
```typescript
logger.warn('Rate limit approaching', { 
  userId, 
  remaining: 5, 
  limit: 100 
});
```

### Info
Use for important informational messages:
```typescript
logger.info('User logged in successfully', { 
  userId, 
  loginMethod: 'email' 
});
```

### Debug
Use for detailed debugging information (only shown in development):
```typescript
logger.debug('Cache hit for key', { 
  key: 'user:123', 
  ttl: 3600 
});
```

## Best Practices

### 1. Always Include Context

Include relevant context with your log messages:

```typescript
// Good
logger.error('Failed to create prompt', error, {
  userId: user.id,
  folderId: data.folderId,
  promptTitle: data.title
});

// Bad
logger.error('Failed to create prompt');
```

### 2. Use Structured Data

Pass structured data as objects rather than string concatenation:

```typescript
// Good
logger.info('Processing batch job', {
  jobId: job.id,
  itemsProcessed: 150,
  totalItems: 500,
  progress: 0.3
});

// Bad
logger.info(`Processing batch job ${job.id}: 150/500 items (30%)`);
```

### 3. Include Error Objects

When logging errors, always include the error object:

```typescript
try {
  await someOperation();
} catch (error) {
  // Good - error is passed as second parameter
  logger.error('Operation failed', error, {
    operation: 'someOperation',
    userId
  });
  
  // Bad - error details are lost
  logger.error('Operation failed: ' + error.message);
}
```

### 4. Use Request Context

In API routes and middleware, the request ID is automatically included. You can add additional context:

```typescript
export async function POST(request: Request) {
  const { userId, action } = await request.json();
  
  logger.info('API request received', {
    endpoint: '/api/actions',
    userId,
    action
  });
  
  // Request ID is automatically included from middleware
}
```

### 5. Log at Appropriate Levels

- **Error**: System errors, unhandled exceptions, critical failures
- **Warn**: Deprecation warnings, high resource usage, recoverable errors
- **Info**: Request/response logs, important state changes, business events
- **Debug**: Detailed execution flow, variable values, cache operations

### 6. Avoid Logging Sensitive Data

Never log passwords, tokens, or other sensitive information:

```typescript
// Good
logger.info('User authentication attempt', {
  email: user.email,
  method: 'password'
});

// Bad - never log passwords
logger.info('User login', {
  email: user.email,
  password: user.password  // DON'T DO THIS!
});
```

### 7. Use Child Loggers for Modules

Create child loggers with default metadata for specific modules:

```typescript
// In a service file
import { createLogger } from '@/lib/logger';

const logger = createLogger({ 
  module: 'PromptService' 
});

// All logs from this logger will include module: 'PromptService'
logger.info('Prompt created', { promptId });
```

## Environment Variables

Configure logging behavior with these environment variables:

- `LOG_LEVEL`: Set the minimum log level (default: 'info' in production, 'debug' in development)
- `NODE_ENV`: Determines log format (JSON in production, colored text in development)

## Request Tracking

The middleware automatically adds request IDs to all requests. These are included in all logs during request processing and returned in the `x-request-id` response header.

To correlate logs across services:
1. Check the `x-request-id` header in responses
2. Search logs for this request ID to see all related log entries

## Examples

### Server Actions

```typescript
export async function createPrompt(data: CreatePromptInput) {
  const user = await requireAuth();
  
  logger.info('Creating prompt', {
    userId: user.id,
    folderId: data.folderId,
    tagCount: data.tags.length
  });
  
  try {
    const prompt = await db.prompt.create({
      data: { ...data, userId: user.id }
    });
    
    logger.info('Prompt created successfully', {
      promptId: prompt.id,
      userId: user.id
    });
    
    return { success: true, prompt };
  } catch (error) {
    logger.error('Failed to create prompt', error, {
      userId: user.id,
      data
    });
    throw error;
  }
}
```

### API Routes

```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    logger.info('Processing webhook', {
      type: body.type,
      source: body.source
    });
    
    // Process webhook...
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Webhook processing failed', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Cache Operations

```typescript
async function getCachedData(key: string) {
  logger.debug('Attempting cache retrieval', { key });
  
  const cached = await redis.get(key);
  
  if (cached) {
    logger.debug('Cache hit', { key });
    return JSON.parse(cached);
  }
  
  logger.debug('Cache miss', { key });
  return null;
}
```

## Migration Guide

If you're updating existing code to use the new logger:

1. Import the logger:
   ```typescript
   import { logger } from '@/lib/logger';
   ```

2. Replace console methods:
   - `console.log` → `logger.info` or `logger.debug`
   - `console.error` → `logger.error`
   - `console.warn` → `logger.warn`

3. Add structured context:
   ```typescript
   // Before
   console.error('Error creating user:', error);
   
   // After
   logger.error('Error creating user', error, { 
     email: userData.email 
   });
   ```

4. Remove string concatenation in favor of structured data:
   ```typescript
   // Before
   console.log(`User ${userId} logged in at ${timestamp}`);
   
   // After
   logger.info('User logged in', { userId, timestamp });
   ```