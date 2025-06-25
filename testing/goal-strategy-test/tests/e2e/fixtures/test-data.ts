export interface TestGoal {
  id: string;
  input: string;
  category: 'business' | 'personal' | 'health' | 'education' | 'career' | 'financial';
  complexity: 'simple' | 'medium' | 'complex';
  expectedSMARTCriteria: {
    specific: boolean;
    measurable: boolean;
    achievable: boolean;
    relevant: boolean;
    timeBound: boolean;
  };
  expectedMilestoneCount: { min: number; max: number };
  expectedTaskCount: { min: number; max: number };
  expectedTimeframe: string; // e.g., "3 months", "1 year"
}

export const TEST_GOALS: TestGoal[] = [
  {
    id: 'business-revenue-simple',
    input: 'Increase our monthly recurring revenue',
    category: 'business',
    complexity: 'simple',
    expectedSMARTCriteria: {
      specific: false, // Missing specific amount
      measurable: false, // No specific metric
      achievable: true,
      relevant: true,
      timeBound: false // No deadline
    },
    expectedMilestoneCount: { min: 3, max: 6 },
    expectedTaskCount: { min: 8, max: 20 },
    expectedTimeframe: '6 months'
  },
  {
    id: 'business-revenue-smart',
    input: 'Increase our monthly recurring revenue by 25% from $50,000 to $62,500 within 6 months by expanding our enterprise customer base and improving retention rates',
    category: 'business',
    complexity: 'medium',
    expectedSMARTCriteria: {
      specific: true,
      measurable: true,
      achievable: true,
      relevant: true,
      timeBound: true
    },
    expectedMilestoneCount: { min: 4, max: 8 },
    expectedTaskCount: { min: 15, max: 35 },
    expectedTimeframe: '6 months'
  },
  {
    id: 'personal-fitness-simple',
    input: 'Get fit and lose weight',
    category: 'health',
    complexity: 'simple',
    expectedSMARTCriteria: {
      specific: false,
      measurable: false,
      achievable: true,
      relevant: true,
      timeBound: false
    },
    expectedMilestoneCount: { min: 3, max: 6 },
    expectedTaskCount: { min: 10, max: 25 },
    expectedTimeframe: '3 months'
  },
  {
    id: 'personal-fitness-smart',
    input: 'Lose 20 pounds and reduce body fat percentage from 25% to 20% within 4 months through a combination of strength training 3x per week and cardio 2x per week, while maintaining a caloric deficit of 500 calories per day',
    category: 'health',
    complexity: 'complex',
    expectedSMARTCriteria: {
      specific: true,
      measurable: true,
      achievable: true,
      relevant: true,
      timeBound: true
    },
    expectedMilestoneCount: { min: 4, max: 8 },
    expectedTaskCount: { min: 20, max: 40 },
    expectedTimeframe: '4 months'
  },
  {
    id: 'education-skill-development',
    input: 'Learn Python programming to become a data scientist and get certified within 8 months',
    category: 'education',
    complexity: 'complex',
    expectedSMARTCriteria: {
      specific: true,
      measurable: true,
      achievable: true,
      relevant: true,
      timeBound: true
    },
    expectedMilestoneCount: { min: 6, max: 10 },
    expectedTaskCount: { min: 25, max: 50 },
    expectedTimeframe: '8 months'
  },
  {
    id: 'career-promotion',
    input: 'Get promoted to senior manager level with a 20% salary increase within 12 months',
    category: 'career',
    complexity: 'medium',
    expectedSMARTCriteria: {
      specific: true,
      measurable: true,
      achievable: true,
      relevant: true,
      timeBound: true
    },
    expectedMilestoneCount: { min: 5, max: 9 },
    expectedTaskCount: { min: 18, max: 35 },
    expectedTimeframe: '12 months'
  },
  {
    id: 'financial-savings',
    input: 'Save $30,000 for a house down payment in 18 months by reducing expenses and increasing income',
    category: 'financial',
    complexity: 'medium',
    expectedSMARTCriteria: {
      specific: true,
      measurable: true,
      achievable: true,
      relevant: true,
      timeBound: true
    },
    expectedMilestoneCount: { min: 4, max: 8 },
    expectedTaskCount: { min: 15, max: 30 },
    expectedTimeframe: '18 months'
  },
  {
    id: 'business-product-launch',
    input: 'Launch our new mobile app with 10,000 active users and $50,000 in revenue within 6 months',
    category: 'business',
    complexity: 'complex',
    expectedSMARTCriteria: {
      specific: true,
      measurable: true,
      achievable: true,
      relevant: true,
      timeBound: true
    },
    expectedMilestoneCount: { min: 6, max: 12 },
    expectedTaskCount: { min: 30, max: 60 },
    expectedTimeframe: '6 months'
  }
];

export const API_CONFIG = {
  validApiKey: 'test-api-key-12345',
  validUrl: 'http://localhost:3001',
  invalidApiKey: 'invalid-key',
  invalidUrl: 'invalid-url'
};

