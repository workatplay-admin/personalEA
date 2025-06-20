import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config/environment';
import { AppError } from '@/middleware/error-handler';
import { logger } from '@/utils/logger';

export interface JwtPayload {
  userId: string;
  email: string;
  scopes: string[];
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  correlationId?: string;
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new AppError(
        'Authorization header is required',
        401,
        'MISSING_AUTH_HEADER'
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError(
        'Authorization header must start with Bearer',
        401,
        'INVALID_AUTH_FORMAT'
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw new AppError(
        'JWT token is required',
        401,
        'MISSING_JWT_TOKEN'
      );
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    
    // Attach user info to request
    req.user = decoded;

    logger.debug('User authenticated', {
      correlationId: req.correlationId,
      userId: decoded.userId,
      email: decoded.email,
      scopes: decoded.scopes,
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('JWT verification failed', {
        correlationId: req.correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof jwt.TokenExpiredError) {
        next(new AppError(
          'JWT token has expired',
          401,
          'JWT_TOKEN_EXPIRED'
        ));
      } else {
        next(new AppError(
          'Invalid JWT token',
          401,
          'INVALID_JWT_TOKEN'
        ));
      }
    } else {
      next(error);
    }
  }
};

// Middleware to check specific scopes
export const requireScopes = (requiredScopes: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(
        'User not authenticated',
        401,
        'USER_NOT_AUTHENTICATED'
      ));
    }

    const userScopes = req.user.scopes || [];
    const hasRequiredScopes = requiredScopes.every(scope => 
      userScopes.includes(scope)
    );

    if (!hasRequiredScopes) {
      logger.warn('Insufficient permissions', {
        correlationId: req.correlationId,
        userId: req.user.userId,
        requiredScopes,
        userScopes,
      });

      return next(new AppError(
        'Insufficient permissions',
        403,
        'INSUFFICIENT_PERMISSIONS',
        {
          requiredScopes,
          userScopes,
        }
      ));
    }

    next();
  };
};

// Optional auth middleware (doesn't fail if no token)
export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);
  
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;
  } catch (error) {
    // Log but don't fail for optional auth
    logger.debug('Optional auth failed', {
      correlationId: req.correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  next();
};

export default authMiddleware;