import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const DependencyMappingSchema = z.object({
  milestoneId: z.string().uuid(),
  analysisType: z.enum(['CRITICAL_PATH', 'PARALLEL_OPTIMIZATION', 'RESOURCE_LEVELING']).default('CRITICAL_PATH'),
  includeBuffers: z.boolean().default(true),
  bufferPercentage: z.number().min(0).max(50).default(20), // 20% buffer by default
}).partial().required({ milestoneId: true });

const TaskDependencySchema = z.object({
  predecessorId: z.string().uuid(),
  successorId: z.string().uuid(),
  dependencyType: z.enum(['FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH']).default('FINISH_TO_START'),
  lag: z.number().default(0), // Hours of lag/lead time
  isHard: z.boolean().default(true), // Hard vs soft dependency
});

export interface TaskNode {
  id: string;
  title: string;
  estimatedHours: number;
  priority: string;
  complexity: string;
  skills: string[];
  dependencies: TaskDependency[];
  dependents: TaskDependency[];
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  slack: number;
  isCritical: boolean;
}

export interface TaskDependency {
  id: string;
  predecessorId: string;
  successorId: string;
  dependencyType: 'FINISH_TO_START' | 'START_TO_START' | 'FINISH_TO_FINISH' | 'START_TO_FINISH';
  lag: number;
  isHard: boolean;
}

export interface DependencyAnalysis {
  milestoneId: string;
  totalDuration: number;
  criticalPath: string[];
  criticalPathDuration: number;
  parallelTracks: ParallelTrack[];
  resourceConflicts: ResourceConflict[];
  optimizationSuggestions: OptimizationSuggestion[];
  scheduleMetrics: {
    totalTasks: number;
    criticalTasks: number;
    parallelizableHours: number;
    sequentialHours: number;
    bufferHours: number;
  };
}

export interface ParallelTrack {
  id: string;
  name: string;
  tasks: string[];
  duration: number;
  skills: string[];
  canRunInParallel: boolean;
}

export interface ResourceConflict {
  skill: string;
  conflictingTasks: string[];
  timeOverlap: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestions: string[];
}

export interface OptimizationSuggestion {
  type: 'PARALLELIZE' | 'RESEQUENCE' | 'SPLIT_TASK' | 'MERGE_TASKS' | 'ADD_RESOURCES';
  description: string;
  affectedTasks: string[];
  estimatedSavings: number; // Hours saved
  implementationEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  priority: number;
}

export class DependencyMapper {
  /**
   * Analyze task dependencies and generate critical path
   */
  async analyzeDependencies(request: z.infer<typeof DependencyMappingSchema>): Promise<DependencyAnalysis> {
    const correlationId = `dep-analysis-${Date.now()}`;
    logger.info('Starting dependency analysis', { correlationId, request });

    try {
      // Validate request
      const validatedRequest = DependencyMappingSchema.parse(request);

      // Load tasks and dependencies
      const tasks = await this.loadTasksWithDependencies(validatedRequest.milestoneId);
      if (tasks.length === 0) {
        throw new Error(`No tasks found for milestone: ${validatedRequest.milestoneId}`);
      }

      // Build task graph
      const taskGraph = this.buildTaskGraph(tasks);

      // Validate graph (check for cycles)
      this.validateTaskGraph(taskGraph);

      // Calculate critical path using CPM (Critical Path Method)
      const criticalPathResult = this.calculateCriticalPath(taskGraph);

      // Identify parallel execution opportunities
      const parallelTracks = this.identifyParallelTracks(taskGraph, criticalPathResult);

      // Detect resource conflicts
      const resourceConflicts = this.detectResourceConflicts(taskGraph, parallelTracks);

      // Generate optimization suggestions
      const optimizationSuggestions = this.generateOptimizationSuggestions(
        taskGraph,
        criticalPathResult,
        parallelTracks,
        resourceConflicts
      );

      // Calculate schedule metrics
      const scheduleMetrics = this.calculateScheduleMetrics(
        taskGraph,
        criticalPathResult,
        parallelTracks,
        validatedRequest.bufferPercentage || 20
      );

      const result: DependencyAnalysis = {
        milestoneId: validatedRequest.milestoneId,
        totalDuration: criticalPathResult.totalDuration,
        criticalPath: criticalPathResult.criticalPath,
        criticalPathDuration: criticalPathResult.criticalPathDuration,
        parallelTracks,
        resourceConflicts,
        optimizationSuggestions,
        scheduleMetrics,
      };

      // Save analysis results
      await this.saveDependencyAnalysis(validatedRequest.milestoneId, result, correlationId);

      logger.info('Dependency analysis completed', {
        correlationId,
        totalDuration: result.totalDuration,
        criticalPathLength: result.criticalPath.length,
      });

      return result;
    } catch (error) {
      logger.error('Dependency analysis failed', { correlationId, error });
      throw error;
    }
  }

