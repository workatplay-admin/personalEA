import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../src/middleware/auth';

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      body: {},
      correlationId: 'test-correlation-123'
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  describe('Bearer Token Authentication', () => {
    it('should authenticate valid bearer token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-jwt-token'
      };

      // Mock JWT verification
      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com'
      });

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect((mockRequest as any).user).toEqual({
        id: 'user-123',
        email: 'test@example.com'
      });
    });

    it('should reject invalid bearer token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      jest.spyOn(require('jsonwebtoken'), 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token'
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token'
      };

      const tokenExpiredError = new Error('jwt expired');
      (tokenExpiredError as any).name = 'TokenExpiredError';
      jest.spyOn(require('jsonwebtoken'), 'verify').mockImplementation(() => {
        throw tokenExpiredError;
      });

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired'
        }
      });
    });

    it('should reject malformed authorization header', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token'
      };

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_AUTH_FORMAT',
          message: 'Invalid authorization format'
        }
      });
    });

    it('should reject missing authorization header', async () => {
      mockRequest.headers = {};

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'NO_AUTH_HEADER',
          message: 'Authorization header required'
        }
      });
    });
  });

  describe('API Key Authentication', () => {
    it('should authenticate valid API key', async () => {
      mockRequest.headers = {
        'x-api-key': 'valid-api-key-123'
      };

      // Mock API key validation
      const mockValidateApiKey = jest.fn().mockResolvedValue({
        userId: 'user-456',
        email: 'apiuser@example.com',
        permissions: ['read', 'write']
      });
      jest.spyOn(require('../../src/services/auth'), 'validateApiKey')
        .mockImplementation(mockValidateApiKey);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockValidateApiKey).toHaveBeenCalledWith('valid-api-key-123');
      expect(nextFunction).toHaveBeenCalled();
      expect((mockRequest as any).user).toEqual({
        id: 'user-456',
        email: 'apiuser@example.com',
        permissions: ['read', 'write']
      });
    });

    it('should reject invalid API key', async () => {
      mockRequest.headers = {
        'x-api-key': 'invalid-key'
      };

      const mockValidateApiKey = jest.fn().mockResolvedValue(null);
      jest.spyOn(require('../../src/services/auth'), 'validateApiKey')
        .mockImplementation(mockValidateApiKey);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key'
        }
      });
    });

    it('should handle rate-limited API key', async () => {
      mockRequest.headers = {
        'x-api-key': 'rate-limited-key'
      };

      const mockValidateApiKey = jest.fn().mockRejectedValue(
        new Error('Rate limit exceeded for API key')
      );
      jest.spyOn(require('../../src/services/auth'), 'validateApiKey')
        .mockImplementation(mockValidateApiKey);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded for API key'
        }
      });
    });
  });

  describe('Session Authentication', () => {
    it('should authenticate valid session cookie', async () => {
      mockRequest.cookies = {
        'session-id': 'valid-session-123'
      };

      const mockValidateSession = jest.fn().mockResolvedValue({
        userId: 'user-789',
        email: 'session@example.com'
      });
      jest.spyOn(require('../../src/services/auth'), 'validateSession')
        .mockImplementation(mockValidateSession);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockValidateSession).toHaveBeenCalledWith('valid-session-123');
      expect(nextFunction).toHaveBeenCalled();
      expect((mockRequest as any).user).toEqual({
        id: 'user-789',
        email: 'session@example.com'
      });
    });

    it('should reject expired session', async () => {
      mockRequest.cookies = {
        'session-id': 'expired-session'
      };

      const mockValidateSession = jest.fn().mockResolvedValue(null);
      jest.spyOn(require('../../src/services/auth'), 'validateSession')
        .mockImplementation(mockValidateSession);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Session has expired'
        }
      });
    });
  });

  describe('Multiple Auth Methods', () => {
    it('should prefer Bearer token over API key', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-jwt-token',
        'x-api-key': 'also-valid-key'
      };

      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({
        userId: 'jwt-user',
        email: 'jwt@example.com'
      });

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect((mockRequest as any).user.id).toBe('jwt-user');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should fall back to API key if Bearer token invalid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
        'x-api-key': 'valid-api-key'
      };

      jest.spyOn(require('jsonwebtoken'), 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const mockValidateApiKey = jest.fn().mockResolvedValue({
        userId: 'api-user',
        email: 'api@example.com'
      });
      jest.spyOn(require('../../src/services/auth'), 'validateApiKey')
        .mockImplementation(mockValidateApiKey);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect((mockRequest as any).user.id).toBe('api-user');
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('Permission Checks', () => {
    it('should check permissions for protected routes', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-jwt-token'
      };
      mockRequest.path = '/api/v1/admin/users';
      mockRequest.method = 'DELETE';

      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user']
      });

      const requiresAdmin = true;
      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
        { requiresAdmin }
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Admin access required'
        }
      });
    });

    it('should allow admin access to protected routes', async () => {
      mockRequest.headers = {
        authorization: 'Bearer admin-jwt-token'
      };
      mockRequest.path = '/api/v1/admin/users';

      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({
        userId: 'admin-123',
        email: 'admin@example.com',
        roles: ['admin']
      });

      const requiresAdmin = true;
      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
        { requiresAdmin }
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('Security Headers', () => {
    it('should add security headers to authenticated requests', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-jwt-token'
      };

      jest.spyOn(require('jsonwebtoken'), 'verify').mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com'
      });

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect((mockRequest as any).securityHeaders).toEqual({
        'X-User-ID': 'user-123',
        'X-Auth-Method': 'jwt',
        'X-Request-ID': 'test-correlation-123'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockRequest.headers = {
        'x-api-key': 'valid-key'
      };

      const mockValidateApiKey = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );
      jest.spyOn(require('../../src/services/auth'), 'validateApiKey')
        .mockImplementation(mockValidateApiKey);

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Authentication service temporarily unavailable'
        }
      });
    });

    it('should handle unexpected errors gracefully', async () => {
      mockRequest.headers = {
        authorization: 'Bearer token'
      };

      jest.spyOn(require('jsonwebtoken'), 'verify').mockImplementation(() => {
        throw new TypeError('Cannot read property of undefined');
      });

      await authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed'
        }
      });
    });
  });
});