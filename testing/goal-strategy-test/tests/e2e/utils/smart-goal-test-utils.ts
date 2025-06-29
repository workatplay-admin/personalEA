/**
 * Test utilities for SMART goal clarification flow testing
 */

export interface SMARTConfidences {
  specific: number
  measurable: number
  achievable: number
  relevant: number
  timeBound: number
}

export interface ClarificationTestScenario {
  name: string
  description: string
  initialGoal: string
  initialConfidences: SMARTConfidences
  expectedOrder: string[]
  expectedSkipped: string[]
  userResponses: Record<string, string[]> // Multiple responses per component
}

/**
 * Calculate which component should be addressed next based on confidence scores
 * Following the prioritization rules:
 * 1. Focus on aspects below 90%
 * 2. Prioritize lowest scores
 * 3. Skip aspects above 90%
 */
export function getNextComponent(confidences: SMARTConfidences): string | null {
  const components = Object.entries(confidences)
    .filter(([_, confidence]) => confidence < 90) // Only consider below 90%
    .sort((a, b) => a[1] - b[1]) // Sort by confidence (lowest first)
  
  return components.length > 0 ? components[0][0] : null
}

/**
 * Determine if a component needs further clarification
 */
export function needsFurtherClarification(component: string, confidence: number): boolean {
  return confidence < 90
}

/**
 * Generate expected clarification sequence based on confidence scores
 */
export function generateExpectedSequence(confidences: SMARTConfidences): string[] {
  const sequence: string[] = []
  const workingConfidences = { ...confidences }
  
  while (true) {
    const nextComponent = getNextComponent(workingConfidences)
    if (!nextComponent) break
    
    sequence.push(nextComponent)
    // Simulate confidence increase after clarification
    workingConfidences[nextComponent as keyof SMARTConfidences] = 91
  }
  
  return sequence
}

/**
 * Test scenarios for comprehensive validation
 */
export const TEST_SCENARIOS: ClarificationTestScenario[] = [
  {
    name: 'Lowest First Priority',
    description: 'Should address components in order of lowest confidence',
    initialGoal: 'Improve my health',
    initialConfidences: {
      specific: 60,
      measurable: 30,  // Lowest - should be first
      achievable: 80,
      relevant: 45,    // Second lowest
      timeBound: 70
    },
    expectedOrder: ['measurable', 'relevant', 'specific', 'timeBound', 'achievable'],
    expectedSkipped: [],
    userResponses: {
      measurable: [
        'Lose some weight',
        'Lose 20 pounds and reduce body fat by 5%'
      ],
      relevant: [
        'To feel better',
        'To reduce health risks and increase energy for playing with my kids'
      ],
      specific: [
        'Exercise more and eat better'
      ],
      timeBound: [
        'By the end of the year'
      ],
      achievable: [
        'Yes, I have time and a gym membership'
      ]
    }
  },
  {
    name: 'Skip High Confidence',
    description: 'Should skip components already above 90%',
    initialGoal: 'Run a marathon in 4 hours by December 2025',
    initialConfidences: {
      specific: 92,     // Skip
      measurable: 95,   // Skip
      achievable: 45,   // Address first (lowest)
      relevant: 88,     // Address second
      timeBound: 93     // Skip
    },
    expectedOrder: ['achievable', 'relevant'],
    expectedSkipped: ['specific', 'measurable', 'timeBound'],
    userResponses: {
      achievable: [
        'I currently run 10K races',
        'I run 30 miles per week and have completed 3 half-marathons'
      ],
      relevant: [
        'Personal achievement and raising money for charity'
      ]
    }
  },
  {
    name: 'Persistent Low Confidence',
    description: 'Should keep clarifying same component until 90%',
    initialGoal: 'Start a business',
    initialConfidences: {
      specific: 25,     // Very low - needs multiple clarifications
      measurable: 85,
      achievable: 70,
      relevant: 88,
      timeBound: 40
    },
    expectedOrder: ['specific', 'timeBound', 'achievable', 'measurable', 'relevant'],
    expectedSkipped: [],
    userResponses: {
      specific: [
        'Some kind of tech business',
        'A mobile app',
        'A productivity app for remote teams',
        'A project management app with AI-powered task prioritization for remote software teams'
      ],
      timeBound: [
        'Soon',
        'Within 6 months for MVP, full launch in 12 months'
      ],
      achievable: [
        'I have the skills and some savings'
      ],
      measurable: [
        '1000 users and $10K MRR within first year'
      ],
      relevant: [
        'I see a gap in the market and have experience with the problem'
      ]
    }
  },
  {
    name: 'All Below Threshold',
    description: 'Should prioritize when all aspects need work',
    initialGoal: 'Be successful',
    initialConfidences: {
      specific: 15,
      measurable: 10,   // Lowest
      achievable: 20,
      relevant: 18,
      timeBound: 12
    },
    expectedOrder: ['measurable', 'timeBound', 'specific', 'relevant', 'achievable'],
    expectedSkipped: [],
    userResponses: {
      measurable: [
        'Make money',
        'Earn $100K annually',
        'Increase income to $100K through salary and side projects'
      ],
      timeBound: [
        'Eventually',
        'In 2 years',
        'By December 2026'
      ],
      specific: [
        'Career growth',
        'Become a senior developer',
        'Become a senior full-stack developer at a tech company'
      ],
      relevant: [
        'Financial security',
        'Support my family and save for retirement'
      ],
      achievable: [
        'Yes with hard work',
        'I have 3 years experience and am learning new technologies'
      ]
    }
  },
  {
    name: 'All Above Threshold',
    description: 'Should complete immediately when all aspects are clear',
    initialGoal: 'Complete AWS certification exam SAA-C03 by March 15, 2025',
    initialConfidences: {
      specific: 95,
      measurable: 92,
      achievable: 91,
      relevant: 94,
      timeBound: 98
    },
    expectedOrder: [],
    expectedSkipped: ['specific', 'measurable', 'achievable', 'relevant', 'timeBound'],
    userResponses: {}
  }
]

