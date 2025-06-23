/**
 * Conversation Quality Metrics System for PersonalEA
 * Phase 2: LLM-First Testing Framework
 */

export interface ConversationQualityMetrics {
  // Core Quality Scores (0-1)
  goalImprovement: number;          // How much better is final vs original goal?
  conversationNaturalness: number;  // Natural, engaging conversation flow?
  userSatisfactionPrediction: number; // Would user feel satisfied?
  smartCriteriaFulfillment: number;   // Does final goal meet SMART criteria?
  
  // Detailed Breakdown
  breakdown: {
    specific: QualityCriterion;
    measurable: QualityCriterion;
    achievable: QualityCriterion;
    relevant: QualityCriterion;
    timeBound: QualityCriterion;
  };
  
  // Meta Information
  confidence: number;               // Confidence in the assessment (0-1)
  reasoning: string;                // AI's reasoning for the scores
  timestamp: Date;
  conversationLength: number;       // Number of exchanges
  
  // Advanced Metrics
  engagementLevel: number;          // User participation quality (0-1)
  insightGeneration: number;        // "Aha!" moments detected (0-1)
  resistanceHandling: number;       // How well pushback was handled (0-1)
  actionabilityScore: number;       // How actionable is final goal? (0-1)
}

export interface QualityCriterion {
  score: number;                    // 0-1 rating for this criterion
  improvement: number;              // How much it improved from start (0-1)
  reasoning: string;                // Why this score was assigned
  evidence: string[];               // Specific conversation excerpts
}

export interface ConversationData {
  conversationId: string;
  originalGoal: string;
  finalGoal: {
    title: string;
    criteria: any;  // SMART goal structure
    confidence: number;
  };
  messages: ChatMessage[];
  userProfile?: UserProfile;
  context: ConversationContext;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    component?: string;            // Which SMART component being discussed
    sentiment?: 'positive' | 'neutral' | 'negative' | 'resistant';
    engagement?: number;           // User engagement level in this message
  };
}

export interface UserProfile {
  responsePatterns: string[];       // 'collaborative', 'resistant', 'detailed', etc.
  domain?: string;                  // 'business', 'personal', 'health', etc.
  experience?: 'beginner' | 'intermediate' | 'advanced';
  preferences: {
    communicationStyle: 'direct' | 'conversational' | 'structured';
    detailLevel: 'minimal' | 'moderate' | 'comprehensive';
  };
}

export interface ConversationContext {
  sessionDuration: number;          // Minutes spent in conversation
  componentsCovered: string[];      // Which SMART components were addressed
  clarificationRounds: number;      // How many clarification cycles
  userInitiatedQuestions: number;   // Questions user asked
  systemGuidanceInstances: number;  // Times system provided guidance
}

// AI Judge Response Format
export interface AIJudgeResponse {
  metrics: ConversationQualityMetrics;
  recommendations: {
    whatWorkedWell: string[];
    areasForImprovement: string[];
    suggestedOptimizations: string[];
  };
  conversationPatterns: {
    strongPatterns: string[];       // Patterns that led to success
    weakPatterns: string[];         // Patterns that hindered progress
  };
  predictedOutcome: {
    goalAchievementLikelihood: number; // Will user actually achieve this goal?
    followUpNeeded: boolean;
    riskFactors: string[];
  };
}

// Test Scenario Types for Automated Testing
export interface TestScenario {
  id: string;
  name: string;
  description: string;
  
  // Test Setup
  initialGoal: string;
  userPersona: UserProfile;
  expectedBehavior: string[];
  
  // Success Criteria
  minimumQualityThresholds: {
    goalImprovement: number;
    conversationNaturalness: number;
    userSatisfactionPrediction: number;
    smartCriteriaFulfillment: number;
  };
  
  // Test Configuration
  maxRounds: number;
  timeoutMinutes: number;
  mockUserResponses?: string[];     // For automated testing
}

// Batch Testing Results
export interface BatchTestResults {
  testSuiteId: string;
  timestamp: Date;
  scenarios: {
    scenarioId: string;
    passed: boolean;
    metrics: ConversationQualityMetrics;
    actualConversation: ConversationData;
    deviations: string[];           // Where it differed from expectations
  }[];
  
  aggregateMetrics: {
    averageGoalImprovement: number;
    averageUserSatisfaction: number;
    passRate: number;
    totalConversations: number;
  };
  
  insights: {
    bestPerformingPatterns: string[];
    worstPerformingPatterns: string[];
    emergentBehaviors: string[];
    systemRecommendations: string[];
  };
}