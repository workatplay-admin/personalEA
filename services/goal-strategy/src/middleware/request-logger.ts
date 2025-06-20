import { Request, Response, NextFunction } from 'express';
import { createCorrelationId, createContextLogger } from '@/utils/logger';

/**
 * Request Logger Middleware
 * Adds correlation ID and logs all requests
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Generate correlation ID if not present
  const correlationId = req.headers['x-correlation-id'] as string || createCorrelationId();
  req.correlationId = correlationId;
  
  // Set correlation ID in response headers
  res.setHeader('X-Correlation-ID', correlationId);
  
  const logger = createContextLogger(correlationId);
  
  // Log incoming request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    userId: req.user?.id
  });
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
      responseSize: JSON.stringify(body).length
    });
    
    return originalJson.call(this, body);
  };
  
  // Override res.send to log response
  const originalSend = res.send;
  res.send = function(body: any) {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
      responseSize: typeof body === 'string' ? body.length : JSON.stringify(body).length
    });
    
    return originalSend.call(this, body);
  };
  
  next();
};

/**
 * Performance Logger Middleware
 * Logs slow requests
 */
export const performanceLogger = (threshold: number = 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      if (duration > threshold) {
        const logger = createContextLogger(req.correlationId || 'unknown');
        logger.warn('Slow request detected', {
          method: req.method,
          url: req.url,
          duration,
          threshold,
          statusCode: res.statusCode,
          userId: req.user?.id
        });
      }
    });
    
    next();
  };
};

/**
 * Request Size Logger Middleware
 * Logs large request bodies
 */
export const requestSizeLogger = (threshold: number = 1024 * 1024) => { // 1MB default
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    if (contentLength > threshold) {
      const logger = createContextLogger(req.correlationId || 'unknown');
      logger.warn('Large request body detected', {
        method: req.method,
        url: req.url,
        contentLength,
        threshold,
        userId: req.user?.id
      });
    }
    
    next();
  };
};