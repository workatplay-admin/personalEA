/**
 * SMART Goal Processor V2 Service
 * 
 * Enhanced SMART goal processor leveraging LLM-driven architecture for improved
 * goal transformation, conversational refinement, and intelligent processing workflows.
 * 
 * @see {@link file://../../../../docs/goal-strategy-service-specification.md Goal Strategy Service Specification}
 * @see {@link file://../../../../docs/LLM_DRIVEN_REFACTORING.md LLM-Driven Refactoring Guide}
 * @see {@link file://../../../../docs/reference/architecture/system-overview.md System Architecture Overview}
 */

import { logger } from '@/utils/logger';
import { env } from '@/config/environment';
import { UnifiedGoalProcessor } from './unified-goal-processor';
import { LLMDrivenValidator } from './llm-driven-validator';
import { LLMTaskEstimator } from './llm-task-estimator';
import { ConversationalStateManager } from './conversational-state-manager';
import { 
  RawGoalInput, 
  GoalTranslationResult, 
  ConversationMessage,
  GoalState,
  SMARTGoal,
  Milestone,
  TaskBreakdown
} from '../types/smart-goals';

/**
 * SMARTGoalProcessorV2 - Refactored to leverage LLM for heavy lifting
 * 
 * Key improvements:
 * 1. Single unified LLM call for most operations
 * 2. Natural language understanding replaces regex patterns
 * 3. Contextual state management
 * 4. Intelligent error recovery
 * 5. Dynamic UI generation
 */
export class SMARTGoalProcessorV2 {
  private unifiedProcessor: UnifiedGoalProcessor;
  private validator: LLMDrivenValidator;
  private estimator: LLMTaskEstimator;
  private stateManager: ConversationalStateManager;
  
  constructor(apiKey?: string) {
    const key = apiKey || env.OPENAI_API_KEY;
    this.unifiedProcessor = new UnifiedGoalProcessor(key);
    this.validator = new LLMDrivenValidator(key);
    this.estimator = new LLMTaskEstimator(key);
    this.stateManager = new ConversationalStateManager(key);
  }

  /**
   * Process a complete conversation turn - replaces multiple method calls
   */
  async processConversationTurn(
    conversationHistory: ConversationMessage[],
    userInput: string,
    currentGoalState?: GoalState
  ): Promise<{
    goal: SMARTGoal,
    conversationState: any,
    response: string,
    uiConfig: any,
    nextSteps: string[]
  }> {
    const correlationId = this.generateCorrelationId();
    logger.info('Processing conversation turn with unified LLM', { correlationId });

    try {
      // 1. Manage conversation state with LLM
      const currentMetadata = currentGoalState?.conversationMetadata;
      const conversationState = await this.stateManager.manageConversation(
        conversationHistory,
        userInput,
        currentMetadata ? {
          phase: {
            current: currentMetadata.phase.current as any,
            confidence: currentMetadata.phase.confidence,
            transitionReason: undefined
          }
        } : undefined
      );

      // 2. Process the entire conversation with unified processor
      const result = await this.unifiedProcessor.processGoalConversation(
        conversationHistory,
        currentGoalState || this.createInitialGoalState(),
        userInput
      );

      // 3. Return comprehensive result
      return {
        goal: this.mapToSMARTGoal(result.updatedGoal),
        conversationState: result.conversationState,
        response: result.response.message,
        uiConfig: conversationState.uiRecommendations,
        nextSteps: result.conversationState.suggestedQuestions || []
      };

    } catch (error) {
      logger.error('Error in conversation processing', { error, correlationId });
      
      // Intelligent error recovery
      const recovery = await this.unifiedProcessor.handleError(
        error,
        { conversationHistory, currentState: currentGoalState || this.createInitialGoalState() }
      );
      
      return {
        goal: currentGoalState?.goal || this.createEmptyGoal(),
        conversationState: { phase: 'error_recovery' },
        response: recovery.userMessage,
        uiConfig: { primaryDisplay: 'chat' },
        nextSteps: recovery.suggestions
      };
    }
  }

  /**
   * Validate and enhance goal with single LLM call
   */
  async validateAndEnhanceGoal(goalText: string, context?: any): Promise<{
    isValid: boolean,
    enhancedGoal: string,
    components: any,
    suggestions: string[]
  }> {
    // Extract all components with LLM
    const components = await this.validator.extractGoalComponents(goalText, context);
    
    // Validate and get enhancements
    const validation = await this.validator.validateAndEnhance(components);
    
    // Generate contextual examples if needed
    const examples = validation.validationIssues.length > 0
      ? await this.validator.generateContextualExamples(
          validation.validationIssues,
          components.domain.category,
          goalText
        )
      : [];

    return {
      isValid: validation.isValid,
      enhancedGoal: this.constructEnhancedGoal(components),
      components,
      suggestions: [
        ...validation.enhancements.map(e => e.enhancement),
        ...examples.flatMap(e => e.examples)
      ]
    };
  }

  /**
   * Generate complete project plan with unified estimation
   */
  async generateProjectPlan(
    smartGoal: SMARTGoal,
    context?: any
  ): Promise<{
    milestones: Milestone[],
    tasks: TaskBreakdown,
    timeline: any,
    risks: any[]
  }> {
    // Get comprehensive estimate for the entire goal
    const estimate = await this.estimator.estimateTask(
      smartGoal.description,
      {
        projectType: smartGoal.category,
        deadline: smartGoal.smartCriteria?.timeBound?.deadline,
        constraints: context?.constraints
      }
    );

    // Transform estimate into milestones and tasks
    const milestones = this.generateMilestonesFromEstimate(estimate, smartGoal);
    const tasks = this.generateTaskBreakdownFromEstimate(estimate);

    return {
      milestones,
      tasks,
      timeline: {
        totalHours: estimate.estimates.recommended.hours,
        criticalPath: estimate.parallelization.criticalPath,
        parallelTracks: estimate.parallelization.opportunities
      },
      risks: estimate.risks
    };
  }

