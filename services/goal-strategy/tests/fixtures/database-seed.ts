// Database Seed Data for Testing
// This file contains sample data for all database tables

import { Prisma } from '@prisma/client';

// Sample Goals
export const sampleGoals: Prisma.GoalCreateInput[] = [
  {
    id: 'goal-001',
    userId: 'test-user-001',
    title: 'Achieve Senior Software Engineer Promotion',
    description: 'Get promoted to Senior Software Engineer by demonstrating leadership, technical expertise, and project impact',
    rawGoal: 'Get promoted to Senior Software Engineer',
    smartCriteria: {
      specific: {
        value: 'Achieve promotion to Senior Software Engineer role',
        confidence: 0.9
      },
      measurable: {
        value: 'Lead 2 major projects, mentor 2 junior developers, complete system design certification',
        metrics: [
          { name: 'Projects Led', target: 2, unit: 'count' },
          { name: 'Developers Mentored', target: 2, unit: 'count' },
          { name: 'Certification Score', target: 85, unit: 'percentage' }
        ],
        confidence: 0.85
      },
      achievable: {
        value: 'Based on current performance and company growth, promotion is realistic',
        confidence: 0.8
      },
      relevant: {
        value: 'Aligns with career goals and company needs',
        confidence: 0.95
      },
      timeBound: {
        value: '12 months',
        deadline: new Date('2025-06-25'),
        confidence: 0.9
      }
    },
    status: 'ACTIVE',
    priority: 'HIGH',
    category: 'Career',
    tags: ['promotion', 'leadership', 'technical-growth'],
    targetDate: new Date('2025-06-25')
  },
  {
    id: 'goal-002',
    userId: 'test-user-002',
    title: 'Improve Academic Performance',
    description: 'Raise GPA from 2.8 to 3.3 by end of semester through focused study and tutoring',
    rawGoal: 'Improve my GPA',
    smartCriteria: {
      specific: {
        value: 'Raise semester GPA from 2.8 to 3.3',
        confidence: 0.85
      },
      measurable: {
        value: 'Achieve minimum B+ in all courses, A- in major courses',
        metrics: [
          { name: 'Target GPA', target: 3.3, unit: 'gpa' },
          { name: 'Study Hours/Week', target: 20, unit: 'hours' },
          { name: 'Tutoring Sessions', target: 2, unit: 'per week' }
        ],
        confidence: 0.8
      },
      achievable: {
        value: 'With dedicated study time and tutoring support, goal is achievable',
        confidence: 0.75
      },
      relevant: {
        value: 'Critical for maintaining scholarship and graduate school applications',
        confidence: 0.95
      },
      timeBound: {
        value: '1 semester (4 months)',
        deadline: new Date('2025-05-15'),
        confidence: 0.9
      }
    },
    status: 'ACTIVE',
    priority: 'CRITICAL',
    category: 'Education',
    tags: ['gpa', 'academic', 'study'],
    targetDate: new Date('2025-05-15')
  },
  {
    id: 'goal-003',
    userId: 'test-user-003',
    title: 'Launch E-commerce Business',
    description: 'Start and grow handmade crafts business to $2000/month revenue',
    rawGoal: 'Start an e-commerce business selling handmade crafts',
    smartCriteria: {
      specific: {
        value: 'Launch online store selling handmade jewelry and accessories',
        confidence: 0.9
      },
      measurable: {
        value: 'Achieve $2000 monthly revenue with 100+ customers',
        metrics: [
          { name: 'Monthly Revenue', target: 2000, unit: 'USD' },
          { name: 'Customer Base', target: 100, unit: 'customers' },
          { name: 'Product Listings', target: 50, unit: 'products' }
        ],
        confidence: 0.8
      },
      achievable: {
        value: 'With $5000 capital and existing craft skills, goal is realistic',
        confidence: 0.75
      },
      relevant: {
        value: 'Provides additional income and creative outlet',
        confidence: 0.9
      },
      timeBound: {
        value: '6 months to launch, 12 months to revenue target',
        deadline: new Date('2025-12-25'),
        confidence: 0.85
      }
    },
    status: 'ACTIVE',
    priority: 'HIGH',
    category: 'Business',
    tags: ['entrepreneurship', 'e-commerce', 'creative'],
    targetDate: new Date('2025-12-25')
  },
  {
    id: 'goal-004',
    userId: 'test-user-004',
    title: 'Complete First Marathon',
    description: 'Train for and complete a full marathon within 9 months',
    rawGoal: 'Run a marathon',
    smartCriteria: {
      specific: {
        value: 'Complete the Chicago Marathon in October 2025',
        confidence: 0.9
      },
      measurable: {
        value: 'Finish 26.2 miles, build to 40 miles/week training',
        metrics: [
          { name: 'Weekly Mileage', target: 40, unit: 'miles' },
          { name: 'Long Run Distance', target: 20, unit: 'miles' },
          { name: 'Finish Time', target: 270, unit: 'minutes' }
        ],
        confidence: 0.85
      },
      achievable: {
        value: 'With structured training and injury prevention, goal is achievable',
        confidence: 0.8
      },
      relevant: {
        value: 'Improves health and achieves personal milestone',
        confidence: 0.95
      },
      timeBound: {
        value: '9 months training period',
        deadline: new Date('2025-10-13'),
        confidence: 0.9
      }
    },
    status: 'ACTIVE',
    priority: 'MEDIUM',
    category: 'Health & Fitness',
    tags: ['running', 'marathon', 'fitness'],
    targetDate: new Date('2025-10-13')
  },
  {
    id: 'goal-005',
    userId: 'test-user-001',
    title: 'Complete System Design Certification',
    description: 'Subset goal for promotion - complete system design certification',
    rawGoal: 'Get system design certification',
    smartCriteria: {
      specific: {
        value: 'Pass AWS Solutions Architect Professional exam',
        confidence: 0.95
      },
      measurable: {
        value: 'Score 750+ on certification exam',
        metrics: [
          { name: 'Exam Score', target: 750, unit: 'points' },
          { name: 'Study Hours', target: 120, unit: 'hours' },
          { name: 'Practice Tests', target: 5, unit: 'tests' }
        ],
        confidence: 0.9
      },
      achievable: {
        value: 'With study plan and resources, certification is attainable',
        confidence: 0.85
      },
      relevant: {
        value: 'Required skill for Senior Engineer role',
        confidence: 1.0
      },
      timeBound: {
        value: '3 months',
        deadline: new Date('2025-04-25'),
        confidence: 0.9
      }
    },
    status: 'ACTIVE',
    priority: 'HIGH',
    category: 'Career',
    tags: ['certification', 'aws', 'system-design'],
    targetDate: new Date('2025-04-25')
  }
];