/**
 * Mock API response generator for testing
 */
export function generateMockClarifyResponse(
  component: string,
  userAnswer: string,
  currentConfidence: number
): any {
  // Simulate confidence increase based on answer quality
  const answerQuality = calculateAnswerQuality(userAnswer)
  const newConfidence = Math.min(100, currentConfidence + answerQuality * 30)
  
  return {
    success: true,
    data: {
      criteria: {
        [component]: {
          value: userAnswer,
          confidence: newConfidence
        }
      },
      needsFollowUp: newConfidence < 90,
      feedback: generateFeedback(component, answerQuality, newConfidence),
      confidence: newConfidence
    }
  }
}

/**
 * Calculate answer quality (0-1) based on heuristics
 */
function calculateAnswerQuality(answer: string): number {
  const length = answer.length
  const hasNumbers = /\d/.test(answer)
  const hasSpecificWords = /specific|exactly|precisely|measure|goal|target|deadline|date/.test(answer.toLowerCase())
  
  let quality = 0.3 // Base quality
  
  if (length > 50) quality += 0.2
  if (length > 100) quality += 0.1
  if (hasNumbers) quality += 0.2
  if (hasSpecificWords) quality += 0.2
  
  return Math.min(1, quality)
}

/**
 * Generate contextual feedback based on improvement
 */
function generateFeedback(component: string, quality: number, newConfidence: number): string {
  if (quality < 0.5) {
    return `That's a start, but let's make your ${component} aspect more specific. Can you add more detail?`
  } else if (quality < 0.8) {
    return `Good progress! Your ${component} aspect is getting clearer. ${newConfidence < 90 ? 'Let\'s refine it a bit more.' : ''}`
  } else {
    return `Excellent! Your ${component} aspect is now well-defined.`
  }
}

/**
 * Validate that a clarification sequence follows prioritization rules
 */
export function validateClarificationSequence(
  actualSequence: string[],
  initialConfidences: SMARTConfidences
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const workingConfidences = { ...initialConfidences }
  
  for (let i = 0; i < actualSequence.length; i++) {
    const component = actualSequence[i]
    const expectedNext = getNextComponent(workingConfidences)
    
    if (component !== expectedNext) {
      errors.push(
        `Step ${i + 1}: Expected '${expectedNext}' (confidence: ${expectedNext ? workingConfidences[expectedNext as keyof SMARTConfidences] : 'N/A'}), ` +
        `but got '${component}' (confidence: ${workingConfidences[component as keyof SMARTConfidences]})`
      )
    }
    
    // Mark as completed (above 90%)
    workingConfidences[component as keyof SMARTConfidences] = 91
  }
  
  // Check if any components below 90% were missed
  const remaining = Object.entries(workingConfidences)
    .filter(([_, confidence]) => confidence < 90)
    .map(([component]) => component)
  
  if (remaining.length > 0) {
    errors.push(`Components not addressed but below 90%: ${remaining.join(', ')}`)
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}