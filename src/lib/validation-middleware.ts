import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '@/lib/logger';

export class ValidationError extends Error {
  constructor(
    message: string,
    public details: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function handleZodError(error: unknown): ValidationError {
  if (error instanceof ZodError) {
    const details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    
    logger.warn('Zod validation failed', { details });
    
    return new ValidationError(
      'Validation failed',
      details
    );
  }
  
  logger.error('Unexpected validation error', error);
  return new ValidationError('Unexpected validation error', []);
}

export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: (data: T, request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      const body = await request.json();
      const validatedData = schema.parse(body);
      
      return await handler(validatedData, request);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Validation error', {
          errors: error.errors,
          path: request.url,
        });
        
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        );
      }
      
      throw error;
    }
  };
}

// Enhanced action wrapper for server actions
export function withActionValidation<T, R>(
  schema: ZodSchema<T>,
  action: (data: T) => Promise<R>
) {
  return async (data: unknown): Promise<{ success: true; data: R } | { success: false; error: string; details?: Array<{ field: string; message: string }> }> => {
    try {
      const validatedData = schema.parse(data);
      const result = await action(validatedData);
      return { success: true, data: result };
    } catch (error) {
      const validationError = handleZodError(error);
      return {
        success: false,
        error: validationError.message,
        details: validationError.details,
      };
    }
  };
}

// Query parameter validation
export function validateQueryParams<T>(
  schema: ZodSchema<T>,
  searchParams: URLSearchParams
): T {
  try {
    const params = Object.fromEntries(searchParams.entries());
    
    // Convert string parameters to appropriate types
    const convertedParams: Record<string, any> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value === 'true') convertedParams[key] = true;
      else if (value === 'false') convertedParams[key] = false;
      else if (!isNaN(Number(value)) && value !== '') convertedParams[key] = Number(value);
      else convertedParams[key] = value;
    }
    
    return schema.parse(convertedParams);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(
        'Query parameter validation failed',
        error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }
    throw error;
  }
}

// Batch validation for multiple items
export function validateBatch<T>(
  schema: ZodSchema<T>,
  items: unknown[]
): { success: true; data: T[] } | { success: false; errors: Array<{ index: number; error: string }> } {
  const results: T[] = [];
  const errors: Array<{ index: number; error: string }> = [];
  
  items.forEach((item, index) => {
    try {
      const validated = schema.parse(item);
      results.push(validated);
    } catch (error) {
      if (error instanceof ZodError) {
        errors.push({
          index,
          error: error.errors.map(e => e.message).join(', ')
        });
      }
    }
  });
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  return { success: true, data: results };
}