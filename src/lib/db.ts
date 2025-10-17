import { PrismaClient } from '@/generated/prisma'
import { logger } from '@/lib/logger'

declare global {
  var prisma: PrismaClient | undefined
}

// Enhanced database configuration with connection pooling
const prismaConfig = {
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pooling settings
  __internal: {
    engine: {
      connectionLimit: 10,
      poolTimeout: 10000,
      connectTimeout: 10000,
    },
  },
}

export const db =
  global.prisma ||
  new PrismaClient(prismaConfig)

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