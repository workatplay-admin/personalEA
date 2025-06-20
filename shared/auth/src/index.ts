import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Types and interfaces
export interface JwtPayload {
  userId: string;
  email: string;
  scopes: string[];
  iat: number;
  exp: number;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  bcryptRounds: number;
}

// Validation schemas
export const jwtPayloadSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  scopes: z.array(z.string()),
  iat: z.number(),
  exp: z.number(),
});

export const authConfigSchema = z.object({
  jwtSecret: z.string().min(32),
  jwtExpiresIn: z.string(),
  jwtRefreshExpiresIn: z.string(),
  bcryptRounds: z.number().min(8).max(15).default(12),
});

// Auth service class
export class AuthService {
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = authConfigSchema.parse(config);
  }

  /**
   * Generate JWT token
   */
  generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresIn,
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtRefreshExpiresIn,
    });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JwtPayload {
    const decoded = jwt.verify(token, this.config.jwtSecret) as JwtPayload;
    return jwtPayloadSchema.parse(decoded);
  }

  /**
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.bcryptRounds);
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Check if user has required scopes
   */
  hasScopes(userScopes: string[], requiredScopes: string[]): boolean {
    return requiredScopes.every(scope => userScopes.includes(scope));
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Generate correlation ID
   */
  generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Predefined scopes
export const SCOPES = {
  // Email service scopes
  EMAIL_READ: 'email:read',
  EMAIL_WRITE: 'email:write',
  EMAIL_SYNC: 'email:sync',
  EMAIL_PROCESS: 'email:process',
  
  // Goal service scopes
  GOAL_READ: 'goal:read',
  GOAL_WRITE: 'goal:write',
  GOAL_DELETE: 'goal:delete',
  
  // Calendar service scopes
  CALENDAR_READ: 'calendar:read',
  CALENDAR_WRITE: 'calendar:write',
  CALENDAR_SYNC: 'calendar:sync',
  
  // Admin scopes
  ADMIN_READ: 'admin:read',
  ADMIN_WRITE: 'admin:write',
  ADMIN_DELETE: 'admin:delete',
} as const;

// Error classes
export class AuthError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 401) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'AuthError';
  }
}

export class TokenExpiredError extends AuthError {
  constructor() {
    super('Token has expired', 'TOKEN_EXPIRED', 401);
  }
}

export class InvalidTokenError extends AuthError {
  constructor() {
    super('Invalid token', 'INVALID_TOKEN', 401);
  }
}

export class InsufficientScopesError extends AuthError {
  constructor(requiredScopes: string[], userScopes: string[]) {
    super(
      `Insufficient permissions. Required: ${requiredScopes.join(', ')}, User has: ${userScopes.join(', ')}`,
      'INSUFFICIENT_SCOPES',
      403
    );
  }
}

// Utility functions
export const createAuthService = (config: AuthConfig): AuthService => {
  return new AuthService(config);
};

export const validateScopes = (scopes: string[]): boolean => {
  const validScopes = Object.values(SCOPES);
  return scopes.every(scope => validScopes.includes(scope as any));
};

// Export everything
// export * from './middleware';
// export * from './types';