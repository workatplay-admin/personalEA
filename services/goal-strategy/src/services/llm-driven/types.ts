/**
 * Type definitions for LLM-driven services
 */

import { z } from 'zod';
import { ClarificationCategory } from '../../types/smart-goals';

// UnifiedGoalProcessor types
export const ComprehensiveGoalResponseSchema = z.object({
  updatedGoal: z.object({
    title: z.string(),
    category: z.string(),
    specific: z.object({
      what: z.string().optional(),
      who: z.string().optional(),
      where: z.string().optional(),
      why: z.string().optional()
    }),
    measurable: z.object({
      metrics: z.array(z.string()),
      targetValue: z.string().optional(),
      currentValue: z.string().optional()
    }),
    achievable: z.object({
      resources: z.array(z.string()),
      constraints: z.array(z.string()),
      feasibilityScore: z.number().min(0).max(100)
    }),
    relevant: z.object({
      alignment: z.string(),
      benefits: z.array(z.string()),
      stakeholders: z.array(z.string())
    }),
    timeBound: z.object({
      deadline: z.string().optional(),
      milestones: z.array(z.object({
        name: z.string(),
        dueDate: z.string().optional()
      }))
    }),
    status: z.object({
      isComplete: z.boolean(),
      confidenceScores: z.object({
        specific: z.number().min(0).max(100),
        measurable: z.number().min(0).max(100),
        achievable: z.number().min(0).max(100),
        relevant: z.number().min(0).max(100),
        timeBound: z.number().min(0).max(100),
        overall: z.number().min(0).max(100)
      })
    })
  }),
  conversationState: z.object({
    phase: z.enum(['initial', 'clarifying', 'refining', 'complete']),
    nextAction: z.enum(['ask_clarification', 'confirm_details', 'generate_plan', 'complete']),
    missingInformation: z.array(z.string()),
    suggestedQuestions: z.array(z.string()),
    userCommunicationStyle: z.string()
  }),
  clarifications: z.array(z.object({
    category: z.nativeEnum(ClarificationCategory),
    question: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    reason: z.string()
  })).optional(),
  milestones: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    dueDate: z.string().optional(),
    dependencies: z.array(z.string()),
    estimatedDuration: z.number(),
    tasks: z.array(z.object({
      id: z.string(),
      title: z.string(),
      estimatedHours: z.number()
    }))
  })).optional(),
  taskBreakdown: z.object({
    totalEstimatedHours: z.number(),
    criticalPath: z.array(z.string()),
    parallelTracks: z.array(z.array(z.string())),
    riskFactors: z.array(z.string())
  }).optional(),
  response: z.object({
    message: z.string(),
    tone: z.enum(['encouraging', 'professional', 'casual', 'detailed']),
    includeExamples: z.boolean(),
    visualizationData: z.any().optional()
  })
});

export type ComprehensiveGoalResponse = z.infer<typeof ComprehensiveGoalResponseSchema>;

// LLMDrivenValidator types
export const ExtractedComponentsSchema = z.object({
  timeframes: z.array(z.object({
    text: z.string(),
    type: z.enum(['deadline', 'duration', 'milestone', 'recurring']),
    parsedValue: z.string().optional(),
    confidence: z.number().min(0).max(100)
  })),
  metrics: z.array(z.object({
    text: z.string(),
    type: z.enum(['numeric', 'percentage', 'boolean', 'qualitative']),
    value: z.union([z.string(), z.number()]).optional(),
    unit: z.string().optional(),
    confidence: z.number().min(0).max(100)
  })),
  specificDetails: z.object({
    what: z.object({ value: z.string().optional(), confidence: z.number() }),
    who: z.object({ value: z.string().optional(), confidence: z.number() }),
    where: z.object({ value: z.string().optional(), confidence: z.number() }),
    why: z.object({ value: z.string().optional(), confidence: z.number() }),
    how: z.object({ value: z.string().optional(), confidence: z.number() })
  }),
  resources: z.array(z.object({
    name: z.string(),
    type: z.enum(['human', 'financial', 'technical', 'time', 'knowledge']),
    required: z.boolean(),
    available: z.boolean().optional()
  })),
  dependencies: z.array(z.object({
    description: z.string(),
    type: z.enum(['prerequisite', 'concurrent', 'external']),
    criticality: z.enum(['high', 'medium', 'low'])
  })),
  domain: z.object({
    category: z.string(),
    subCategory: z.string().optional(),
    keywords: z.array(z.string()),
    industryContext: z.string().optional()
  }),
  analysis: z.object({
    overallCompleteness: z.number().min(0).max(100),
    missingComponents: z.array(z.string()),
    ambiguities: z.array(z.string()),
    suggestions: z.array(z.object({
      component: z.string(),
      suggestion: z.string(),
      example: z.string().optional()
    }))
  })
});

export type ExtractedComponents = z.infer<typeof ExtractedComponentsSchema>;

