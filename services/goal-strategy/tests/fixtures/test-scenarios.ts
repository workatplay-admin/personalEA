// Comprehensive Test Scenarios for PersonalEA Goal Strategy Service

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  userProfile: {
    userId: string;
    type: 'professional' | 'student' | 'entrepreneur' | 'personal';
    experience: 'beginner' | 'intermediate' | 'advanced';
  };
  steps: TestStep[];
  expectedOutcomes: string[];
  testData: any;
}

export interface TestStep {
  action: string;
  input?: any;
  expectedResponse?: any;
  validation?: string[];
}

export const userTestScenarios: TestScenario[] = [
  {
    id: 'scenario-001',
    name: 'Professional Career Advancement',
    description: 'User wants to advance their career with specific goals',
    userProfile: {
      userId: 'test-user-001',
      type: 'professional',
      experience: 'intermediate'
    },
    steps: [
      {
        action: 'submitGoal',
        input: {
          goal: 'Get promoted to Senior Software Engineer',
          context: {
            timeframe: '12 months',
            resources: ['Current role as Software Engineer', 'Company training budget', 'Mentorship program'],
            constraints: ['Current project commitments', 'Need to maintain work-life balance'],
            priority: 'HIGH'
          }
        },
        expectedResponse: {
          requiresClarification: true,
          clarificationQuestions: [
            'What specific skills or achievements does your company require for Senior Engineers?',
            'What is your current performance rating?',
            'How many years of experience do you currently have?'
          ]
        }
      },
      {
        action: 'answerClarifications',
        input: {
          answers: [
            'Lead 2+ projects, mentor juniors, expertise in system design',
            'Exceeds expectations for last 2 reviews',
            '3 years as Software Engineer'
          ]
        },
        expectedResponse: {
          smartGoal: {
            specific: 'Achieve promotion to Senior Software Engineer by leading 2 major projects, mentoring 2 junior developers, and demonstrating system design expertise',
            measurable: true,
            achievable: true,
            relevant: true,
            timeBound: '12 months'
          }
        }
      },
      {
        action: 'createMilestones',
        expectedResponse: {
          milestones: [
            'Complete system design certification (3 months)',
            'Lead first major project (6 months)',
            'Start mentoring program (4 months)',
            'Lead second project and demonstrate impact (10 months)',
            'Formal promotion review (12 months)'
          ]
        }
      }
    ],
    expectedOutcomes: [
      'SMART goal created with clear metrics',
      'Milestones generated with timeline',
      'Tasks broken down for each milestone',
      'Progress tracking enabled'
    ],
    testData: {
      metrics: [
        { name: 'Projects Led', targetValue: 2, type: 'COUNT' },
        { name: 'Juniors Mentored', targetValue: 2, type: 'COUNT' },
        { name: 'System Design Score', targetValue: 85, type: 'PERCENTAGE' }
      ]
    }
  },
  {
    id: 'scenario-002',
    name: 'Student Academic Achievement',
    description: 'College student setting academic goals',
    userProfile: {
      userId: 'test-user-002',
      type: 'student',
      experience: 'beginner'
    },
    steps: [
      {
        action: 'submitGoal',
        input: {
          goal: 'Improve my GPA',
          context: {
            timeframe: 'this semester',
            resources: ['Study groups', 'Tutoring center', 'Online resources'],
            constraints: ['Part-time job 20 hours/week', 'Limited study time'],
            priority: 'CRITICAL'
          }
        },
        expectedResponse: {
          requiresClarification: true,
          clarificationQuestions: [
            'What is your current GPA?',
            'What GPA are you targeting?',
            'Which subjects need the most improvement?',
            'How many courses are you taking this semester?'
          ]
        }
      },
      {
        action: 'answerClarifications',
        input: {
          answers: [
            'Current GPA is 2.8',
            'Target GPA of 3.3 or higher',
            'Math and Chemistry are weakest subjects',
            '5 courses (15 credits)'
          ]
        },
        expectedResponse: {
          smartGoal: {
            specific: 'Raise semester GPA from 2.8 to 3.3 by improving Math and Chemistry grades',
            measurable: true,
            achievable: true,
            relevant: true,
            timeBound: '1 semester (4 months)'
          }
        }
      }
    ],
    expectedOutcomes: [
      'Clear GPA improvement target set',
      'Study schedule created',
      'Resource allocation planned',
      'Progress checkpoints established'
    ],
    testData: {
      metrics: [
        { name: 'Target GPA', targetValue: 3.3, type: 'NUMERIC' },
        { name: 'Study Hours per Week', targetValue: 20, type: 'NUMERIC' },
        { name: 'Tutoring Sessions Attended', targetValue: 2, type: 'COUNT' }
      ]
    }
  },
  {
    id: 'scenario-003',
    name: 'Entrepreneur Business Launch',
    description: 'Aspiring entrepreneur starting an online business',
    userProfile: {
      userId: 'test-user-003',
      type: 'entrepreneur',
      experience: 'beginner'
    },
    steps: [
      {
        action: 'submitGoal',
        input: {
          goal: 'Start an e-commerce business selling handmade crafts',
          context: {
            timeframe: '6 months',
            resources: ['$5000 startup capital', 'Craft skills', 'Basic marketing knowledge'],
            constraints: ['Full-time job', 'No business experience', 'Limited technical skills'],
            priority: 'HIGH'
          }
        },
        expectedResponse: {
          requiresClarification: true,
          clarificationQuestions: [
            'What revenue target do you have for the first year?',
            'What type of handmade crafts will you focus on?',
            'Will you handle fulfillment yourself or use a service?',
            'What platforms will you sell on (own website, Etsy, Amazon)?'
          ]
        }
      }
    ],
    expectedOutcomes: [
      'Business launch plan created',
      'Revenue targets established',
      'Marketing strategy outlined',
      'Operational milestones defined'
    ],
    testData: {
      metrics: [
        { name: 'Monthly Revenue', targetValue: 2000, type: 'CURRENCY' },
        { name: 'Products Listed', targetValue: 50, type: 'COUNT' },
        { name: 'Customer Base', targetValue: 100, type: 'COUNT' }
      ]
    }
  },
  {
    id: 'scenario-004',
    name: 'Personal Health and Fitness',
    description: 'Individual setting health and fitness goals',
    userProfile: {
      userId: 'test-user-004',
      type: 'personal',
      experience: 'intermediate'
    },
    steps: [
      {
        action: 'submitGoal',
        input: {
          goal: 'Run a marathon',
          context: {
            timeframe: '9 months',
            resources: ['Running shoes', 'Local running club', 'Fitness tracker'],
            constraints: ['Previous knee injury', 'Can only train 4 days per week'],
            priority: 'MEDIUM'
          }
        },
        expectedResponse: {
          requiresClarification: true,
          clarificationQuestions: [
            'What is your current running fitness level?',
            'Have you run any races before?',
            'Which marathon are you targeting?',
            'Do you have a time goal or just want to finish?'
          ]
        }
      }
    ],
    expectedOutcomes: [
      'Training plan created',
      'Weekly mileage targets set',
      'Injury prevention measures included',
      'Race preparation timeline established'
    ],
    testData: {
      metrics: [
        { name: 'Weekly Mileage', targetValue: 40, type: 'NUMERIC' },
        { name: 'Long Run Distance', targetValue: 20, type: 'NUMERIC' },
        { name: 'Marathon Finish', targetValue: 1, type: 'BOOLEAN' }
      ]
    }
  },
  {
    id: 'scenario-005',
    name: 'Complex Multi-Goal Project',
    description: 'User with multiple interconnected goals',
    userProfile: {
      userId: 'test-user-005',
      type: 'professional',
      experience: 'advanced'
    },
    steps: [
      {
        action: 'submitGoal',
        input: {
          goal: 'Build and launch a SaaS product while maintaining my day job',
          context: {
            timeframe: '18 months',
            resources: ['$20k budget', 'Technical skills', 'Business network', '20 hours/week'],
            constraints: ['Full-time job', 'Family commitments', 'No co-founder'],
            priority: 'CRITICAL'
          }
        },
        expectedResponse: {
          requiresClarification: true,
          clarificationQuestions: [
            'What problem will your SaaS solve?',
            'What is your target market?',
            'What is your revenue goal for year 1?',
            'Will you bootstrap or seek funding?'
          ]
        }
      }
    ],
    expectedOutcomes: [
      'Product development roadmap',
      'Launch timeline with phases',
      'Revenue projections',
      'Risk mitigation strategies'
    ],
    testData: {
      metrics: [
        { name: 'MVP Launch', targetValue: 1, type: 'BOOLEAN' },
        { name: 'Beta Users', targetValue: 100, type: 'COUNT' },
        { name: 'MRR at Launch', targetValue: 5000, type: 'CURRENCY' },
        { name: 'Development Hours', targetValue: 1000, type: 'NUMERIC' }
      ]
    }
  }
];

