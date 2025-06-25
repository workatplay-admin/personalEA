import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/environment';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * GET /api/v1/auth/test-token
 * Generate a test JWT token for development/testing purposes
 */
router.get('/test-token', async (req, res, next): Promise<void> => {
  try {
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);
    
    logger.info('Test JWT token generation request', { correlationId });

    // Generate test user payload
    const payload = {
      id: 'test-user-' + Date.now(),
      email: 'test@personalea.dev',
      scopes: ['goals:read', 'goals:write', 'milestones:read', 'milestones:write', 'tasks:read', 'tasks:write']
    };

    // Generate JWT token
    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '24h' });

    logger.info('Test JWT token generated successfully', { 
      correlationId,
      userId: payload.id,
      scopes: payload.scopes 
    });

    res.json({
      success: true,
      data: {
        token,
        user: payload,
        expiresIn: '24h'
      },
      correlationId
    });

  } catch (error) {
    logger.error('Failed to generate test JWT token', { error });
    next(error);
  }
});

export default router;