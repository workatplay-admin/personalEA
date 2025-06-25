import { Goal, Milestone, WBSTask, TaskEstimation } from '../../types'

export const mockGoals: Goal[] = [
  {
    id: 'goal-1',
    title: 'Increase website conversion rate by 25% within 6 months',
    targetValue: 25,
    unit: 'percent',
    deadline: '2024-06-01',
    criteria: {
      specific: {
        value: 'Increase website conversion rate from current 2.1% to 2.6%',
        confidence: 0.9,
        missing: []
      },
      measurable: {
        value: '25% increase in conversion rate measured through Google Analytics',
        confidence: 0.95,
        metrics: ['conversion rate', 'Google Analytics', 'A/B testing results'],
        missing: []
      },
      achievable: {
        value: 'Based on industry benchmarks and current performance, 25% increase is realistic',
        confidence: 0.8,
        missing: ['budget confirmation']
      },
      relevant: {
        value: 'Higher conversion rate directly impacts revenue and business growth',
        confidence: 0.9,
        missing: []
      },
      timeBound: {
        value: '6-month timeline with monthly milestones',
        confidence: 0.85,
        deadline: '2024-06-01',
        missing: []
      }
    },
    missingCriteria: ['budget confirmation'],
    clarificationQuestions: [
      'What is the current monthly marketing budget available for this initiative?',
      'Are there any technical constraints that might affect conversion optimization?'
    ],
    confidence: 0.87,
    correlation_id: 'test-goal-1'
  },
  {
    id: 'goal-2',
    title: 'Launch mobile app with 10,000 downloads in first quarter',
    targetValue: 10000,
    unit: 'downloads',
    deadline: '2024-03-31',
    criteria: {
      specific: {
        value: 'Launch mobile app for iOS and Android platforms',
        confidence: 0.85,
        missing: ['feature specifications']
      },
      measurable: {
        value: '10,000 downloads tracked through app store analytics',
        confidence: 0.9,
        metrics: ['app store downloads', 'user acquisition metrics'],
        missing: []
      },
      achievable: {
        value: 'Target is realistic based on market research and marketing budget',
        confidence: 0.7,
        missing: ['development timeline', 'marketing strategy']
      },
      relevant: {
        value: 'Mobile presence essential for business growth and customer engagement',
        confidence: 0.95,
        missing: []
      },
      timeBound: {
        value: 'First quarter launch with pre-launch marketing campaign',
        confidence: 0.8,
        deadline: '2024-03-31',
        missing: []
      }
    },
    missingCriteria: ['feature specifications', 'development timeline', 'marketing strategy'],
    clarificationQuestions: [
      'What are the core features required for the MVP?',
      'What is the development team size and experience?',
      'What marketing channels will be used for app promotion?'
    ],
    confidence: 0.82,
    correlation_id: 'test-goal-2'
  },
  {
    id: 'goal-3',
    title: 'Reduce customer support response time to under 2 hours',
    targetValue: 2,
    unit: 'hours',
    deadline: '2024-04-15',
    criteria: {
      specific: {
        value: 'Reduce average customer support response time from 8 hours to under 2 hours',
        confidence: 0.9,
        missing: []
      },
      measurable: {
        value: 'Response time measured through support ticket system analytics',
        confidence: 0.95,
        metrics: ['average response time', 'first response time', 'resolution time'],
        missing: []
      },
      achievable: {
        value: 'Achievable through process automation and additional staff',
        confidence: 0.85,
        missing: []
      },
      relevant: {
        value: 'Faster response time improves customer satisfaction and retention',
        confidence: 0.9,
        missing: []
      },
      timeBound: {
        value: 'Implementation within 3 months with weekly progress reviews',
        confidence: 0.8,
        deadline: '2024-04-15',
        missing: []
      }
    },
    missingCriteria: [],
    clarificationQuestions: [],
    confidence: 0.88,
    correlation_id: 'test-goal-3'
  }
]