// Sample Goal Metrics
export const sampleGoalMetrics: Prisma.GoalMetricCreateInput[] = [
  {
    id: 'metric-001',
    name: 'Projects Led',
    type: 'COUNT',
    targetValue: 2,
    currentValue: 0,
    unit: 'projects',
    measurementFrequency: 'quarterly',
    isPrimary: true,
    goal: { connect: { id: 'goal-001' } }
  },
  {
    id: 'metric-002',
    name: 'Developers Mentored',
    type: 'COUNT',
    targetValue: 2,
    currentValue: 1,
    unit: 'people',
    measurementFrequency: 'monthly',
    isPrimary: true,
    goal: { connect: { id: 'goal-001' } }
  },
  {
    id: 'metric-003',
    name: 'Current GPA',
    type: 'NUMERIC',
    targetValue: 3.3,
    currentValue: 2.8,
    baselineValue: 2.8,
    unit: 'gpa',
    measurementFrequency: 'semester',
    isPrimary: true,
    goal: { connect: { id: 'goal-002' } }
  },
  {
    id: 'metric-004',
    name: 'Monthly Revenue',
    type: 'CURRENCY',
    targetValue: 2000,
    currentValue: 0,
    unit: 'USD',
    measurementFrequency: 'monthly',
    isPrimary: true,
    goal: { connect: { id: 'goal-003' } }
  },
  {
    id: 'metric-005',
    name: 'Weekly Running Mileage',
    type: 'NUMERIC',
    targetValue: 40,
    currentValue: 15,
    baselineValue: 10,
    unit: 'miles',
    measurementFrequency: 'weekly',
    isPrimary: true,
    goal: { connect: { id: 'goal-004' } }
  }
];

