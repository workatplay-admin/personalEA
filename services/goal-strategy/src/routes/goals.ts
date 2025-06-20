import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, requireScopes } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { smartGoalProcessor, RawGoalInput, ClarificationAnswer } from '@/services/smart-goal-processor';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const translateGoalSchema = z.object({
  raw_goal: z.string().min(1, 'Goal cannot be empty'),
  context: z.object({
    timeframe: z.string().optional(),
    resources: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional()
  }).optional()
});

const clarifyGoalSchema = z.object({
  goal_id: z.string().cuid(),
  answers: z.array(z.object({
    question: z.string(),
    answer: z.string(),
    smartCriterion: z.enum(['specific', 'measurable', 'achievable', 'relevant', 'timeBound'])
  }))
});

const createGoalSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  smart_criteria: z.object({
    specific: z.object({
      value: z.string(),
      confidence: z.number().min(0).max(1),
      missing: z.array(z.string()).optional()
    }),
    measurable: z.object({
      value: z.string(),
      metrics: z.array(z.string()),
      confidence: z.number().min(0).max(1),
      missing: z.array(z.string()).optional()
    }),
    achievable: z.object({
      value: z.string(),
      confidence: z.number().min(0).max(1),
      missing: z.array(z.string()).optional()
    }),
    relevant: z.object({
      value: z.string(),
      confidence: z.number().min(0).max(1),
      missing: z.array(z.string()).optional()
    }),
    timeBound: z.object({
      value: z.string(),
      deadline: z.string().optional(),
      confidence: z.number().min(0).max(1),
      missing: z.array(z.string()).optional()
    })
  }),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  target_date: z.string().datetime().optional()
});

const updateGoalSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  smart_criteria: z.object({}).passthrough().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  target_date: z.string().datetime().optional()
});

const createMetricSchema = z.object({
  name: z.string().min(1, 'Metric name is required'),
  type: z.enum(['NUMERIC', 'PERCENTAGE', 'BOOLEAN', 'CURRENCY', 'COUNT']),
  target_value: z.number(),
  baseline_value: z.number().optional(),
  unit: z.string().optional(),
  measurement_frequency: z.string().optional(),
  is_primary: z.boolean().default(false)
});

// Apply authentication to all routes
router.use(authenticateJWT);

/**
 * POST /api/v1/goals/translate
 * Convert raw goal to SMART format using AI
 */
