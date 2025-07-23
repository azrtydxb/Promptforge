# Embedding Worker Documentation

## Overview

PromptForge uses a background worker process to generate embeddings for semantic search functionality. This worker is built with BullMQ and requires Redis to be running.

## Running the Application

### Development Mode

The default development command starts everything automatically:

```bash
npm run dev
```

This command starts:
- The Next.js development server
- The embedding worker process
- Both processes will be monitored and restarted if they crash

### Running Components Separately

If you need to run components individually:

**Next.js only (without worker):**
```bash
npm run dev:next-only
```

**Worker only:**
```bash
npm run worker
```

### Production

In production, you should run the worker as a separate process:

```bash
# Start the Next.js production server
npm run start

# In a separate process (e.g., using PM2, systemd, or Docker)
npm run worker
```

## Troubleshooting

### Common Issues

1. **"Command timed out" errors**
   - Ensure Redis is running: `docker-compose up -d redis`
   - Check Redis connection: `npm run redis:logs`
   - Verify the worker is running: `npm run worker`

2. **Jobs accumulating without processing**
   - Check the Admin > AI Settings > Embedding tab
   - Look for the "Worker Status" alert
   - If it shows "Jobs are waiting but no workers appear to be processing", start the worker

3. **Worker crashes immediately**
   - Check Redis is accessible
   - Verify OpenAI API key is configured in Admin > AI Settings
   - Check logs for specific error messages

### Worker Health Check

The embedding management UI in Admin > AI Settings shows:
- Queue statistics (waiting, active, completed, failed jobs)
- Worker health status
- Real-time updates when processing embeddings

### Redis Connection

The worker uses a dedicated Redis connection configured for BullMQ requirements:
- `maxRetriesPerRequest: null` (required by BullMQ)
- No command timeout restrictions
- Separate from the main application's Redis cache

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│     Redis       │◀────│ Embedding Worker│
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                         │
        │                       │                         │
        ▼                       ▼                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   PostgreSQL    │     │   BullMQ Queue  │     │   OpenAI API    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Configuration

### Environment Variables

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redispassword

# Worker Configuration (optional)
WORKER_CONCURRENCY=2  # Number of jobs to process simultaneously
```

### Admin Configuration

1. Navigate to Admin > AI Settings
2. Configure OpenAI API key in the "Embedding AI" tab
3. Select embedding model (recommended: text-embedding-3-small)
4. Save configuration

## Monitoring

### Logs

Worker logs include:
- Job processing status
- Embedding generation progress
- Error messages with context
- Performance metrics

### Queue Metrics

Available in Admin > AI Settings > Embedding Management:
- Total prompts/templates
- Embeddings generated
- Pending items
- Failed jobs
- Processing rate

## Development

### Running Tests

```bash
# Test the worker functionality
npm test src/lib/queues/embedding-queue.test.ts
```

### Debugging

Enable debug logging:
```bash
DEBUG=bullmq:* npm run worker
```

## Scaling

For high-volume installations:

1. **Multiple Workers**: Run multiple worker instances
   ```bash
   # Terminal 1
   WORKER_ID=1 npm run worker
   
   # Terminal 2
   WORKER_ID=2 npm run worker
   ```

2. **Redis Cluster**: Configure BullMQ to use Redis Cluster for better performance

3. **Dedicated Resources**: Run workers on separate servers from the main application