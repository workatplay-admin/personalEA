import { Router, Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { config } from '@/config/environment';

const router = Router();

// Basic health check
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'email-processing',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: config.environment,
  });
});

// Detailed health check
router.get('/detailed', async (req: Request, res: Response) => {
  const healthChecks = {
    service: 'healthy',
    database: 'unknown',
    redis: 'unknown',
    external_apis: 'unknown',
  };

  let overallStatus = 'healthy';

  try {
    // TODO: Add database health check
    // const dbHealth = await checkDatabaseHealth();
    // healthChecks.database = dbHealth ? 'healthy' : 'unhealthy';

    // TODO: Add Redis health check
    // const redisHealth = await checkRedisHealth();
    // healthChecks.redis = redisHealth ? 'healthy' : 'unhealthy';

    // TODO: Add external API health checks
    // const externalHealth = await checkExternalAPIs();
    // healthChecks.external_apis = externalHealth ? 'healthy' : 'unhealthy';

    // Determine overall status
    const unhealthyServices = Object.values(healthChecks).filter(
      status => status === 'unhealthy'
    );

    if (unhealthyServices.length > 0) {
      overallStatus = 'degraded';
    }

    res.status(200).json({
      status: overallStatus,
      service: 'email-processing',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: config.environment,
      checks: healthChecks,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(503).json({
      status: 'unhealthy',
      service: 'email-processing',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: config.environment,
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
});

// Readiness probe
router.get('/ready', (req: Request, res: Response) => {
  // TODO: Add readiness checks (database connections, etc.)
  res.status(200).json({
    status: 'ready',
    service: 'email-processing',
    timestamp: new Date().toISOString(),
  });
});

// Liveness probe
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    service: 'email-processing',
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRoutes };
export default router;