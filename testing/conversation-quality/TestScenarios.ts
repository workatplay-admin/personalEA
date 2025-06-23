/**
 * Test Scenarios and Personas for PersonalEA Phase 2 Testing
 * Comprehensive collection of user types and testing scenarios
 */

import { TestScenario, UserProfile } from './ConversationQualityMetrics.js';

/**
 * User Personas for Testing
 */
export const testPersonas: { [key: string]: UserProfile } = {
  
  // Collaborative users - work well with AI
  eagerEntrepreneur: {
    responsePatterns: ['collaborative', 'detailed', 'ambitious', 'business-focused'],
    domain: 'business',
    experience: 'intermediate',
    preferences: {
      communicationStyle: 'conversational',
      detailLevel: 'comprehensive'
    }
  },

  enthusiasticLearner: {
    responsePatterns: ['collaborative', 'curious', 'specific'],
    domain: 'personal',
    experience: 'beginner',
    preferences: {
      communicationStyle: 'conversational',
      detailLevel: 'moderate'
    }
  },

  // Resistant users - challenging but realistic
  skepticalManager: {
    responsePatterns: ['resistant', 'questioning', 'time-conscious'],
    domain: 'business',
    experience: 'advanced',
    preferences: {
      communicationStyle: 'direct',
      detailLevel: 'minimal'
    }
  },

  overwhelmedParent: {
    responsePatterns: ['resistant', 'vague', 'distracted', 'time-pressed'],
    domain: 'personal',
    experience: 'beginner',
    preferences: {
      communicationStyle: 'direct',
      detailLevel: 'minimal'
    }
  },

  // Neutral users - average cases
  pragmaticDeveloper: {
    responsePatterns: ['analytical', 'logical', 'precise'],
    domain: 'professional',
    experience: 'advanced',
    preferences: {
      communicationStyle: 'structured',
      detailLevel: 'moderate'
    }
  },

  casualUser: {
    responsePatterns: ['neutral', 'moderate-detail'],
    domain: 'personal',
    experience: 'intermediate',
    preferences: {
      communicationStyle: 'conversational',
      detailLevel: 'moderate'
    }
  },

  // Edge cases
  overThinkingAcademic: {
    responsePatterns: ['detailed', 'analytical', 'perfectionist', 'verbose'],
    domain: 'academic',
    experience: 'advanced',
    preferences: {
      communicationStyle: 'structured',
      detailLevel: 'comprehensive'
    }
  },

  impulsiveTeen: {
    responsePatterns: ['vague', 'impatient', 'changing-mind'],
    domain: 'personal',
    experience: 'beginner',
    preferences: {
      communicationStyle: 'conversational',
      detailLevel: 'minimal'
    }
  }
};

/**
 * Test Scenarios for Different Goal Types and User Combinations
 */
