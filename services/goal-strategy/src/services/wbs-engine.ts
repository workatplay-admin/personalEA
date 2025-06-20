import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import { logger } from '../utils/logger';
import { z } from 'zod';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'],
});

// Validation schemas
const TaskBreakdownSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  estimatedHours: z.number().min(0.25).max(8), // Max 1 day (8 hours)
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  complexity: z.enum(['SIMPLE', 'MODERATE', 'COMPLEX']),
  skills: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  completionCriteria: z.array(z.string()).min(1),
  templateCategory: z.string().optional(),
});

const WBSRequestSchema = z.object({
  milestoneId: z.string().uuid(),
  maxDepth: z.number().min(1).max(5).default(3),
  maxTasksPerLevel: z.number().min(2).max(10).default(6),
  targetTaskSize: z.number().min(0.25).max(8).default(4), // Target 4 hours per task
  includeTemplates: z.boolean().default(true),
});

export interface TaskBreakdown {
  title: string;
  description: string;
  estimatedHours: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
  skills?: string[];
  dependencies?: string[];
  completionCriteria: string[];
  templateCategory?: string;
  subtasks?: TaskBreakdown[];
}

export interface WBSResult {
  milestoneId: string;
  totalTasks: number;
  totalEstimatedHours: number;
  maxDepth: number;
  taskHierarchy: TaskBreakdown[];
  templates: TaskTemplate[];
  analysisMetrics: {
    averageTaskSize: number;
    complexityDistribution: Record<string, number>;
    skillsRequired: string[];
    criticalPath: string[];
  };
}

export interface TaskTemplate {
  id: string;
  category: string;
  name: string;
  description: string;
  estimatedHours: number;
  skills: string[];
  completionCriteria: string[];
  usageCount: number;
}

export class WBSEngine {
  /**
   * Generate Work Breakdown Structure for a milestone
   */
  async generateWBS(request: z.infer<typeof WBSRequestSchema>): Promise<WBSResult> {
    const correlationId = `wbs-${Date.now()}`;
    logger.info('Starting WBS generation', { correlationId, request });

    try {
      // Validate request
      const validatedRequest = WBSRequestSchema.parse(request);

      // Get milestone details
      const milestone = await this.getMilestoneWithContext(validatedRequest.milestoneId);
      if (!milestone) {
        throw new Error(`Milestone not found: ${validatedRequest.milestoneId}`);
      }

      // Load relevant templates
      const templates = validatedRequest.includeTemplates 
        ? await this.loadTaskTemplates(milestone.goal.category)
        : [];

      // Generate task breakdown using AI
      const taskHierarchy = await this.generateTaskHierarchy(
        milestone,
        validatedRequest,
        templates,
        correlationId
      );

      // Calculate metrics
      const analysisMetrics = this.calculateWBSMetrics(taskHierarchy);

      // Save WBS to database
      await this.saveWBSToDatabase(validatedRequest.milestoneId, taskHierarchy, correlationId);

      const result: WBSResult = {
        milestoneId: validatedRequest.milestoneId,
        totalTasks: this.countTotalTasks(taskHierarchy),
        totalEstimatedHours: analysisMetrics.totalHours,
        maxDepth: this.calculateMaxDepth(taskHierarchy),
        taskHierarchy,
        templates,
        analysisMetrics: {
          averageTaskSize: analysisMetrics.averageTaskSize,
          complexityDistribution: analysisMetrics.complexityDistribution,
          skillsRequired: analysisMetrics.skillsRequired,
          criticalPath: analysisMetrics.criticalPath,
        },
      };

      logger.info('WBS generation completed', { 
        correlationId, 
        totalTasks: result.totalTasks,
        totalHours: result.totalEstimatedHours 
      });

      return result;
    } catch (error) {
      logger.error('WBS generation failed', { correlationId, error });
      throw error;
    }
  }

