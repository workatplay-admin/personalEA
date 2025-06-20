import { Router } from 'express';
import { z } from 'zod';
import { taskEstimationEngine } from '../services/task-estimation-engine';
import { authenticateJWT } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const EstimateTaskSchema = z.object({
  body: z.object({
    taskId: z.string().uuid().optional(),
    taskDescription: z.string().min(1).max(1000),
    complexity: z.enum(['SIMPLE', 'MODERATE', 'COMPLEX']),
    skills: z.array(z.string()).min(1),
    methods: z.array(z.enum(['EXPERT_JUDGMENT', 'ANALOGY', 'THREE_POINT_PERT', 'PARAMETRIC', 'BOTTOM_UP'])).optional(),
    includeUncertainty: z.boolean().optional(),
    confidenceLevel: z.number().min(0.5).max(0.99).optional(),
  }),
});

const UpdateActualSchema = z.object({
  params: z.object({
    taskId: z.string().uuid(),
  }),
  body: z.object({
    actualHours: z.number().min(0.1),
    completionNotes: z.string().optional(),
  }),
});

/**
 * @route POST /api/v1/estimations/estimate
 * @desc Generate comprehensive task estimation using multiple methods
 * @access Private
 */
router.post(
  '/estimate',
  authenticateJWT,
  async (req, res) => {
    const correlationId = `estimation-${Date.now()}`;
    
    try {
      logger.info('Task estimation request received', { 
        correlationId, 
        taskDescription: req.body.taskDescription?.substring(0, 50) + '...',
        complexity: req.body.complexity,
        userId: req.user?.id 
      });

      const result = await taskEstimationEngine.estimateTask(req.body);

      logger.info('Task estimation completed successfully', { 
        correlationId,
        finalEstimate: result.finalEstimate.expected,
        confidence: result.confidence,
        methodsUsed: result.metadata.methodsUsed.length 
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Task estimation completed successfully',
      });
    } catch (error) {
      logger.error('Task estimation failed', { correlationId, error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to estimate task',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route PUT /api/v1/estimations/:taskId/actual
 * @desc Update estimation with actual completion data for learning
 * @access Private
 */
router.put(
  '/:taskId/actual',
  authenticateJWT,
  async (req, res) => {
    const correlationId = `update-actual-${Date.now()}`;
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Task ID is required',
      });
    }
    
    try {
      logger.info('Update actual hours request received', { 
        correlationId, 
        taskId,
        actualHours: req.body.actualHours,
        userId: req.user?.id 
      });

      await taskEstimationEngine.updateWithActual(
        taskId,
        req.body.actualHours,
        req.body.completionNotes
      );

      logger.info('Actual hours updated successfully', { correlationId });

      res.status(200).json({
        success: true,
        message: 'Actual completion data updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update actual hours', { correlationId, error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to update actual completion data',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route POST /api/v1/estimations/batch
 * @desc Estimate multiple tasks in batch
 * @access Private
 */
router.post(
  '/batch',
  authenticateJWT,
  async (req, res) => {
    const correlationId = `batch-estimation-${Date.now()}`;
    
    try {
      const { tasks } = req.body;
      
      if (!Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Tasks array is required and must not be empty',
        });
      }

      if (tasks.length > 10) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 10 tasks allowed per batch request',
        });
      }

      logger.info('Batch estimation request received', { 
        correlationId, 
        taskCount: tasks.length,
        userId: req.user?.id 
      });

      const results = [];
      const errors = [];

      for (let i = 0; i < tasks.length; i++) {
        try {
          const task = tasks[i];
          const result = await taskEstimationEngine.estimateTask(task);
          results.push({
            index: i,
            taskDescription: task.taskDescription,
            estimation: result,
          });
        } catch (error) {
          errors.push({
            index: i,
            taskDescription: tasks[i]?.taskDescription || 'Unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      logger.info('Batch estimation completed', { 
        correlationId,
        successCount: results.length,
        errorCount: errors.length 
      });

      res.status(200).json({
        success: true,
        data: {
          results,
          errors,
          summary: {
            totalTasks: tasks.length,
            successfulEstimations: results.length,
            failedEstimations: errors.length,
            totalEstimatedHours: results.reduce((sum, r) => sum + r.estimation.finalEstimate.expected, 0),
          },
        },
        message: `Batch estimation completed: ${results.length}/${tasks.length} successful`,
      });
    } catch (error) {
      logger.error('Batch estimation failed', { correlationId, error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to process batch estimation',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route GET /api/v1/estimations/methods
 * @desc Get available estimation methods and their descriptions
 * @access Private
 */
router.get(
  '/methods',
  authenticateJWT,
  async (req, res) => {
    const correlationId = `methods-${Date.now()}`;
    
    try {
      logger.info('Estimation methods request received', { 
        correlationId,
        userId: req.user?.id 
      });

      const methods = [
        {
          name: 'EXPERT_JUDGMENT',
          displayName: 'Expert Judgment (AI)',
          description: 'AI-powered estimation based on task analysis and industry best practices',
          accuracy: 'Medium-High',
          speed: 'Fast',
          dataRequirements: 'Task description, complexity, skills',
          bestFor: 'General purpose estimation, new or unique tasks',
        },
        {
          name: 'ANALOGY',
          displayName: 'Analogy-Based',
          description: 'Estimation based on similar historical tasks',
          accuracy: 'High',
          speed: 'Fast',
          dataRequirements: 'Historical task data with similar characteristics',
          bestFor: 'Repetitive tasks, tasks with good historical data',
        },
        {
          name: 'THREE_POINT_PERT',
          displayName: 'Three-Point PERT',
          description: 'PERT estimation using optimistic, most likely, and pessimistic scenarios',
          accuracy: 'High',
          speed: 'Medium',
          dataRequirements: 'Detailed task analysis for scenario planning',
          bestFor: 'Complex tasks with uncertainty, project planning',
        },
        {
          name: 'PARAMETRIC',
          displayName: 'Parametric',
          description: 'Statistical estimation based on historical parameters and relationships',
          accuracy: 'High',
          speed: 'Fast',
          dataRequirements: 'Large historical dataset with consistent parameters',
          bestFor: 'Well-defined tasks with established patterns',
        },
        {
          name: 'BOTTOM_UP',
          displayName: 'Bottom-Up',
          description: 'Estimation by breaking down tasks into smaller components',
          accuracy: 'Very High',
          speed: 'Slow',
          dataRequirements: 'Detailed task breakdown and component analysis',
          bestFor: 'Complex tasks, detailed project planning, high accuracy needs',
        },
      ];

      res.status(200).json({
        success: true,
        data: {
          methods,
          recommendations: {
            quickEstimate: ['EXPERT_JUDGMENT', 'ANALOGY'],
            accurateEstimate: ['THREE_POINT_PERT', 'BOTTOM_UP', 'ANALOGY'],
            newTask: ['EXPERT_JUDGMENT', 'THREE_POINT_PERT'],
            repetitiveTask: ['ANALOGY', 'PARAMETRIC'],
            complexTask: ['BOTTOM_UP', 'THREE_POINT_PERT'],
          },
        },
        message: 'Estimation methods retrieved successfully',
      });
    } catch (error) {
      logger.error('Failed to get estimation methods', { correlationId, error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve estimation methods',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route GET /api/v1/estimations/:taskId/history
 * @desc Get estimation history and accuracy for a task
 * @access Private
 */
router.get(
  '/:taskId/history',
  authenticateJWT,
  async (req, res) => {
    const correlationId = `estimation-history-${Date.now()}`;
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Task ID is required',
      });
    }
    
    try {
      logger.info('Estimation history request received', { 
        correlationId, 
        taskId,
        userId: req.user?.id 
      });

      // This would retrieve historical estimation data
      // For now, return placeholder data
      const historyData = {
        taskId,
        estimations: [],
        accuracy: {
          averageAccuracy: 0,
          estimationCount: 0,
          lastUpdated: null,
        },
        trends: {
          improvingAccuracy: false,
          consistentUnderestimation: false,
          consistentOverestimation: false,
        },
      };

      logger.info('Estimation history retrieved successfully', { correlationId });

      res.status(200).json({
        success: true,
        data: historyData,
        message: 'Estimation history retrieved successfully',
      });
    } catch (error) {
      logger.error('Failed to get estimation history', { correlationId, error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve estimation history',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route GET /api/v1/estimations/analytics/accuracy
 * @desc Get overall estimation accuracy analytics
 * @access Private
 */
router.get(
  '/analytics/accuracy',
  authenticateJWT,
  async (req, res) => {
    const correlationId = `accuracy-analytics-${Date.now()}`;
    
    try {
      logger.info('Accuracy analytics request received', { 
        correlationId,
        userId: req.user?.id 
      });

      // This would calculate analytics from historical data
      // For now, return placeholder analytics
      const analytics = {
        overall: {
          averageAccuracy: 0.75,
          totalEstimations: 0,
          accurateEstimations: 0, // Within 20% of actual
          dataQuality: 'LOW' as const,
        },
        byMethod: {
          EXPERT_JUDGMENT: { accuracy: 0.70, count: 0 },
          ANALOGY: { accuracy: 0.85, count: 0 },
          THREE_POINT_PERT: { accuracy: 0.80, count: 0 },
          PARAMETRIC: { accuracy: 0.75, count: 0 },
          BOTTOM_UP: { accuracy: 0.90, count: 0 },
        },
        byComplexity: {
          SIMPLE: { accuracy: 0.85, count: 0 },
          MODERATE: { accuracy: 0.75, count: 0 },
          COMPLEX: { accuracy: 0.65, count: 0 },
        },
        trends: {
          improvingOverTime: false,
          commonBiases: [],
          recommendations: [
            'Start collecting actual completion data to improve accuracy',
            'Use multiple estimation methods for better results',
            'Consider breaking down complex tasks further',
          ],
        },
      };

      res.status(200).json({
        success: true,
        data: analytics,
        message: 'Accuracy analytics retrieved successfully',
      });
    } catch (error) {
      logger.error('Failed to get accuracy analytics', { correlationId, error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve accuracy analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;