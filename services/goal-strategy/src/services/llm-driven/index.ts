/**
 * LLM-Driven Services
 * 
 * This module exports refactored services that leverage LLM capabilities
 * for more intelligent and unified processing, replacing complex rule-based logic.
 */

export { UnifiedGoalProcessor } from '../unified-goal-processor';
export { LLMDrivenValidator } from '../llm-driven-validator';
export { LLMTaskEstimator } from '../llm-task-estimator';
export { ConversationalStateManager } from '../conversational-state-manager';
export { SMARTGoalProcessorV2 } from '../smart-goal-processor-v2';

// Type exports for the new services
export type {
  ComprehensiveGoalResponse,
  ExtractedComponents,
  ComprehensiveEstimate,
  ConversationState
} from './types';