// Edge case scenarios for testing
export const edgeCaseScenarios: TestScenario[] = [
  {
    id: 'edge-001',
    name: 'Vague Goal Clarification',
    description: 'User submits extremely vague goal',
    userProfile: {
      userId: 'test-edge-001',
      type: 'personal',
      experience: 'beginner'
    },
    steps: [
      {
        action: 'submitGoal',
        input: {
          goal: 'Be successful'
        },
        expectedResponse: {
          requiresClarification: true,
          clarificationQuestions: [
            'What does success mean to you?',
            'In which area of life (career, personal, financial)?',
            'What timeframe are you considering?',
            'What would indicate youve achieved success?'
          ]
        }
      }
    ],
    expectedOutcomes: [
      'Multiple clarification rounds needed',
      'Goal refined to specific area',
      'Concrete metrics established'
    ],
    testData: {}
  },
  {
    id: 'edge-002',
    name: 'Conflicting Constraints',
    description: 'User has conflicting constraints',
    userProfile: {
      userId: 'test-edge-002',
      type: 'professional',
      experience: 'intermediate'
    },
    steps: [
      {
        action: 'submitGoal',
        input: {
          goal: 'Double my income',
          context: {
            timeframe: '3 months',
            resources: ['Current job', 'No additional time'],
            constraints: ['Cannot work more hours', 'Cannot change jobs', 'No side business allowed'],
            priority: 'CRITICAL'
          }
        },
        expectedResponse: {
          requiresClarification: true,
          feedbackMessage: 'Your constraints may make this goal very challenging. Lets explore options.'
        }
      }
    ],
    expectedOutcomes: [
      'System identifies conflicts',
      'Alternative approaches suggested',
      'Goal adjusted or constraints reconsidered'
    ],
    testData: {}
  },
  {
    id: 'edge-003',
    name: 'Multiple Goals Dependencies',
    description: 'User has multiple interdependent goals',
    userProfile: {
      userId: 'test-edge-003',
      type: 'entrepreneur',
      experience: 'advanced'
    },
    steps: [
      {
        action: 'submitMultipleGoals',
        input: {
          goals: [
            'Learn web development',
            'Build a startup',
            'Generate $10k/month revenue',
            'Hire a team'
          ],
          context: {
            timeframe: '2 years',
            note: 'These goals are connected'
          }
        },
        expectedResponse: {
          suggestedOrder: [
            'Learn web development (prerequisite)',
            'Build a startup (depends on skills)',
            'Generate revenue (depends on product)',
            'Hire team (depends on revenue)'
          ],
          dependencies: 'identified'
        }
      }
    ],
    expectedOutcomes: [
      'Dependencies mapped',
      'Sequential plan created',
      'Risk points identified'
    ],
    testData: {}
  }
];

