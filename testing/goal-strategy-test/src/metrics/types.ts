import { Goal, ChatMessage } from '../types'

/**
 * Core metric value with confidence and evidence
 */
export interface MetricValue {
  score: number // 0-100
  confidence: number // 0-1
  evidence: string[]
  timestamp: Date
}

/**
 * SMART component evaluation
 */
export interface SMARTComponentEvaluation {
  component: 'specific' | 'measurable' | 'achievable' | 'relevant' | 'timeBound'
  presence: MetricValue
  quality: MetricValue
  improvement: number // Percentage improvement from original
}

/**
 * Goal improvement metrics
 */
export interface GoalImprovementMetrics {
  overall: MetricValue
  clarityEnhancement: {
    specificityGain: MetricValue
    completeness: MetricValue
    structure: MetricValue
  }
  smartTransformation: {
    components: SMARTComponentEvaluation[]
    overallTransformation: MetricValue
  }
  actionability: {
    nextStepsClarity: MetricValue
    milestoneDefinition: MetricValue
    dependencyMapping: MetricValue
  }
  originalGoal: string
  finalGoal: Goal
  comparisonAnalysis: {
    addedElements: string[]
    removedAmbiguities: string[]
    structuralChanges: string[]
  }
}

/**
 * Conversation flow metrics
 */
export interface ConversationNaturalnessMetrics {
  overall: MetricValue
  flowCoherence: {
    topicTransitions: MetricValue
    contextRetention: MetricValue
    responseRelevance: MetricValue
    conversationalRhythm: MetricValue
  }
  languageQuality: {
    toneConsistency: MetricValue
    vocabularyAppropriateness: MetricValue
    grammarFluency: MetricValue
  }
  engagementFactors: {
    clarificationQuality: MetricValue
    empathyIndicators: MetricValue
    interactiveElements: MetricValue
  }
  conversationPatterns: {
    averageTurnLength: number
    questionAnswerRatio: number
    topicSwitchCount: number
    clarificationCycles: number
  }
}

/**
 * User satisfaction prediction metrics
 */
export interface UserSatisfactionMetrics {
  overall: MetricValue
  goalAchievement: {
    confidenceImprovement: MetricValue
    completionRate: MetricValue
    iterationEfficiency: MetricValue
  }
  experienceQuality: {
    responseTime: MetricValue
    errorRecovery: MetricValue
    guidanceEffectiveness: MetricValue
  }
  outcomeSatisfaction: {
    expectationFulfillment: MetricValue
    learningExperience: MetricValue
    motivationEnhancement: MetricValue
  }
  predictedNPS: number // -100 to 100
  predictedContinuationLikelihood: number // 0-1
}

/**
 * SMART criteria fulfillment metrics
 */
export interface SMARTFulfillmentMetrics {
  overall: MetricValue
  componentScores: {
    specific: MetricValue
    measurable: MetricValue
    achievable: MetricValue
    relevant: MetricValue
    timeBound: MetricValue
  }
  integrationQuality: {
    componentHarmony: MetricValue
    noContradictions: MetricValue
    completeness: MetricValue
  }
  missingElements: string[]
  strengths: string[]
  weaknesses: string[]
}

/**
 * Conversation session data
 */
export interface ConversationSession {
  sessionId: string
  goalId: string
  startTime: Date
  endTime?: Date
  messages: ConversationMessage[]
  originalGoal: string
  finalGoal?: Goal
  userActions: UserAction[]
  systemEvents: SystemEvent[]
}

/**
 * Extended chat message with metrics
 */
export interface ConversationMessage extends ChatMessage {
  responseTime?: number // milliseconds
  editCount?: number
  sentiment?: number // -1 to 1
  intent?: MessageIntent
  metricsSnapshot?: {
    currentConfidence: number
    smartCompleteness: number
  }
}

/**
 * Message intent classification
 */
export type MessageIntent = 
  | 'provide_information'
  | 'ask_clarification'
  | 'express_confusion'
  | 'confirm_understanding'
  | 'request_help'
  | 'provide_feedback'
  | 'navigate_process'

/**
 * User action tracking
 */
export interface UserAction {
  timestamp: Date
  action: 'message_sent' | 'edit_started' | 'edit_cancelled' | 'help_requested' | 'navigation_command'
  details?: Record<string, any>
}

/**
 * System event tracking
 */
