import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, requireScopes } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { milestoneGenerator, MilestoneGenerationInput } from '@/services/milestone-generator';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const generateMilestonesSchema = z.object({
  preferences: z.object({
    milestone_count: z.number().min(2).max(6).optional(),
    distribution_strategy: z.enum(['EVEN', 'FRONT_LOADED', 'BACK_LOADED']).optional(),
    include_buffer_time: z.boolean().optional()
  }).optional()
});

const createMilestoneSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  target_date: z.string().datetime(),
  completion_criteria: z.string().min(1, 'Completion criteria is required'),
  order_index: z.number().min(0).optional(),
  estimated_effort: z.number().min(0).optional()
});

const updateMilestoneSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  target_date: z.string().datetime().optional(),
  completion_criteria: z.string().optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']).optional(),
  order_index: z.number().min(0).optional(),
  estimated_effort: z.number().min(0).optional(),
  progress_percentage: z.number().min(0).max(100).optional(),
  notes: z.string().optional()
});

const recordProgressSchema = z.object({
  progress_percentage: z.number().min(0).max(100),
  notes: z.string().optional()
});

// Apply authentication to all routes
router.use(authenticateJWT);

/**
 * POST /api/v1/goals/:goalId/milestones/generate
 * Generate milestone breakdown for a goal using AI
 */
