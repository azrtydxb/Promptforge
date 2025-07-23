# Promptforge - AI Prompt Management Platform

A comprehensive Next.js application for managing, sharing, and organizing AI prompts with advanced caching capabilities.

## Features

### Core Functionality
- **Prompt Management**: Create, edit, organize, and share AI prompts
- **Tag System**: Categorize prompts with a flexible tagging system
- **User Authentication**: Secure user registration and login with NextAuth
- **Dashboard Analytics**: Real-time insights into prompt usage and performance
- **Shared Prompts Marketplace**: Discover and share prompts with the community
- **Search & Filtering**: Advanced search capabilities across prompts and tags
- **Semantic Search**: AI-powered search using embeddings for finding similar prompts
- **Embedding Management**: Background worker for generating and updating embeddings

### Performance & Caching
- **Redis Caching**: Comprehensive caching strategy for optimal performance
- **Session Management**: Cached user sessions and preferences
- **Analytics Caching**: Real-time dashboard data with intelligent cache invalidation
- **Rate Limiting**: Redis-based API rate limiting for security

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Caching**: Redis 7 with ioredis client
- **Authentication**: NextAuth.js
- **Deployment**: Docker Compose for development

## Getting Started

### Prerequisites
- Node.js 18+ 
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Promptforge
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Update the environment variables in `.env.local`:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/prompt-manager"
   
   # NextAuth
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   
   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=redispassword
   ```

4. **Start the services**
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up -d
   
   # Run database migrations
   npx prisma migrate dev
   
   # Generate Prisma client
   npx prisma generate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   This command automatically starts both:
   - The Next.js development server
   - The embedding worker (required for semantic search)

   **Note:** If you want to run only the Next.js server without the worker:
   ```bash
   npm run dev:next-only
   ```

6. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)


### Cached Operations
- Tag management and search
- Dashboard analytics and statistics
- Shared prompts with filtering and pagination
- User sessions and preferences
- Popular content and trending data

### Cache Configuration
```typescript
// TTL (Time To Live) settings
const cacheTTL = {
  prompt: 5 * 60,        // 5 minutes
  tags: 10 * 60,         // 10 minutes
  dashboardAnalytics: 5 * 60,  // 5 minutes
  sharedPrompts: 10 * 60,      // 10 minutes
  session: 24 * 60 * 60,       // 24 hours
};
```

## Project Structure

```
src/
├── app/
│   ├── actions/           # Server actions
│   │   ├── tag.actions.cached.ts      # Cached tag operations
│   │   ├── analytics.actions.cached.ts # Cached analytics
│   │   └── shared-prompts.actions.cached.ts # Cached shared prompts
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── prompts/          # Prompt management pages
│   └── shared-prompts/   # Shared prompts marketplace
├── lib/
│   ├── redis.ts          # Redis configuration and cache service
│   ├── session-cache.ts  # Session caching utilities
│   ├── cache-invalidation.ts # Cache invalidation strategies
│   └── prisma.ts         # Database configuration
└── components/           # Reusable UI components
```

## Available Scripts

```bash
# Development
npm run dev          # Start dev server + embedding worker
npm run dev:next-only # Start only Next.js dev server
npm run worker       # Start embedding worker separately
npm run build        # Build for production
npm run start        # Start production server

# Database
npx prisma migrate dev    # Run database migrations
npx prisma generate      # Generate Prisma client
npx prisma studio       # Open Prisma Studio

# Docker
docker-compose up -d     # Start services (PostgreSQL + Redis)
docker-compose down      # Stop services
docker-compose logs      # View service logs

# Redis Management
npm run redis:up     # Start Redis container
npm run redis:down   # Stop Redis container
npm run redis:logs   # View Redis logs
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Prompts
- `GET /api/prompts` - List user prompts
- `POST /api/prompts` - Create new prompt
- `PUT /api/prompts/[id]` - Update prompt
- `DELETE /api/prompts/[id]` - Delete prompt

### Tags
- `GET /api/tags` - List all tags (cached)
- `POST /api/tags` - Create new tag
- `PUT /api/tags/[id]` - Update tag

### Analytics
- `GET /api/analytics/dashboard` - Dashboard analytics (cached)
- `GET /api/analytics/global` - Global statistics (cached)

## Database Schema

### Core Tables
- **User**: User accounts and profiles
- **Prompt**: AI prompts with content and metadata
- **Tag**: Categorization tags
- **PromptToTag**: Many-to-many relationship
- **SharedPrompt**: Public prompt sharing

### Relationships
- Users can have multiple prompts
- Prompts can have multiple tags
- Prompts can be shared publicly
- Analytics track user interactions

## Caching Strategy

### Cache Keys Structure
```
cache:{domain}:{identifier}:{optional_params}

Examples:
- cache:prompt:123
- cache:tags:all
- cache:analytics:dashboard:user456
- cache:shared-prompts:popular
- cache:session:sess_abc123
```

### Invalidation Triggers
- **Prompt Operations**: Clear prompt, tags, and analytics caches
- **Tag Operations**: Clear tag-related caches
- **User Actions**: Clear user-specific caches
- **Sharing Actions**: Clear shared prompts caches

## Performance Optimizations

### Redis Optimizations
- Connection pooling and lazy connections
- Pipeline operations for batch requests
- Automatic retry with exponential backoff
- Health monitoring and error handling

### Application Optimizations
- Server-side rendering with Next.js
- Optimized database queries with Prisma
- Efficient cache-aside patterns
- Strategic cache warming

## Monitoring & Maintenance

### Health Checks
```typescript
// Redis health check
await CacheService.getInstance().healthCheck();

// Database health check
await prisma.$queryRaw`SELECT 1`;
```

### Cache Statistics
- Monitor hit/miss ratios
- Track memory usage
- Performance metrics
- Error rates

## Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `redis` - Redis caching implementation
- `feature/*` - Feature development branches

### Testing
```bash
# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## Deployment

### Docker Production
```bash
# Build production image
docker build -t promptforge .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables (Production)
```env
NODE_ENV=production
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
NEXTAUTH_SECRET="secure-secret"
NEXTAUTH_URL="https://your-domain.com"
```

## Troubleshooting

### Common Issues

#### "Command timed out" Errors
If you see Redis timeout errors in the logs:
1. Ensure Redis is running: `docker-compose ps`
2. Check Redis connection: `npm run redis:logs`
3. **Make sure the embedding worker is running**: `npm run worker`

#### Embeddings Not Generating
1. Check Admin > AI Settings > Embedding tab
2. Verify OpenAI API key is configured
3. Look for "Worker Status" alerts
4. If jobs are waiting, start the worker: `npm run worker`

#### Worker Crashes
1. Check Redis is accessible
2. Verify API keys in Admin settings
3. Check logs for specific errors
4. Try restarting: `npm run worker`

### Worker Management

The embedding worker is automatically started with `npm run dev`:
- Development: `npm run dev` starts both app and worker
- Production: Run worker as a separate process
- Monitor: Check Admin > AI Settings > Embedding Management

For detailed worker documentation, see [docs/EMBEDDING_WORKER.md](docs/EMBEDDING_WORKER.md)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Review the API documentation

## Acknowledgments

- Next.js team for the excellent framework
- Prisma for the powerful ORM
- Redis for high-performance caching
- The open-source community for inspiration and tools