// Sample Milestones
export const sampleMilestones: Prisma.MilestoneCreateInput[] = [
  {
    id: 'milestone-001',
    title: 'Complete System Design Certification',
    description: 'Pass AWS Solutions Architect Professional exam',
    targetDate: new Date('2025-04-25'),
    completionCriteria: 'Score 750+ on certification exam',
    status: 'IN_PROGRESS',
    orderIndex: 1,
    progressPercentage: 35,
    notes: 'Started online course, completed 2 practice tests',
    goal: { connect: { id: 'goal-001' } }
  },
  {
    id: 'milestone-002',
    title: 'Lead First Major Project',
    description: 'Take ownership of customer portal redesign project',
    targetDate: new Date('2025-07-25'),
    completionCriteria: 'Successfully deliver project on time with positive stakeholder feedback',
    status: 'NOT_STARTED',
    orderIndex: 2,
    progressPercentage: 0,
    goal: { connect: { id: 'goal-001' } }
  },
  {
    id: 'milestone-003',
    title: 'Improve Math Grade',
    description: 'Raise Calculus grade from C to B+',
    targetDate: new Date('2025-03-15'),
    completionCriteria: 'Score 85%+ on midterm and final',
    status: 'IN_PROGRESS',
    orderIndex: 1,
    progressPercentage: 40,
    notes: 'Working with tutor twice weekly',
    goal: { connect: { id: 'goal-002' } }
  },
  {
    id: 'milestone-004',
    title: 'Launch Online Store',
    description: 'Set up Shopify store with initial product catalog',
    targetDate: new Date('2025-03-25'),
    completionCriteria: 'Store live with 20+ products and payment processing',
    status: 'IN_PROGRESS',
    orderIndex: 1,
    progressPercentage: 60,
    notes: 'Domain purchased, store design in progress',
    goal: { connect: { id: 'goal-003' } }
  },
  {
    id: 'milestone-005',
    title: 'Complete Half Marathon',
    description: 'Run 13.1 miles as training milestone',
    targetDate: new Date('2025-06-15'),
    completionCriteria: 'Finish half marathon race in under 2:15',
    status: 'NOT_STARTED',
    orderIndex: 1,
    progressPercentage: 0,
    goal: { connect: { id: 'goal-004' } }
  }
];