export const testScenarios: TestScenario[] = [
  
  // Business Goals
  {
    id: 'biz-001',
    name: 'Eager Entrepreneur - Launch Business',
    description: 'Collaborative user with business goal, should have high success rate',
    initialGoal: 'I want to start my own business',
    userPersona: testPersonas.eagerEntrepreneur,
    expectedBehavior: ['provides detailed responses', 'asks clarifying questions', 'collaborates actively'],
    minimumQualityThresholds: {
      goalImprovement: 0.8,
      conversationNaturalness: 0.7,
      userSatisfactionPrediction: 0.8,
      smartCriteriaFulfillment: 0.7
    },
    maxRounds: 6,
    timeoutMinutes: 10,
    mockUserResponses: [
      "I'm thinking about an online consulting business helping small businesses with digital marketing",
      "I have about 10 years of marketing experience and good industry connections", 
      "Yes, I can definitely commit 20-30 hours per week initially while keeping my day job",
      "This aligns perfectly with my long-term goal of financial independence",
      "I'd like to launch within 6 months and reach $5000 monthly revenue by the end of year one"
    ]
  },

  {
    id: 'biz-002', 
    name: 'Skeptical Manager - Team Goal',
    description: 'Resistant user with business goal, tests system resilience',
    initialGoal: 'My team needs to be more productive',
    userPersona: testPersonas.skepticalManager,
    expectedBehavior: ['questions necessity', 'provides minimal detail initially', 'resistance to specifics'],
    minimumQualityThresholds: {
      goalImprovement: 0.6,
      conversationNaturalness: 0.6,
      userSatisfactionPrediction: 0.5,
      smartCriteriaFulfillment: 0.6
    },
    maxRounds: 5,
    timeoutMinutes: 8
  },

  // Personal Goals
  {
    id: 'personal-001',
    name: 'Enthusiastic Learner - Language Goal', 
    description: 'Collaborative beginner with learning goal',
    initialGoal: 'I want to learn Spanish',
    userPersona: testPersonas.enthusiasticLearner,
    expectedBehavior: ['eager to provide details', 'asks for guidance', 'positive engagement'],
    minimumQualityThresholds: {
      goalImprovement: 0.8,
      conversationNaturalness: 0.8,
      userSatisfactionPrediction: 0.8,
      smartCriteriaFulfillment: 0.7
    },
    maxRounds: 5,
    timeoutMinutes: 8,
    mockUserResponses: [
      "I want to have conversations with native speakers when I travel to Spain next year",
      "I can study about 30 minutes on weekdays and an hour on weekends",
      "Yes, I'm willing to take a class and use language apps - I have a budget of around $200",
      "This is important because I want to connect with my Spanish-speaking colleagues better",
      "I want to be conversational within 12 months before my trip to Madrid"
    ]
  },

  {
    id: 'personal-002',
    name: 'Overwhelmed Parent - Health Goal',
    description: 'Resistant user with health goal, common real-world scenario',
    initialGoal: 'I need to get healthy',
    userPersona: testPersonas.overwhelmedParent,
    expectedBehavior: ['vague responses', 'mentions time constraints', 'needs encouragement'],
    minimumQualityThresholds: {
      goalImprovement: 0.5,
      conversationNaturalness: 0.6,
      userSatisfactionPrediction: 0.5,
      smartCriteriaFulfillment: 0.5
    },
    maxRounds: 4,
    timeoutMinutes: 6
  },

  // Professional Goals
  {
    id: 'prof-001',
    name: 'Pragmatic Developer - Skill Goal',
    description: 'Analytical user with professional development goal',
    initialGoal: 'I want to learn cloud architecture',
    userPersona: testPersonas.pragmaticDeveloper,
    expectedBehavior: ['logical responses', 'asks for specifics', 'systematic approach'],
    minimumQualityThresholds: {
      goalImprovement: 0.8,
      conversationNaturalness: 0.7,
      userSatisfactionPrediction: 0.7,
      smartCriteriaFulfillment: 0.8
    },
    maxRounds: 5,
    timeoutMinutes: 10,
    mockUserResponses: [
      "I want to design and implement scalable cloud solutions using AWS",
      "I can quantify this by obtaining AWS Solutions Architect certification and completing 3 real projects",
      "I have 5 years of development experience and my company will pay for training",
      "This directly supports my career progression to senior architect role",
      "I want certification within 6 months and practical experience within 12 months"
    ]
  },

  // Edge Cases
  {
    id: 'edge-001',
    name: 'Over-Thinking Academic - Research Goal',
    description: 'Verbose, perfectionist user who provides too much detail',
    initialGoal: 'I want to research the intersection of machine learning and behavioral psychology',
    userPersona: testPersonas.overThinkingAcademic,
    expectedBehavior: ['extremely detailed responses', 'multiple considerations', 'perfectionist tendencies'],
    minimumQualityThresholds: {
      goalImprovement: 0.7,
      conversationNaturalness: 0.6,
      userSatisfactionPrediction: 0.6,
      smartCriteriaFulfillment: 0.8
    },
    maxRounds: 8,
    timeoutMinutes: 15
  },

  {
    id: 'edge-002',
    name: 'Impulsive Teen - Creative Goal',
    description: 'Vague, impatient user who changes mind frequently',
    initialGoal: 'I want to be creative',
    userPersona: testPersonas.impulsiveTeen,
    expectedBehavior: ['very vague responses', 'changes direction', 'impatient with process'],
    minimumQualityThresholds: {
      goalImprovement: 0.4,
      conversationNaturalness: 0.5,
      userSatisfactionPrediction: 0.4,
      smartCriteriaFulfillment: 0.4
    },
    maxRounds: 3,
    timeoutMinutes: 5
  },

  // Baseline scenarios for system validation
  {
    id: 'baseline-001',
    name: 'Casual User - Fitness Goal',
    description: 'Average user with common fitness goal - baseline measurement',
    initialGoal: 'I want to get in shape',
    userPersona: testPersonas.casualUser,
    expectedBehavior: ['moderate detail', 'reasonable cooperation', 'typical responses'],
    minimumQualityThresholds: {
      goalImprovement: 0.7,
      conversationNaturalness: 0.7,
      userSatisfactionPrediction: 0.7,
      smartCriteriaFulfillment: 0.6
    },
    maxRounds: 5,
    timeoutMinutes: 8
  },

  {
    id: 'baseline-002',
    name: 'Casual User - Financial Goal',
    description: 'Average user with financial goal - baseline measurement',
    initialGoal: 'I want to save money',
    userPersona: testPersonas.casualUser,
    expectedBehavior: ['moderate detail', 'reasonable cooperation', 'typical responses'],
    minimumQualityThresholds: {
      goalImprovement: 0.7,
      conversationNaturalness: 0.7,
      userSatisfactionPrediction: 0.7,
      smartCriteriaFulfillment: 0.6
    },
    maxRounds: 5,
    timeoutMinutes: 8
  }
];