router.post('/translate', requireScopes(['goals:write']), async (req, res, next) => {
  try {
    const { raw_goal, context } = translateGoalSchema.parse(req.body);
    const correlationId = req.correlationId;
    const userApiKey = req.headers['x-openai-api-key'] as string;

    logger.info('Goal translation request', {
      correlationId,
      userId: req.user?.id,
      rawGoal: raw_goal,
      hasUserApiKey: !!userApiKey
    });

    const input: RawGoalInput = {
      goal: raw_goal,
      context: context ? Object.fromEntries(
        Object.entries({
          timeframe: context.timeframe,
          resources: context.resources,
          constraints: context.constraints,
          priority: context.priority
        }).filter(([_, value]) => value !== undefined)
      ) as any : undefined
    };

    const result = await smartGoalProcessor.translateGoal(input, userApiKey);

    res.json({
      smart_goal: result.smartGoal,
      smart_criteria: result.smartCriteria,
      missing_criteria: result.missingCriteria,
      clarification_questions: result.clarificationQuestions,
      confidence: result.confidence,
      correlation_id: correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/goals/clarify
 * Process clarification answers to improve SMART goal
 */
router.post('/clarify', requireScopes(['goals:write']), async (req, res, next) => {
  try {
    const { goal_id, answers } = clarifyGoalSchema.parse(req.body);
    const correlationId = req.correlationId;

    logger.info('Goal clarification request', {
      correlationId,
      userId: req.user?.id,
      goalId: goal_id,
      answersCount: answers.length
    });

    // Get existing goal
    const goal = await prisma.goal.findFirst({
      where: {
        id: goal_id,
        userId: req.user!.id
      }
    });

    if (!goal) {
      return res.status(404).json({
        error: {
          code: 'GOAL_NOT_FOUND',
          message: 'Goal not found or access denied'
        }
      });
    }

    const clarificationAnswers: ClarificationAnswer[] = answers.map(a => ({
      question: a.question,
      answer: a.answer,
      smartCriterion: a.smartCriterion
    }));

    const result = await smartGoalProcessor.processClarifications(
      goal.rawGoal || goal.title,
      goal.smartCriteria as any,
      clarificationAnswers
    );

    // Update goal with improved SMART criteria
    const updatedGoal = await prisma.goal.update({
      where: { id: goal_id },
      data: {
        title: result.smartGoal,
        smartCriteria: result.smartCriteria,
        updatedAt: new Date()
      }
    });

    // Save clarification answers
    await Promise.all(answers.map(answer => 
      prisma.goalClarification.create({
        data: {
          goalId: goal_id,
          question: answer.question,
          answer: answer.answer,
          smartCriterion: answer.smartCriterion,
          status: 'ANSWERED'
        }
      })
    ));

    res.json({
      goal: updatedGoal,
      smart_criteria: result.smartCriteria,
      remaining_missing_criteria: result.missingCriteria,
      additional_questions: result.clarificationQuestions,
      confidence: result.confidence,
      correlation_id: correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/goals
 * Create a new goal
 */
router.post('/', requireScopes(['goals:write']), async (req, res, next) => {
  try {
    const goalData = createGoalSchema.parse(req.body);
    const correlationId = req.correlationId;

    logger.info('Goal creation request', {
      correlationId,
      userId: req.user?.id,
      title: goalData.title
    });

    const goal = await prisma.goal.create({
      data: {
        userId: req.user!.id,
        title: goalData.title,
        description: goalData.description,
        smartCriteria: goalData.smart_criteria,
        priority: goalData.priority,
        category: goalData.category,
        tags: goalData.tags,
        targetDate: goalData.target_date ? new Date(goalData.target_date) : null,
        status: 'DRAFT'
      },
      include: {
        metrics: true,
        milestones: true
      }
    });

    res.status(201).json({
      goal,
      correlation_id: correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/goals
 * List user's goals with filtering and pagination
 */
router.get('/', requireScopes(['goals:read']), async (req, res, next) => {
  try {
    const page = parseInt(req.query['page'] as string) || 1;
    const limit = Math.min(parseInt(req.query['limit'] as string) || 20, 100);
    const offset = (page - 1) * limit;
    
    const status = req.query['status'] as string;
    const category = req.query['category'] as string;
    const priority = req.query['priority'] as string;

    const where: any = {
      userId: req.user!.id
    };

    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    const [goals, total] = await Promise.all([
      prisma.goal.findMany({
        where,
        include: {
          metrics: true,
          milestones: {
            include: {
              tasks: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.goal.count({ where })
    ]);

    res.json({
      goals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      correlation_id: req.correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/goals/:id
 * Get specific goal with full details
 */
router.get('/:id', requireScopes(['goals:read']), async (req, res, next) => {
  try {
    const goalId = req.params['id'];

    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: req.user!.id
      },
      include: {
        metrics: true,
        milestones: {
          include: {
            tasks: {
              include: {
                estimates: true,
                schedules: true
              }
            },
            progress: true
          },
          orderBy: { orderIndex: 'asc' }
        },
        clarifications: true
      }
    });

    if (!goal) {
      return res.status(404).json({
        error: {
          code: 'GOAL_NOT_FOUND',
          message: 'Goal not found or access denied'
        }
      });
    }

    // Calculate progress
    const totalTasks = goal.milestones.reduce((sum: number, m: any) => sum + m.tasks.length, 0);
    const completedTasks = goal.milestones.reduce(
      (sum: number, m: any) => sum + m.tasks.filter((t: any) => t.status === 'COMPLETED').length,
      0
    );
    const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    res.json({
      goal,
      progress: {
        percentage: progressPercentage,
        completed_tasks: completedTasks,
        total_tasks: totalTasks,
        completed_milestones: goal.milestones.filter((m: any) => m.status === 'COMPLETED').length,
        total_milestones: goal.milestones.length
      },
      correlation_id: req.correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/goals/:id
 * Update goal
 */
router.put('/:id', requireScopes(['goals:write']), async (req, res, next) => {
  try {
    const goalId = req.params['id'];
    const updates = updateGoalSchema.parse(req.body);

    const existingGoal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: req.user!.id
      }
    });

    if (!existingGoal) {
      return res.status(404).json({
        error: {
          code: 'GOAL_NOT_FOUND',
          message: 'Goal not found or access denied'
        }
      });
    }

    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        ...updates,
        targetDate: updates.target_date ? new Date(updates.target_date) : undefined,
        completedAt: updates.status === 'COMPLETED' ? new Date() : undefined,
        updatedAt: new Date()
      },
      include: {
        metrics: true,
        milestones: true
      }
    });

    logger.info('Goal updated', {
      correlationId: req.correlationId,
      userId: req.user?.id,
      goalId,
      updates: Object.keys(updates)
    });

    res.json({
      goal,
      correlation_id: req.correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/goals/:id
 * Delete goal
 */
router.delete('/:id', requireScopes(['goals:write']), async (req, res, next) => {
  try {
    const goalId = req.params['id'];

    const existingGoal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: req.user!.id
      }
    });

    if (!existingGoal) {
      return res.status(404).json({
        error: {
          code: 'GOAL_NOT_FOUND',
          message: 'Goal not found or access denied'
        }
      });
    }

    await prisma.goal.delete({
      where: { id: goalId }
    });

    logger.info('Goal deleted', {
      correlationId: req.correlationId,
      userId: req.user?.id,
      goalId
    });

    res.json({
      success: true,
      correlation_id: req.correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/goals/:id/smart-analysis
 * Get SMART criteria analysis for goal
 */
router.get('/:id/smart-analysis', requireScopes(['goals:read']), async (req, res, next) => {
  try {
    const goalId = req.params['id'];

    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: req.user!.id
      }
    });

    if (!goal) {
      return res.status(404).json({
        error: {
          code: 'GOAL_NOT_FOUND',
          message: 'Goal not found or access denied'
        }
      });
    }

    const analysis = await smartGoalProcessor.analyzeGoalCompleteness(
      goal.smartCriteria as any
    );

    res.json({
      goal_id: goalId,
      smart_criteria: goal.smartCriteria,
      analysis,
      correlation_id: req.correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/goals/:id/metrics
 * Add success metric to goal
 */
router.post('/:id/metrics', requireScopes(['goals:write']), async (req, res, next) => {
  try {
    const goalId = req.params['id'];
    const metricData = createMetricSchema.parse(req.body);

    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: req.user!.id
      }
    });

    if (!goal) {
      return res.status(404).json({
        error: {
          code: 'GOAL_NOT_FOUND',
          message: 'Goal not found or access denied'
        }
      });
    }

    // If this is a primary metric, unset other primary metrics
    if (metricData.is_primary) {
      await prisma.goalMetric.updateMany({
        where: { goalId },
        data: { isPrimary: false }
      });
    }

    const metric = await prisma.goalMetric.create({
      data: {
        goalId,
        name: metricData.name,
        type: metricData.type,
        targetValue: metricData.target_value,
        baselineValue: metricData.baseline_value,
        unit: metricData.unit,
        measurementFrequency: metricData.measurement_frequency,
        isPrimary: metricData.is_primary
      }
    });

    res.status(201).json({
      metric,
      correlation_id: req.correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/goals/:id/metrics/tracking
 * Get metric tracking status
 */
router.get('/:id/metrics/tracking', requireScopes(['goals:read']), async (req, res, next) => {
  try {
    const goalId = req.params['id'];

    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: req.user!.id
      },
      include: {
        metrics: true
      }
    });

    if (!goal) {
      return res.status(404).json({
        error: {
          code: 'GOAL_NOT_FOUND',
          message: 'Goal not found or access denied'
        }
      });
    }

    const tracking = goal.metrics.map((metric: any) => ({
      id: metric.id,
      name: metric.name,
      type: metric.type,
      target_value: metric.targetValue,
      current_value: metric.currentValue,
      baseline_value: metric.baselineValue,
      progress_percentage: metric.baselineValue 
        ? ((metric.currentValue - metric.baselineValue) / (metric.targetValue - metric.baselineValue)) * 100
        : (metric.currentValue / metric.targetValue) * 100,
      is_primary: metric.isPrimary,
      unit: metric.unit,
      measurement_frequency: metric.measurementFrequency
    }));

    res.json({
      goal_id: goalId,
      metrics: tracking,
      correlation_id: req.correlationId
    });

  } catch (error) {
    next(error);
  }
});

export default router;