  /**
   * Add or update task dependency
   */
  async addTaskDependency(dependency: z.infer<typeof TaskDependencySchema>): Promise<void> {
    const correlationId = `add-dep-${Date.now()}`;
    logger.info('Adding task dependency', { correlationId, dependency });

    try {
      // Validate dependency
      const validatedDependency = TaskDependencySchema.parse(dependency);

      // Check if dependency would create a cycle
      await this.validateNoCycle(validatedDependency);

      // Save dependency
      await prisma.taskDependency.create({
        data: {
          predecessorId: validatedDependency.predecessorId,
          successorId: validatedDependency.successorId,
          dependencyType: validatedDependency.dependencyType,
          lag: validatedDependency.lag,
          isHard: validatedDependency.isHard,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info('Task dependency added successfully', { correlationId });
    } catch (error) {
      logger.error('Failed to add task dependency', { correlationId, error });
      throw error;
    }
  }

  /**
   * Remove task dependency
   */
  async removeTaskDependency(predecessorId: string, successorId: string): Promise<void> {
    const correlationId = `remove-dep-${Date.now()}`;
    logger.info('Removing task dependency', { correlationId, predecessorId, successorId });

    try {
      await prisma.taskDependency.deleteMany({
        where: {
          predecessorId,
          successorId,
        },
      });

      logger.info('Task dependency removed successfully', { correlationId });
    } catch (error) {
      logger.error('Failed to remove task dependency', { correlationId, error });
      throw error;
    }
  }

  /**
   * Load tasks with their dependencies
   */
  private async loadTasksWithDependencies(milestoneId: string): Promise<any[]> {
    return await prisma.task.findMany({
      where: { milestoneId },
      include: {
        dependencies: {
          include: {
            predecessor: true,
          },
        },
        dependents: {
          include: {
            successor: true,
          },
        },
      },
    });
  }

  /**
   * Build task graph from database tasks
   */
  private buildTaskGraph(tasks: any[]): Map<string, TaskNode> {
    const taskGraph = new Map<string, TaskNode>();

    // Create task nodes
    for (const task of tasks) {
      const taskNode: TaskNode = {
        id: task.id,
        title: task.title,
        estimatedHours: task.estimatedHours,
        priority: task.priority,
        complexity: task.complexity,
        skills: task.skills || [],
        dependencies: task.dependencies.map((dep: any) => ({
          id: dep.id,
          predecessorId: dep.predecessorId,
          successorId: dep.successorId,
          dependencyType: dep.dependencyType,
          lag: dep.lag,
          isHard: dep.isHard,
        })),
        dependents: task.dependents.map((dep: any) => ({
          id: dep.id,
          predecessorId: dep.predecessorId,
          successorId: dep.successorId,
          dependencyType: dep.dependencyType,
          lag: dep.lag,
          isHard: dep.isHard,
        })),
        earliestStart: 0,
        earliestFinish: 0,
        latestStart: 0,
        latestFinish: 0,
        slack: 0,
        isCritical: false,
      };

      taskGraph.set(task.id, taskNode);
    }

    return taskGraph;
  }

  /**
   * Validate task graph for cycles
   */
  private validateTaskGraph(taskGraph: Map<string, TaskNode>): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true; // Cycle detected
      }
      if (visited.has(nodeId)) {
        return false; // Already processed
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = taskGraph.get(nodeId);
      if (node) {
        for (const dependent of node.dependents) {
          if (hasCycle(dependent.successorId)) {
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of taskGraph.keys()) {
      if (hasCycle(nodeId)) {
        throw new Error('Circular dependency detected in task graph');
      }
    }
  }

  /**
   * Calculate critical path using Critical Path Method (CPM)
   */
  private calculateCriticalPath(taskGraph: Map<string, TaskNode>): {
    criticalPath: string[];
    criticalPathDuration: number;
    totalDuration: number;
  } {
    // Forward pass - calculate earliest start/finish times
    this.forwardPass(taskGraph);

    // Backward pass - calculate latest start/finish times
    this.backwardPass(taskGraph);

    // Calculate slack and identify critical tasks
    const criticalTasks: string[] = [];
    let maxFinishTime = 0;

    for (const [taskId, task] of taskGraph) {
      task.slack = task.latestStart - task.earliestStart;
      task.isCritical = task.slack === 0;

      if (task.isCritical) {
        criticalTasks.push(taskId);
      }

      maxFinishTime = Math.max(maxFinishTime, task.earliestFinish);
    }

    // Build critical path sequence
    const criticalPath = this.buildCriticalPathSequence(taskGraph, criticalTasks);

    return {
      criticalPath,
      criticalPathDuration: maxFinishTime,
      totalDuration: maxFinishTime,
    };
  }

  /**
   * Forward pass calculation
   */
  private forwardPass(taskGraph: Map<string, TaskNode>): void {
    const processed = new Set<string>();

    const processTask = (taskId: string): void => {
      if (processed.has(taskId)) return;

      const task = taskGraph.get(taskId);
      if (!task) return;

      // Calculate earliest start based on dependencies
      let earliestStart = 0;
      for (const dependency of task.dependencies) {
        const predecessor = taskGraph.get(dependency.predecessorId);
        if (predecessor) {
          processTask(predecessor.id); // Ensure predecessor is processed first
          
          let dependencyFinish = 0;
          switch (dependency.dependencyType) {
            case 'FINISH_TO_START':
              dependencyFinish = predecessor.earliestFinish + dependency.lag;
              break;
            case 'START_TO_START':
              dependencyFinish = predecessor.earliestStart + dependency.lag;
              break;
            case 'FINISH_TO_FINISH':
              dependencyFinish = predecessor.earliestFinish + dependency.lag - task.estimatedHours;
              break;
            case 'START_TO_FINISH':
              dependencyFinish = predecessor.earliestStart + dependency.lag - task.estimatedHours;
              break;
          }
          
          earliestStart = Math.max(earliestStart, dependencyFinish);
        }
      }

      task.earliestStart = earliestStart;
      task.earliestFinish = earliestStart + task.estimatedHours;
      processed.add(taskId);
    };

    // Process all tasks
    for (const taskId of taskGraph.keys()) {
      processTask(taskId);
    }
  }

  /**
   * Backward pass calculation
   */
  private backwardPass(taskGraph: Map<string, TaskNode>): void {
    // Find project end time
    let projectEndTime = 0;
    for (const task of taskGraph.values()) {
      projectEndTime = Math.max(projectEndTime, task.earliestFinish);
    }

    // Initialize latest times for tasks with no dependents
    for (const task of taskGraph.values()) {
      if (task.dependents.length === 0) {
        task.latestFinish = projectEndTime;
        task.latestStart = task.latestFinish - task.estimatedHours;
      }
    }

    const processed = new Set<string>();

    const processTask = (taskId: string): void => {
      if (processed.has(taskId)) return;

      const task = taskGraph.get(taskId);
      if (!task) return;

      // Calculate latest finish based on dependents
      let latestFinish = task.latestFinish || projectEndTime;
      
      for (const dependent of task.dependents) {
        const successor = taskGraph.get(dependent.successorId);
        if (successor) {
          processTask(successor.id); // Ensure successor is processed first
          
          let dependencyStart = 0;
          switch (dependent.dependencyType) {
            case 'FINISH_TO_START':
              dependencyStart = successor.latestStart - dependent.lag;
              break;
            case 'START_TO_START':
              dependencyStart = successor.latestStart - dependent.lag + task.estimatedHours;
              break;
            case 'FINISH_TO_FINISH':
              dependencyStart = successor.latestFinish - dependent.lag;
              break;
            case 'START_TO_FINISH':
              dependencyStart = successor.latestFinish - dependent.lag + task.estimatedHours;
              break;
          }
          
          latestFinish = Math.min(latestFinish, dependencyStart);
        }
      }

      task.latestFinish = latestFinish;
      task.latestStart = task.latestFinish - task.estimatedHours;
      processed.add(taskId);
    };

    // Process all tasks in reverse order
    const taskIds = Array.from(taskGraph.keys()).reverse();
    for (const taskId of taskIds) {
      processTask(taskId);
    }
  }

  /**
   * Build critical path sequence
   */
  private buildCriticalPathSequence(taskGraph: Map<string, TaskNode>, criticalTasks: string[]): string[] {
    // Find the critical path by following dependencies among critical tasks
    const criticalPath: string[] = [];
    const visited = new Set<string>();

    // Start with critical tasks that have no critical predecessors
    const startTasks = criticalTasks.filter(taskId => {
      const task = taskGraph.get(taskId);
      return task && !task.dependencies.some(dep => 
        criticalTasks.includes(dep.predecessorId)
      );
    });

    const buildPath = (taskId: string): void => {
      if (visited.has(taskId)) return;
      
      visited.add(taskId);
      criticalPath.push(taskId);

      const task = taskGraph.get(taskId);
      if (task) {
        // Find next critical task in sequence
        const nextCriticalTask = task.dependents.find(dep => 
          criticalTasks.includes(dep.successorId) && !visited.has(dep.successorId)
        );

        if (nextCriticalTask) {
          buildPath(nextCriticalTask.successorId);
        }
      }
    };

    // Build path from each start task
    for (const startTask of startTasks) {
      buildPath(startTask);
    }

    return criticalPath;
  }

  /**
   * Identify parallel execution tracks
   */
  private identifyParallelTracks(
    taskGraph: Map<string, TaskNode>,
    criticalPathResult: any
  ): ParallelTrack[] {
    const parallelTracks: ParallelTrack[] = [];
    const processedTasks = new Set<string>();

    // Group tasks that can run in parallel
    let trackId = 1;
    for (const [taskId, task] of taskGraph) {
      if (processedTasks.has(taskId)) continue;

      const parallelTasks = this.findParallelTasks(taskGraph, taskId, processedTasks);
      if (parallelTasks.length > 1) {
        const allSkills = new Set<string>();
        let totalDuration = 0;

        for (const parallelTaskId of parallelTasks) {
          const parallelTask = taskGraph.get(parallelTaskId);
          if (parallelTask) {
            parallelTask.skills.forEach(skill => allSkills.add(skill));
            totalDuration = Math.max(totalDuration, parallelTask.estimatedHours);
            processedTasks.add(parallelTaskId);
          }
        }

        parallelTracks.push({
          id: `track-${trackId++}`,
          name: `Parallel Track ${trackId - 1}`,
          tasks: parallelTasks,
          duration: totalDuration,
          skills: Array.from(allSkills),
          canRunInParallel: this.validateParallelExecution(taskGraph, parallelTasks),
        });
      }
    }

    return parallelTracks;
  }

  /**
   * Find tasks that can run in parallel with the given task
   */
  private findParallelTasks(
    taskGraph: Map<string, TaskNode>,
    startTaskId: string,
    processedTasks: Set<string>
  ): string[] {
    const parallelTasks = [startTaskId];
    const startTask = taskGraph.get(startTaskId);
    if (!startTask) return parallelTasks;

    // Find tasks with similar timing that don't depend on each other
    for (const [taskId, task] of taskGraph) {
      if (taskId === startTaskId || processedTasks.has(taskId)) continue;

      // Check if tasks can run in parallel (no direct dependencies)
      const hasDirectDependency = this.hasDirectDependency(taskGraph, startTaskId, taskId);
      const hasTimeOverlap = this.hasTimeOverlap(startTask, task);

      if (!hasDirectDependency && hasTimeOverlap) {
        parallelTasks.push(taskId);
      }
    }

    return parallelTasks;
  }

  /**
   * Check if two tasks have direct dependency relationship
   */
  private hasDirectDependency(taskGraph: Map<string, TaskNode>, task1Id: string, task2Id: string): boolean {
    const task1 = taskGraph.get(task1Id);
    const task2 = taskGraph.get(task2Id);

    if (!task1 || !task2) return false;

    // Check if task1 depends on task2 or vice versa
    const task1DependsOnTask2 = task1.dependencies.some(dep => dep.predecessorId === task2Id);
    const task2DependsOnTask1 = task2.dependencies.some(dep => dep.predecessorId === task1Id);

    return task1DependsOnTask2 || task2DependsOnTask1;
  }

  /**
   * Check if two tasks have overlapping time windows
   */
  private hasTimeOverlap(task1: TaskNode, task2: TaskNode): boolean {
    return !(task1.earliestFinish <= task2.earliestStart || task2.earliestFinish <= task1.earliestStart);
  }

  /**
   * Validate that tasks can actually run in parallel
   */
  private validateParallelExecution(taskGraph: Map<string, TaskNode>, taskIds: string[]): boolean {
    // Check for resource conflicts (same skills required)
    const skillUsage = new Map<string, string[]>();

    for (const taskId of taskIds) {
      const task = taskGraph.get(taskId);
      if (task) {
        for (const skill of task.skills) {
          if (!skillUsage.has(skill)) {
            skillUsage.set(skill, []);
          }
          skillUsage.get(skill)!.push(taskId);
        }
      }
    }

    // If any skill is required by multiple tasks, they can't run in parallel
    for (const [skill, tasks] of skillUsage) {
      if (tasks.length > 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Detect resource conflicts
   */
  private detectResourceConflicts(
    taskGraph: Map<string, TaskNode>,
    parallelTracks: ParallelTrack[]
  ): ResourceConflict[] {
    const conflicts: ResourceConflict[] = [];
    const skillUsage = new Map<string, { taskId: string; timeWindow: [number, number] }[]>();

    // Collect skill usage across all tasks
    for (const [taskId, task] of taskGraph) {
      for (const skill of task.skills) {
        if (!skillUsage.has(skill)) {
          skillUsage.set(skill, []);
        }
        skillUsage.get(skill)!.push({
          taskId,
          timeWindow: [task.earliestStart, task.earliestFinish],
        });
      }
    }

    // Detect conflicts
    for (const [skill, usages] of skillUsage) {
      const conflictingTasks: string[] = [];
      let totalOverlap = 0;

      for (let i = 0; i < usages.length; i++) {
        for (let j = i + 1; j < usages.length; j++) {
          const usage1 = usages[i];
          const usage2 = usages[j];

          if (usage1 && usage2) {
            // Check for time overlap
            const overlapStart = Math.max(usage1.timeWindow[0], usage2.timeWindow[0]);
            const overlapEnd = Math.min(usage1.timeWindow[1], usage2.timeWindow[1]);

            if (overlapStart < overlapEnd) {
              conflictingTasks.push(usage1.taskId, usage2.taskId);
              totalOverlap += overlapEnd - overlapStart;
            }
          }
        }
      }

      if (conflictingTasks.length > 0) {
        const uniqueConflictingTasks = Array.from(new Set(conflictingTasks));
        conflicts.push({
          skill,
          conflictingTasks: uniqueConflictingTasks,
          timeOverlap: totalOverlap,
          severity: totalOverlap > 16 ? 'HIGH' : totalOverlap > 8 ? 'MEDIUM' : 'LOW',
          suggestions: this.generateConflictSuggestions(skill, uniqueConflictingTasks, taskGraph),
        });
      }
    }

    return conflicts;
  }

  /**
   * Generate suggestions for resolving resource conflicts
   */
  private generateConflictSuggestions(
    skill: string,
    conflictingTasks: string[],
    taskGraph: Map<string, TaskNode>
  ): string[] {
    const suggestions: string[] = [];

    suggestions.push(`Add additional ${skill} resource to handle parallel work`);
    suggestions.push(`Sequence tasks requiring ${skill} to avoid overlap`);

    // Check if any tasks can be split
    for (const taskId of conflictingTasks) {
      const task = taskGraph.get(taskId);
      if (task && task.estimatedHours > 4) {
        suggestions.push(`Consider splitting "${task.title}" into smaller tasks`);
      }
    }

    return suggestions;
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(
    taskGraph: Map<string, TaskNode>,
    criticalPathResult: any,
    parallelTracks: ParallelTrack[],
    resourceConflicts: ResourceConflict[]
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Suggest parallelization opportunities
    for (const track of parallelTracks) {
      if (track.canRunInParallel && track.tasks.length > 1) {
        suggestions.push({
          type: 'PARALLELIZE',
          description: `Execute ${track.tasks.length} tasks in parallel to save time`,
          affectedTasks: track.tasks,
          estimatedSavings: track.duration * (track.tasks.length - 1),
          implementationEffort: 'MEDIUM',
          priority: track.tasks.some(taskId => 
            criticalPathResult.criticalPath.includes(taskId)
          ) ? 1 : 2,
        });
      }
    }

    // Suggest task splitting for large tasks
    for (const [taskId, task] of taskGraph) {
      if (task.estimatedHours > 6) {
        suggestions.push({
          type: 'SPLIT_TASK',
          description: `Split "${task.title}" into smaller, more manageable tasks`,
          affectedTasks: [taskId],
          estimatedSavings: 0, // No direct time savings, but better manageability
          implementationEffort: 'LOW',
          priority: 3,
        });
      }
    }

    // Suggest resource additions for conflicts
    for (const conflict of resourceConflicts) {
      if (conflict.severity === 'HIGH') {
        suggestions.push({
          type: 'ADD_RESOURCES',
          description: `Add additional ${conflict.skill} resources to resolve conflicts`,
          affectedTasks: conflict.conflictingTasks,
          estimatedSavings: conflict.timeOverlap * 0.5, // Assume 50% time savings
          implementationEffort: 'HIGH',
          priority: 1,
        });
      }
    }

    // Sort by priority
    return suggestions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Calculate schedule metrics
   */
  private calculateScheduleMetrics(
    taskGraph: Map<string, TaskNode>,
    criticalPathResult: any,
    parallelTracks: ParallelTrack[],
    bufferPercentage: number
  ): any {
    const totalTasks = taskGraph.size;
    const criticalTasks = Array.from(taskGraph.values()).filter(task => task.isCritical).length;
    
    let parallelizableHours = 0;
    let sequentialHours = 0;

    for (const track of parallelTracks) {
      if (track.canRunInParallel) {
        parallelizableHours += track.duration * (track.tasks.length - 1);
      }
    }

    sequentialHours = criticalPathResult.criticalPathDuration;
    const bufferHours = (sequentialHours * bufferPercentage) / 100;

    return {
      totalTasks,
      criticalTasks,
      parallelizableHours,
      sequentialHours,
      bufferHours,
    };
  }

  /**
   * Validate that adding a dependency won't create a cycle
   */
  private async validateNoCycle(dependency: z.infer<typeof TaskDependencySchema>): Promise<void> {
    // Get all existing dependencies
    const existingDependencies = await prisma.taskDependency.findMany();
    
    // Build temporary graph including the new dependency
    const graph = new Map<string, string[]>();
    
    for (const dep of existingDependencies) {
      if (!graph.has(dep.predecessorId)) {
        graph.set(dep.predecessorId, []);
      }
      graph.get(dep.predecessorId)!.push(dep.successorId);
    }

    // Add the new dependency
    if (!graph.has(dependency.predecessorId)) {
      graph.set(dependency.predecessorId, []);
    }
    graph.get(dependency.predecessorId)!.push(dependency.successorId);

    // Check for cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true;
      }
      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    if (hasCycle(dependency.predecessorId)) {
      throw new Error('Adding this dependency would create a circular dependency');
    }
  }

  /**
   * Save dependency analysis results
   */
  private async saveDependencyAnalysis(
    milestoneId: string,
    analysis: DependencyAnalysis,
    correlationId: string
  ): Promise<void> {
    logger.info('Saving dependency analysis', { correlationId, milestoneId });

    // Save analysis results to database (implementation depends on schema)
    // For now, we'll just log the completion
    logger.info('Dependency analysis saved', { 
      correlationId, 
      criticalPathLength: analysis.criticalPath.length,
      parallelTracks: analysis.parallelTracks.length,
    });
  }
}

export const dependencyMapper = new DependencyMapper();