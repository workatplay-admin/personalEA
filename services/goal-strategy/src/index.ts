import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env, getCorsOrigins } from '@/config/environment';
import { logger } from '@/utils/logger';
import { requestLogger, performanceLogger } from '@/middleware/request-logger';
import { errorHandler, notFoundHandler } from '@/middleware/error-handler';

// Import routes
import healthRoutes from '@/routes/health';
import goalRoutes from '@/routes/goals';
import milestoneRoutes from '@/routes/milestones';
import wbsRoutes from '@/routes/wbs';
import dependencyRoutes from '@/routes/dependencies';
import estimationRoutes from '@/routes/estimations';
// import taskRoutes from '@/routes/tasks';
// import capacityRoutes from '@/routes/capacity';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: getCorsOrigins(),
  credentials: env.CORS_CREDENTIALS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Correlation-ID',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['X-Correlation-ID']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Request logging and performance monitoring
app.use(requestLogger);
app.use(performanceLogger(2000)); // Log requests taking more than 2 seconds

// Health check endpoint (simple)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'goal-strategy-service',
    version: env.API_VERSION,
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId
  });
});

// API routes
const apiRouter = express.Router();

// Mount API routes
apiRouter.use('/health', healthRoutes);
apiRouter.use('/goals', goalRoutes);
apiRouter.use('/milestones', milestoneRoutes);
apiRouter.use('/wbs', wbsRoutes);
apiRouter.use('/dependencies', dependencyRoutes);
apiRouter.use('/estimations', estimationRoutes);
// apiRouter.use('/tasks', taskRoutes);
// apiRouter.use('/capacity', capacityRoutes);

// Mount API router
app.use(`/api/${env.API_VERSION}`, apiRouter);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const server = app.listen(env.PORT, () => {
  logger.info('Goal & Strategy Service started', {
    port: env.PORT,
    environment: env.NODE_ENV,
    version: env.API_VERSION,
    features: {
      aiGoalTranslation: env.FEATURE_AI_GOAL_TRANSLATION,
      milestoneGeneration: env.FEATURE_MILESTONE_GENERATION,
      wbsAutomation: env.FEATURE_WBS_AUTOMATION,
      dependencyMapping: env.FEATURE_DEPENDENCY_MAPPING,
      estimationEngine: env.FEATURE_ESTIMATION_ENGINE,
      calendarIntegration: env.FEATURE_CALENDAR_INTEGRATION,
      capacityManagement: env.FEATURE_CAPACITY_MANAGEMENT
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

export default app;