export interface SMARTCriterionDetail {
  value: string;
  confidence: number;
  missing?: string[];
}

export interface MeasurableCriterionDetail extends SMARTCriterionDetail {
  metrics: string[];
}

export interface TimeBoundCriterionDetail extends SMARTCriterionDetail {
  deadline?: string;
}

export interface Goal {
  id: string; // Added id
  title: string; // maps from smartGoal
  targetValue?: number; // Added targetValue
  unit?: string; // Added unit
  deadline?: string; // Added deadline
  criteria: { // maps from smartCriteria
    specific: SMARTCriterionDetail;
    measurable: MeasurableCriterionDetail;
    achievable: SMARTCriterionDetail;
    relevant: SMARTCriterionDetail;
    timeBound: TimeBoundCriterionDetail;
  };
  missingCriteria: string[];
  clarificationQuestions: string[];
  confidence: number;
  correlation_id?: string;
}

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  description: string;
  targetDate: string;
  successCriteria: string[];
  dependencies: string[];
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  createdAt: string;
  updatedAt: string;
}

export interface WBSTask {
  id: string;
  milestoneId: string;
  title: string;
  description: string;
  completionCriteria: string;
  estimatedHours: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[];
  assignee?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  parentTaskId?: string;
  level: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskEstimation {
  taskId: string;
  expertJudgment: {
    estimate: number;
    confidence: number;
    reasoning: string;
  };
  analogyBased: {
    estimate: number;
    confidence: number;
    similarTask: string;
    adjustmentFactor: number;
  };
  threePoint: {
    optimistic: number;
    mostLikely: number;
    pessimistic: number;
    expected: number;
    standardDeviation: number;
  };
  parametric: {
    estimate: number;
    confidence: number;
    parameters: Record<string, number>;
    formula: string;
  };
  bottomUp: {
    estimate: number;
    confidence: number;
    subTasks: Array<{
      name: string;
      estimate: number;
    }>;
  };
  finalEstimate: {
    hours: number;
    confidence: number;
    method: string;
    uncertaintyRange: {
      min: number;
      max: number;
    };
  };
}

export interface FeedbackData {
  sessionId: string;
  originalGoal: string;
  smartGoalRating: number;
  smartGoalFeedback: string;
  milestonesRating: number;
  milestonesFeedback: string;
  wbsRating: number;
  wbsFeedback: string;
  estimationRating: number;
  estimationFeedback: string;
  overallRating: number;
  overallFeedback: string;
  wouldUseAgain: boolean;
  improvements: string;
  timestamp: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Interactive Clarification Types
export interface ClarificationQuestion {
  id: string;
  type: 'text' | 'number' | 'date' | 'choice' | 'range';
  question: string;
  advice: string;
  placeholder?: string;
  options?: string[];
  validation?: {
    required: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
  smartCriterion: 'specific' | 'measurable' | 'achievable' | 'relevant' | 'timeBound';
}

export interface ClarificationResponse {
  questionId: string;
  answer: string | number | Date;
  confidence: number;
}

export interface ClarificationSession {
  goalId: string;
  questions: ClarificationQuestion[];
  responses: ClarificationResponse[];
  currentQuestionIndex: number;
  isComplete: boolean;
}