  /**
   * Refine existing WBS based on feedback or new requirements
   */
  async refineWBS(
    milestoneId: string,
    refinements: {
      taskId?: string;
      action: 'SPLIT' | 'MERGE' | 'ADJUST_ESTIMATE' | 'ADD_DEPENDENCY';
      parameters: Record<string, any>;
    }[]
  ): Promise<WBSResult> {
    const correlationId = `wbs-refine-${Date.now()}`;
    logger.info('Starting WBS refinement', { correlationId, milestoneId, refinements });

    try {
      // Get existing WBS
      const existingWBS = await this.getExistingWBS(milestoneId);
      if (!existingWBS) {
        throw new Error(`No existing WBS found for milestone: ${milestoneId}`);
      }

      // Apply refinements
      let refinedHierarchy = existingWBS.taskHierarchy;
      for (const refinement of refinements) {
        refinedHierarchy = await this.applyRefinement(refinedHierarchy, refinement, correlationId);
      }

      // Recalculate metrics
      const analysisMetrics = this.calculateWBSMetrics(refinedHierarchy);

      // Update database
      await this.updateWBSInDatabase(milestoneId, refinedHierarchy, correlationId);

      const result: WBSResult = {
        milestoneId,
        totalTasks: this.countTotalTasks(refinedHierarchy),
        totalEstimatedHours: analysisMetrics.totalHours,
        maxDepth: this.calculateMaxDepth(refinedHierarchy),
        taskHierarchy: refinedHierarchy,
        templates: [], // Templates not needed for refinement
        analysisMetrics: {
          averageTaskSize: analysisMetrics.averageTaskSize,
          complexityDistribution: analysisMetrics.complexityDistribution,
          skillsRequired: analysisMetrics.skillsRequired,
          criticalPath: analysisMetrics.criticalPath,
        },
      };

      logger.info('WBS refinement completed', { correlationId, totalTasks: result.totalTasks });
      return result;
    } catch (error) {
      logger.error('WBS refinement failed', { correlationId, error });
      throw error;
    }
  }