// LLMTaskEstimator types
export const ComprehensiveEstimateSchema = z.object({
  taskAnalysis: z.object({
    complexity: z.enum(['simple', 'medium', 'complex', 'very_complex']),
    clarityScore: z.number().min(0).max(100),
    noveltyScore: z.number().min(0).max(100),
    technicalDebtRisk: z.number().min(0).max(100)
  }),
  estimates: z.object({
    optimistic: z.object({
      hours: z.number(),
      assumptions: z.array(z.string())
    }),
    likely: z.object({
      hours: z.number(),
      methodology: z.string(),
      confidence: z.number().min(0).max(100)
    }),
    pessimistic: z.object({
      hours: z.number(),
      riskFactors: z.array(z.string())
    }),
    recommended: z.object({
      hours: z.number(),
      bufferPercentage: z.number(),
      rationale: z.string()
    })
  }),
  breakdown: z.array(z.object({
    subtask: z.string(),
    hours: z.number(),
    complexity: z.enum(['simple', 'medium', 'complex']),
    dependencies: z.array(z.string()),
    parallelizable: z.boolean(),
    skillsRequired: z.array(z.string())
  })),
  risks: z.array(z.object({
    factor: z.string(),
    probability: z.enum(['low', 'medium', 'high']),
    impact: z.enum(['low', 'medium', 'high']),
    mitigation: z.string(),
    contingencyHours: z.number()
  })),
  dependencies: z.object({
    prerequisites: z.array(z.string()),
    blockers: z.array(z.string()),
    externalDependencies: z.array(z.object({
      item: z.string(),
      owner: z.string().optional(),
      estimatedWaitTime: z.number().optional()
    }))
  }),
  resources: z.object({
    required: z.array(z.object({
      type: z.string(),
      description: z.string(),
      availability: z.enum(['available', 'needs_acquisition', 'uncertain'])
    })),
    optimal: z.array(z.string())
  }),
  parallelization: z.object({
    opportunities: z.array(z.object({
      tasks: z.array(z.string()),
      timeSaving: z.number(),
      requiresCoordination: z.boolean()
    })),
    criticalPath: z.array(z.string()),
    maxParallelism: z.number()
  }),
  recommendations: z.array(z.object({
    type: z.enum(['process', 'resource', 'scope', 'timeline']),
    suggestion: z.string(),
    impact: z.string()
  }))
});

export type ComprehensiveEstimate = z.infer<typeof ComprehensiveEstimateSchema>;

// ConversationalStateManager types
export const ConversationStateSchema = z.object({
  phase: z.object({
    current: z.enum(['greeting', 'initial_input', 'clarification', 'refinement', 'confirmation', 'planning', 'complete']),
    confidence: z.number().min(0).max(100),
    transitionReason: z.string().optional()
  }),
  informationGathered: z.object({
    goalStatement: z.string().optional(),
    smartCriteria: z.object({
      specific: z.array(z.string()),
      measurable: z.array(z.string()),
      achievable: z.array(z.string()),
      relevant: z.array(z.string()),
      timeBound: z.array(z.string())
    }),
    additionalContext: z.array(z.string())
  }),
  informationNeeded: z.array(z.object({
    category: z.string(),
    specifics: z.array(z.string()),
    priority: z.enum(['critical', 'important', 'nice_to_have']),
    suggestedQuestion: z.string()
  })),
  userProfile: z.object({
    communicationStyle: z.enum(['brief', 'detailed', 'technical', 'casual', 'formal']),
    domainExpertise: z.enum(['novice', 'intermediate', 'expert']),
    preferredPace: z.enum(['quick', 'moderate', 'thorough']),
    responsePatterns: z.object({
      averageLength: z.number(),
      usesExamples: z.boolean(),
      asksQuestions: z.boolean(),
      providesContext: z.boolean()
    })
  }),
  conversationDynamics: z.object({
    momentum: z.enum(['building', 'steady', 'slowing', 'stalled']),
    engagement: z.number().min(0).max(100),
    clarityTrend: z.enum(['improving', 'stable', 'declining']),
    frustrationIndicators: z.array(z.string())
  }),
  nextActions: z.array(z.object({
    action: z.enum(['ask_question', 'provide_summary', 'suggest_examples', 'confirm_understanding', 'move_to_planning', 'offer_help', 'change_approach']),
    priority: z.number(),
    rationale: z.string(),
    content: z.string().optional()
  })),
  uiRecommendations: z.object({
    primaryDisplay: z.enum(['chat', 'visual_progress', 'form_view', 'summary_card']),
    components: z.array(z.object({
      type: z.string(),
      props: z.record(z.any()),
      visibility: z.enum(['prominent', 'normal', 'subtle', 'hidden'])
    })),
    interactions: z.array(z.object({
      element: z.string(),
      enabled: z.boolean(),
      hint: z.string().optional()
    })),
    emphasis: z.object({
      highlightArea: z.string().optional(),
      focusMessage: z.string().optional(),
      animationType: z.enum(['none', 'subtle', 'attention']).optional()
    })
  }),
  metadata: z.object({
    conversationDuration: z.number(),
    turnCount: z.number(),
    lastActivityTimestamp: z.string(),
    stateVersion: z.number()
  })
});

export type ConversationState = z.infer<typeof ConversationStateSchema>;