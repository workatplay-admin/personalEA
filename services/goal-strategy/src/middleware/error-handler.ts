import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createContextLogger } from '@/utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * Global Error Handler Middleware
 */
export const errorHandler = (
  error: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const correlationId = req.correlationId || 'unknown';
  const logger = createContextLogger(correlationId);

  // Log the error
  logger.error('Request error occurred', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: validationErrors,
        correlationId
      }
    });
    return;
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    switch (prismaError.code) {
      case 'P2002':
        res.status(409).json({
          error: {
            code: 'DUPLICATE_RECORD',
            message: 'A record with this data already exists',
            details: prismaError.meta,
            correlationId
          }
        });
        return;

      case 'P2025':
        res.status(404).json({
          error: {
            code: 'RECORD_NOT_FOUND',
            message: 'The requested record was not found',
            details: prismaError.meta,
            correlationId
          }
        });
        return;

      case 'P2003':
        res.status(400).json({
          error: {
            code: 'FOREIGN_KEY_CONSTRAINT',
            message: 'Foreign key constraint failed',
            details: prismaError.meta,
            correlationId
          }
        });
        return;

      default:
        res.status(500).json({
          error: {
            code: 'DATABASE_ERROR',
            message: 'Database operation failed',
            details: prismaError.meta,
            correlationId
          }
        });
        return;
    }
  }

  // Handle Prisma validation errors
  if (error.name === 'PrismaClientValidationError') {
    res.status(400).json({
      error: {
        code: 'DATABASE_VALIDATION_ERROR',
        message: 'Database validation failed',
        correlationId
      }
    });
    return;
  }

  // Handle custom app errors
  if ('statusCode' in error && error.statusCode) {
    res.status(error.statusCode).json({
      error: {
        code: error.code || 'APP_ERROR',
        message: error.message,
        details: error.details,
        correlationId
      }
    });
    return;
  }

  // Handle specific error types
  if (error.message.includes('JWT')) {
    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication failed',
        correlationId
      }
    });
    return;
  }

  if (error.message.includes('OpenAI') || error.message.includes('AI')) {
    res.status(503).json({
      error: {
        code: 'AI_SERVICE_ERROR',
        message: 'AI service temporarily unavailable',
        correlationId
      }
    });
    return;
  }

  // Default error response
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      correlationId
    }
  });
};

/**
 * 404 Not Found Handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const correlationId = req.correlationId || 'unknown';
  
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      correlationId
    }
  });
};

/**
 * Custom Error Classes
 */
export class ValidationError extends Error implements AppError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  code = 'NOT_FOUND';

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements AppError {
  statusCode = 409;
  code = 'CONFLICT';
  details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ConflictError';
    this.details = details;
  }
}

export class ForbiddenError extends Error implements AppError {
  statusCode = 403;
  code = 'FORBIDDEN';

  constructor(message: string = 'Access forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ServiceUnavailableError extends Error implements AppError {
  statusCode = 503;
  code = 'SERVICE_UNAVAILABLE';

  constructor(message: string = 'Service temporarily unavailable') {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

export class BadRequestError extends Error implements AppError {
  statusCode = 400;
  code = 'BAD_REQUEST';
  details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'BadRequestError';
    this.details = details;
  }
}

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};