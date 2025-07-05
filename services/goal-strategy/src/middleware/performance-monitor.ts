/**
 * Performance Monitor Middleware
 * 
 * Middleware for monitoring and tracking performance metrics
 * with neural network integration for optimization.
 */

import { Request, Response, NextFunction } from 'express';
import { createContextLogger } from '@/utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const logger = createContextLogger('performance-monitor');

export interface PerformanceMetrics {
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  requestSize: number;
  responseSize: number;
  timestamp: string;
  endpoint: string;
  method: string;
  statusCode: number;
}

export function performanceMonitor(operationName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    const requestSize = JSON.stringify(req.body).length;

    // Capture original end method
    const originalEnd = res.end;
    let responseSize = 0;

    // Override end method to capture response size
    res.end = function(chunk?: any, encoding?: any) {
      if (chunk) {
        responseSize = Buffer.byteLength(chunk, encoding);
      }
      return originalEnd.call(this, chunk, encoding);
    } as any;

    // Continue with the request
    next();

    // Capture metrics after response
    res.on('finish', async () => {
      const duration = Date.now() - startTime;
      const endMemory = process.memoryUsage();

      const metrics: PerformanceMetrics = {
        duration,
        memoryUsage: {
          rss: endMemory.rss - startMemory.rss,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external,
          arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
        },
        requestSize,
        responseSize,
        timestamp: new Date().toISOString(),
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode
      };

      // Log performance metrics
      logger.info('Performance metrics', {
        operationName,
        metrics,
        correlationId: req.correlationId
      });

      // Report to neural system for optimization
      try {
        await execAsync(
          `npx ruv-swarm hook notification --message "Performance: ${operationName} took ${duration}ms" --telemetry true`
        );
      } catch (error) {
        logger.debug('Failed to report performance to neural system', { error });
      }

      // Trigger performance analysis if duration is high
      if (duration > 5000) { // 5 seconds
        logger.warn('High performance duration detected', {
          operationName,
          duration,
          endpoint: req.path
        });

        try {
          await execAsync(
            `npx ruv-swarm mcp call benchmark_run --type agent --iterations 1`
          );
        } catch (error) {
          logger.debug('Failed to trigger performance benchmark', { error });
        }
      }
    });
  };
}

export default performanceMonitor;