import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, requireScopes } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { PlannerService } from '@/services/planner-service';

const router = Router();
const prisma = new PrismaClient();
const plannerService = new PlannerService(prisma);

// Validation schemas
const generateScheduleSchema = z.object({
  goal_id: z.string().cuid(),
  working_hours: z.object({
    monday: z.object({
      enabled: z.boolean(),
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/)
    }).optional(),
    tuesday: z.object({
      enabled: z.boolean(),
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/)
    }).optional(),
    wednesday: z.object({
      enabled: z.boolean(),
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/)
    }).optional(),
    thursday: z.object({
      enabled: z.boolean(),
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/)
    }).optional(),
    friday: z.object({
      enabled: z.boolean(),
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/)
    }).optional(),
    saturday: z.object({
      enabled: z.boolean(),
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/)
    }).optional(),
    sunday: z.object({
      enabled: z.boolean(),
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/)
    }).optional()
  }),
  constraints: z.object({
    max_hours_per_day: z.number().min(1).max(24).default(8),
    max_consecutive_hours: z.number().min(0.5).max(8).default(2),
    break_duration_minutes: z.number().min(5).max(120).default(15),
    preferred_task_duration_hours: z.number().min(0.5).max(4).default(1),
    avoid_context_switching: z.boolean().default(true)
  }).optional(),
  preferences: z.object({
    energy_levels: z.object({
      morning: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('HIGH'),
      afternoon: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
      evening: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('LOW')
    }).optional(),
    task_type_preferences: z.object({
      creative: z.array(z.string()).default(['morning']),
      analytical: z.array(z.string()).default(['morning', 'afternoon']),
      administrative: z.array(z.string()).default(['afternoon']),
      communication: z.array(z.string()).default(['afternoon'])
    }).optional()
  }).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional()
});

const updateScheduleSchema = z.object({
  schedule_id: z.string().cuid(),
  updates: z.array(z.object({
    task_id: z.string().cuid(),
    new_start_time: z.string().datetime(),
    new_end_time: z.string().datetime(),
    reason: z.string().optional()
  }))
});

const conflictResolutionSchema = z.object({
  conflict_id: z.string().cuid(),
  resolution_strategy: z.enum(['RESCHEDULE_TASK', 'SPLIT_TASK', 'EXTEND_DEADLINE', 'REDUCE_SCOPE']),
  parameters: z.object({}).passthrough().optional()
});

// Apply authentication to all routes
router.use(authenticateJWT);

/**
 * POST /api/v1/planner/schedule
 * Generate optimized schedule for a goal
 */
router.post('/schedule', requireScopes(['goals:write']), async (req, res, next): Promise<void> => {
  try {
    const scheduleData = generateScheduleSchema.parse(req.body);
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);

    logger.info('Schedule generation request', {
      correlationId,
      userId: req.user?.id,
      goalId: scheduleData.goal_id
    });

    // Verify goal ownership
    const goal = await prisma.goal.findFirst({
      where: {
        id: scheduleData.goal_id,
        userId: req.user!.id
      },
      include: {
        milestones: {
          include: {
            tasks: {
              include: {
                estimates: true
              }
            }
          }
        }
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

    // Generate schedule
    const schedule = await plannerService.generateSchedule(
      scheduleData.goal_id,
      scheduleData.working_hours,
      scheduleData.constraints,
      scheduleData.preferences,
      scheduleData.start_date ? new Date(scheduleData.start_date) : undefined,
      scheduleData.end_date ? new Date(scheduleData.end_date) : undefined
    );

    res.json({
      schedule,
      correlation_id: correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/planner/schedule/:goalId
 * Get current schedule for a goal
 */
router.get('/schedule/:goalId', requireScopes(['goals:read']), async (req, res, next): Promise<void> => {
  try {
    const goalId = req.params['goalId']!;
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);

    // Verify goal ownership
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

    const schedule = await plannerService.getSchedule(goalId);

    res.json({
      schedule,
      correlation_id: correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/planner/schedule
 * Update existing schedule
 */
router.put('/schedule', requireScopes(['goals:write']), async (req, res, next): Promise<void> => {
  try {
    const updateData = updateScheduleSchema.parse(req.body);
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);

    logger.info('Schedule update request', {
      correlationId,
      userId: req.user?.id,
      scheduleId: updateData.schedule_id,
      updatesCount: updateData.updates.length
    });

    // Verify schedule ownership through goal
    const schedule = await prisma.taskSchedule.findFirst({
      where: {
        id: updateData.schedule_id
      },
      include: {
        task: {
          include: {
            milestone: {
              include: {
                goal: true
              }
            }
          }
        }
      }
    });

    if (!schedule || schedule.task.milestone.goal.userId !== req.user!.id) {
      res.status(404).json({
        error: {
          code: 'SCHEDULE_NOT_FOUND',
          message: 'Schedule not found or access denied'
        }
      });
      return;
    }

    const updatedSchedule = await plannerService.updateSchedule(
      updateData.schedule_id,
      updateData.updates
    );

    res.json({
      schedule: updatedSchedule,
      correlation_id: correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/planner/conflicts/:goalId
 * Get scheduling conflicts for a goal
 */
router.get('/conflicts/:goalId', requireScopes(['goals:read']), async (req, res, next): Promise<void> => {
  try {
    const goalId = req.params['goalId']!;
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);

    // Verify goal ownership
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

    const conflicts = await plannerService.detectConflicts(goalId);

    res.json({
      conflicts,
      correlation_id: correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/planner/conflicts/resolve
 * Resolve a scheduling conflict
 */
router.post('/conflicts/resolve', requireScopes(['goals:write']), async (req, res, next): Promise<void> => {
  try {
    const resolutionData = conflictResolutionSchema.parse(req.body);
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);

    logger.info('Conflict resolution request', {
      correlationId,
      userId: req.user?.id,
      conflictId: resolutionData.conflict_id,
      strategy: resolutionData.resolution_strategy
    });

    // TODO: Implement conflict resolution once database schema is updated
    // For now, just verify the conflict exists in our temporary storage
    // This will be replaced with proper database queries once schema is migrated

    const resolution = await plannerService.resolveConflict(
      resolutionData.conflict_id,
      resolutionData.resolution_strategy,
      resolutionData.parameters
    );

    res.json({
      resolution,
      correlation_id: correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/planner/suggestions/:goalId
 * Get AI-powered scheduling suggestions
 */
router.get('/suggestions/:goalId', requireScopes(['goals:read']), async (req, res, next): Promise<void> => {
  try {
    const goalId = req.params['goalId']!;
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);
    const userApiKey = req.headers['x-openai-api-key'] as string;

    // Verify goal ownership
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

    const suggestions = await plannerService.generateAISuggestions(goalId, userApiKey);

    res.json({
      suggestions,
      correlation_id: correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/planner/analytics/:goalId
 * Get scheduling analytics and insights
 */
router.get('/analytics/:goalId', requireScopes(['goals:read']), async (req, res, next): Promise<void> => {
  try {
    const goalId = req.params['goalId']!;
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);

    // Verify goal ownership
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

    const analytics = await plannerService.getScheduleAnalytics(goalId);

    res.json({
      analytics,
      correlation_id: correlationId
    });

  } catch (error) {
    next(error);
  }
});

export default router;