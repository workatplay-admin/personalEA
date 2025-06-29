import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, requireScopes } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { smartGoalProcessor, RawGoalInput, ClarificationAnswer } from '@/services/smart-goal-processor';
import { contextualHelpHandler, componentQuestionHandler } from './goals-chat-endpoints';

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
  }).optional(),
  mode: z.enum(['automatic', 'interactive']).optional().default('automatic')
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
router.post('/translate', requireScopes(['goals:write']), async (req, res, next): Promise<void> => {
  try {
    const { raw_goal, context, mode } = translateGoalSchema.parse(req.body);
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);
    const userApiKey = req.headers['x-openai-api-key'] as string;

    logger.info('Goal translation request', {
      correlationId,
      userId: req.user?.id,
      rawGoal: raw_goal,
      mode,
      hasUserApiKey: !!userApiKey
    });

    // Validate API key if provided
    if (userApiKey && !userApiKey.startsWith('sk-')) {
      res.status(400).json({
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid OpenAI API key format',
          correlationId
        }
      });
      return;
    }

    const input: RawGoalInput = {
      goal: raw_goal,
      context: context ? Object.fromEntries(
        Object.entries({
          timeframe: context.timeframe,
          resources: context.resources,
          constraints: context.constraints,
          priority: context.priority
        }).filter(([_, value]) => value !== undefined)
      ) as any : undefined,
      mode
    };

    const result = await smartGoalProcessor.translateGoal(input, userApiKey);

    // Save the goal to database so clarify endpoint can find it
    const savedGoal = await prisma.goal.create({
      data: {
        id: correlationId, // Use correlation ID as goal ID
        userId: req.user!.id,
        title: result.smartGoal,
        rawGoal: raw_goal,
        smartCriteria: result.smartCriteria as any,
        status: 'ACTIVE'
      }
    });

    res.json({
      success: true,
      data: {
        id: savedGoal.id,
        title: result.smartGoal,
        description: result.smartGoal,
        criteria: result.smartCriteria,
        missingCriteria: result.missingCriteria,
        clarificationQuestions: result.clarificationQuestions,
        confidence: result.confidence,
        correlation_id: correlationId,
        status: 'DRAFT',
        priority: 'MEDIUM',
        mode: result.mode,
        needsRefinement: result.needsRefinement,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/goals/:id/clarify
 * Get clarification questions for a specific goal
 */
router.post('/:id/clarify', requireScopes(['goals:read']), async (req, res, next): Promise<void> => {
  try {
    const goalId = req.params['id']!;
    const { clarifications, goalContext } = req.body;
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);

    logger.info('Goal clarification request for specific goal', {
      correlationId,
      userId: req.user?.id,
      goalId,
      hasClarifications: !!clarifications,
      hasContext: !!goalContext
    });

    // Get existing goal
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: req.user!.id
      },
      include: {
        clarifications: true
      }
    });

    if (!goal) {
      res.status(404).json({
        error: {
          code: 'GOAL_NOT_FOUND',
          message: 'Goal not found or access denied',
          correlationId
        }
      });
      return;
    }

    // If clarifications are provided, process them
    if (clarifications && Array.isArray(clarifications) && clarifications.length > 0) {
      // Filter out any empty or already-processed clarifications
      const newClarifications = clarifications.filter((c: any) => 
        c.answer && c.answer.trim().length > 0
      );

      if (newClarifications.length === 0) {
        // No new clarifications to process
        res.json({
          success: true,
          data: {
            ...goal,
            confidence: 0.75,
            updatedAt: goal.updatedAt.toISOString()
          },
          message: "No new clarifications to process",
          correlation_id: correlationId
        });
        return;
      }

      const clarificationAnswers: ClarificationAnswer[] = newClarifications.map((c: any) => ({
        question: c.question,
        answer: c.answer.trim(),
        smartCriterion: c.smartCriterion
      }));

      const userApiKey = req.headers['x-openai-api-key'] as string;
      
      const result = await smartGoalProcessor.processClarifications(
        goal.rawGoal || goal.title,
        goal.smartCriteria as any,
        clarificationAnswers,
        userApiKey
      );

      // Update goal with improved SMART criteria
      const updatedGoal = await prisma.goal.update({
        where: { id: goalId },
        data: {
          title: result.smartGoal,
          smartCriteria: result.smartCriteria as any,
          updatedAt: new Date()
        }
      });

      // Save clarification answers (only new ones)
      await Promise.all(newClarifications.map((clarification: any) => 
        prisma.goalClarification.create({
          data: {
            goalId,
            question: clarification.question,
            answer: clarification.answer.trim(),
            smartCriterion: clarification.smartCriterion,
            status: 'ANSWERED'
          }
        })
      ));

      res.json({
        success: true,
        data: {
          ...updatedGoal,
          confidence: result.confidence,
          remaining_questions: result.clarificationQuestions,
          updatedAt: updatedGoal.updatedAt.toISOString()
        },
        correlation_id: correlationId
      });
    } else {
      // Just return the current goal state with any pending clarifications
      const pendingClarifications = goal.clarifications.filter(c => c.status === 'PENDING');
      
      res.json({
        success: true,
        data: {
          ...goal,
          clarification_questions: pendingClarifications.map(c => ({
            id: c.id,
            question: c.question,
            smartCriterion: c.smartCriterion
          })),
          confidence: 0.75, // Default confidence
          updatedAt: goal.updatedAt.toISOString()
        },
        correlation_id: correlationId
      });
    }

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/goals/clarify
 * Process clarification answers to improve SMART goal
 */
router.post('/clarify', requireScopes(['goals:write']), async (req, res, next): Promise<void> => {
  try {
    const { goal_id, answers } = clarifyGoalSchema.parse(req.body);
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);

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
      res.status(404).json({
        error: {
          code: 'GOAL_NOT_FOUND',
          message: 'Goal not found or access denied'
        }
      });
      return;
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
        smartCriteria: result.smartCriteria as any,
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
      success: true,
      data: {
        id: updatedGoal.id,
        title: updatedGoal.title,
        description: updatedGoal.description,
        smart_criteria: result.smartCriteria,
        remaining_missing_criteria: result.missingCriteria,
        additional_questions: result.clarificationQuestions,
        confidence: result.confidence,
        correlation_id: correlationId,
        status: updatedGoal.status,
        priority: updatedGoal.priority,
        created_at: updatedGoal.createdAt.toISOString(),
        updated_at: updatedGoal.updatedAt.toISOString()
      }
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
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);

    logger.info('Goal creation request', {
      correlationId,
      userId: req.user?.id,
      title: goalData.title
    });

    const goal = await prisma.goal.create({
      data: {
        userId: req.user!.id,
        title: goalData.title,
        description: goalData.description || null,
        smartCriteria: goalData.smart_criteria,
        priority: goalData.priority,
        category: goalData.category || null,
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
      success: true,
      data: goal,
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
      success: true,
      data: {
        goals,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      },
      correlation_id: req.correlationId || Math.random().toString(36).substring(7)
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/goals/:id
 * Get specific goal with full details
 */
router.get('/:id', requireScopes(['goals:read']), async (req, res, next): Promise<void> => {
  try {
    const goalId = req.params['id']!;

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
      res.status(404).json({
        error: {
          code: 'GOAL_NOT_FOUND',
          message: 'Goal not found or access denied'
        }
      });
      return;
    }

    // Calculate progress
    const milestones = (goal as any).milestones || [];
    const totalTasks = milestones.reduce((sum: number, m: any) => sum + m.tasks.length, 0);
    const completedTasks = milestones.reduce(
      (sum: number, m: any) => sum + m.tasks.filter((t: any) => t.status === 'COMPLETED').length,
      0
    );
    const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    res.json({
      success: true,
      data: {
        goal,
        progress: {
          percentage: progressPercentage,
          completed_tasks: completedTasks,
          total_tasks: totalTasks,
          completed_milestones: milestones.filter((m: any) => m.status === 'COMPLETED').length,
          total_milestones: milestones.length
        }
      },
      correlation_id: req.correlationId || Math.random().toString(36).substring(7)
    });

  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/goals/:id
 * Update goal
 */
router.put('/:id', requireScopes(['goals:write']), async (req, res, next): Promise<void> => {
  try {
    const goalId = req.params['id']!;
    const updates = updateGoalSchema.parse(req.body);

    const existingGoal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: req.user!.id
      }
    });

    if (!existingGoal) {
      res.status(404).json({
        error: {
          code: 'GOAL_NOT_FOUND',
          message: 'Goal not found or access denied'
        }
      });
      return;
    }

    const updateData: any = {
      ...updates,
      updatedAt: new Date()
    };
    
    if (updates.target_date !== undefined) {
      updateData.targetDate = updates.target_date ? new Date(updates.target_date) : null;
    }
    
    if (updates.status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }
    
    // Remove the target_date field as it's not part of the Prisma schema
    delete updateData.target_date;

    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: updateData,
      include: {
        metrics: true,
        milestones: true
      }
    });

    logger.info('Goal updated', {
      correlationId: req.correlationId || Math.random().toString(36).substring(7),
      userId: req.user?.id,
      goalId,
      updates: Object.keys(updates)
    });

    res.json({
      success: true,
      data: goal,
      correlation_id: req.correlationId || Math.random().toString(36).substring(7)
    });

  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/goals/:id
 * Delete goal
 */
router.delete('/:id', requireScopes(['goals:write']), async (req, res, next): Promise<void> => {
  try {
    const goalId = req.params['id']!;

    const existingGoal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: req.user!.id
      }
    });

    if (!existingGoal) {
      res.status(404).json({
        error: {
          code: 'GOAL_NOT_FOUND',
          message: 'Goal not found or access denied'
        }
      });
      return;
    }

    await prisma.goal.delete({
      where: { id: goalId }
    });

    logger.info('Goal deleted', {
      correlationId: req.correlationId || Math.random().toString(36).substring(7),
      userId: req.user?.id,
      goalId
    });

    res.json({
      success: true,
      data: { deleted: true },
      correlation_id: req.correlationId || Math.random().toString(36).substring(7)
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/goals/:id/smart-analysis
 * Get SMART criteria analysis for goal
 */
router.get('/:id/smart-analysis', requireScopes(['goals:read']), async (req, res, next): Promise<void> => {
  try {
    const goalId = req.params['id']!;

    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: req.user!.id
      }
    });

    if (!goal) {
      res.status(404).json({
        error: {
          code: 'GOAL_NOT_FOUND',
          message: 'Goal not found or access denied'
        }
      });
      return;
    }

    const userApiKey = req.headers['x-openai-api-key'] as string;
    const analysis = await smartGoalProcessor.analyzeGoalCompleteness(
      goal.smartCriteria as any,
      userApiKey
    );

    res.json({
      success: true,
      data: {
        goal_id: goalId,
        smart_criteria: goal.smartCriteria,
        analysis
      },
      correlation_id: req.correlationId || Math.random().toString(36).substring(7)
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/goals/:id/metrics
 * Add success metric to goal
 */
router.post('/:id/metrics', requireScopes(['goals:write']), async (req, res, next): Promise<void> => {
  try {
    const goalId = req.params['id']!;
    const metricData = createMetricSchema.parse(req.body);

    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: req.user!.id
      }
    });

    if (!goal) {
      res.status(404).json({
        error: {
          code: 'GOAL_NOT_FOUND',
          message: 'Goal not found or access denied'
        }
      });
      return;
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
        baselineValue: metricData.baseline_value || null,
        unit: metricData.unit || null,
        measurementFrequency: metricData.measurement_frequency || null,
        isPrimary: metricData.is_primary
      }
    });

    res.status(201).json({
      success: true,
      data: metric,
      correlation_id: req.correlationId || Math.random().toString(36).substring(7)
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/goals/:id/metrics/tracking
 * Get metric tracking status
 */
router.get('/:id/metrics/tracking', requireScopes(['goals:read']), async (req, res, next): Promise<void> => {
  try {
    const goalId = req.params['id']!;

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
      res.status(404).json({
        error: {
          code: 'GOAL_NOT_FOUND',
          message: 'Goal not found or access denied'
        }
      });
      return;
    }

    const metrics = (goal as any).metrics || [];
    const tracking = metrics.map((metric: any) => ({
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
      success: true,
      data: {
        goal_id: goalId,
        metrics: tracking
      },
      correlation_id: req.correlationId || Math.random().toString(36).substring(7)
    });

  } catch (error) {
    next(error);
  }
});

// Chat endpoint handlers already imported at the top

/**
 * POST /api/v1/goals/interactive-refine
 * Interactive goal refinement through chat
 */
router.post('/interactive-refine', requireScopes(['goals:write']), async (req, res, next): Promise<void> => {
  try {
    const { goal_id, component, user_response, conversation_history } = req.body;
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);
    const userApiKey = req.headers['x-openai-api-key'] as string;

    logger.info('Interactive goal refinement request', {
      correlationId,
      userId: req.user?.id,
      goalId: goal_id,
      component,
      hasUserResponse: !!user_response
    });

    // Get existing goal
    const goal = await prisma.goal.findFirst({
      where: {
        id: goal_id,
        userId: req.user!.id
      }
    });

    if (!goal) {
      res.status(404).json({
        error: {
          code: 'GOAL_NOT_FOUND',
          message: 'Goal not found or access denied',
          correlationId
        }
      });
      return;
    }

    // Build prompt for refinement
    const systemPrompt = `You are helping refine a goal interactively. The user has provided input about the "${component}" component.
Original goal: "${goal.rawGoal || goal.title}"
User's response: "${user_response}"

Based on this input, suggest how to improve the ${component} aspect of their goal.
Provide:
1. An improved description for this component
2. Specific suggestions for further refinement
3. A follow-up question if more clarification is needed

Respond in JSON format:
{
  "improvedComponent": "string",
  "suggestions": ["string"],
  "followUpQuestion": "string or null",
  "confidenceIncrease": number (0-0.3)
}`;

    // Messages array prepared but not used in current implementation
    // const messages = [
    //   { role: 'system', content: systemPrompt },
    //   ...(conversation_history || [])
    // ];

    const apiKey = userApiKey || process.env.OPENAI_API_KEY;
    const aiResponse = await smartGoalProcessor['callOpenAI'](systemPrompt, correlationId, apiKey);
    const refinementResult = JSON.parse(smartGoalProcessor['stripMarkdownCodeBlocks'](aiResponse));

    // Update the specific component in the goal's SMART criteria
    const updatedCriteria = goal.smartCriteria as any;
    if (updatedCriteria[component]) {
      updatedCriteria[component].value = refinementResult.improvedComponent;
      updatedCriteria[component].confidence = Math.min(
        1,
        (updatedCriteria[component].confidence || 0.5) + refinementResult.confidenceIncrease
      );
    }

    // Update goal in database
    await prisma.goal.update({
      where: { id: goal_id },
      data: {
        smartCriteria: updatedCriteria,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: {
        goal_id,
        component,
        improvedValue: refinementResult.improvedComponent,
        suggestions: refinementResult.suggestions,
        followUpQuestion: refinementResult.followUpQuestion,
        updatedConfidence: updatedCriteria[component]?.confidence || 0,
        overallProgress: calculateOverallProgress(updatedCriteria)
      },
      correlation_id: correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/goals/analyze-without-transform
 * Analyze a goal without automatic transformation
 */
router.post('/analyze-without-transform', requireScopes(['goals:read']), async (req, res, next): Promise<void> => {
  try {
    const { raw_goal, context } = req.body;
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);
    const userApiKey = req.headers['x-openai-api-key'] as string;

    logger.info('Goal analysis without transformation request', {
      correlationId,
      userId: req.user?.id,
      rawGoal: raw_goal
    });

    const input: RawGoalInput = {
      goal: raw_goal,
      context,
      mode: 'interactive'
    };

    const analysis = await smartGoalProcessor.analyzeGoalInteractive(input, userApiKey);

    res.json({
      success: true,
      data: {
        rawGoal: analysis.rawGoal,
        analysis: analysis.analysis,
        smartComponents: analysis.smartComponents,
        confidence: analysis.confidence,
        recommendedQuestions: analysis.recommendedQuestions
      },
      correlation_id: correlationId
    });

  } catch (error) {
    next(error);
  }
});

// Helper function to calculate overall progress
function calculateOverallProgress(criteria: any): number {
  const components = ['specific', 'measurable', 'achievable', 'relevant', 'timeBound'];
  const totalConfidence = components.reduce((sum, comp) => {
    return sum + (criteria[comp]?.confidence || 0);
  }, 0);
  return (totalConfidence / components.length) * 100;
}

// Chat endpoints
router.post('/contextual-help', authenticateJWT, requireScopes(['goals:write']), contextualHelpHandler);
router.post('/component-question', authenticateJWT, requireScopes(['goals:write']), componentQuestionHandler);

export default router;