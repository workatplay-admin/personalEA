export interface UserScenario {
  id: string;
  name: string;
  persona: string;
  goal: string;
  expectedBehavior: {
    hesitationPoints: string[];
    likelyErrors: string[];
    successCriteria: string[];
  };
  testingPriority: 'high' | 'medium' | 'low';
  complexity: 'simple' | 'medium' | 'complex';
}

export const REALISTIC_USER_SCENARIOS: UserScenario[] = [
  {
    id: 'first-time-user-simple',
    name: 'First-time user with simple goal',
    persona: 'Tech-savvy professional trying the app for the first time',
    goal: 'I want to lose 10 pounds',
    expectedBehavior: {
      hesitationPoints: [
        'API configuration screen',
        'Deciding what to enter as goal',
        'Clicking Transform button for first time'
      ],
      likelyErrors: [
        'Might enter invalid API key format',
        'May not understand what SMART goals are'
      ],
      successCriteria: [
        'Successfully configures API',
        'Enters goal and gets SMART conversion',
        'Understands the SMART criteria explanation'
      ]
    },
    testingPriority: 'high',
    complexity: 'simple'
  },
  {
    id: 'business-professional-complex',
    name: 'Business professional with complex goal',
    persona: 'Experienced manager planning a business initiative',
    goal: 'Launch a new product line that generates $1M revenue within 18 months while maintaining current team productivity',
    expectedBehavior: {
      hesitationPoints: [
        'Reviewing SMART goal breakdown',
        'Analyzing milestone timeline',
        'Evaluating task estimates'
      ],
      likelyErrors: [
        'May want to modify generated milestones',
        'Might question estimation accuracy'
      ],
      successCriteria: [
        'Completes full workflow to estimation',
        'Reviews all phases carefully',
        'Understands milestone dependencies'
      ]
    },
    testingPriority: 'high',
    complexity: 'complex'
  },
  {
    id: 'health-fitness-enthusiast',
    name: 'Health and fitness enthusiast',
    persona: 'Person focused on personal health goals',
    goal: 'Train for and complete a half marathon in under 2 hours within 6 months',
    expectedBehavior: {
      hesitationPoints: [
        'Understanding training schedule complexity',
        'Reviewing milestone timelines'
      ],
      likelyErrors: [
        'May underestimate training requirements',
        'Might want to adjust timeline'
      ],
      successCriteria: [
        'Gets realistic training milestones',
        'Understands progressive training approach',
        'Sees detailed task breakdown'
      ]
    },
    testingPriority: 'medium',
    complexity: 'medium'
  },
  {
    id: 'student-career-development',
    name: 'Student planning career development',
    persona: 'University student preparing for career transition',
    goal: 'Land a software engineering job at a top tech company after graduation',
    expectedBehavior: {
      hesitationPoints: [
        'Understanding skill requirements',
        'Timeline for job search preparation'
      ],
      likelyErrors: [
        'May underestimate preparation time',
        'Might not understand all required skills'
      ],
      successCriteria: [
        'Gets comprehensive skill development plan',
        'Understands preparation timeline',
        'Sees networking and application strategies'
      ]
    },
    testingPriority: 'medium',
    complexity: 'medium'
  },
  {
    id: 'entrepreneur-startup',
    name: 'Entrepreneur starting a business',
    persona: 'First-time entrepreneur with innovative idea',
    goal: 'Build and launch a SaaS platform that reaches 1000 paying customers',
    expectedBehavior: {
      hesitationPoints: [
        'Understanding development complexity',
        'Marketing and customer acquisition strategies',
        'Resource and time estimation'
      ],
      likelyErrors: [
        'May underestimate development time',
        'Might not consider all business aspects'
      ],
      successCriteria: [
        'Gets comprehensive business development plan',
        'Understands MVP approach',
        'Sees customer acquisition strategy'
      ]
    },
    testingPriority: 'high',
    complexity: 'complex'
  },
  {
    id: 'retiree-personal-project',
    name: 'Retiree with personal project',
    persona: 'Recently retired person pursuing passion project',
    goal: 'Write and self-publish a memoir about my military service',
    expectedBehavior: {
      hesitationPoints: [
        'Understanding self-publishing process',
        'Timeline for writing and editing'
      ],
      likelyErrors: [
        'May underestimate editing requirements',
        'Might not understand publishing platforms'
      ],
      successCriteria: [
        'Gets structured writing plan',
        'Understands publishing process',
        'Sees realistic timeline'
      ]
    },
    testingPriority: 'low',
    complexity: 'medium'
  },
  {
    id: 'working-parent-balance',
    name: 'Working parent seeking work-life balance',
    persona: 'Busy parent juggling career and family',
    goal: 'Establish better work-life balance while advancing my career',
    expectedBehavior: {
      hesitationPoints: [
        'Balancing competing priorities',
        'Understanding time management strategies'
      ],
      likelyErrors: [
        'May set unrealistic expectations',
        'Might not account for family obligations'
      ],
      successCriteria: [
        'Gets practical balance strategies',
        'Understands priority management',
        'Sees sustainable approach'
      ]
    },
    testingPriority: 'medium',
    complexity: 'complex'
  },
  {
    id: 'creative-professional-portfolio',
    name: 'Creative professional building portfolio',
    persona: 'Designer/artist building professional presence',
    goal: 'Build a professional portfolio website and gain 10 new clients',
    expectedBehavior: {
      hesitationPoints: [
        'Understanding portfolio requirements',
        'Marketing and client acquisition'
      ],
      likelyErrors: [
        'May focus too much on technical aspects',
        'Might underestimate marketing effort'
      ],
      successCriteria: [
        'Gets balanced technical and marketing plan',
        'Understands client acquisition process',
        'Sees portfolio development strategy'
      ]
    },
    testingPriority: 'medium',
    complexity: 'medium'
  },
  {
    id: 'finance-professional-certification',
    name: 'Finance professional seeking certification',
    persona: 'Financial analyst pursuing advanced certification',
    goal: 'Pass the CFA Level II exam on first attempt within 8 months',
    expectedBehavior: {
      hesitationPoints: [
        'Understanding study requirements',
        'Balancing work and study schedule'
      ],
      likelyErrors: [
        'May underestimate study time required',
        'Might not plan for work conflicts'
      ],
      successCriteria: [
        'Gets structured study plan',
        'Understands time commitment',
        'Sees progress tracking strategy'
      ]
    },
    testingPriority: 'low',
    complexity: 'medium'
  },
  {
    id: 'non-profit-organizer',
    name: 'Non-profit organizer planning campaign',
    persona: 'Community organizer planning awareness campaign',
    goal: 'Organize a community awareness campaign that reaches 10,000 people and raises $50,000',
    expectedBehavior: {
      hesitationPoints: [
        'Understanding outreach strategies',
        'Fundraising approach and timeline'
      ],
      likelyErrors: [
        'May underestimate community engagement effort',
        'Might not consider all fundraising channels'
      ],
      successCriteria: [
        'Gets comprehensive campaign plan',
        'Understands community engagement strategies',
        'Sees fundraising milestone approach'
      ]
    },
    testingPriority: 'low',
    complexity: 'complex'
  }
];

