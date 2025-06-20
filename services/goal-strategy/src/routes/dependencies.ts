import { Router } from 'express';
import { z } from 'zod';
import { dependencyMapper } from '../services/dependency-mapper';
import { authenticateJWT } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const AnalyzeDependenciesSchema = z.object({
  body: z.object({
    milestoneId: z.string().uuid(),
    analysisType: z.enum(['CRITICAL_PATH', 'PARALLEL_OPTIMIZATION', 'RESOURCE_LEVELING']).optional(),
    includeBuffers: z.boolean().optional(),
    bufferPercentage: z.number().min(0).max(50).optional(),
  }),
});

const AddDependencySchema = z.object({
  body: z.object({
    predecessorId: z.string().uuid(),
    successorId: z.string().uuid(),
    dependencyType: z.enum(['FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH']).optional(),
    lag: z.number().optional(),
    isHard: z.boolean().optional(),
  }),
});

const RemoveDependencySchema = z.object({
  body: z.object({
    predecessorId: z.string().uuid(),
    successorId: z.string().uuid(),
  }),
});

/**
 * @route POST /api/v1/dependencies/analyze
 * @desc Analyze task dependencies and generate critical path
 * @access Private
 */
router.post(
  '/analyze',
  authenticateJWT,
  async (req, res) => {
    const correlationId = `dep-analyze-${Date.now()}`;
    
    try {
      logger.info('Dependency analysis request received', { 
        correlationId, 
        milestoneId: req.body.milestoneId,
        userId: req.user?.id 
      });

      const result = await dependencyMapper.analyzeDependencies(req.body);

      logger.info('Dependency analysis completed successfully', { 
        correlationId,
        criticalPathLength: result.criticalPath.length,
        totalDuration: result.totalDuration 
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Dependency analysis completed successfully',
      });
    } catch (error) {
      logger.error('Dependency analysis failed', { correlationId, error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to analyze dependencies',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route POST /api/v1/dependencies/add
 * @desc Add a task dependency
 * @access Private
 */
router.post(
  '/add',
  authenticateJWT,
  async (req, res) => {
    const correlationId = `dep-add-${Date.now()}`;
    
    try {
      logger.info('Add dependency request received', { 
        correlationId, 
        dependency: req.body,
        userId: req.user?.id 
      });

      await dependencyMapper.addTaskDependency(req.body);

      logger.info('Dependency added successfully', { correlationId });

      res.status(201).json({
        success: true,
        message: 'Task dependency added successfully',
      });
    } catch (error) {
      logger.error('Failed to add dependency', { correlationId, error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to add task dependency',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route DELETE /api/v1/dependencies/remove
 * @desc Remove a task dependency
 * @access Private
 */
router.delete(
  '/remove',
  authenticateJWT,
  async (req, res) => {
    const correlationId = `dep-remove-${Date.now()}`;
    
    try {
      logger.info('Remove dependency request received', { 
        correlationId, 
        dependency: req.body,
        userId: req.user?.id 
      });

      const { predecessorId, successorId } = req.body;
      await dependencyMapper.removeTaskDependency(predecessorId, successorId);

      logger.info('Dependency removed successfully', { correlationId });

      res.status(200).json({
        success: true,
        message: 'Task dependency removed successfully',
      });
    } catch (error) {
      logger.error('Failed to remove dependency', { correlationId, error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to remove task dependency',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route GET /api/v1/dependencies/:milestoneId/critical-path
 * @desc Get critical path for a milestone
 * @access Private
 */
router.get(
  '/:milestoneId/critical-path',
  authenticateJWT,
  async (req, res) => {
    const correlationId = `critical-path-${Date.now()}`;
    const { milestoneId } = req.params;
    
    if (!milestoneId) {
      return res.status(400).json({
        success: false,
        error: 'Milestone ID is required',
      });
    }
    
    try {
      logger.info('Critical path request received', {
        correlationId,
        milestoneId,
        userId: req.user?.id
      });

      const result = await dependencyMapper.analyzeDependencies({
        milestoneId,
        analysisType: 'CRITICAL_PATH',
      });

      const criticalPathData = {
        milestoneId,
        criticalPath: result.criticalPath,
        duration: result.criticalPathDuration,
        totalTasks: result.scheduleMetrics.totalTasks,
        criticalTasks: result.scheduleMetrics.criticalTasks,
      };

      logger.info('Critical path retrieved successfully', { 
        correlationId,
        pathLength: result.criticalPath.length 
      });

      res.status(200).json({
        success: true,
        data: criticalPathData,
        message: 'Critical path retrieved successfully',
      });
    } catch (error) {
      logger.error('Failed to get critical path', { correlationId, error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve critical path',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route GET /api/v1/dependencies/:milestoneId/parallel-tracks
 * @desc Get parallel execution tracks for a milestone
 * @access Private
 */
router.get(
  '/:milestoneId/parallel-tracks',
  authenticateJWT,
  async (req, res) => {
    const correlationId = `parallel-tracks-${Date.now()}`;
    const { milestoneId } = req.params;
    
    if (!milestoneId) {
      return res.status(400).json({
        success: false,
        error: 'Milestone ID is required',
      });
    }
    
    try {
      logger.info('Parallel tracks request received', {
        correlationId,
        milestoneId,
        userId: req.user?.id
      });

      const result = await dependencyMapper.analyzeDependencies({
        milestoneId,
        analysisType: 'PARALLEL_OPTIMIZATION',
      });

      const parallelData = {
        milestoneId,
        parallelTracks: result.parallelTracks,
        optimizationSuggestions: result.optimizationSuggestions.filter(s => s.type === 'PARALLELIZE'),
        potentialSavings: result.scheduleMetrics.parallelizableHours,
      };

      logger.info('Parallel tracks retrieved successfully', { 
        correlationId,
        trackCount: result.parallelTracks.length 
      });

      res.status(200).json({
        success: true,
        data: parallelData,
        message: 'Parallel execution tracks retrieved successfully',
      });
    } catch (error) {
      logger.error('Failed to get parallel tracks', { correlationId, error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve parallel tracks',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route GET /api/v1/dependencies/:milestoneId/resource-conflicts
 * @desc Get resource conflicts for a milestone
 * @access Private
 */
router.get(
  '/:milestoneId/resource-conflicts',
  authenticateJWT,
  async (req, res) => {
    const correlationId = `resource-conflicts-${Date.now()}`;
    const { milestoneId } = req.params;
    
    if (!milestoneId) {
      return res.status(400).json({
        success: false,
        error: 'Milestone ID is required',
      });
    }
    
    try {
      logger.info('Resource conflicts request received', {
        correlationId,
        milestoneId,
        userId: req.user?.id
      });

      const result = await dependencyMapper.analyzeDependencies({
        milestoneId,
        analysisType: 'RESOURCE_LEVELING',
      });

      const conflictData = {
        milestoneId,
        resourceConflicts: result.resourceConflicts,
        resolutionSuggestions: result.optimizationSuggestions.filter(s => s.type === 'ADD_RESOURCES'),
        severity: result.resourceConflicts.length > 0 ? 
          Math.max(...result.resourceConflicts.map(c => c.severity === 'HIGH' ? 3 : c.severity === 'MEDIUM' ? 2 : 1)) : 0,
      };

      logger.info('Resource conflicts retrieved successfully', { 
        correlationId,
        conflictCount: result.resourceConflicts.length 
      });

      res.status(200).json({
        success: true,
        data: conflictData,
        message: 'Resource conflicts retrieved successfully',
      });
    } catch (error) {
      logger.error('Failed to get resource conflicts', { correlationId, error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve resource conflicts',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route GET /api/v1/dependencies/:milestoneId/optimization
 * @desc Get optimization suggestions for a milestone
 * @access Private
 */
router.get(
  '/:milestoneId/optimization',
  authenticateJWT,
  async (req, res) => {
    const correlationId = `optimization-${Date.now()}`;
    const { milestoneId } = req.params;
    
    if (!milestoneId) {
      return res.status(400).json({
        success: false,
        error: 'Milestone ID is required',
      });
    }
    
    try {
      logger.info('Optimization suggestions request received', {
        correlationId,
        milestoneId,
        userId: req.user?.id
      });

      const result = await dependencyMapper.analyzeDependencies({
        milestoneId,
        analysisType: 'CRITICAL_PATH',
      });

      const optimizationData = {
        milestoneId,
        suggestions: result.optimizationSuggestions,
        totalPotentialSavings: result.optimizationSuggestions.reduce((sum, s) => sum + s.estimatedSavings, 0),
        highPrioritySuggestions: result.optimizationSuggestions.filter(s => s.priority === 1),
      };

      logger.info('Optimization suggestions retrieved successfully', { 
        correlationId,
        suggestionCount: result.optimizationSuggestions.length 
      });

      res.status(200).json({
        success: true,
        data: optimizationData,
        message: 'Optimization suggestions retrieved successfully',
      });
    } catch (error) {
      logger.error('Failed to get optimization suggestions', { correlationId, error });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve optimization suggestions',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;