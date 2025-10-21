import { PrismaClient, Prisma } from '@/generated/prisma'
import { logger } from '@/lib/logger'

declare global {
  var prisma: PrismaClient | undefined
}

// Enhanced database configuration
// Note: Connection pooling is configured via DATABASE_URL query parameters
// Example: postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20&connect_timeout=10
const prismaConfig: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === 'development' ? [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ] as Prisma.LogDefinition[] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
}

export const db =
  global.prisma ||
  new PrismaClient(prismaConfig)

// Log query performance in development
if (process.env.NODE_ENV === 'development') {
  db.$on('query' as never, (e: { query: string; duration: number }) => {
    if (e.duration > 100) { // Only log queries taking > 100ms
      logger.warn(`Slow query (${e.duration}ms):`, { query: e.query.substring(0, 200) })
    }
  })
}

// Database health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    logger.error('Database health check failed', error)
    return false
  }
}

// Connection pool monitoring
export async function getDatabaseStats() {
  try {
    const stats = await db.$queryRaw`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `
    return stats
  } catch (error) {
    logger.error('Failed to get database stats', error)
    return null
  }
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.$disconnect()
    logger.info('Database connection closed')
  }
}

if (process.env.NODE_ENV !== 'production') {
  global.prisma = db
}