export interface SystemEvent {
  timestamp: Date
  event: 'api_call' | 'error_occurred' | 'timeout' | 'fallback_triggered' | 'component_completed'
  details?: Record<string, any>
}

/**
 * Complete conversation metrics
 */
export interface ConversationMetrics {
  sessionId: string
  goalId: string
  timestamp: Date
  duration: number // milliseconds
  messageCount: number
  
  // Core metrics
  goalImprovement: GoalImprovementMetrics
  conversationNaturalness: ConversationNaturalnessMetrics
  userSatisfaction: UserSatisfactionMetrics
  smartFulfillment: SMARTFulfillmentMetrics
  
  // Aggregate scores
  overallScore: MetricValue
  qualityRating: 'excellent' | 'good' | 'acceptable' | 'needs_improvement' | 'poor'
  
  // Behavioral metrics
  efficiency: {
    messagesPerComponent: number
    averageResponseTime: number
    completionTime: number
    revisionCount: number
  }
  
  // Detailed analysis
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
}

/**
 * Metrics calculation configuration
 */
export interface MetricsConfig {
  weights: {
    goalImprovement: number
    conversationNaturalness: number
    userSatisfaction: number
    smartFulfillment: number
  }
  thresholds: {
    excellent: number
    good: number
    acceptable: number
    needsImprovement: number
  }
  analysisOptions: {
    includeDetailedEvidence: boolean
    generateRecommendations: boolean
    trackBehavioralMetrics: boolean
    enableRealTimeMetrics: boolean
  }
}

/**
 * Real-time metrics update
 */
export interface RealTimeMetricsUpdate {
  timestamp: Date
  messageIndex: number
  currentMetrics: {
    confidence: number
    completeness: number
    clarity: number
    engagement: number
  }
  delta: {
    confidence: number
    completeness: number
    clarity: number
    engagement: number
  }
  trigger: 'user_message' | 'bot_response' | 'goal_update'
}

/**
 * Metrics comparison for A/B testing
 */
export interface MetricsComparison {
  sessionA: ConversationMetrics
  sessionB: ConversationMetrics
  differences: {
    overallScore: number
    goalImprovement: number
    conversationNaturalness: number
    userSatisfaction: number
    smartFulfillment: number
  }
  statisticalSignificance?: {
    pValue: number
    confidenceInterval: [number, number]
    effectSize: number
  }
}

/**
 * Batch metrics analysis
 */
export interface BatchMetricsAnalysis {
  timeRange: { start: Date; end: Date }
  sessionCount: number
  aggregateMetrics: {
    averageOverallScore: number
    averageGoalImprovement: number
    averageConversationNaturalness: number
    averageUserSatisfaction: number
    averageSmartFulfillment: number
  }
  distribution: {
    excellent: number
    good: number
    acceptable: number
    needsImprovement: number
    poor: number
  }
  trends: {
    scoreImprovement: number // percentage
    completionRateChange: number
    averageDurationChange: number
  }
  topIssues: Array<{
    issue: string
    frequency: number
    averageImpact: number
  }>
}

/**
 * Metrics service interface
 */
export interface IMetricsService {
  // Core operations
  startSession(originalGoal: string): ConversationSession
  updateSession(sessionId: string, message: ConversationMessage): void
  finalizeSession(sessionId: string, finalGoal: Goal): void
  
  // Metrics calculation
  calculateMetrics(session: ConversationSession): Promise<ConversationMetrics>
  calculateRealTimeMetrics(session: ConversationSession): RealTimeMetricsUpdate
  
  // Analysis
  compareMetrics(sessionIdA: string, sessionIdB: string): Promise<MetricsComparison>
  analyzeBatch(timeRange: { start: Date; end: Date }): Promise<BatchMetricsAnalysis>
  
  // Reporting
  generateReport(sessionId: string): Promise<MetricsReport>
  exportMetrics(sessionIds: string[], format: 'json' | 'csv'): Promise<string>
}

/**
 * Metrics report format
 */
export interface MetricsReport {
  summary: {
    sessionId: string
    goalId: string
    timestamp: Date
    overallScore: number
    rating: string
  }
  detailedScores: {
    goalImprovement: number
    conversationNaturalness: number
    userSatisfaction: number
    smartFulfillment: number
  }
  visualizations?: {
    scoreRadarChart: string // base64 or URL
    improvementTimeline: string
    componentComparison: string
  }
  insights: {
    strengths: string[]
    improvements: string[]
    recommendations: string[]
  }
  rawData?: ConversationMetrics
}