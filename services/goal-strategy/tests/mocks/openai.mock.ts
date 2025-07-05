import { jest } from '@jest/globals';
import type { GoalTranslationResult, SMARTCriteria } from '../../src/services/smart-goal-processor';

export const mockOpenAIResponse = {
  choices: [{
    message: {
      content: JSON.stringify({
        smartGoal: "Increase monthly website traffic by 25% through SEO optimization and content marketing by December 31, 2024",
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
        missingCriteria: ["baseline traffic numbers"],
        clarificationQuestions: [
          "What is your current monthly website traffic baseline?",
          "What specific SEO tools and budget do you have available?"
        ],
        confidence: 0.87
      })
    }
  }]
};

export const mockLowConfidenceResponse = {
  choices: [{
    message: {
      content: JSON.stringify({
        smartGoal: "Be successful in business",
        smartCriteria: {
          specific: {
            value: "Be successful in business",
            confidence: 0.2,
            missing: ["specific business type", "success metrics", "target market"]
          },
          measurable: {
            value: "Success is not quantified",
            metrics: [],
            confidence: 0.1,
            missing: ["quantifiable metrics", "measurement methods"]
          },
          achievable: {
            value: "Cannot assess without more details",
            confidence: 0.3,
            missing: ["resources", "timeline", "current situation"]
          },
          relevant: {
            value: "Business success is generally relevant",
            confidence: 0.6,
            missing: ["personal goals alignment", "market context"]
          },
          timeBound: {
            value: "No timeline specified",
            confidence: 0.1,
            missing: ["deadline", "milestones", "timeline"]
          }
        },
        missingCriteria: ["specific", "measurable", "achievable", "timeBound"],
        clarificationQuestions: [
          "What type of business are you referring to?",
          "How do you define success for your business?",
          "What is your target timeline for achieving this success?",
          "What resources do you currently have available?",
          "What specific metrics would indicate success to you?"
        ],
        confidence: 0.24
      })
    }
  }]
};

export const mockAnalysisResponse = {
  choices: [{
    message: {
      content: JSON.stringify({
        completenessScore: 0.85,
        strengths: [
          "Clear and specific target (25% traffic increase)",
          "Well-defined timeline (December 31, 2024)",
          "Measurable metrics identified",
          "Realistic and achievable goal"
        ],
        weaknesses: [
          "Missing baseline traffic numbers",
          "Could specify budget constraints",
          "SEO strategy could be more detailed"
        ],
        recommendations: [
          "Establish current traffic baseline before starting",
          "Define specific SEO tools and budget allocation",
          "Create monthly milestones to track progress",
          "Consider potential seasonal traffic variations"
        ]
      })
    }
  }]
};

export const mockErrorResponse = {
  ok: false,
  status: 429,
  text: async () => JSON.stringify({
    error: {
      message: "Rate limit exceeded",
      type: "rate_limit_error",
      param: null,
      code: "rate_limit_exceeded"
    }
  })
};

export const mockInvalidAPIKeyResponse = {
  ok: false,
  status: 401,
  text: async () => JSON.stringify({
    error: {
      message: "Invalid API key provided",
      type: "invalid_request_error",
      param: null,
      code: "invalid_api_key"
    }
  })
};

export const createMockOpenAIFetch = (response = mockOpenAIResponse, shouldSucceed = true) => {
  return jest.fn().mockResolvedValue({
    ok: shouldSucceed,
    status: shouldSucceed ? 200 : 400,
    json: async () => response,
    text: async () => JSON.stringify(response)
  });
};

export const mockSMARTCriteria: SMARTCriteria = {
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
};

export const mockGoalTranslationResult: GoalTranslationResult = {
  smartGoal: "Increase monthly website traffic by 25% through SEO optimization and content marketing by December 31, 2024",
  smartCriteria: mockSMARTCriteria,
  missingCriteria: ["baseline traffic numbers"],
  clarificationQuestions: [
    "What is your current monthly website traffic baseline?",
    "What specific SEO tools and budget do you have available?"
  ],
  confidence: 0.87
};

export function createMockOpenAIResponse(data: Partial<{
  smartGoal: string;
  confidence: number;
  smartCriteria: Partial<SMARTCriteria>;
  clarificationQuestions: string[];
  missingCriteria: string[];
}>) {
  const defaultCriteria: SMARTCriteria = {
    specific: { value: "Test", confidence: 0.5, missing: [] },
    measurable: { value: "Test", metrics: [], confidence: 0.5, missing: [] },
    achievable: { value: "Test", confidence: 0.5, missing: [] },
    relevant: { value: "Test", confidence: 0.5, missing: [] },
    timeBound: { value: "Test", confidence: 0.5, missing: [] }
  };

  return {
    smartGoal: data.smartGoal || "Test goal",
    confidence: data.confidence || 0.5,
    smartCriteria: {
      ...defaultCriteria,
      ...data.smartCriteria
    },
    clarificationQuestions: data.clarificationQuestions || [],
    missingCriteria: data.missingCriteria || []
  };
}