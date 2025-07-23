# Redis Setup for PromptForge

This document explains how to set up Redis for the embedding queue system.

## Quick Start

1. **Start Redis server:**
   ```bash
   npm run redis:up
   ```

2. **Copy environment variables:**
   ```bash
   cp .env.example .env.local
   ```

3. **Add your OpenAI API key to `.env.local`:**
   ```bash
   OPENAI_API_KEY="your-openai-api-key-here"
   ```

4. **Start the worker process:**
   ```bash
   npm run worker
   ```

5. **Start the Next.js app:**
   ```bash
   npm run dev
   ```

## Environment Variables

The following Redis-related environment variables are available:

```bash
# Redis Configuration
REDIS_HOST="localhost"          # Redis server host
REDIS_PORT="6379"              # Redis server port  
REDIS_PASSWORD="redispassword" # Redis authentication password

# OpenAI API (required for embeddings)
OPENAI_API_KEY="your-openai-api-key-here"
```

## Docker Compose Services

The `docker-compose.yml` includes:

- **Redis Server**: Main Redis instance for job queues
- **Redis Commander** (optional): Web-based Redis GUI at http://localhost:8081
  - Username: `admin`
  - Password: `admin123` (configurable via `REDIS_COMMANDER_PASSWORD`)

## NPM Scripts

```bash
# Redis management
npm run redis:up      # Start Redis container
npm run redis:down    # Stop Redis container  
npm run redis:logs    # View Redis logs

# Worker management
npm run worker        # Start background worker process
```

## How It Works

1. **Automatic Embedding Generation**: When prompts are created or updated, embedding jobs are automatically queued
2. **Background Processing**: The worker process picks up jobs and generates embeddings using OpenAI
3. **Queue Management**: Redis manages job queues with retry logic and error handling
4. **Real-time Updates**: No cron jobs needed - everything happens automatically

## Monitoring

- **Queue Status**: Check job status at `/api/queues/status`
- **Worker Status**: Monitor logs from the worker process
- **Redis GUI**: Use Redis Commander for visual queue monitoring

## Production Deployment

For production:

1. Use a managed Redis service (AWS ElastiCache, Redis Cloud, etc.)
2. Run workers as separate processes or containers
3. Configure proper Redis authentication and SSL
4. Set up monitoring and alerting for queue health

## Troubleshooting

**Redis connection issues:**
```bash
# Check if Redis is running
docker-compose ps redis

# View Redis logs
npm run redis:logs

# Test Redis connection
docker-compose exec redis redis-cli ping
```

**Worker not processing jobs:**
- Ensure OpenAI API key is set
- Check worker logs for errors
- Verify Redis connection from worker

**Embedding generation failing:**
- Check OpenAI API key validity
- Monitor API rate limits
- Review job failure logs in Redis