// Sample Tasks
export const sampleTasks: Prisma.TaskCreateInput[] = [
  {
    id: 'task-001',
    title: 'Enroll in AWS certification course',
    description: 'Sign up for official AWS training course',
    completionCriteria: 'Course enrollment confirmed',
    estimatedHours: 2,
    actualHours: 1.5,
    status: 'COMPLETED',
    priority: 'HIGH',
    assignedTo: 'test-user-001',
    tags: ['aws', 'training'],
    completedAt: new Date('2025-01-20'),
    milestone: { connect: { id: 'milestone-001' } }
  },
  {
    id: 'task-002',
    title: 'Complete 120 hours of study',
    description: 'Study AWS services and architecture patterns',
    completionCriteria: 'Complete all course modules and labs',
    estimatedHours: 120,
    actualHours: 45,
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assignedTo: 'test-user-001',
    tags: ['aws', 'study'],
    startedAt: new Date('2025-01-21'),
    milestone: { connect: { id: 'milestone-001' } }
  },
  {
    id: 'task-003',
    title: 'Schedule tutoring sessions',
    description: 'Book regular Math and Chemistry tutoring',
    completionCriteria: 'Weekly sessions scheduled for semester',
    estimatedHours: 1,
    status: 'NOT_STARTED',
    priority: 'CRITICAL',
    assignedTo: 'test-user-002',
    tags: ['tutoring', 'academic'],
    milestone: { connect: { id: 'milestone-003' } }
  },
  {
    id: 'task-004',
    title: 'Product photography',
    description: 'Take professional photos of initial product line',
    completionCriteria: '5+ high-quality photos per product',
    estimatedHours: 8,
    status: 'NOT_STARTED',
    priority: 'HIGH',
    assignedTo: 'test-user-003',
    tags: ['photography', 'products'],
    milestone: { connect: { id: 'milestone-004' } }
  },
  {
    id: 'task-005',
    title: 'Build base mileage',
    description: 'Increase weekly running to 25 miles',
    completionCriteria: 'Maintain 25 miles/week for 3 weeks',
    estimatedHours: 12,
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    assignedTo: 'test-user-004',
    tags: ['running', 'training'],
    milestone: { connect: { id: 'milestone-005' } }
  }
];

// Sample Goal Clarifications
export const sampleClarifications: Prisma.GoalClarificationCreateInput[] = [
  {
    id: 'clarification-001',
    question: 'What specific technical skills are required for Senior Engineer at your company?',
    answer: 'System design, cloud architecture (AWS), mentoring, and project leadership',
    smartCriterion: 'specific',
    status: 'ANSWERED',
    goal: { connect: { id: 'goal-001' } }
  },
  {
    id: 'clarification-002',
    question: 'What is your current performance rating?',
    answer: 'Exceeds expectations for last 2 review cycles',
    smartCriterion: 'achievable',
    status: 'ANSWERED',
    goal: { connect: { id: 'goal-001' } }
  },
  {
    id: 'clarification-003',
    question: 'Which courses need the most improvement?',
    answer: 'Calculus (currently C+) and Chemistry (currently C)',
    smartCriterion: 'specific',
    status: 'ANSWERED',
    goal: { connect: { id: 'goal-002' } }
  },
  {
    id: 'clarification-004',
    question: 'What type of handmade crafts will you focus on?',
    answer: 'Handmade jewelry and accessories, starting with earrings and bracelets',
    smartCriterion: 'specific',
    status: 'ANSWERED',
    goal: { connect: { id: 'goal-003' } }
  },
  {
    id: 'clarification-005',
    question: 'Have you run any races before?',
    answer: 'Yes, several 5Ks and one 10K, but never longer distances',
    smartCriterion: 'achievable',
    status: 'ANSWERED',
    goal: { connect: { id: 'goal-004' } }
  }
];

// Sample Team Capacity
export const sampleTeamCapacity: Prisma.TeamCapacityCreateInput[] = [
  {
    id: 'capacity-001',
    userId: 'test-user-001',
    availableHoursPerWeek: 45,
    weekendPreference: 'LIGHT_WEEKENDS',
    focusTimePreferences: {
      mornings: true,
      preferredHours: ['9-11am', '2-4pm'],
      deepWorkDays: ['Tuesday', 'Thursday']
    },
    skillTags: ['software-development', 'aws', 'system-design', 'mentoring']
  },
  {
    id: 'capacity-002',
    userId: 'test-user-002',
    availableHoursPerWeek: 20,
    weekendPreference: 'FULL_WEEKENDS',
    focusTimePreferences: {
      evenings: true,
      preferredHours: ['6-9pm', 'weekends'],
      deepWorkDays: ['Saturday', 'Sunday']
    },
    skillTags: ['studying', 'math', 'chemistry']
  },
  {
    id: 'capacity-003',
    userId: 'test-user-003',
    availableHoursPerWeek: 25,
    weekendPreference: 'FULL_WEEKENDS',
    focusTimePreferences: {
      evenings: true,
      preferredHours: ['7-10pm', 'weekend mornings'],
      deepWorkDays: ['Saturday', 'Sunday']
    },
    skillTags: ['crafts', 'business', 'marketing']
  },
  {
    id: 'capacity-004',
    userId: 'test-user-004',
    availableHoursPerWeek: 15,
    weekendPreference: 'LIGHT_WEEKENDS',
    focusTimePreferences: {
      mornings: true,
      preferredHours: ['6-7am', '5-6pm'],
      deepWorkDays: ['Monday', 'Wednesday', 'Friday', 'Saturday']
    },
    skillTags: ['running', 'fitness', 'endurance']
  }
];