// User personas for different testing scenarios
export const testUserPersonas = [
  {
    userId: 'persona-tech-pro',
    name: 'Alex Chen',
    profile: {
      occupation: 'Software Developer',
      age: 28,
      goals: ['Career advancement', 'Skill development', 'Work-life balance'],
      techSavvy: 'high',
      planningExperience: 'moderate'
    }
  },
  {
    userId: 'persona-student',
    name: 'Maria Rodriguez',
    profile: {
      occupation: 'College Student',
      age: 20,
      goals: ['Academic success', 'Career preparation', 'Personal growth'],
      techSavvy: 'moderate',
      planningExperience: 'low'
    }
  },
  {
    userId: 'persona-entrepreneur',
    name: 'David Kim',
    profile: {
      occupation: 'Aspiring Entrepreneur',
      age: 35,
      goals: ['Business launch', 'Financial freedom', 'Impact'],
      techSavvy: 'moderate',
      planningExperience: 'high'
    }
  },
  {
    userId: 'persona-fitness',
    name: 'Sarah Johnson',
    profile: {
      occupation: 'Marketing Manager',
      age: 32,
      goals: ['Health improvement', 'Athletic achievement', 'Stress management'],
      techSavvy: 'low',
      planningExperience: 'moderate'
    }
  }
];