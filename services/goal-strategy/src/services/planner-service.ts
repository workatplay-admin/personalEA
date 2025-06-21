import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { PriorityType, TaskResponse, DependencyTypeType } from '@/types/goal';

// Calendar and scheduling related schemas
export const TimeSlotSchema = z.object({
  id: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isAvailable: z.boolean(),
  conflictingEvents: z.array(z.string()).optional()
});

export const DayConfigSchema = z.object({
  start: z.string(),
  end: z.string(),
  enabled: z.boolean()
});

export const WorkingHoursSchema = z.object({
  monday: DayConfigSchema,
  tuesday: DayConfigSchema,
  wednesday: DayConfigSchema,
  thursday: DayConfigSchema,
  friday: DayConfigSchema,
  saturday: DayConfigSchema,
  sunday: DayConfigSchema,
  timezone: z.string()
});

export const SchedulingConstraintsSchema = z.object({
  workingHours: WorkingHoursSchema,
  maxBlockSizeHours: z.number().max(2).default(2), // ≤2 hour constraint
  minBlockSizeHours: z.number().min(0.25).default(0.25),
  bufferBetweenTasksMinutes: z.number().default(15),
  allowWeekends: z.boolean().default(false),
  preferredTimeSlots: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string(),
    endTime: z.string(),
    preference: z.enum(['PREFERRED', 'NEUTRAL', 'AVOID'])
  })).optional()
});

export const ScoredSlotSchema = z.object({
  slot: TimeSlotSchema,
  score: z.number().min(0).max(100),
  factors: z.object({
    priorityScore: z.number(),
    dependencyScore: z.number(),
    preferenceScore: z.number(),
    availabilityScore: z.number()
  }),
  reasoning: z.string()
});

