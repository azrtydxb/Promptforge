import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage for request context
export const requestContext = new AsyncLocalStorage<{
  requestId: string;
  userId?: string;
  userEmail?: string;
  method?: string;
  path?: string;
  [key: string]: unknown;
}>();

// Custom format for development
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const context = requestContext.getStore();
    const contextStr = context
      ? ` [${context.requestId}${context.userId ? ` uid:${context.userId}` : ''}]`
      : '';
    
    let output = `${timestamp} ${level}${contextStr}: ${message}`;
    
    // Add metadata if present
    const filteredMeta = Object.keys(meta).reduce((acc, key) => {
      if (key !== 'timestamp' && key !== 'level' && key !== 'message') {
        acc[key] = meta[key];
      }
      return acc;
    }, {} as Record<string, unknown>);
    
    if (Object.keys(filteredMeta).length > 0) {
      output += '\n' + JSON.stringify(filteredMeta, null, 2);
    }
    
    return output;
  })
);

// Custom format for production (structured JSON)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const context = requestContext.getStore();
    if (context) {
      info = { ...info, ...context };
    }
    return JSON.stringify(info);
  })
);

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

// Configure log level based on environment
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Create the logger instance
export const logger = winston.createLogger({
  level: logLevel,
  format: isProduction ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

// Create a child logger with default metadata
export function createLogger(defaultMeta: Record<string, unknown>) {
  return logger.child(defaultMeta);
}

// Helper function to log with context
export function logWithContext(level: string, message: string, meta?: Record<string, unknown>) {
  const context = requestContext.getStore();
  const fullMeta = { ...context, ...meta };
  logger.log(level, message, fullMeta);
}

// Convenience methods
export const logError = (message: string, error?: Error | unknown, meta?: Record<string, unknown>) => {
  const errorMeta = error instanceof Error
    ? { error: { errorMessage: error.message, stack: error.stack, name: error.name } }
    : error ? { error } : {};
  logWithContext('error', message, { ...errorMeta, ...meta });
};

export const logWarn = (message: string, meta?: Record<string, unknown>) => {
  logWithContext('warn', message, meta);
};

export const logInfo = (message: string, meta?: Record<string, unknown>) => {
  logWithContext('info', message, meta);
};

export const logDebug = (message: string, meta?: Record<string, unknown>) => {
  logWithContext('debug', message, meta);
};

// Export log levels for reference
export const LogLevels = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;

export type LogLevel = typeof LogLevels[keyof typeof LogLevels];

// Log startup information
logger.info('Logger initialized', {
  environment: isProduction ? 'production' : 'development',
  logLevel,
  nodeEnv: process.env.NODE_ENV,
});