export const mockMilestones: Milestone[] = [
  {
    id: 'milestone-1-1',
    goalId: 'goal-1',
    title: 'Conversion Rate Analysis and Baseline Setup',
    description: 'Analyze current conversion funnel and establish baseline metrics',
    targetDate: '2024-01-15T00:00:00.000Z',
    successCriteria: [
      'Current conversion rate documented',
      'Analytics tracking implemented',
      'Baseline metrics established',
      'Conversion funnel analysis completed'
    ],
    dependencies: [],
    progress: 0,
    status: 'not_started',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'milestone-1-2',
    goalId: 'goal-1',
    title: 'A/B Testing Infrastructure Setup',
    description: 'Implement A/B testing tools and create testing framework',
    targetDate: '2024-02-01T00:00:00.000Z',
    successCriteria: [
      'A/B testing platform integrated',
      'Testing framework documented',
      'Statistical significance calculator implemented',
      'Team training completed'
    ],
    dependencies: ['milestone-1-1'],
    progress: 0,
    status: 'not_started',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'milestone-2-1',
    goalId: 'goal-2',
    title: 'Mobile App MVP Development',
    description: 'Develop minimum viable product for mobile app',
    targetDate: '2024-02-15T00:00:00.000Z',
    successCriteria: [
      'Core features implemented',
      'User authentication system',
      'Basic UI/UX completed',
      'Testing completed'
    ],
    dependencies: [],
    progress: 0,
    status: 'not_started',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'milestone-3-1',
    goalId: 'goal-3',
    title: 'Support Process Automation',
    description: 'Implement automated support processes and tools',
    targetDate: '2024-02-01T00:00:00.000Z',
    successCriteria: [
      'Automated ticket routing implemented',
      'Chatbot for common queries deployed',
      'Knowledge base updated',
      'Staff training completed'
    ],
    dependencies: [],
    progress: 0,
    status: 'not_started',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  }
]

export const mockWBSTasks: WBSTask[] = [
  {
    id: 'task-1-1-1',
    milestoneId: 'milestone-1-1',
    title: 'Current Conversion Rate Analysis',
    description: 'Analyze existing website conversion funnel and identify bottlenecks',
    completionCriteria: 'Detailed analysis report with conversion rates at each funnel stage',
    estimatedHours: 16,
    priority: 'high',
    dependencies: [],
    status: 'not_started',
    level: 1,
    order: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'task-1-1-2',
    milestoneId: 'milestone-1-1',
    title: 'Analytics Implementation',
    description: 'Set up comprehensive analytics tracking for conversion events',
    completionCriteria: 'All conversion events tracked with proper attribution',
    estimatedHours: 12,
    priority: 'high',
    dependencies: ['task-1-1-1'],
    status: 'not_started',
    level: 1,
    order: 2,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'task-1-2-1',
    milestoneId: 'milestone-1-2',
    title: 'A/B Testing Platform Selection',
    description: 'Research and select appropriate A/B testing platform',
    completionCriteria: 'Platform selected with technical requirements documented',
    estimatedHours: 8,
    priority: 'medium',
    dependencies: [],
    status: 'not_started',
    level: 1,
    order: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'task-2-1-1',
    milestoneId: 'milestone-2-1',
    title: 'Mobile App Architecture Design',
    description: 'Design technical architecture for mobile application',
    completionCriteria: 'Architecture documentation with technology stack decisions',
    estimatedHours: 24,
    priority: 'critical',
    dependencies: [],
    status: 'not_started',
    level: 1,
    order: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'task-3-1-1',
    milestoneId: 'milestone-3-1',
    title: 'Support Ticket System Integration',
    description: 'Integrate automated routing with existing support ticket system',
    completionCriteria: 'Automated routing rules configured and tested',
    estimatedHours: 20,
    priority: 'high',
    dependencies: [],
    status: 'not_started',
    level: 1,
    order: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  }
]