router.post('/:goalId/milestones/generate', requireScopes(['goals:write']), async (req, res, next) => {
  try {
    const goalId = req.params['goalId']!;
    const { preferences } = generateMilestonesSchema.parse(req.body);
    const correlationId = req.correlationId;

    logger.info('Milestone generation request', {
      correlationId,
      userId: req.user?.id,
      goalId,
      preferences
    });

    // Get the goal with SMART criteria
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

    // Prepare input for milestone generator
    const input: MilestoneGenerationInput = {
      goalId,
      goalTitle: goal.title,
      smartCriteria: goal.smartCriteria as any,
      targetDate: goal.targetDate || undefined,
      preferences: preferences ? {
        ...(preferences.milestone_count !== undefined && { milestoneCount: preferences.milestone_count }),
        ...(preferences.distribution_strategy !== undefined && { distributionStrategy: preferences.distribution_strategy }),
        ...(preferences.include_buffer_time !== undefined && { includeBufferTime: preferences.include_buffer_time })
      } : undefined
    };

    const result = await milestoneGenerator.generateMilestones(input);

    // Save generated milestones to database
    const createdMilestones = await Promise.all(
      result.milestones.map(milestone =>
        prisma.milestone.create({
          data: {
            goalId,
            title: milestone.title,
            description: milestone.description,
            targetDate: milestone.targetDate,
            completionCriteria: milestone.completionCriteria,
            orderIndex: milestone.orderIndex,
            status: 'NOT_STARTED'
          }
        })
      )
    );

    res.json({
      milestones: createdMilestones,
      generation_result: {
        rationale: result.rationale,
        timeline: result.timeline,
        confidence: result.confidence
      },
      correlation_id: correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/goals/:goalId/milestones
 * Create a new milestone for a goal
 */
router.post('/:goalId/milestones', requireScopes(['goals:write']), async (req, res, next) => {
  try {
    const goalId = req.params['goalId']!;
    const milestoneData = createMilestoneSchema.parse(req.body);
    const correlationId = req.correlationId;

    logger.info('Milestone creation request', {
      correlationId,
      userId: req.user?.id,
      goalId,
      title: milestoneData.title
    });

    // Verify goal ownership
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

    // Get next order index if not provided
    let orderIndex = milestoneData.order_index;
    if (orderIndex === undefined) {
      const lastMilestone = await prisma.milestone.findFirst({
        where: { goalId },
        orderBy: { orderIndex: 'desc' }
      });
      orderIndex = (lastMilestone?.orderIndex || 0) + 1;
    }

    const milestone = await prisma.milestone.create({
      data: {
        goalId,
        title: milestoneData.title,
        description: milestoneData.description,
        targetDate: new Date(milestoneData.target_date),
        completionCriteria: milestoneData.completion_criteria,
        orderIndex,
        status: 'NOT_STARTED'
      }
    });

    res.status(201).json({
      milestone,
      correlation_id: correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/goals/:goalId/milestones
 * Get all milestones for a goal
 */
router.get('/:goalId/milestones', requireScopes(['goals:read']), async (req, res, next) => {
  try {
    const goalId = req.params['goalId']!;

    // Verify goal ownership
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

    const milestones = await prisma.milestone.findMany({
      where: { goalId },
      include: {
        tasks: {
          include: {
            estimates: true,
            schedules: true
          }
        },
        progress: {
          orderBy: { recordedAt: 'desc' },
          take: 5 // Last 5 progress records
        }
      },
      orderBy: { orderIndex: 'asc' }
    });

    // Calculate progress for each milestone
    const milestonesWithProgress = milestones.map((milestone: any) => {
      const totalTasks = milestone.tasks.length;
      const completedTasks = milestone.tasks.filter((t: any) => t.status === 'COMPLETED').length;
      const calculatedProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      return {
        ...milestone,
        calculated_progress: calculatedProgress,
        task_summary: {
          total: totalTasks,
          completed: completedTasks,
          in_progress: milestone.tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
          not_started: milestone.tasks.filter((t: any) => t.status === 'NOT_STARTED').length
        }
      };
    });

    res.json({
      milestones: milestonesWithProgress,
      correlation_id: req.correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/milestones/:id
 * Get specific milestone with full details
 */
router.get('/:id', requireScopes(['goals:read']), async (req, res, next) => {
  try {
    const milestoneId = req.params['id']!;

    const milestone = await prisma.milestone.findFirst({
      where: { id: milestoneId },
      include: {
        goal: {
          where: { userId: req.user!.id }
        },
        tasks: {
          include: {
            estimates: true,
            schedules: true,
            predecessors: {
              include: {
                predecessorTask: true
              }
            },
            successors: {
              include: {
                successorTask: true
              }
            }
          }
        },
        progress: {
          orderBy: { recordedAt: 'desc' }
        }
      }
    });

    if (!milestone || !milestone.goal) {
      return res.status(404).json({
        error: {
          code: 'MILESTONE_NOT_FOUND',
          message: 'Milestone not found or access denied'
        }
      });
    }

    // Calculate detailed progress metrics
    const totalTasks = milestone.tasks.length;
    const completedTasks = milestone.tasks.filter((t: any) => t.status === 'COMPLETED').length;
    const totalEstimatedHours = milestone.tasks.reduce((sum: number, t: any) => sum + (t.estimatedHours || 0), 0);
    const completedHours = milestone.tasks
      .filter((t: any) => t.status === 'COMPLETED')
      .reduce((sum: number, t: any) => sum + (t.actualHours || t.estimatedHours || 0), 0);

    res.json({
      milestone,
      progress_metrics: {
        task_completion: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        hour_completion: totalEstimatedHours > 0 ? (completedHours / totalEstimatedHours) * 100 : 0,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        total_estimated_hours: totalEstimatedHours,
        completed_hours: completedHours
      },
      correlation_id: req.correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/milestones/:id
 * Update milestone
 */
router.put('/:id', requireScopes(['goals:write']), async (req, res, next) => {
  try {
    const milestoneId = req.params['id']!;
    const updates = updateMilestoneSchema.parse(req.body);

    // Verify milestone ownership through goal
    const existingMilestone = await prisma.milestone.findFirst({
      where: { id: milestoneId },
      include: {
        goal: {
          where: { userId: req.user!.id }
        }
      }
    });

    if (!existingMilestone || !existingMilestone.goal) {
      return res.status(404).json({
        error: {
          code: 'MILESTONE_NOT_FOUND',
          message: 'Milestone not found or access denied'
        }
      });
    }

    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...updates,
        targetDate: updates.target_date ? new Date(updates.target_date) : undefined,
        completedAt: updates.status === 'COMPLETED' ? new Date() : undefined,
        updatedAt: new Date()
      },
      include: {
        tasks: true,
        progress: {
          orderBy: { recordedAt: 'desc' },
          take: 1
        }
      }
    });

    logger.info('Milestone updated', {
      correlationId: req.correlationId,
      userId: req.user?.id,
      milestoneId,
      updates: Object.keys(updates)
    });

    res.json({
      milestone,
      correlation_id: req.correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/milestones/:id
 * Delete milestone
 */
router.delete('/:id', requireScopes(['goals:write']), async (req, res, next) => {
  try {
    const milestoneId = req.params['id']!;

    // Verify milestone ownership through goal
    const existingMilestone = await prisma.milestone.findFirst({
      where: { id: milestoneId },
      include: {
        goal: {
          where: { userId: req.user!.id }
        }
      }
    });

    if (!existingMilestone || !existingMilestone.goal) {
      return res.status(404).json({
        error: {
          code: 'MILESTONE_NOT_FOUND',
          message: 'Milestone not found or access denied'
        }
      });
    }

    await prisma.milestone.delete({
      where: { id: milestoneId }
    });

    logger.info('Milestone deleted', {
      correlationId: req.correlationId,
      userId: req.user?.id,
      milestoneId
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
 * GET /api/v1/milestones/:id/progress
 * Get milestone progress tracking
 */
router.get('/:id/progress', requireScopes(['goals:read']), async (req, res, next) => {
  try {
    const milestoneId = req.params['id']!;

    // Verify milestone ownership through goal
    const milestone = await prisma.milestone.findFirst({
      where: { id: milestoneId },
      include: {
        goal: {
          where: { userId: req.user!.id }
        },
        tasks: true,
        progress: {
          orderBy: { recordedAt: 'desc' }
        }
      }
    });

    if (!milestone || !milestone.goal) {
      return res.status(404).json({
        error: {
          code: 'MILESTONE_NOT_FOUND',
          message: 'Milestone not found or access denied'
        }
      });
    }

    // Calculate current progress
    const totalTasks = milestone.tasks.length;
    const completedTasks = milestone.tasks.filter((t: any) => t.status === 'COMPLETED').length;
    const currentProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate velocity (progress over time)
    const progressHistory = milestone.progress.slice(0, 10); // Last 10 records
    let velocity = 0;
    if (progressHistory.length >= 2) {
      const recent = progressHistory[0];
      const older = progressHistory[progressHistory.length - 1];
      const timeDiff = recent.recordedAt.getTime() - older.recordedAt.getTime();
      const progressDiff = recent.progressPercentage - older.progressPercentage;
      velocity = timeDiff > 0 ? (progressDiff / (timeDiff / (1000 * 60 * 60 * 24))) : 0; // progress per day
    }

    res.json({
      milestone_id: milestoneId,
      current_progress: {
        percentage: currentProgress,
        tasks_completed: completedTasks,
        tasks_total: totalTasks,
        status: milestone.status
      },
      progress_history: progressHistory,
      velocity: {
        progress_per_day: velocity,
        estimated_completion_days: velocity > 0 ? (100 - currentProgress) / velocity : null
      },
      correlation_id: req.correlationId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/milestones/:id/progress
 * Record progress update for milestone
 */
router.post('/:id/progress', requireScopes(['goals:write']), async (req, res, next) => {
  try {
    const milestoneId = req.params['id'];
    const { progress_percentage, notes } = recordProgressSchema.parse(req.body);

    // Verify milestone ownership through goal
    const milestone = await prisma.milestone.findFirst({
      where: { id: milestoneId },
      include: {
        goal: {
          where: { userId: req.user!.id }
        }
      }
    });

    if (!milestone || !milestone.goal) {
      return res.status(404).json({
        error: {
          code: 'MILESTONE_NOT_FOUND',
          message: 'Milestone not found or access denied'
        }
      });
    }

    // Record progress
    const progressRecord = await prisma.milestoneProgress.create({
      data: {
        milestoneId,
        progressPercentage: progress_percentage,
        notes,
        recordedBy: req.user!.id
      }
    });

    // Update milestone progress percentage
    await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        progressPercentage: progress_percentage,
        status: progress_percentage >= 100 ? 'COMPLETED' : 
                progress_percentage > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
        completedAt: progress_percentage >= 100 ? new Date() : null
      }
    });

    logger.info('Milestone progress recorded', {
      correlationId: req.correlationId,
      userId: req.user?.id,
      milestoneId,
      progressPercentage: progress_percentage
    });

    res.status(201).json({
      progress_record: progressRecord,
      correlation_id: req.correlationId
    });

  } catch (error) {
    next(error);
  }
});

export default router;
