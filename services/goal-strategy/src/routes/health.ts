import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { env } from '@/config/environment';
import { createContextLogger } from '@/utils/logger';
import { asyncHandler } from '@/middleware/error-handler';

const router = Router();
const prisma = new PrismaClient();

/**
 * Basic Health Check
 * GET /health
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'goal-strategy-service',
    version: env.API_VERSION,
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId
  });
}));

/**
 * Detailed Health Check
 * GET /health/detailed
 */
router.get('/detailed', asyncHandler(async (req: Request, res: Response) => {
  const logger = createContextLogger(req.correlationId || 'health-check');
  const startTime = Date.now();
  
  const healthChecks = {
    service: 'healthy',
    database: 'unknown',
    ai: 'unknown',
    features: {
      aiGoalTranslation: env.FEATURE_AI_GOAL_TRANSLATION,
      milestoneGeneration: env.FEATURE_MILESTONE_GENERATION,
      wbsAutomation: env.FEATURE_WBS_AUTOMATION,
      dependencyMapping: env.FEATURE_DEPENDENCY_MAPPING,
      estimationEngine: env.FEATURE_ESTIMATION_ENGINE,
      calendarIntegration: env.FEATURE_CALENDAR_INTEGRATION,
      capacityManagement: env.FEATURE_CAPACITY_MANAGEMENT
    }
  };

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    healthChecks.database = 'healthy';
    logger.info('Database health check passed');
  } catch (error) {
    healthChecks.database = 'unhealthy';
    logger.error('Database health check failed', { error });
  }

  // Check AI service (OpenAI) connectivity
  try {
    if (env.OPENAI_API_KEY && env.FEATURE_AI_GOAL_TRANSLATION) {
      // Simple test to verify API key is valid
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
      
      // Make a minimal request to test connectivity
      await openai.models.list();
      healthChecks.ai = 'healthy';
      logger.info('AI service health check passed');
    } else {
      healthChecks.ai = 'disabled';
    }
  } catch (error) {
    healthChecks.ai = 'unhealthy';
    logger.error('AI service health check failed', { error });
  }

  const duration = Date.now() - startTime;
  const overallStatus = Object.values(healthChecks).every(status => 
    status === 'healthy' || status === 'disabled'
  ) ? 'healthy' : 'unhealthy';

  res.status(overallStatus === 'healthy' ? 200 : 503).json({
    status: overallStatus,
    service: 'goal-strategy-service',
    version: env.API_VERSION,
    timestamp: new Date().toISOString(),
    duration,
    checks: healthChecks,
    correlationId: req.correlationId
  });
}));

/**
 * Readiness Probe
 * GET /health/ready
 */
router.get('/ready', asyncHandler(async (req: Request, res: Response) => {
  const logger = createContextLogger(req.correlationId || 'readiness-check');
  
  try {
    // Check if database is accessible
    await prisma.$queryRaw`SELECT 1`;
    
    logger.info('Readiness check passed');
    res.json({
      status: 'ready',
      service: 'goal-strategy-service',
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Readiness check failed', { error });
    res.status(503).json({
      status: 'not ready',
      service: 'goal-strategy-service',
      timestamp: new Date().toISOString(),
      error: 'Database not accessible',
      correlationId: req.correlationId
    });
  }
}));

/**
 * Liveness Probe
 * GET /health/live
 */
router.get('/live', asyncHandler(async (req: Request, res: Response) => {
  // Simple liveness check - if we can respond, we're alive
  res.json({
    status: 'alive',
    service: 'goal-strategy-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    correlationId: req.correlationId
  });
}));

/**
 * Metrics Endpoint
 * GET /health/metrics
 */
router.get('/metrics', asyncHandler(async (req: Request, res: Response) => {
  const logger = createContextLogger(req.correlationId || 'metrics-check');
  
  try {
    // Get basic database metrics
    const goalCount = await prisma.goal.count();
    const milestoneCount = await prisma.milestone.count();
    const taskCount = await prisma.task.count();
    
    const metrics = {
      service: 'goal-strategy-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        goals: goalCount,
        milestones: milestoneCount,
        tasks: taskCount
      },
      features: {
        aiGoalTranslation: env.FEATURE_AI_GOAL_TRANSLATION,
        milestoneGeneration: env.FEATURE_MILESTONE_GENERATION,
        wbsAutomation: env.FEATURE_WBS_AUTOMATION,
        dependencyMapping: env.FEATURE_DEPENDENCY_MAPPING,
        estimationEngine: env.FEATURE_ESTIMATION_ENGINE,
        calendarIntegration: env.FEATURE_CALENDAR_INTEGRATION,
        capacityManagement: env.FEATURE_CAPACITY_MANAGEMENT
      },
      correlationId: req.correlationId
    };

    logger.info('Metrics collected successfully', { 
      goalCount, 
      milestoneCount, 
      taskCount 
    });

    res.json(metrics);
  } catch (error) {
    logger.error('Failed to collect metrics', { error });
    res.status(500).json({
      error: 'Failed to collect metrics',
      service: 'goal-strategy-service',
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId
    });
  }
}));

export default router;