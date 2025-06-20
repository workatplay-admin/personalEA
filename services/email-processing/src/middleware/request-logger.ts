import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

export interface RequestWithCorrelationId extends Request {
  correlationId: string;
}

export const requestLogger = (
  req: RequestWithCorrelationId,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  
  // Generate or use existing correlation ID
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  req.correlationId = correlationId;
  
  // Set correlation ID in response headers
  res.setHeader('x-correlation-id', correlationId);

  // Log incoming request
  logger.info('Incoming request', {
    correlationId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    headers: {
      authorization: req.headers.authorization ? '[REDACTED]' : undefined,
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
    },
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): Response {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      correlationId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.getHeader('content-length'),
    });

    // Call original end method
    originalEnd.call(this, chunk, encoding);
    return this;
  };

  next();
};

export default requestLogger;