  /**
   * Replace pattern-based detection with LLM understanding
   */
  async detectInformationInResponse(
    userResponse: string,
    expectedType: string
  ): Promise<{
    detected: boolean,
    extractedValue: any,
    confidence: number,
    alternativeInterpretations: string[]
  }> {
    const components = await this.validator.extractGoalComponents(
      userResponse,
      `Looking for: ${expectedType}`
    );

    // Map component type to detection result
    switch (expectedType) {
      case 'timeframe':
        return {
          detected: components.timeframes.length > 0,
          extractedValue: components.timeframes[0]?.parsedValue,
          confidence: components.timeframes[0]?.confidence || 0,
          alternativeInterpretations: components.timeframes.slice(1).map(t => t.text)
        };
      case 'metrics':
        return {
          detected: components.metrics.length > 0,
          extractedValue: components.metrics.map(m => ({
            metric: m.text,
            value: m.value,
            unit: m.unit
          })),
          confidence: Math.max(...components.metrics.map(m => m.confidence)),
          alternativeInterpretations: []
        };
      default:
        return {
          detected: false,
          extractedValue: null,
          confidence: 0,
          alternativeInterpretations: []
        };
    }
  }

  // Helper methods
  private generateCorrelationId(): string {
    return Math.random().toString(36).substring(7);
  }

  private createInitialGoalState(): GoalState {
    return {
      goal: this.createEmptyGoal(),
      conversationMetadata: {
        phase: { current: 'initial_input', confidence: 100 },
        turnCount: 0
      }
    };
  }

  private createEmptyGoal(): SMARTGoal {
    return {
      id: '',
      originalGoal: '',
      description: '',
      category: 'general',
      smartCriteria: {
        specific: { what: '', who: '', where: '', why: '' },
        measurable: { metrics: [], targetValue: '' },
        achievable: { resources: [], constraints: [] },
        relevant: { alignment: '', benefits: [] },
        timeBound: { deadline: '', milestones: [] }
      },
      confidenceScores: {
        overall: 0,
        specific: 0,
        measurable: 0,
        achievable: 0,
        relevant: 0,
        timeBound: 0
      }
    };
  }

  private mapToSMARTGoal(goalData: any): SMARTGoal {
    return {
      id: goalData.id || this.generateCorrelationId(),
      originalGoal: goalData.title,
      description: goalData.title,
      category: goalData.category,
      smartCriteria: {
        specific: goalData.specific,
        measurable: goalData.measurable,
        achievable: goalData.achievable,
        relevant: goalData.relevant,
        timeBound: goalData.timeBound
      },
      confidenceScores: goalData.status.confidenceScores,
      isComplete: goalData.status.isComplete,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private constructEnhancedGoal(components: any): string {
    const parts = [];
    
    if (components.specificDetails.what.value) {
      parts.push(components.specificDetails.what.value);
    }
    
    if (components.metrics.length > 0) {
      const metricStr = components.metrics
        .map(m => `${m.text}${m.value ? ` (${m.value}${m.unit || ''})` : ''}`)
        .join(', ');
      parts.push(`measured by ${metricStr}`);
    }
    
    if (components.timeframes.length > 0) {
      parts.push(`by ${components.timeframes[0].text}`);
    }
    
    return parts.join(' ');
  }

  private generateMilestonesFromEstimate(estimate: any, goal: SMARTGoal): Milestone[] {
    return estimate.breakdown.map((subtask, index) => ({
      id: `milestone-${index + 1}`,
      goalId: goal.id,
      title: subtask.subtask,
      description: `Complete ${subtask.subtask}`,
      targetDate: this.calculateTargetDate(subtask.hours, index),
      dependencies: subtask.dependencies,
      status: 'pending' as const,
      confidenceScore: estimate.estimates.likely.confidence,
      estimatedHours: subtask.hours,
      tasks: []
    }));
  }

  private generateTaskBreakdownFromEstimate(estimate: any): TaskBreakdown {
    return {
      totalTasks: estimate.breakdown.length,
      totalEstimatedHours: estimate.estimates.recommended.hours,
      criticalPath: estimate.parallelization.criticalPath,
      parallelTracks: estimate.parallelization.opportunities.map(opp => ({
        tasks: opp.tasks,
        estimatedDuration: opp.timeSaving
      })),
      tasksByPhase: this.groupTasksByPhase(estimate.breakdown)
    };
  }

  private calculateTargetDate(hours: number, index: number): string {
    const date = new Date();
    date.setDate(date.getDate() + (hours / 8) * (index + 1)); // Simple calculation
    return date.toISOString();
  }

  private groupTasksByPhase(breakdown: any[]): Record<string, any[]> {
    // Group tasks by complexity as a proxy for phase
    return breakdown.reduce((acc, task) => {
      const phase = task.complexity === 'simple' ? 'initial' : 
                   task.complexity === 'medium' ? 'development' : 'finalization';
      if (!acc[phase]) acc[phase] = [];
      acc[phase].push(task);
      return acc;
    }, {});
  }
}