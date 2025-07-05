/**
 * SMART Goals Type Definitions
 * 
 * Defines the core types and interfaces for SMART goal processing,
 * including criteria, validation, and conversation flow.
 * 
 * @see {@link file://../../../../docs/goal-strategy-service-specification.md#smart-goal-structure SMART Goal Structure}
 * @see {@link file://../../API_DOCUMENTATION.md#data-models API Data Models}
 */

import { z } from 'zod';

// Re-export enums from goal.ts
export { ClarificationStatusType as ClarificationCategory } from './goal';

// ConversationMessage type
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

/**
 * SMART Goal interface representing a fully processed goal
 * @see {@link file://../../../../docs/goal-strategy-service-specification.md#step-2-smart-goal-translation SMART Goal Translation}
 */
// SMART Goal interfaces
export interface SMARTGoal {
  id: string;
  originalGoal: string;
  title?: string;
  description: string;
  category: string;
  smartCriteria: {
    specific: {
      what?: string;
      who?: string;
      where?: string;
      why?: string;
    };
    measurable: {
      metrics: string[];
      targetValue?: string;
      currentValue?: string;
    };
    achievable: {
      resources: string[];
      constraints: string[];
      feasibilityScore?: number;
    };
    relevant: {
      alignment: string;
      benefits: string[];
      stakeholders?: string[];
    };
    timeBound: {
      deadline?: string;
      milestones: Array<{
        name: string;
        dueDate?: string;
      }>;
    };
  };
  confidenceScores: {
    overall: number;
    specific: number;
    measurable: number;
    achievable: number;
    relevant: number;
    timeBound: number;
  };
  isComplete?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Goal State
export interface GoalState {
  goal: SMARTGoal;
  conversationMetadata?: {
    phase: {
      current: string;
      confidence: number;
    };
    turnCount: number;
  };
}

// Goal Clarification
export interface GoalClarification {
  category: 'PENDING' | 'ANSWERED' | 'SKIPPED';
  question: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  suggestedAnswer?: string;
}

// Milestone
export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  description: string;
  targetDate?: string;
  dueDate?: string;
  dependencies: string[];
  status: 'pending';
  confidenceScore: number;
  estimatedHours?: number;
  estimatedDuration?: number;
  tasks: Array<{
    id: string;
    title: string;
    estimatedHours: number;
  }>;
}

// Task Breakdown
export interface TaskBreakdown {
  totalTasks: number;
  totalEstimatedHours: number;
  criticalPath: string[];
  parallelTracks: Array<{
    tasks: string[];
    estimatedDuration: number;
  }>;
  tasksByPhase?: Record<string, any[]>;
}

// Additional interfaces needed for goal processing
export interface RawGoalInput {
  goal: string;
  context?: Record<string, any>;
  mode?: 'automatic' | 'interactive';
}

export interface GoalTranslationResult {
  smartGoal: string;
  smartCriteria: any;
  missingCriteria: string[];
  clarificationQuestions: string[];
  confidence: number;
  mode: 'automatic' | 'interactive';
  needsRefinement: boolean;
}

// Re-export types that might be needed
export type {
  SmartCriteria,
  GoalStatusType,
  MilestoneStatusType,
  TaskStatusType,
  PriorityType,
  ClarificationStatusType
} from './goal';