  /**
   * Generate task hierarchy using AI with recursive decomposition
   */
  private async generateTaskHierarchy(
    milestone: any,
    request: z.infer<typeof WBSRequestSchema>,
    templates: TaskTemplate[],
    correlationId: string
  ): Promise<TaskBreakdown[]> {
    const prompt = this.buildWBSPrompt(milestone, request, templates);

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert project manager specializing in Work Breakdown Structure (WBS) creation. 
            Your task is to decompose milestones into actionable tasks following these principles:
            
            1. RECURSIVE DECOMPOSITION: Break down complex work into smaller, manageable tasks
            2. TASK SIZE LIMIT: Each task should be ≤8 hours (1 day) of work
            3. CLEAR COMPLETION CRITERIA: Every task must have specific, measurable completion criteria
            4. DEPENDENCY AWARENESS: Identify logical dependencies between tasks
            5. SKILL MAPPING: Identify required skills for each task
            6. TEMPLATE UTILIZATION: Use provided templates when applicable
            
            Return a JSON object with the task hierarchy structure.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse and validate the response
      const parsedResponse = JSON.parse(content);
      return this.validateAndProcessTaskHierarchy(parsedResponse.tasks || parsedResponse);
    } catch (error) {
      logger.error('AI task hierarchy generation failed', { correlationId, error });
      throw new Error(`Failed to generate task hierarchy: ${error}`);
    }
  }

  /**
   * Build comprehensive prompt for WBS generation
   */
  private buildWBSPrompt(
    milestone: any,
    request: z.infer<typeof WBSRequestSchema>,
    templates: TaskTemplate[]
  ): string {
    const templateInfo = templates.length > 0 
      ? `\n\nAvailable Task Templates:\n${templates.map(t => 
          `- ${t.name}: ${t.description} (${t.estimatedHours}h, Skills: ${t.skills.join(', ')})`
        ).join('\n')}`
      : '';

    return `
Create a Work Breakdown Structure for the following milestone:

**Milestone Details:**
- Title: ${milestone.title}
- Description: ${milestone.description}
- Target Date: ${milestone.targetDate}
- Success Criteria: ${milestone.successCriteria?.join(', ') || 'Not specified'}
- Goal Context: ${milestone.goal.title} - ${milestone.goal.description}

**WBS Requirements:**
- Maximum Depth: ${request.maxDepth} levels
- Maximum Tasks per Level: ${request.maxTasksPerLevel}
- Target Task Size: ${request.targetTaskSize} hours
- Each task must be ≤8 hours (1 day)

**Task Structure Requirements:**
For each task, provide:
1. title: Clear, action-oriented task name
2. description: Detailed description of what needs to be done
3. estimatedHours: Realistic time estimate (0.25-8 hours)
4. priority: LOW, MEDIUM, HIGH, or CRITICAL
5. complexity: SIMPLE, MODERATE, or COMPLEX
6. skills: Array of required skills/expertise
7. dependencies: Array of task titles this depends on
8. completionCriteria: Array of specific, measurable completion criteria
9. templateCategory: If using a template, specify which one
10. subtasks: Array of subtasks (for recursive breakdown)

**Decomposition Strategy:**
1. Start with high-level work packages
2. Recursively break down until each task is ≤${request.targetTaskSize} hours
3. Ensure logical sequencing and dependencies
4. Balance workload across different skill sets
5. Include quality assurance and testing tasks
6. Consider integration and deployment activities

${templateInfo}

Return a JSON object with this structure:
{
  "tasks": [
    {
      "title": "Task Name",
      "description": "Detailed description",
      "estimatedHours": 4.0,
      "priority": "HIGH",
      "complexity": "MODERATE",
      "skills": ["skill1", "skill2"],
      "dependencies": ["Previous Task"],
      "completionCriteria": ["Criteria 1", "Criteria 2"],
      "templateCategory": "optional",
      "subtasks": [...]
    }
  ]
}
`;
  }

  /**
   * Validate and process the AI-generated task hierarchy
   */
  private validateAndProcessTaskHierarchy(tasks: any[]): TaskBreakdown[] {
    const processTask = (task: any): TaskBreakdown => {
      // Validate core task structure
      const validatedTask = TaskBreakdownSchema.parse({
        title: task.title,
        description: task.description,
        estimatedHours: task.estimatedHours,
        priority: task.priority,
        complexity: task.complexity,
        skills: task.skills || [],
        dependencies: task.dependencies || [],
        completionCriteria: task.completionCriteria,
        templateCategory: task.templateCategory,
      });

      // Process subtasks recursively
      const result: TaskBreakdown = {
        title: validatedTask.title,
        description: validatedTask.description,
        estimatedHours: validatedTask.estimatedHours,
        priority: validatedTask.priority,
        complexity: validatedTask.complexity,
        skills: validatedTask.skills || [],
        dependencies: validatedTask.dependencies || [],
        completionCriteria: validatedTask.completionCriteria,
        ...(validatedTask.templateCategory && { templateCategory: validatedTask.templateCategory }),
      };
      if (task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0) {
        result.subtasks = task.subtasks.map(processTask);
      }

      return result;
    };

    return tasks.map(processTask);
  }

  /**
   * Calculate comprehensive WBS metrics
   */
  private calculateWBSMetrics(taskHierarchy: TaskBreakdown[]): {
    totalHours: number;
    averageTaskSize: number;
    complexityDistribution: Record<string, number>;
    skillsRequired: string[];
    criticalPath: string[];
  } {
    const allTasks = this.flattenTaskHierarchy(taskHierarchy);
    const totalHours = allTasks.reduce((sum, task) => sum + task.estimatedHours, 0);
    const averageTaskSize = totalHours / allTasks.length;

    const complexityDistribution = allTasks.reduce((dist, task) => {
      dist[task.complexity] = (dist[task.complexity] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    const skillsSet = new Set<string>();
    allTasks.forEach(task => {
      task.skills?.forEach(skill => skillsSet.add(skill));
    });

    // Simple critical path calculation (tasks with HIGH/CRITICAL priority and dependencies)
    const criticalPath = allTasks
      .filter(task => ['HIGH', 'CRITICAL'].includes(task.priority))
      .map(task => task.title);

    return {
      totalHours,
      averageTaskSize,
      complexityDistribution,
      skillsRequired: Array.from(skillsSet),
      criticalPath,
    };
  }

  /**
   * Flatten task hierarchy for analysis
   */
  private flattenTaskHierarchy(tasks: TaskBreakdown[]): TaskBreakdown[] {
    const flattened: TaskBreakdown[] = [];
    
    const flatten = (taskList: TaskBreakdown[]) => {
      for (const task of taskList) {
        flattened.push(task);
        if (task.subtasks) {
          flatten(task.subtasks);
        }
      }
    };

    flatten(tasks);
    return flattened;
  }

  /**
   * Count total tasks in hierarchy
   */
  private countTotalTasks(tasks: TaskBreakdown[]): number {
    return this.flattenTaskHierarchy(tasks).length;
  }

  /**
   * Calculate maximum depth of task hierarchy
   */
  private calculateMaxDepth(tasks: TaskBreakdown[]): number {
    const getDepth = (taskList: TaskBreakdown[], currentDepth = 1): number => {
      let maxDepth = currentDepth;
      for (const task of taskList) {
        if (task.subtasks && task.subtasks.length > 0) {
          maxDepth = Math.max(maxDepth, getDepth(task.subtasks, currentDepth + 1));
        }
      }
      return maxDepth;
    };

    return getDepth(tasks);
  }

  /**
   * Get milestone with full context
   */
  private async getMilestoneWithContext(milestoneId: string) {
    return await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        goal: {
          include: {
            metrics: true,
          },
        },
      },
    });
  }

  /**
   * Load task templates for the given category
   */
  private async loadTaskTemplates(category?: string): Promise<TaskTemplate[]> {
    // This would load from a template database or file system
    // For now, return empty array - will be implemented in template service
    return [];
  }

  /**
   * Save WBS to database
   */
  private async saveWBSToDatabase(
    milestoneId: string,
    taskHierarchy: TaskBreakdown[],
    correlationId: string
  ): Promise<void> {
    logger.info('Saving WBS to database', { correlationId, milestoneId });

    // Flatten tasks for database storage
    const allTasks = this.flattenTaskHierarchy(taskHierarchy);
    
    // Create tasks in database
    for (const task of allTasks) {
      await prisma.task.create({
        data: {
          milestoneId,
          title: task.title,
          description: task.description,
          estimatedHours: task.estimatedHours,
          priority: task.priority,
          complexity: task.complexity,
          skills: task.skills || [],
          completionCriteria: task.completionCriteria,
          templateCategory: task.templateCategory,
          status: 'NOT_STARTED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    logger.info('WBS saved to database', { correlationId, taskCount: allTasks.length });
  }

  /**
   * Get existing WBS from database
   */
  private async getExistingWBS(milestoneId: string): Promise<WBSResult | null> {
    const tasks = await prisma.task.findMany({
      where: { milestoneId },
      orderBy: { createdAt: 'asc' },
    });

    if (tasks.length === 0) {
      return null;
    }

    // Convert flat tasks back to hierarchy (simplified for now)
    const taskHierarchy: TaskBreakdown[] = tasks.map((task: any) => ({
      title: task.title,
      description: task.description,
      estimatedHours: task.estimatedHours,
      priority: task.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
      complexity: task.complexity as 'SIMPLE' | 'MODERATE' | 'COMPLEX',
      skills: task.skills || [],
      dependencies: [], // Would need to be reconstructed from dependencies table
      completionCriteria: task.completionCriteria,
      templateCategory: task.templateCategory || undefined,
    }));

    const analysisMetrics = this.calculateWBSMetrics(taskHierarchy);

    return {
      milestoneId,
      totalTasks: tasks.length,
      totalEstimatedHours: analysisMetrics.totalHours,
      maxDepth: 1, // Simplified for flat structure
      taskHierarchy,
      templates: [],
      analysisMetrics: {
        averageTaskSize: analysisMetrics.averageTaskSize,
        complexityDistribution: analysisMetrics.complexityDistribution,
        skillsRequired: analysisMetrics.skillsRequired,
        criticalPath: analysisMetrics.criticalPath,
      },
    };
  }

  /**
   * Update WBS in database
   */
  private async updateWBSInDatabase(
    milestoneId: string,
    taskHierarchy: TaskBreakdown[],
    correlationId: string
  ): Promise<void> {
    logger.info('Updating WBS in database', { correlationId, milestoneId });

    // Delete existing tasks
    await prisma.task.deleteMany({
      where: { milestoneId },
    });

    // Save updated tasks
    await this.saveWBSToDatabase(milestoneId, taskHierarchy, correlationId);
  }

  /**
   * Apply refinement to task hierarchy
   */
  private async applyRefinement(
    taskHierarchy: TaskBreakdown[],
    refinement: any,
    correlationId: string
  ): Promise<TaskBreakdown[]> {
    // Implementation would depend on refinement type
    // For now, return unchanged hierarchy
    logger.info('Applying WBS refinement', { correlationId, refinement });
    return taskHierarchy;
  }
}

export const wbsEngine = new WBSEngine();