import { z } from 'zod';

// Enums
export const GoalStatus = z.enum(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']);
export const MilestoneStatus = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']);
export const TaskStatus = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']);
export const Priority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const MetricType = z.enum(['NUMERIC', 'PERCENTAGE', 'BOOLEAN', 'CURRENCY', 'COUNT']);
export const ClarificationStatus = z.enum(['PENDING', 'ANSWERED', 'SKIPPED']);
export const DependencyType = z.enum(['FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH']);
export const EstimationMethod = z.enum(['EXPERT_JUDGMENT', 'ANALOGY_BASED', 'THREE_POINT_PERT', 'HISTORICAL_DATA']);
export const WeekendPreference = z.enum(['NO_WEEKENDS', 'LIGHT_WEEKENDS', 'FULL_WEEKENDS']);

// Type exports
export type GoalStatusType = z.infer<typeof GoalStatus>;
export type MilestoneStatusType = z.infer<typeof MilestoneStatus>;
export type TaskStatusType = z.infer<typeof TaskStatus>;
export type PriorityType = z.infer<typeof Priority>;
export type MetricTypeType = z.infer<typeof MetricType>;
export type ClarificationStatusType = z.infer<typeof ClarificationStatus>;
export type DependencyTypeType = z.infer<typeof DependencyType>;
export type EstimationMethodType = z.infer<typeof EstimationMethod>;
export type WeekendPreferenceType = z.infer<typeof WeekendPreference>;

// SMART Criteria Schema
export const SmartCriteriaSchema = z.object({
  specific: z.object({
    description: z.string(),
    isComplete: z.boolean(),
    confidence: z.number().min(0).max(1)
  }),
  measurable: z.object({
    metrics: z.array(z.string()),
    isComplete: z.boolean(),
    confidence: z.number().min(0).max(1)
  }),
  achievable: z.object({
    assessment: z.string(),
    isComplete: z.boolean(),
    confidence: z.number().min(0).max(1)
  }),
  relevant: z.object({
    alignment: z.string(),
    isComplete: z.boolean(),
    confidence: z.number().min(0).max(1)
  }),
  timeBound: z.object({
    deadline: z.string().datetime().optional(),
    timeline: z.string(),
    isComplete: z.boolean(),
    confidence: z.number().min(0).max(1)
  })
});

export type SmartCriteria = z.infer<typeof SmartCriteriaSchema>;

// Goal Translation Schemas
export const GoalTranslationRequestSchema = z.object({
  rawGoal: z.string().min(1),
  context: z.object({
    userRole: z.string().optional(),
    timeframe: z.string().optional(),
    constraints: z.array(z.string()).optional(),
    existingGoals: z.array(z.string()).optional()
  }).optional()
});

export const GoalTranslationResponseSchema = z.object({
  smartGoal: z.object({
    title: z.string(),
    description: z.string(),
    smartCriteria: SmartCriteriaSchema
  }),
  missingCriteria: z.array(z.string()),
  clarificationQuestions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    criterion: z.string(),
    suggestedAnswers: z.array(z.string()).optional()
  })),
  confidence: z.number().min(0).max(1)
});

export type GoalTranslationRequest = z.infer<typeof GoalTranslationRequestSchema>;
export type GoalTranslationResponse = z.infer<typeof GoalTranslationResponseSchema>;

// Goal Clarification Schemas
export const GoalClarificationRequestSchema = z.object({
  goalId: z.string(),
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.string()
  }))
});

export const GoalClarificationResponseSchema = z.object({
  updatedGoal: z.object({
    title: z.string(),
    description: z.string(),
    smartCriteria: SmartCriteriaSchema
  }),
  additionalQuestions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    criterion: z.string(),
    suggestedAnswers: z.array(z.string()).optional()
  })).optional(),
  isComplete: z.boolean()
});

export type GoalClarificationRequest = z.infer<typeof GoalClarificationRequestSchema>;
export type GoalClarificationResponse = z.infer<typeof GoalClarificationResponseSchema>;

// Goal CRUD Schemas
export const CreateGoalSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  smartCriteria: SmartCriteriaSchema,
  priority: Priority.optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  targetDate: z.string().datetime().optional()
});

export const UpdateGoalSchema = CreateGoalSchema.partial();

