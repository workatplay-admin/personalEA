import { jest } from '@jest/globals';

export const mockGoal = {
  id: 'goal-123',
  userId: 'user-456',
  title: 'Increase website traffic',
  description: 'Improve online presence through SEO',
  rawGoal: 'I want to get more traffic to my website',
  smartCriteria: {
    specific: {
      value: "Increase monthly website traffic by 25% through SEO optimization and content marketing",
      confidence: 0.9,
      missing: []
    },
    measurable: {
      value: "25% increase in monthly website traffic",
      metrics: ["Monthly unique visitors", "Organic search traffic", "Page views"],
      confidence: 0.95,
      missing: []
    },
    achievable: {
      value: "Realistic based on current traffic trends and available resources",
      confidence: 0.8,
      missing: ["Current baseline traffic numbers"]
    },
    relevant: {
      value: "Aligns with business growth objectives and market expansion goals",
      confidence: 0.85,
      missing: []
    },
    timeBound: {
      value: "December 31, 2024",
      deadline: "2024-12-31T23:59:59Z",
      confidence: 0.9,
      missing: []
    }
  },
  status: 'DRAFT',
  priority: 'HIGH',
  category: 'Marketing',
  tags: ['SEO', 'Traffic', 'Growth'],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  targetDate: new Date('2024-12-31'),
  completedAt: null
};

export const mockGoalMetric = {
  id: 'metric-123',
  goalId: 'goal-123',
  name: 'Monthly Unique Visitors',
  type: 'NUMERIC',
  targetValue: 10000,
  currentValue: 8000,
  baselineValue: 7500,
  unit: 'visitors',
  measurementFrequency: 'monthly',
  isPrimary: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

export const mockGoalClarification = {
  id: 'clarification-123',
  goalId: 'goal-123',
  question: 'What is your current monthly website traffic baseline?',
  answer: 'Currently getting about 7,500 unique visitors per month',
  smartCriterion: 'achievable',
  status: 'ANSWERED',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

export const mockMilestone = {
  id: 'milestone-123',
  goalId: 'goal-123',
  title: 'SEO Audit Complete',
  description: 'Complete comprehensive SEO audit and identify optimization opportunities',
  targetDate: new Date('2024-03-31'),
  completionCriteria: 'SEO audit report completed and action items identified',
  status: 'NOT_STARTED',
  orderIndex: 1,
  progressPercentage: 0,
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  completedAt: null
};

export const mockTask = {
  id: 'task-123',
  milestoneId: 'milestone-123',
  parentTaskId: null,
  title: 'Conduct keyword research',
  description: 'Research and identify target keywords for SEO optimization',
  completionCriteria: 'List of 50+ target keywords with search volumes',
  estimatedHours: 8,
  actualHours: null,
  status: 'NOT_STARTED',
  priority: 'HIGH',
  assignedTo: null,
  tags: ['SEO', 'Research'],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  startedAt: null,
  completedAt: null
};

export const createMockPrismaClient = () => ({
  goal: {
    create: jest.fn().mockResolvedValue(mockGoal),
    findFirst: jest.fn().mockResolvedValue(mockGoal),
    findMany: jest.fn().mockResolvedValue([mockGoal]),
    update: jest.fn().mockResolvedValue(mockGoal),
    delete: jest.fn().mockResolvedValue(mockGoal),
    count: jest.fn().mockResolvedValue(1)
  },
  goalMetric: {
    create: jest.fn().mockResolvedValue(mockGoalMetric),
    findMany: jest.fn().mockResolvedValue([mockGoalMetric]),
    updateMany: jest.fn().mockResolvedValue({ count: 1 })
  },
  goalClarification: {
    create: jest.fn().mockResolvedValue(mockGoalClarification),
    findMany: jest.fn().mockResolvedValue([mockGoalClarification])
  },
  milestone: {
    create: jest.fn().mockResolvedValue(mockMilestone),
    findMany: jest.fn().mockResolvedValue([mockMilestone]),
    update: jest.fn().mockResolvedValue(mockMilestone)
  },
  task: {
    create: jest.fn().mockResolvedValue(mockTask),
    findMany: jest.fn().mockResolvedValue([mockTask]),
    update: jest.fn().mockResolvedValue(mockTask)
  },
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined)
});

// Mock the PrismaClient module
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => createMockPrismaClient())
}));