export const mockTaskEstimations: TaskEstimation[] = [
  {
    taskId: 'task-1-1-1',
    expertJudgment: {
      estimate: 16,
      confidence: 0.8,
      reasoning: 'Based on previous conversion analysis projects of similar complexity'
    },
    analogyBased: {
      estimate: 18,
      confidence: 0.7,
      similarTask: 'E-commerce funnel analysis for retail client',
      adjustmentFactor: 1.1
    },
    threePoint: {
      optimistic: 12,
      mostLikely: 16,
      pessimistic: 24,
      expected: 16.7,
      standardDeviation: 2.0
    },
    parametric: {
      estimate: 15,
      confidence: 0.6,
      parameters: {
        funnelStages: 5,
        dataComplexity: 3,
        toolsRequired: 2
      },
      formula: 'funnelStages * dataComplexity + toolsRequired'
    },
    bottomUp: {
      estimate: 16.5,
      confidence: 0.9,
      subTasks: [
        { name: 'Data collection and preparation', estimate: 4 },
        { name: 'Funnel stage analysis', estimate: 8 },
        { name: 'Bottleneck identification', estimate: 2.5 },
        { name: 'Report creation', estimate: 2 }
      ]
    },
    finalEstimate: {
      hours: 16.3,
      confidence: 0.82,
      method: 'Weighted average with emphasis on expert judgment and bottom-up',
      uncertaintyRange: {
        min: 13,
        max: 20
      }
    }
  },
  {
    taskId: 'task-1-1-2',
    expertJudgment: {
      estimate: 12,
      confidence: 0.85,
      reasoning: 'Standard analytics implementation with known tools'
    },
    analogyBased: {
      estimate: 10,
      confidence: 0.8,
      similarTask: 'Google Analytics 4 implementation for SaaS platform',
      adjustmentFactor: 0.9
    },
    threePoint: {
      optimistic: 8,
      mostLikely: 12,
      pessimistic: 18,
      expected: 12.3,
      standardDeviation: 1.7
    },
    parametric: {
      estimate: 11,
      confidence: 0.7,
      parameters: {
        eventsToTrack: 8,
        integrationComplexity: 2,
        testingTime: 3
      },
      formula: 'eventsToTrack * 1.2 + integrationComplexity + testingTime'
    },
    bottomUp: {
      estimate: 12,
      confidence: 0.9,
      subTasks: [
        { name: 'Event tracking setup', estimate: 6 },
        { name: 'Custom dimensions configuration', estimate: 2 },
        { name: 'Dashboard creation', estimate: 2 },
        { name: 'Testing and verification', estimate: 2 }
      ]
    },
    finalEstimate: {
      hours: 11.8,
      confidence: 0.86,
      method: 'Weighted average with high confidence in expert judgment',
      uncertaintyRange: {
        min: 9,
        max: 15
      }
    }
  },
  {
    taskId: 'task-2-1-1',
    expertJudgment: {
      estimate: 24,
      confidence: 0.75,
      reasoning: 'Mobile architecture design requires careful consideration of scalability and platform differences'
    },
    analogyBased: {
      estimate: 28,
      confidence: 0.7,
      similarTask: 'Cross-platform mobile app architecture for fintech startup',
      adjustmentFactor: 1.2
    },
    threePoint: {
      optimistic: 18,
      mostLikely: 24,
      pessimistic: 36,
      expected: 25,
      standardDeviation: 3
    },
    parametric: {
      estimate: 26,
      confidence: 0.6,
      parameters: {
        platforms: 2,
        complexityScore: 8,
        architecturalPatterns: 3
      },
      formula: 'platforms * complexityScore + architecturalPatterns * 2'
    },
    bottomUp: {
      estimate: 25,
      confidence: 0.85,
      subTasks: [
        { name: 'Requirements analysis', estimate: 4 },
        { name: 'Technology stack selection', estimate: 6 },
        { name: 'System architecture design', estimate: 8 },
        { name: 'Database design', estimate: 4 },
        { name: 'Documentation creation', estimate: 3 }
      ]
    },
    finalEstimate: {
      hours: 24.8,
      confidence: 0.78,
      method: 'Weighted average with preference for bottom-up and expert judgment',
      uncertaintyRange: {
        min: 20,
        max: 30
      }
    }
  }
]