/**
 * Quick test scenarios for development/debugging
 */
export const quickTestScenarios: TestScenario[] = [
  {
    id: 'quick-001',
    name: 'Quick Collaborative Test',
    description: 'Fast test with collaborative user',
    initialGoal: 'I want to learn guitar',
    userPersona: testPersonas.enthusiasticLearner,
    expectedBehavior: ['quick positive responses'],
    minimumQualityThresholds: {
      goalImprovement: 0.7,
      conversationNaturalness: 0.7,
      userSatisfactionPrediction: 0.7,
      smartCriteriaFulfillment: 0.6
    },
    maxRounds: 3,
    timeoutMinutes: 5,
    mockUserResponses: [
      "I want to play acoustic songs around a campfire",
      "I can practice 30 minutes daily",
      "I have 6 months to learn the basics"
    ]
  },

  {
    id: 'quick-002', 
    name: 'Quick Resistant Test',
    description: 'Fast test with resistant user',
    initialGoal: 'I need to exercise more',
    userPersona: testPersonas.overwhelmedParent,
    expectedBehavior: ['brief, resistant responses'],
    minimumQualityThresholds: {
      goalImprovement: 0.4,
      conversationNaturalness: 0.5,
      userSatisfactionPrediction: 0.4,
      smartCriteriaFulfillment: 0.4
    },
    maxRounds: 3,
    timeoutMinutes: 5,
    mockUserResponses: [
      "I don't know, just healthier I guess",
      "I'm too busy, maybe 10 minutes?",
      "I suppose in a few months"
    ]
  }
];

/**
 * Test suite configurations
 */
export const testSuiteConfigs = {
  full: {
    name: 'Full PersonalEA Test Suite',
    scenarios: testScenarios,
    description: 'Complete testing of all personas and scenarios'
  },
  
  quick: {
    name: 'Quick Development Test',
    scenarios: quickTestScenarios,
    description: 'Fast tests for development and debugging'
  },
  
  collaborative: {
    name: 'Collaborative Users Only',
    scenarios: testScenarios.filter(s => 
      s.userPersona.responsePatterns.includes('collaborative')
    ),
    description: 'Test scenarios with cooperative users'
  },
  
  resistant: {
    name: 'Resistant Users Only', 
    scenarios: testScenarios.filter(s =>
      s.userPersona.responsePatterns.includes('resistant')
    ),
    description: 'Test scenarios with challenging users'
  },
  
  baseline: {
    name: 'Baseline Measurements',
    scenarios: testScenarios.filter(s => s.id.startsWith('baseline')),
    description: 'Standard scenarios for system benchmarking'
  }
};