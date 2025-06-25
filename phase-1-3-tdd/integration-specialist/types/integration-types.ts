// Integration Types for Phase 1-3 TDD Implementation

// Import existing types from main project
import { Goal, Milestone, WBSTask, TaskEstimation } from '../../../testing/goal-strategy-test/src/types';

// Export existing types for convenience
export { Goal, Milestone, WBSTask, TaskEstimation };

// Phase 2: Critical Success Metrics Types

export interface CriticalSuccessMetric {
  id: string;
  goalId: string;
  name: string;
  description: string;
  type: 'quantitative' | 'qualitative' | 'binary';
  category: 'outcome' | 'output' | 'process' | 'leading' | 'lagging';
  measurableCriteria: {
    unit: string;
    targetValue: number;
    minimumThreshold: number;
    maximumThreshold: number;
  };
  dataSource: string;
  collectionMethod: 'manual' | 'automated' | 'hybrid';
  frequency: 'daily' | 'weekly' | 'monthly' | 'milestone';
  responsibility: string;
  priority: 'critical' | 'important' | 'monitoring';
  createdAt?: string;
  updatedAt?: string;
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile' | 'unknown';
  slope?: number;
  dataPoints: number;
  timespan: string;
  confidence: number;
}

export interface BenchmarkComparison {
  industry: string;
  averageValue: number;
  topQuartile: number;
  source: string;
  confidence: number;
}

export interface MetricBaseline {
  metricId: string;
  currentValue: number;
  historicalTrend: TrendAnalysis;
  benchmarkData?: BenchmarkComparison;
  confidence: number;
  lastUpdated: string;
}

export interface AlertThreshold {
  metricId: string;
  type: 'below_minimum' | 'above_maximum' | 'trend_negative' | 'stagnant';
  value: number;
  severity: 'warning' | 'critical';
  recipients: string[];
}

export interface TrackingSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  daysOfWeek?: number[];
  timeOfDay?: string;
  automated: boolean;
  responsibilities: Record<string, string[]>;
}

export interface ReportingPlan {
  frequency: 'weekly' | 'monthly' | 'quarterly';
  format: 'dashboard' | 'email' | 'presentation' | 'all';
  stakeholders: string[];
  customizations: Record<string, any>;
}

export interface MeasurementStrategy {
  goalId: string;
  overallApproach: string;
  trackingSchedule: TrackingSchedule;
  reportingPlan: ReportingPlan;
  alerting: {
    enabled: boolean;
    thresholds: AlertThreshold[];
    escalationRules: Record<string, string>;
  };
  qualityAssurance: {
    dataValidationRules: string[];
    auditFrequency: string;
    backupSources: string[];
  };
  createdAt: string;
  lastReviewed?: string;
}

// Phase Integration Types

export interface Phase1Output {
  goal: Goal;
  smartCriteria: Goal['criteria'];
  confidence: number;
  clarificationHistory?: Array<{ role: string; content: string }>;
}

export interface Phase2Input extends Phase1Output {
  // Inherits all Phase 1 data
}

export interface Phase2Output extends Phase1Output {
  metrics: CriticalSuccessMetric[];
  baselines: MetricBaseline[];
  measurementPlan: MeasurementStrategy;
}

export interface Phase3Input extends Phase2Output {
  // Inherits all Phase 1 & 2 data
}

export interface Phase3Output extends Phase2Output {
  milestones: Milestone[];
  wbsTasks: WBSTask[];
  estimations: TaskEstimation[];
  dependencies: DependencyMap;
}

// Dependency Management Types

export interface DependencyRelationship {
  from: string; // ID of dependent item
  to: string;   // ID of dependency
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  lag?: number; // Days
  strength: 'mandatory' | 'discretionary' | 'external';
}

export interface DependencyMap {
  goalId: string;
  relationships: DependencyRelationship[];
  criticalPath: string[];
  riskAssessment: {
    highRiskDependencies: string[];
    mitigationStrategies: Record<string, string>;
  };
}

// Error Handling Types

export interface PhaseTransitionError {
  phase: 'phase1' | 'phase2' | 'phase3a' | 'phase3b' | 'phase3c';
  errorType: 'validation' | 'api' | 'timeout' | 'data' | 'business_logic';
  message: string;
  details?: Record<string, any>;
  recoverySuggestion: string;
  rollbackData?: any;
  timestamp: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: PhaseTransitionError[];
  warnings: string[];
  dataQualityScore: number;
}

// API Response Types

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  correlationId?: string;
  processingTime?: number;
}

// Configuration Types

export interface IntegrationConfig {
  enablePhase2: boolean;
  timeouts: {
    phase1: number;
    phase2: number;
    phase3: number;
  };
  retryPolicy: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  dataValidation: {
    strictMode: boolean;
    requiredConfidenceThreshold: number;
  };
  monitoring: {
    enabled: boolean;
    metricsEndpoint: string;
    alertingWebhook?: string;
  };
}

// Test Support Types

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  inputData: Phase1Output;
  expectedPhase2Output: Partial<Phase2Output>;
  expectedPhase3Output: Partial<Phase3Output>;
  testType: 'happy_path' | 'error_case' | 'edge_case' | 'performance';
}

export interface TestFixture {
  goals: Record<string, Goal>;
  expectedMetrics: Record<string, CriticalSuccessMetric[]>;
  expectedBaselines: Record<string, MetricBaseline[]>;
  scenarios: TestScenario[];
}

// Analytics and Monitoring Types

export interface IntegrationMetrics {
  phase1ToPhase2Success: number;
  phase2ToPhase3Success: number;
  averageProcessingTime: Record<string, number>;
  errorRates: Record<string, number>;
  userSatisfactionScores: number[];
  dataQualityScores: number[];
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  availability: number;
  resourceUtilization: Record<string, number>;
}

export interface UserBehaviorMetrics {
  phaseCompletionRates: Record<string, number>;
  abandonmentPoints: Record<string, number>;
  averageSessionDuration: number;
  returnUserRate: number;
  featureUsageStats: Record<string, number>;
}