export const USER_BEHAVIOR_PATTERNS = {
  hesitationTriggers: [
    'First time seeing API configuration',
    'Unfamiliar terminology (SMART goals, WBS, etc.)',
    'Large amounts of generated content',
    'Time estimates that seem too high/low',
    'Complex milestone dependencies'
  ],
  
  commonErrors: [
    'Invalid API key format',
    'Leaving goal field empty',
    'Not understanding SMART criteria',
    'Expecting instant results',
    'Confusion about milestone vs. task differences'
  ],
  
  successPatterns: [
    'Clear understanding of each phase',
    'Realistic goal setting',
    'Patient with AI processing time',
    'Reads generated content carefully',
    'Uses provided examples for guidance'
  ],
  
  dropOffPoints: [
    'API configuration too complex',
    'Goal transformation takes too long',
    'Generated content not relevant',
    'Too many steps in workflow',
    'Errors not clearly explained'
  ]
};

export const ACCESSIBILITY_SCENARIOS = [
  {
    id: 'keyboard-only-user',
    name: 'Keyboard-only navigation',
    description: 'User who relies entirely on keyboard navigation',
    requirements: [
      'All elements must be focusable',
      'Clear focus indicators',
      'Logical tab order',
      'Keyboard shortcuts where appropriate'
    ]
  },
  {
    id: 'screen-reader-user',
    name: 'Screen reader user',
    description: 'Visually impaired user using screen reader',
    requirements: [
      'Proper ARIA labels',
      'Semantic HTML structure',
      'Alt text for images',
      'Clear heading hierarchy'
    ]
  },
  {
    id: 'motor-impairment-user',
    name: 'User with motor impairments',
    description: 'User with limited fine motor control',
    requirements: [
      'Large click targets',
      'No hover-only interactions',
      'Adequate time for interactions',
      'Error prevention and correction'
    ]
  }
];

export const PERFORMANCE_SCENARIOS = [
  {
    id: 'slow-network',
    name: 'Slow network connection',
    description: '3G connection with high latency',
    conditions: {
      downloadSpeed: '1.6 Mbps',
      uploadSpeed: '750 Kbps',
      latency: '300ms'
    }
  },
  {
    id: 'mobile-device',
    name: 'Low-end mobile device',
    description: 'Older smartphone with limited processing power',
    conditions: {
      cpu: '4x slowdown',
      memory: '1GB',
      viewport: '375x667'
    }
  },
  {
    id: 'peak-usage',
    name: 'Peak usage times',
    description: 'High server load conditions',
    conditions: {
      apiResponseTime: '3-8 seconds',
      concurrentUsers: '100+',
      errorRate: '2-5%'
    }
  }
];

export function getScenarioByComplexity(complexity: 'simple' | 'medium' | 'complex'): UserScenario[] {
  return REALISTIC_USER_SCENARIOS.filter(scenario => scenario.complexity === complexity);
}

export function getHighPriorityScenarios(): UserScenario[] {
  return REALISTIC_USER_SCENARIOS.filter(scenario => scenario.testingPriority === 'high');
}

export function getScenarioById(id: string): UserScenario | undefined {
  return REALISTIC_USER_SCENARIOS.find(scenario => scenario.id === id);
}