export const GoalResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  rawGoal: z.string().nullable(),
  smartCriteria: SmartCriteriaSchema,
  status: GoalStatus,
  priority: Priority,
  category: z.string().nullable(),
  tags: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  targetDate: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable()
});

export type CreateGoal = z.infer<typeof CreateGoalSchema>;
export type UpdateGoal = z.infer<typeof UpdateGoalSchema>;
export type GoalResponse = z.infer<typeof GoalResponseSchema>;

// Milestone Schemas
export const MilestoneGenerationRequestSchema = z.object({
  preferences: z.object({
    milestoneCount: z.number().min(2).max(6).optional(),
    timeDistribution: z.enum(['EVEN', 'FRONT_LOADED', 'BACK_LOADED']).optional(),
    includeBuffers: z.boolean().optional()
  }).optional()
});

export const MilestoneResponseSchema = z.object({
  id: z.string(),
  goalId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  targetDate: z.string().datetime(),
  completionCriteria: z.string(),
  status: MilestoneStatus,
  orderIndex: z.number(),
  progressPercentage: z.number(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable()
});

export const CreateMilestoneSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  targetDate: z.string().datetime(),
  completionCriteria: z.string(),
  orderIndex: z.number()
});

export const UpdateMilestoneSchema = CreateMilestoneSchema.partial();

export type MilestoneGenerationRequest = z.infer<typeof MilestoneGenerationRequestSchema>;
export type MilestoneResponse = z.infer<typeof MilestoneResponseSchema>;
export type CreateMilestone = z.infer<typeof CreateMilestoneSchema>;
export type UpdateMilestone = z.infer<typeof UpdateMilestoneSchema>;

// Task Schemas
export const TaskResponseSchema = z.object({
  id: z.string(),
  milestoneId: z.string(),
  parentTaskId: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  completionCriteria: z.string().nullable(),
  estimatedHours: z.number().nullable(),
  actualHours: z.number().nullable(),
  status: TaskStatus,
  priority: Priority,
  assignedTo: z.string().nullable(),
  tags: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable()
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  completionCriteria: z.string().optional(),
  estimatedHours: z.number().positive().optional(),
  priority: Priority.optional(),
  assignedTo: z.string().optional(),
  tags: z.array(z.string()).optional(),
  parentTaskId: z.string().optional()
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

export type TaskResponse = z.infer<typeof TaskResponseSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;

// Estimation Schemas
export const TaskEstimationRequestSchema = z.object({
  method: EstimationMethod,
  parameters: z.object({
    optimisticHours: z.number().positive().optional(),
    mostLikelyHours: z.number().positive().optional(),
    pessimisticHours: z.number().positive().optional(),
    similarTaskIds: z.array(z.string()).optional(),
    complexityFactors: z.array(z.string()).optional()
  }).optional()
});

export const TaskEstimationResponseSchema = z.object({
  estimate: z.object({
    estimatedHours: z.number(),
    method: EstimationMethod,
    confidenceScore: z.number().min(0).max(1)
  }),
  confidenceInterval: z.object({
    lower: z.number(),
    upper: z.number(),
    confidence: z.number()
  }),
  rationale: z.string(),
  similarTasks: z.array(z.object({
    taskId: z.string(),
    title: z.string(),
    actualHours: z.number(),
    similarityScore: z.number()
  })).optional()
});

export type TaskEstimationRequest = z.infer<typeof TaskEstimationRequestSchema>;
export type TaskEstimationResponse = z.infer<typeof TaskEstimationResponseSchema>;

// Capacity Management Schemas
export const CapacityAnalysisResponseSchema = z.object({
  teamCapacity: z.object({
    totalAvailableHours: z.number(),
    totalAllocatedHours: z.number(),
    utilizationRate: z.number(),
    bufferHours: z.number()
  }),
  utilization: z.array(z.object({
    userId: z.string(),
    availableHours: z.number(),
    allocatedHours: z.number(),
    utilizationRate: z.number(),
    isOverallocated: z.boolean()
  })),
  recommendations: z.array(z.string())
});

export type CapacityAnalysisResponse = z.infer<typeof CapacityAnalysisResponseSchema>;

// API Response Schemas
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
    correlationId: z.string()
  })
});

export const ApiSuccessSchema = z.object({
  data: z.any(),
  meta: z.object({
    correlationId: z.string(),
    timestamp: z.string().datetime(),
    version: z.string()
  }).optional()
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiSuccess = z.infer<typeof ApiSuccessSchema>;