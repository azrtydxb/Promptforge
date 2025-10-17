import { PrismaClient } from '@/generated/prisma'
import { PerformanceMonitor } from '@/lib/performance'
import { logger } from '@/lib/logger'

declare global {
  var prisma: PrismaClient | undefined
}

// Enhanced database configuration with connection pooling
const prismaConfig = {
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
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

// Performance monitoring wrapper
export const dbWithMonitoring = {
  // Wrap all Prisma methods with performance monitoring
  async findMany(args: any) {
    return PerformanceMonitor.measureQuery('findMany', () => db.$queryRaw`SELECT * FROM "Prompt"`)
  },
  
  // Add more wrapped methods as needed
  user: {
    findUnique: (args: any) => PerformanceMonitor.measureQuery('user.findUnique', () => db.user.findUnique(args)),
    findMany: (args: any) => PerformanceMonitor.measureQuery('user.findMany', () => db.user.findMany(args)),
    create: (args: any) => PerformanceMonitor.measureQuery('user.create', () => db.user.create(args)),
    update: (args: any) => PerformanceMonitor.measureQuery('user.update', () => db.user.update(args)),
    delete: (args: any) => PerformanceMonitor.measureQuery('user.delete', () => db.user.delete(args)),
  },
  
  prompt: {
    findUnique: (args: any) => PerformanceMonitor.measureQuery('prompt.findUnique', () => db.prompt.findUnique(args)),
    findMany: (args: any) => PerformanceMonitor.measureQuery('prompt.findMany', () => db.prompt.findMany(args)),
    create: (args: any) => PerformanceMonitor.measureQuery('prompt.create', () => db.prompt.create(args)),
    update: (args: any) => PerformanceMonitor.measureQuery('prompt.update', () => db.prompt.update(args)),
    delete: (args: any) => PerformanceMonitor.measureQuery('prompt.delete', () => db.prompt.delete(args)),
    count: (args: any) => PerformanceMonitor.measureQuery('prompt.count', () => db.prompt.count(args)),
  },
  
  sharedPrompt: {
    findUnique: (args: any) => PerformanceMonitor.measureQuery('sharedPrompt.findUnique', () => db.sharedPrompt.findUnique(args)),
    findMany: (args: any) => PerformanceMonitor.measureQuery('sharedPrompt.findMany', () => db.sharedPrompt.findMany(args)),
    create: (args: any) => PerformanceMonitor.measureQuery('sharedPrompt.create', () => db.sharedPrompt.create(args)),
    update: (args: any) => PerformanceMonitor.measureQuery('sharedPrompt.update', () => db.sharedPrompt.update(args)),
    delete: (args: any) => PerformanceMonitor.measureQuery('sharedPrompt.delete', () => db.sharedPrompt.delete(args)),
    count: (args: any) => PerformanceMonitor.measureQuery('sharedPrompt.count', () => db.sharedPrompt.count(args)),
  },
  
  tag: {
    findUnique: (args: any) => PerformanceMonitor.measureQuery('tag.findUnique', () => db.tag.findUnique(args)),
    findMany: (args: any) => PerformanceMonitor.measureQuery('tag.findMany', () => db.tag.findMany(args)),
    create: (args: any) => PerformanceMonitor.measureQuery('tag.create', () => db.tag.create(args)),
    update: (args: any) => PerformanceMonitor.measureQuery('tag.update', () => db.tag.update(args)),
    delete: (args: any) => PerformanceMonitor.measureQuery('tag.delete', () => db.tag.delete(args)),
  },
  
  // Add other models as needed...
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