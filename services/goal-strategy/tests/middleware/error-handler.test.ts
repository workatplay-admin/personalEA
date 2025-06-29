import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../src/middleware/error-handler';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let consoleErrorSpy: any; // SpyInstance type not available in current jest types

  beforeEach(() => {
    mockRequest = {
      correlationId: 'test-correlation-123',
      path: '/api/v1/goals',
      method: 'POST',
      user: { id: 'user-123', email: 'test@example.com', scopes: ['goals:read', 'goals:write'] }
    };
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
      headersSent: false
    };
    nextFunction = jest.fn();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Standard Errors', () => {
    it('should handle ValidationError with 400 status', () => {
      const validationError = new Error('Validation failed');
      (validationError as any).name = 'ValidationError';
      (validationError as any).details = [
        { field: 'title', message: 'Title is required' },
        { field: 'priority', message: 'Invalid priority value' }
      ];

      errorHandler(
        validationError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: [
            { field: 'title', message: 'Title is required' },
            { field: 'priority', message: 'Invalid priority value' }
          ],
          correlationId: 'test-correlation-123'
        }
      });
    });

    it('should handle NotFoundError with 404 status', () => {
      const notFoundError = new Error('Goal not found');
      (notFoundError as any).name = 'NotFoundError';
      (notFoundError as any).resourceType = 'Goal';
      (notFoundError as any).resourceId = 'goal-123';

      errorHandler(
        notFoundError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Goal not found',
          resource: {
            type: 'Goal',
            id: 'goal-123'
          },
          correlationId: 'test-correlation-123'
        }
      });
    });

    it('should handle UnauthorizedError with 401 status', () => {
      const unauthorizedError = new Error('Invalid credentials');
      (unauthorizedError as any).name = 'UnauthorizedError';

      errorHandler(
        unauthorizedError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
          correlationId: 'test-correlation-123'
        }
      });
    });

    it('should handle ForbiddenError with 403 status', () => {
      const forbiddenError = new Error('Access denied');
      (forbiddenError as any).name = 'ForbiddenError';
      (forbiddenError as any).requiredPermission = 'goals:delete';

      errorHandler(
        forbiddenError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
          requiredPermission: 'goals:delete',
          correlationId: 'test-correlation-123'
        }
      });
    });

    it('should handle ConflictError with 409 status', () => {
      const conflictError = new Error('Resource already exists');
      (conflictError as any).name = 'ConflictError';
      (conflictError as any).conflictType = 'DUPLICATE_NAME';

      errorHandler(
        conflictError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'CONFLICT',
          message: 'Resource already exists',
          conflictType: 'DUPLICATE_NAME',
          correlationId: 'test-correlation-123'
        }
      });
    });
  });

  describe('Database Errors', () => {
    it('should handle Prisma unique constraint violation', () => {
      const prismaError = new Error('Unique constraint failed');
      (prismaError as any).code = 'P2002';
      (prismaError as any).meta = { target: ['email'] };

      errorHandler(
        prismaError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'DUPLICATE_RESOURCE',
          message: 'A resource with this email already exists',
          field: 'email',
          correlationId: 'test-correlation-123'
        }
      });
    });

    it('should handle Prisma record not found', () => {
      const prismaError = new Error('Record not found');
      (prismaError as any).code = 'P2025';

      errorHandler(
        prismaError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'RECORD_NOT_FOUND',
          message: 'The requested record was not found',
          correlationId: 'test-correlation-123'
        }
      });
    });

    it('should handle database connection errors', () => {
      const dbError = new Error('Can\'t reach database server');
      (dbError as any).code = 'P1001';

      errorHandler(
        dbError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Database service is temporarily unavailable',
          correlationId: 'test-correlation-123'
        }
      });
    });
  });

  describe('External Service Errors', () => {
    it('should handle OpenAI rate limit errors', () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).name = 'OpenAIError';
      (rateLimitError as any).status = 429;
      (rateLimitError as any).headers = {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': '1640995200'
      };

      errorHandler(
        rateLimitError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'OpenAI API rate limit exceeded',
          retryAfter: expect.any(Number),
          correlationId: 'test-correlation-123'
        }
      });
    });

    it('should handle OpenAI API errors', () => {
      const apiError = new Error('Invalid API key');
      (apiError as any).name = 'OpenAIError';
      (apiError as any).status = 401;

      errorHandler(
        apiError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'EXTERNAL_SERVICE_ERROR',
          message: 'OpenAI service error',
          service: 'OpenAI',
          correlationId: 'test-correlation-123'
        }
      });
    });

    it('should handle network timeouts', () => {
      const timeoutError = new Error('Request timeout');
      (timeoutError as any).code = 'ETIMEDOUT';

      errorHandler(
        timeoutError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(504);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'GATEWAY_TIMEOUT',
          message: 'External service request timed out',
          correlationId: 'test-correlation-123'
        }
      });
    });
  });

  describe('Business Logic Errors', () => {
    it('should handle custom business logic errors', () => {
      class InsufficientResourcesError extends Error {
        constructor(message: string, public resourceType: string, public required: number, public available: number) {
          super(message);
          this.name = 'InsufficientResourcesError';
        }
      }

      const businessError = new InsufficientResourcesError(
        'Not enough hours available',
        'working_hours',
        40,
        32
      );

      errorHandler(
        businessError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INSUFFICIENT_RESOURCES',
          message: 'Not enough hours available',
          details: {
            resourceType: 'working_hours',
            required: 40,
            available: 32
          },
          correlationId: 'test-correlation-123'
        }
      });
    });

    it('should handle goal planning conflicts', () => {
      const planningError = new Error('Task dependencies create circular reference');
      (planningError as any).name = 'PlanningError';
      (planningError as any).conflictingTasks = ['task-1', 'task-2', 'task-3'];

      errorHandler(
        planningError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'PLANNING_ERROR',
          message: 'Task dependencies create circular reference',
          conflictingTasks: ['task-1', 'task-2', 'task-3'],
          correlationId: 'test-correlation-123'
        }
      });
    });
  });

  describe('Generic Error Handling', () => {
    it('should handle unknown errors with 500 status', () => {
      const unknownError = new Error('Something went wrong');

      errorHandler(
        unknownError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          correlationId: 'test-correlation-123'
        }
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unhandled error:',
        expect.objectContaining({
          error: unknownError,
          correlationId: 'test-correlation-123',
          path: '/api/v1/goals',
          method: 'POST',
          userId: 'user-123'
        })
      );
    });

    it('should not expose sensitive information in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const sensitiveError = new Error('Database password: secret123');
      (sensitiveError as any).stack = 'Error at sensitive location';

      errorHandler(
        sensitiveError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          correlationId: 'test-correlation-123'
        }
      });
      expect(mockResponse.json).not.toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.any(String)
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devError = new Error('Development error');
      devError.stack = 'Error stack trace';

      errorHandler(
        devError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          correlationId: 'test-correlation-123',
          stack: 'Error stack trace'
        }
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Response State Handling', () => {
    it('should not send response if headers already sent', () => {
      mockResponse.headersSent = true;
      const error = new Error('Test error');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(error);
    });

    it('should handle errors without message', () => {
      const errorWithoutMessage = new Error();
      (errorWithoutMessage as any).name = 'ValidationError';

      errorHandler(
        errorWithoutMessage,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation error occurred',
          correlationId: 'test-correlation-123'
        }
      });
    });
  });

  describe('Error Logging', () => {
    it('should log errors with full context', () => {
      const error = new Error('Test error for logging');
      mockRequest.body = { title: 'Test Goal' };
      mockRequest.query = { page: '1' };
      mockRequest.params = { id: 'goal-123' };

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unhandled error:',
        expect.objectContaining({
          error: error,
          correlationId: 'test-correlation-123',
          path: '/api/v1/goals',
          method: 'POST',
          userId: 'user-123',
          body: { title: 'Test Goal' },
          query: { page: '1' },
          params: { id: 'goal-123' }
        })
      );
    });

    it('should sanitize sensitive data from logs', () => {
      const error = new Error('Auth error');
      mockRequest.body = {
        password: 'secret123',
        creditCard: '4111-1111-1111-1111',
        title: 'Safe data'
      };
      mockRequest.headers = {
        authorization: 'Bearer secret-token',
        'x-api-key': 'secret-key'
      };

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unhandled error:',
        expect.objectContaining({
          body: {
            password: '[REDACTED]',
            creditCard: '[REDACTED]',
            title: 'Safe data'
          }
        })
      );
    });
  });
});