export const MOCK_RESPONSES = {
  smartGoal: {
    success: true,
    data: {
      id: 'goal-123',
      title: 'Increase monthly recurring revenue by 25% within 6 months',
      targetValue: 62500,
      unit: 'USD',
      deadline: '2024-12-31',
      criteria: {
        specific: {
          value: 'Increase monthly recurring revenue by 25% from $50,000 to $62,500',
          confidence: 0.9,
        },
        measurable: {
          value: 'Track MRR monthly, target $62,500',
          confidence: 0.95,
          metrics: ['Monthly Recurring Revenue', 'Customer Acquisition Rate', 'Churn Rate']
        },
        achievable: {
          value: '25% increase is achievable based on current growth trajectory',
          confidence: 0.8,
        },
        relevant: {
          value: 'Revenue growth directly supports business objectives',
          confidence: 0.9,
        },
        timeBound: {
          value: '6-month timeframe with monthly milestones',
          confidence: 0.85,
          deadline: '2024-12-31'
        }
      },
      missingCriteria: [],
      clarificationQuestions: [],
      confidence: 0.88,
      correlation_id: 'test-correlation-123'
    }
  },
  milestones: {
    success: true,
    data: [
      {
        id: 'milestone-1',
        goalId: 'goal-123',
        title: 'Market Research and Competitive Analysis',
        description: 'Conduct thorough market research to identify opportunities',
        targetDate: '2024-08-31',
        successCriteria: ['Market analysis completed', 'Competitive landscape mapped'],
        dependencies: [],
        progress: 0,
        status: 'not_started',
        createdAt: '2024-07-01T00:00:00Z',
        updatedAt: '2024-07-01T00:00:00Z'
      },
      {
        id: 'milestone-2',
        goalId: 'goal-123',
        title: 'Customer Acquisition Strategy Implementation',
        description: 'Implement strategies to acquire new enterprise customers',
        targetDate: '2024-10-31',
        successCriteria: ['Strategy implemented', '20% increase in lead generation'],
        dependencies: ['milestone-1'],
        progress: 0,
        status: 'not_started',
        createdAt: '2024-07-01T00:00:00Z',
        updatedAt: '2024-07-01T00:00:00Z'
      }
    ]
  },
  wbsTasks: {
    success: true,
    data: [
      {
        id: 'task-1',
        milestoneId: 'milestone-1',
        title: 'Market Research Survey Design',
        description: 'Create comprehensive survey for market research',
        completionCriteria: 'Survey designed and validated',
        estimatedHours: 16,
        priority: 'high',
        dependencies: [],
        status: 'not_started',
        level: 0,
        order: 1,
        createdAt: '2024-07-01T00:00:00Z',
        updatedAt: '2024-07-01T00:00:00Z'
      },
      {
        id: 'task-2',
        milestoneId: 'milestone-1',
        title: 'Conduct Market Interviews',
        description: 'Interview potential customers and stakeholders',
        completionCriteria: '20 interviews completed and analyzed',
        estimatedHours: 40,
        priority: 'high',
        dependencies: ['task-1'],
        status: 'not_started',
        level: 1,
        order: 2,
        createdAt: '2024-07-01T00:00:00Z',
        updatedAt: '2024-07-01T00:00:00Z'
      }
    ]
  },
  estimations: {
    success: true,
    data: [
      {
        taskId: 'task-1',
        expertJudgment: {
          estimate: 16,
          confidence: 0.8,
          reasoning: 'Based on previous survey design experience'
        },
        analogyBased: {
          estimate: 18,
          confidence: 0.75,
          similarTask: 'Customer satisfaction survey 2023',
          adjustmentFactor: 1.2
        },
        threePoint: {
          optimistic: 12,
          mostLikely: 16,
          pessimistic: 24,
          expected: 17,
          standardDeviation: 2
        },
        parametric: {
          estimate: 15,
          confidence: 0.7,
          parameters: { complexity: 3, experience: 4 },
          formula: 'complexity * experience * 1.25'
        },
        bottomUp: {
          estimate: 16,
          confidence: 0.85,
          subTasks: [
            { name: 'Question design', estimate: 8 },
            { name: 'Validation and testing', estimate: 6 },
            { name: 'Final review', estimate: 2 }
          ]
        },
        finalEstimate: {
          hours: 16,
          confidence: 0.8,
          method: 'bottom-up',
          uncertaintyRange: { min: 12, max: 20 }
        }
      }
    ]
  }
};

export function getGoalsByCategory(category: TestGoal['category']): TestGoal[] {
  return TEST_GOALS.filter(goal => goal.category === category);
}

export function getGoalsByComplexity(complexity: TestGoal['complexity']): TestGoal[] {
  return TEST_GOALS.filter(goal => goal.complexity === complexity);
}

export function getRandomGoal(): TestGoal {
  return TEST_GOALS[Math.floor(Math.random() * TEST_GOALS.length)];
}

export function getGoalById(id: string): TestGoal | undefined {
  return TEST_GOALS.find(goal => goal.id === id);
}