export const TaskPlacementSchema = z.object({
  taskId: z.string(),
  originalTask: z.object({
    id: z.string(),
    title: z.string(),
    estimatedHours: z.number(),
    priority: z.string(),
    dependencies: z.array(z.string())
  }),
  placements: z.array(z.object({
    slotId: z.string(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    durationHours: z.number(),
    isPartialTask: z.boolean(),
    partIndex: z.number().optional(),
    totalParts: z.number().optional(),
    parentTaskId: z.string().optional()
  })),
  status: z.enum(['PLACED', 'PARTIALLY_PLACED', 'UNPLACED']),
  conflicts: z.array(z.string()).optional(),
  spilloverReason: z.string().optional()
});

export const ScheduleSuggestionSchema = z.object({
  suggestion: z.string(),
  reasoning: z.string(),
  alternatives: z.array(z.object({
    option: z.string(),
    tradeOffs: z.string()
  })),
  urgencyWarning: z.string().optional()
});

export const ConflictExplanationSchema = z.object({
  conflictSummary: z.string(),
  impactAnalysis: z.string(),
  proposedSolutions: z.array(z.object({
    solution: z.string(),
    effortRequired: z.string(),
    impact: z.string()
  })),
  recommendedAction: z.string()
});

export const DependencyGraphSchema = z.object({
  nodes: z.array(z.object({
    taskId: z.string(),
    title: z.string(),
    estimatedHours: z.number(),
    priority: z.string()
  })),
  edges: z.array(z.object({
    fromTaskId: z.string(),
    toTaskId: z.string(),
    dependencyType: z.string(),
    lagHours: z.number().default(0)
  })),
  criticalPath: z.array(z.string()),
  totalDurationHours: z.number()
});

// Type exports
export type TimeSlot = z.infer<typeof TimeSlotSchema>;
export type WorkingHours = z.infer<typeof WorkingHoursSchema>;
export type SchedulingConstraints = z.infer<typeof SchedulingConstraintsSchema>;
export type ScoredSlot = z.infer<typeof ScoredSlotSchema>;
export type TaskPlacement = z.infer<typeof TaskPlacementSchema>;
export type ScheduleSuggestion = z.infer<typeof ScheduleSuggestionSchema>;
export type ConflictExplanation = z.infer<typeof ConflictExplanationSchema>;
export type DependencyGraph = z.infer<typeof DependencyGraphSchema>;

/**
 * Planner Service - Handles calendar integration and intelligent scheduling
 * 
 * This service implements the core scheduling logic for the Goal & Strategy Service,
 * including deterministic algorithms for task placement and AI-powered suggestions.
 */
export class PlannerService {
  private readonly maxBlockSizeHours = 2; // ≤2 hour constraint
  private readonly minBlockSizeHours = 0.25; // 15 minute minimum
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    logger.info('PlannerService initialized', {
      maxBlockSizeHours: this.maxBlockSizeHours,
      minBlockSizeHours: this.minBlockSizeHours
    });
  }

  /**
   * Score available time slots based on task requirements and constraints
   * 
   * @param tasks - Tasks to be scheduled
   * @param availability - Available time slots
   * @param constraints - Scheduling constraints
   * @returns Array of scored slots, sorted by score (highest first)
   */
  async scoreSlots(
    tasks: TaskResponse[],
    availability: TimeSlot[],
    constraints: SchedulingConstraints
  ): Promise<ScoredSlot[]> {
    logger.info('Scoring time slots', {
      taskCount: tasks.length,
      availabilityCount: availability.length
    });

    const scoredSlots: ScoredSlot[] = [];

    for (const slot of availability) {
      if (!slot.isAvailable) continue;

      const score = this.calculateSlotScore(slot, tasks, constraints);
      scoredSlots.push(score);
    }

    // Sort by score (highest first)
    scoredSlots.sort((a, b) => b.score - a.score);

    logger.info('Slot scoring completed', {
      totalSlots: scoredSlots.length,
      topScore: scoredSlots[0]?.score || 0
    });

    return scoredSlots;
  }

  /**
   * Place tasks in available time slots using deterministic algorithm
   * 
   * @param tasks - Tasks to be placed
   * @param constraints - Scheduling constraints
   * @param availability - Available time slots
   * @returns Array of task placements
   */
  async placeTasks(
    tasks: TaskResponse[],
    constraints: SchedulingConstraints,
    availability: TimeSlot[]
  ): Promise<TaskPlacement[]> {
    logger.info('Placing tasks in schedule', {
      taskCount: tasks.length,
      availabilityCount: availability.length
    });

    // First, resolve dependencies to determine scheduling order
    const dependencyGraph = await this.resolveDependencies(tasks);
    const orderedTasks = this.topologicalSort(dependencyGraph, tasks);

    const placements: TaskPlacement[] = [];
    const usedSlots = new Set<string>();

    for (const task of orderedTasks) {
      const placement = await this.placeTask(task, availability, constraints, usedSlots);
      placements.push(placement);

      // Mark used slots
      placement.placements.forEach(p => {
        usedSlots.add(p.slotId);
      });
    }

    logger.info('Task placement completed', {
      totalPlacements: placements.length,
      successfulPlacements: placements.filter(p => p.status === 'PLACED').length,
      partialPlacements: placements.filter(p => p.status === 'PARTIALLY_PLACED').length,
      unplacedTasks: placements.filter(p => p.status === 'UNPLACED').length
    });

    return placements;
  }

  /**
   * Resolve task dependencies and create dependency graph
   * 
   * @param tasks - Tasks to analyze
   * @returns Dependency graph with critical path
   */
  async resolveDependencies(tasks: TaskResponse[]): Promise<DependencyGraph> {
    logger.info('Resolving task dependencies', { taskCount: tasks.length });

    // Create nodes
    const nodes = tasks.map(task => ({
      taskId: task.id,
      title: task.title,
      estimatedHours: task.estimatedHours || 1,
      priority: task.priority
    }));

    // Create edges (this would typically come from a dependencies table)
    // For now, we'll create a simple dependency structure based on priority
    const edges: DependencyGraph['edges'] = [];
    
    // Sort tasks by priority and create sequential dependencies for high-priority tasks
    const highPriorityTasks = tasks.filter(t => t.priority === 'HIGH' || t.priority === 'CRITICAL');
    for (let i = 0; i < highPriorityTasks.length - 1; i++) {
      const currentTask = highPriorityTasks[i];
      const nextTask = highPriorityTasks[i + 1];
      if (currentTask && nextTask) {
        edges.push({
          fromTaskId: currentTask.id,
          toTaskId: nextTask.id,
          dependencyType: 'FINISH_TO_START',
          lagHours: 0
        });
      }
    }

    // Calculate critical path (simplified - would use proper algorithm in production)
    const criticalPath = this.calculateCriticalPath(nodes, edges);
    const totalDurationHours = nodes.reduce((sum, node) => sum + node.estimatedHours, 0);

    const dependencyGraph: DependencyGraph = {
      nodes,
      edges,
      criticalPath,
      totalDurationHours
    };

    logger.info('Dependency resolution completed', {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      criticalPathLength: criticalPath.length,
      totalDurationHours
    });

    return dependencyGraph;
  }

  /**
   * Split multi-day tasks into smaller blocks (≤2 hours each)
   * 
   * @param tasks - Tasks to potentially split
   * @param maxBlockSize - Maximum block size in hours
   * @returns Array of tasks with large tasks split into smaller blocks
   */
  async splitMultiDayTasks(tasks: TaskResponse[], maxBlockSize: number = 2): Promise<TaskResponse[]> {
    logger.info('Splitting multi-day tasks', {
      taskCount: tasks.length,
      maxBlockSize
    });

    const splitTasks: TaskResponse[] = [];

    for (const task of tasks) {
      const estimatedHours = task.estimatedHours || 1;

      if (estimatedHours <= maxBlockSize) {
        // Task fits in one block
        splitTasks.push(task);
      } else {
        // Split task into multiple blocks
        const numberOfBlocks = Math.ceil(estimatedHours / maxBlockSize);
        const hoursPerBlock = estimatedHours / numberOfBlocks;

        for (let i = 0; i < numberOfBlocks; i++) {
          const splitTask: TaskResponse = {
            ...task,
            id: `${task.id}_part_${i + 1}`,
            title: `${task.title} (Part ${i + 1}/${numberOfBlocks})`,
            estimatedHours: hoursPerBlock,
            parentTaskId: task.id
          };
          splitTasks.push(splitTask);
        }

        logger.info('Task split into blocks', {
          originalTaskId: task.id,
          originalHours: estimatedHours,
          numberOfBlocks,
          hoursPerBlock
        });
      }
    }

    logger.info('Task splitting completed', {
      originalTaskCount: tasks.length,
      splitTaskCount: splitTasks.length
    });

    return splitTasks;
  }

  /**
   * Generate AI-powered scheduling suggestions
   * 
   * @param schedule - Current schedule
   * @param context - Additional context for suggestions
   * @returns Scheduling suggestions with reasoning
   */
  async suggestScheduleOptimizations(
    schedule: TaskPlacement[],
    context?: any
  ): Promise<ScheduleSuggestion[]> {
    logger.info('Generating schedule optimization suggestions', {
      scheduleLength: schedule.length
    });

    // This would integrate with the AI service using external prompts
    // For now, return deterministic suggestions based on schedule analysis
    const suggestions: ScheduleSuggestion[] = [];

    // Analyze unplaced tasks
    const unplacedTasks = schedule.filter(p => p.status === 'UNPLACED');
    if (unplacedTasks.length > 0) {
      suggestions.push({
        suggestion: `${unplacedTasks.length} tasks could not be scheduled. Consider extending working hours or moving lower-priority tasks.`,
        reasoning: 'Insufficient available time slots for all tasks within current constraints.',
        alternatives: [
          {
            option: 'Extend daily working hours by 1-2 hours',
            tradeOffs: 'May impact work-life balance but ensures task completion'
          },
          {
            option: 'Move non-critical tasks to next week',
            tradeOffs: 'Delays some deliverables but maintains realistic schedule'
          }
        ],
        urgencyWarning: unplacedTasks.some(t => t.originalTask.priority === 'CRITICAL') 
          ? 'Critical tasks are unscheduled - immediate action required'
          : undefined
      });
    }

    // Analyze fragmented tasks
    const fragmentedTasks = schedule.filter(p => p.placements.length > 1);
    if (fragmentedTasks.length > 0) {
      suggestions.push({
        suggestion: `${fragmentedTasks.length} tasks are split across multiple time blocks. Consider consolidating for better focus.`,
        reasoning: 'Task fragmentation can reduce efficiency due to context switching.',
        alternatives: [
          {
            option: 'Reschedule to create longer continuous blocks',
            tradeOffs: 'May require moving other commitments but improves focus'
          },
          {
            option: 'Accept fragmentation but add buffer time between blocks',
            tradeOffs: 'Maintains current schedule but reduces total available time'
          }
        ]
      });
    }

    logger.info('Schedule optimization suggestions generated', {
      suggestionCount: suggestions.length
    });

    return suggestions;
  }

  /**
   * Generate explanations for scheduling conflicts
   * 
   * @param conflicts - Array of conflict descriptions
   * @param context - Additional context for explanations
   * @returns Detailed conflict explanations with solutions
   */
  async explainConflicts(
    conflicts: string[],
    context?: any
  ): Promise<ConflictExplanation[]> {
    logger.info('Generating conflict explanations', {
      conflictCount: conflicts.length
    });

    const explanations: ConflictExplanation[] = [];

    for (const conflict of conflicts) {
      // This would integrate with AI service for natural language explanations
      // For now, provide structured explanations based on conflict type
      const explanation: ConflictExplanation = {
        conflictSummary: `Scheduling conflict detected: ${conflict}`,
        impactAnalysis: 'This conflict may delay task completion and affect downstream dependencies.',
        proposedSolutions: [
          {
            solution: 'Reschedule conflicting task to next available slot',
            effortRequired: 'Low - automatic rescheduling',
            impact: 'Minimal delay, maintains task sequence'
          },
          {
            solution: 'Split conflicting task into smaller blocks',
            effortRequired: 'Medium - requires task restructuring',
            impact: 'Allows partial progress, may reduce efficiency'
          },
          {
            solution: 'Escalate to manual review',
            effortRequired: 'High - requires human intervention',
            impact: 'Ensures optimal resolution but delays scheduling'
          }
        ],
        recommendedAction: 'Recommend automatic rescheduling as first option, with manual review for critical tasks.'
      };

      explanations.push(explanation);
    }

    logger.info('Conflict explanations generated', {
      explanationCount: explanations.length
    });

    return explanations;
  }

  /**
   * Generate user-friendly messages for scheduling operations
   * 
   * @param context - Context for message generation
   * @returns User-friendly message
   */
  async generateUserFriendlyMessages(context: any): Promise<string> {
    logger.info('Generating user-friendly message', { context });

    // This would integrate with AI service using external prompts
    // For now, return structured messages based on context
    if (context.type === 'schedule_complete') {
      return `Successfully scheduled ${context.taskCount} tasks across ${context.dayCount} days. ${context.conflicts || 0} conflicts resolved automatically.`;
    }

    if (context.type === 'optimization_suggestion') {
      return `I've analyzed your schedule and found ${context.suggestionCount} opportunities for optimization. Would you like to review the suggestions?`;
    }

    return 'Schedule operation completed successfully.';
  }

  /**
   * Generate optimized schedule for a goal
   */
  async generateSchedule(
    goalId: string,
    workingHours: any,
    constraints?: any,
    preferences?: any,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    logger.info('Generating schedule for goal', { goalId });

    // Get goal with tasks
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
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
      throw new Error('Goal not found');
    }

    // Extract all tasks from milestones
    const allTasks: TaskResponse[] = [];
    for (const milestone of goal.milestones) {
      for (const task of milestone.tasks) {
        allTasks.push({
          id: task.id,
          title: task.title,
          description: task.description,
          estimatedHours: task.estimates?.[0]?.estimatedHours || 1,
          priority: task.priority as PriorityType,
          status: task.status as any,
          milestoneId: milestone.id,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
          tags: [],
          completedAt: task.completedAt?.toISOString() || null,
          parentTaskId: null,
          completionCriteria: null,
          actualHours: null,
          startedAt: null,
          assignedTo: null
        });
      }
    }

    // Generate time slots based on working hours
    const timeSlots = this.generateTimeSlots(workingHours, startDate, endDate);
    
    // Create scheduling constraints
    const schedulingConstraints: SchedulingConstraints = {
      workingHours: workingHours,
      maxBlockSizeHours: constraints?.max_consecutive_hours || 2,
      minBlockSizeHours: 0.25,
      bufferBetweenTasksMinutes: constraints?.break_duration_minutes || 15,
      allowWeekends: false
    };

    // Place tasks in schedule
    const placements = await this.placeTasks(allTasks, schedulingConstraints, timeSlots);

    return {
      goalId,
      placements,
      summary: {
        totalTasks: allTasks.length,
        placedTasks: placements.filter(p => p.status === 'PLACED').length,
        partiallyPlacedTasks: placements.filter(p => p.status === 'PARTIALLY_PLACED').length,
        unplacedTasks: placements.filter(p => p.status === 'UNPLACED').length
      }
    };
  }

  /**
   * Get existing schedule for a goal
   */
  async getSchedule(goalId: string): Promise<any> {
    logger.info('Getting schedule for goal', { goalId });

    // This would typically fetch from a schedules table
    // For now, return a placeholder
    return {
      goalId,
      placements: [],
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Update existing schedule
   */
  async updateSchedule(scheduleId: string, updates: any[]): Promise<any> {
    logger.info('Updating schedule', { scheduleId, updateCount: updates.length });

    // This would update the schedule in the database
    // For now, return a placeholder
    return {
      scheduleId,
      updates,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Detect scheduling conflicts
   */
  async detectConflicts(goalId: string): Promise<any[]> {
    logger.info('Detecting conflicts for goal', { goalId });

    // This would analyze the schedule for conflicts
    // For now, return empty array
    return [];
  }

  /**
   * Resolve a scheduling conflict
   */
  async resolveConflict(conflictId: string, strategy: string, parameters?: any): Promise<any> {
    logger.info('Resolving conflict', { conflictId, strategy });

    // This would implement conflict resolution logic
    // For now, return a placeholder
    return {
      conflictId,
      strategy,
      resolution: 'Conflict resolved successfully',
      resolvedAt: new Date().toISOString()
    };
  }

  /**
   * Generate AI-powered suggestions
   */
  async generateAISuggestions(goalId: string, userApiKey?: string): Promise<any[]> {
    logger.info('Generating AI suggestions for goal', { goalId });

    // This would integrate with AI service
    // For now, return placeholder suggestions
    return [
      {
        type: 'optimization',
        suggestion: 'Consider consolidating similar tasks to reduce context switching',
        confidence: 0.8
      }
    ];
  }

  /**
   * Get schedule analytics
   */
  async getScheduleAnalytics(goalId: string): Promise<any> {
    logger.info('Getting schedule analytics for goal', { goalId });

    // This would calculate various analytics
    // For now, return placeholder data
    return {
      goalId,
      efficiency: 0.85,
      utilizationRate: 0.75,
      averageTaskDuration: 1.5,
      fragmentationIndex: 0.3
    };
  }

  // Private helper methods

  private generateTimeSlots(workingHours: any, startDate?: Date, endDate?: Date): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const start = startDate || new Date();
    const end = endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Generate daily slots based on working hours
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      const dayConfig = dayName ? workingHours[dayName] : null;

      if (dayConfig?.enabled) {
        const [startHour, startMinute] = dayConfig.start.split(':').map(Number);
        const [endHour, endMinute] = dayConfig.end.split(':').map(Number);

        const slotStart = new Date(current);
        slotStart.setHours(startHour, startMinute, 0, 0);

        const slotEnd = new Date(current);
        slotEnd.setHours(endHour, endMinute, 0, 0);

        slots.push({
          id: `slot_${current.toISOString().split('T')[0]}_${dayNames[dayOfWeek]}`,
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          isAvailable: true
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return slots;
  }

  // Private helper methods

  private calculateSlotScore(
    slot: TimeSlot,
    tasks: TaskResponse[],
    constraints: SchedulingConstraints
  ): ScoredSlot {
    const slotStart = new Date(slot.startTime);
    const slotEnd = new Date(slot.endTime);
    const slotDurationHours = (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60 * 60);

    // Priority score (0-30 points)
    const priorityScore = this.calculatePriorityScore(tasks);

    // Dependency score (0-25 points)
    const dependencyScore = this.calculateDependencyScore(slot, tasks);

    // Preference score (0-25 points)
    const preferenceScore = this.calculatePreferenceScore(slot, constraints);

    // Availability score (0-20 points)
    const availabilityScore = Math.min(20, slotDurationHours * 10);

    const totalScore = priorityScore + dependencyScore + preferenceScore + availabilityScore;

    return {
      slot,
      score: Math.min(100, totalScore),
      factors: {
        priorityScore,
        dependencyScore,
        preferenceScore,
        availabilityScore
      },
      reasoning: `Slot scored ${totalScore.toFixed(1)}/100 based on priority (${priorityScore}), dependencies (${dependencyScore}), preferences (${preferenceScore}), and availability (${availabilityScore})`
    };
  }

  private calculatePriorityScore(tasks: TaskResponse[]): number {
    const highPriorityTasks = tasks.filter(t => t.priority === 'HIGH' || t.priority === 'CRITICAL').length;
    const totalTasks = tasks.length;
    return totalTasks > 0 ? (highPriorityTasks / totalTasks) * 30 : 0;
  }

  private calculateDependencyScore(slot: TimeSlot, tasks: TaskResponse[]): number {
    // Simplified dependency scoring - would be more sophisticated in production
    return 20; // Default score for now
  }

  private calculatePreferenceScore(slot: TimeSlot, constraints: SchedulingConstraints): number {
    const slotStart = new Date(slot.startTime);
    const dayOfWeek = slotStart.getDay();
    const hour = slotStart.getHours();

    // Prefer working hours
    const workingHours = constraints.workingHours;
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayConfig = workingHours[dayNames[dayOfWeek] as keyof typeof workingHours];

    if (typeof dayConfig === 'object' && 'enabled' in dayConfig && dayConfig.enabled) {
      const dayConfigTyped = dayConfig as { start: string; end: string; enabled: boolean };
      if (dayConfigTyped.start && dayConfigTyped.end) {
        const startTimeParts = dayConfigTyped.start.split(':');
        const endTimeParts = dayConfigTyped.end.split(':');
        
        if (startTimeParts[0] && endTimeParts[0]) {
          const startHour = parseInt(startTimeParts[0]);
          const endHour = parseInt(endTimeParts[0]);
          
          if (hour >= startHour && hour < endHour) {
            return 25; // Full score for working hours
          }
        }
      }
    }

    return 5; // Low score for non-working hours
  }

  private async placeTask(
    task: TaskResponse,
    availability: TimeSlot[],
    constraints: SchedulingConstraints,
    usedSlots: Set<string>
  ): Promise<TaskPlacement> {
    const estimatedHours = task.estimatedHours || 1;
    const placements: TaskPlacement['placements'] = [];

    // Split task if it exceeds max block size
    const splitTasks = estimatedHours > this.maxBlockSizeHours 
      ? await this.splitMultiDayTasks([task], this.maxBlockSizeHours)
      : [task];

    let remainingHours = estimatedHours;
    let partIndex = 1;

    for (const availableSlot of availability) {
      if (usedSlots.has(availableSlot.id) || remainingHours <= 0) continue;

      const slotStart = new Date(availableSlot.startTime);
      const slotEnd = new Date(availableSlot.endTime);
      const slotDurationHours = (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60 * 60);

      const hoursToPlace = Math.min(remainingHours, slotDurationHours, this.maxBlockSizeHours);

      if (hoursToPlace >= this.minBlockSizeHours) {
        const placementEnd = new Date(slotStart.getTime() + (hoursToPlace * 60 * 60 * 1000));

        placements.push({
          slotId: availableSlot.id,
          startTime: slotStart.toISOString(),
          endTime: placementEnd.toISOString(),
          durationHours: hoursToPlace,
          isPartialTask: splitTasks.length > 1,
          partIndex: splitTasks.length > 1 ? partIndex : undefined,
          totalParts: splitTasks.length > 1 ? splitTasks.length : undefined,
          parentTaskId: splitTasks.length > 1 ? task.id : undefined
        });

        remainingHours -= hoursToPlace;
        partIndex++;
      }
    }

    const status: TaskPlacement['status'] = 
      remainingHours <= 0 ? 'PLACED' :
      placements.length > 0 ? 'PARTIALLY_PLACED' : 'UNPLACED';

    return {
      taskId: task.id,
      originalTask: {
        id: task.id,
        title: task.title,
        estimatedHours: task.estimatedHours || 1,
        priority: task.priority,
        dependencies: [] // Would come from dependencies table
      },
      placements,
      status,
      spilloverReason: remainingHours > 0 ? `${remainingHours} hours could not be scheduled` : undefined
    };
  }

  private topologicalSort(dependencyGraph: DependencyGraph, tasks: TaskResponse[]): TaskResponse[] {
    // Simplified topological sort - would use proper algorithm in production
    const criticalTasks = tasks.filter(t => 
      dependencyGraph.criticalPath.includes(t.id)
    );
    const otherTasks = tasks.filter(t => 
      !dependencyGraph.criticalPath.includes(t.id)
    );

    // Sort by priority within each group
    const sortByPriority = (a: TaskResponse, b: TaskResponse) => {
      const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
             (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
    };

    return [
      ...criticalTasks.sort(sortByPriority),
      ...otherTasks.sort(sortByPriority)
    ];
  }

  private calculateCriticalPath(
    nodes: DependencyGraph['nodes'],
    edges: DependencyGraph['edges']
  ): string[] {
    // Simplified critical path calculation
    // In production, this would use proper CPM algorithm
    const highPriorityNodes = nodes
      .filter(n => n.priority === 'HIGH' || n.priority === 'CRITICAL')
      .sort((a, b) => b.estimatedHours - a.estimatedHours);

    return highPriorityNodes.slice(0, Math.min(3, highPriorityNodes.length)).map(n => n.taskId);
  }
}

// Note: Singleton instance will be created in routes with PrismaClient
// export const plannerService = new PlannerService();