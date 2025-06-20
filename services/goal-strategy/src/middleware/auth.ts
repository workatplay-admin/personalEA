import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/environment';
import { createContextLogger } from '@/utils/logger';

// Extend Express Request type to include user and correlation ID
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        scopes: string[];
      };
      correlationId?: string;
    }
  }
}

interface JwtPayload {
  id: string;
  email: string;
  scopes: string[];
  iat?: number;
  exp?: number;
}

/**
 * JWT Authentication Middleware
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  const correlationId = req.correlationId || 'unknown';
  const logger = createContextLogger(correlationId);

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.warn('Missing authorization header');
      res.status(401).json({
        error: {
          code: 'MISSING_AUTH_HEADER',
          message: 'Authorization header is required',
          correlationId
        }
      });
      return;
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>
    
    if (!token) {
      logger.warn('Missing JWT token');
      res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'JWT token is required',
          correlationId
        }
      });
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      scopes: decoded.scopes || []
    };

    logger.info('User authenticated successfully', { 
      userId: decoded.id,
      scopes: decoded.scopes 
    });

    next();
  } catch (error) {
    logger.error('JWT authentication failed', { error });
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'JWT token has expired',
          correlationId
        }
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid JWT token',
          correlationId
        }
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error',
        correlationId
      }
    });
  }
};

/**
 * Scope-based Authorization Middleware
 */
export const requireScopes = (requiredScopes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = req.correlationId || 'unknown';
    const logger = createContextLogger(correlationId);

    if (!req.user) {
      logger.error('User not authenticated for scope check');
      res.status(401).json({
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'User must be authenticated',
          correlationId
        }
      });
      return;
    }

    const userScopes = req.user.scopes || [];
    const hasRequiredScopes = requiredScopes.every(scope => userScopes.includes(scope));

    if (!hasRequiredScopes) {
      logger.warn('Insufficient scopes', { 
        required: requiredScopes,
        userScopes,
        userId: req.user.id 
      });
      
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_SCOPES',
          message: `Required scopes: ${requiredScopes.join(', ')}`,
          details: {
            required: requiredScopes,
            provided: userScopes
          },
          correlationId
        }
      });
      return;
    }

    logger.info('Scope authorization successful', { 
      userId: req.user.id,
      requiredScopes,
      userScopes 
    });

    next();
  };
};

/**
 * Optional Authentication Middleware
 * Adds user info if token is present but doesn't require it
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    next();
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      req.user = {
        id: decoded.id,
        email: decoded.email,
        scopes: decoded.scopes || []
      };
    }
  } catch (error) {
    // Silently ignore invalid tokens for optional auth
  }

  next();
};

// Common scope constants for Goal & Strategy Service
export const SCOPES = {
  GOALS_READ: 'goals.read',
  GOALS_WRITE: 'goals.write',
  GOALS_DELETE: 'goals.delete',
  MILESTONES_READ: 'milestones.read',
  MILESTONES_WRITE: 'milestones.write',
  TASKS_READ: 'tasks.read',
  TASKS_WRITE: 'tasks.write',
  CAPACITY_READ: 'capacity.read',
  CAPACITY_WRITE: 'capacity.write',
  ADMIN: 'admin'
} as const;