// Sample Goal Templates
export const sampleGoalTemplates: Prisma.GoalTemplateCreateInput[] = [
  {
    id: 'template-001',
    name: 'Career Promotion Template',
    description: 'Template for career advancement goals',
    category: 'Career',
    smartTemplate: {
      specific: 'Get promoted to [TARGET_ROLE]',
      measurable: 'Demonstrate [KEY_SKILLS], complete [REQUIREMENTS]',
      achievable: 'Based on current performance and company needs',
      relevant: 'Aligns with career path and organizational goals',
      timeBound: '[TIMEFRAME] months'
    },
    milestoneTemplate: {
      milestones: [
        'Identify promotion requirements',
        'Develop missing skills',
        'Take on stretch projects',
        'Build stakeholder support',
        'Formal promotion review'
      ]
    },
    taskTemplate: {
      tasks: [
        'Meet with manager to discuss requirements',
        'Create skill development plan',
        'Identify stretch project opportunities',
        'Build mentor relationships',
        'Document achievements'
      ]
    },
    usageCount: 45,
    successRate: 0.78
  },
  {
    id: 'template-002',
    name: 'Fitness Goal Template',
    description: 'Template for health and fitness goals',
    category: 'Health & Fitness',
    smartTemplate: {
      specific: 'Achieve [FITNESS_GOAL]',
      measurable: '[METRIC] by [TARGET]',
      achievable: 'With proper training and consistency',
      relevant: 'Improves health and wellbeing',
      timeBound: '[TIMEFRAME] months'
    },
    milestoneTemplate: {
      milestones: [
        'Baseline fitness assessment',
        'Build foundation',
        'Progressive training',
        'Peak preparation',
        'Goal achievement'
      ]
    },
    taskTemplate: {
      tasks: [
        'Get medical clearance',
        'Create training plan',
        'Track progress metrics',
        'Adjust based on progress',
        'Taper for event'
      ]
    },
    usageCount: 120,
    successRate: 0.65
  }
];

// Database seed function
export async function seedDatabase(prisma: any) {
  console.log('Starting database seed...');

  // Create Goals
  for (const goal of sampleGoals) {
    await prisma.goal.create({ data: goal });
  }

  // Create Goal Metrics
  for (const metric of sampleGoalMetrics) {
    await prisma.goalMetric.create({ data: metric });
  }

  // Create Milestones
  for (const milestone of sampleMilestones) {
    await prisma.milestone.create({ data: milestone });
  }

  // Create Tasks
  for (const task of sampleTasks) {
    await prisma.task.create({ data: task });
  }

  // Create Clarifications
  for (const clarification of sampleClarifications) {
    await prisma.goalClarification.create({ data: clarification });
  }

  // Create Team Capacity
  for (const capacity of sampleTeamCapacity) {
    await prisma.teamCapacity.create({ data: capacity });
  }

  // Create Goal Templates
  for (const template of sampleGoalTemplates) {
    await prisma.goalTemplate.create({ data: template });
  }

  console.log('Database seed completed!');
}