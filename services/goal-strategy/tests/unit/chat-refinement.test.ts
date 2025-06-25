import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { SMARTGoalProcessor, ClarificationAnswer, SMARTCriteria } from '../../src/services/smart-goal-processor';
import { mockOpenAIResponse, mockGoalTranslationResult } from '../mocks/openai.mock';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('Chat-Based Goal Refinement and Clarification', () => {
  let processor: SMARTGoalProcessor;
  const validApiKey = 'sk-test-1234567890abcdef';

  beforeEach(() => {
    processor = new SMARTGoalProcessor();
    jest.clearAllMocks();
    
    // Default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockOpenAIResponse
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Clarification Processing', () => {
    const originalGoal = "I want to improve my business performance";
    const baseSMARTCriteria: SMARTCriteria = {
      specific: {
        value: "Improve business performance",
        confidence: 0.4,
        missing: ["specific metrics", "target areas"]
      },
      measurable: {
        value: "Better performance",
        metrics: [],
        confidence: 0.2,
        missing: ["quantifiable metrics", "measurement tools"]
      },
      achievable: {
        value: "Should be possible",
        confidence: 0.5,
        missing: ["resource assessment", "feasibility analysis"]
      },
      relevant: {
        value: "Important for business",
        confidence: 0.7,
        missing: []
      },
      timeBound: {
        value: "At some point",
        confidence: 0.3,
        missing: ["specific deadline", "timeline"]
      }
    };

    describe('Single Clarification Answers', () => {
      it('should process specific clarification to improve specificity', async () => {
        const clarifications: ClarificationAnswer[] = [
          {
            question: "What specific aspect of business performance do you want to improve?",
            answer: "I want to increase monthly revenue by 20%",
            smartCriterion: "specific"
          }
        ];

        const result = await processor.processClarifications(
          originalGoal,
          baseSMARTCriteria,
          clarifications,
          validApiKey
        );

        expect(result.smartCriteria.specific.confidence).toBeGreaterThan(baseSMARTCriteria.specific.confidence);
        expect(result.confidence).toBeGreaterThan(0.5);
        
        // Verify the clarification was included in the prompt
        const callArgs = mockFetch.mock.calls[0][1] as any;
        const body = JSON.parse(callArgs.body);
        const prompt = body.messages[1].content;
        
        expect(prompt).toContain("increase monthly revenue by 20%");
        expect(prompt).toContain("specific");
      });

      it('should process measurable clarification to add metrics', async () => {
        const clarifications: ClarificationAnswer[] = [
          {
            question: "How will you measure business performance?",
            answer: "Track monthly revenue, customer count, and profit margins using our CRM dashboard",
            smartCriterion: "measurable"
          }
        ];

        const result = await processor.processClarifications(
          originalGoal,
          baseSMARTCriteria,
          clarifications
        );

        expect(result.smartCriteria.measurable.confidence).toBeGreaterThan(baseSMARTCriteria.measurable.confidence);
        
        const prompt = (mockFetch.mock.calls[0][1] as any).body;
        const parsedBody = JSON.parse(prompt);
        expect(parsedBody.messages[1].content).toContain("monthly revenue");
        expect(parsedBody.messages[1].content).toContain("customer count");
        expect(parsedBody.messages[1].content).toContain("CRM dashboard");
      });

      it('should process achievable clarification to assess feasibility', async () => {
        const clarifications: ClarificationAnswer[] = [
          {
            question: "What resources do you have available for this goal?",
            answer: "I have a team of 5 sales people, $50k marketing budget, and 6 months timeline",
            smartCriterion: "achievable"
          }
        ];

        const result = await processor.processClarifications(
          originalGoal,
          baseSMARTCriteria,
          clarifications
        );

        expect(result.smartCriteria.achievable.confidence).toBeGreaterThan(baseSMARTCriteria.achievable.confidence);
      });

      it('should process time-bound clarification to set deadlines', async () => {
        const clarifications: ClarificationAnswer[] = [
          {
            question: "When do you want to achieve this goal?",
            answer: "By the end of Q4 2024, with monthly check-ins",
            smartCriterion: "timeBound"
          }
        ];

        const result = await processor.processClarifications(
          originalGoal,
          baseSMARTCriteria,
          clarifications
        );

        expect(result.smartCriteria.timeBound.confidence).toBeGreaterThan(baseSMARTCriteria.timeBound.confidence);
      });
    });

    describe('Multiple Clarification Answers', () => {
      it('should process multiple clarifications together', async () => {
        const clarifications: ClarificationAnswer[] = [
          {
            question: "What specific business metric do you want to improve?",
            answer: "Monthly recurring revenue (MRR)",
            smartCriterion: "specific"
          },
          {
            question: "By how much do you want to improve it?",
            answer: "Increase MRR from $10,000 to $15,000 per month",
            smartCriterion: "measurable"
          },
          {
            question: "When do you want to achieve this?",
            answer: "Within 6 months (by July 2024)",
            smartCriterion: "timeBound"
          }
        ];

        const result = await processor.processClarifications(
          originalGoal,
          baseSMARTCriteria,
          clarifications
        );

        // All clarified criteria should have improved confidence
        expect(result.smartCriteria.specific.confidence).toBeGreaterThan(baseSMARTCriteria.specific.confidence);
        expect(result.smartCriteria.measurable.confidence).toBeGreaterThan(baseSMARTCriteria.measurable.confidence);
        expect(result.smartCriteria.timeBound.confidence).toBeGreaterThan(baseSMARTCriteria.timeBound.confidence);
        
        // Overall confidence should significantly improve
        expect(result.confidence).toBeGreaterThan(0.7);
        
        // Missing criteria should be reduced
        expect(result.missingCriteria.length).toBeLessThan(3);
      });

      it('should handle clarifications for all SMART criteria', async () => {
        const comprehensiveClarifications: ClarificationAnswer[] = [
          {
            question: "What specific aspect of business performance?",
            answer: "Customer acquisition and retention rates",
            smartCriterion: "specific"
          },
          {
            question: "How will you measure success?",
            answer: "Track new customers per month, churn rate, and customer lifetime value",
            smartCriterion: "measurable"
          },
          {
            question: "Is this goal realistic with your current resources?",
            answer: "Yes, we have dedicated sales team and proven marketing channels",
            smartCriterion: "achievable"
          },
          {
            question: "Why is this important for your business?",
            answer: "Customer growth is critical for our Series A funding round",
            smartCriterion: "relevant"
          },
          {
            question: "What's your target timeline?",
            answer: "Achieve targets by end of Q3 2024 to prepare for funding",
            smartCriterion: "timeBound"
          }
        ];

        const result = await processor.processClarifications(
          originalGoal,
          baseSMARTCriteria,
          comprehensiveClarifications
        );

        // All criteria should show improvement
        Object.keys(result.smartCriteria).forEach(key => {
          const criterion = result.smartCriteria[key as keyof SMARTCriteria];
          const baseCriterion = baseSMARTCriteria[key as keyof SMARTCriteria];
          expect(criterion.confidence).toBeGreaterThan(baseCriterion.confidence);
        });

        // Overall confidence should be high
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });

    describe('Iterative Refinement', () => {
      it('should support multiple rounds of clarification', async () => {
        // First round of clarifications
        const firstRoundClarifications: ClarificationAnswer[] = [
          {
            question: "What business metric do you want to improve?",
            answer: "Sales revenue",
            smartCriterion: "specific"
          }
        ];

        const firstResult = await processor.processClarifications(
          originalGoal,
          baseSMARTCriteria,
          firstRoundClarifications
        );

        // Simulate second round with additional clarifications
        const secondRoundClarifications: ClarificationAnswer[] = [
          {
            question: "By how much do you want to increase sales revenue?",
            answer: "Increase by 25% compared to last quarter",
            smartCriterion: "measurable"
          },
          {
            question: "When do you want to achieve this increase?",
            answer: "By the end of next quarter (December 2024)",
            smartCriterion: "timeBound"
          }
        ];

        const secondResult = await processor.processClarifications(
          originalGoal,
          firstResult.smartCriteria,
          secondRoundClarifications
        );

        // Second round should show cumulative improvement
        expect(secondResult.confidence).toBeGreaterThan(firstResult.confidence);
        expect(secondResult.missingCriteria.length).toBeLessThan(firstResult.missingCriteria.length);
      });

      it('should maintain previous clarifications in subsequent rounds', async () => {
        const clarifications: ClarificationAnswer[] = [
          {
            question: "What specific business aspect?",
            answer: "Customer satisfaction scores",
            smartCriterion: "specific"
          }
        ];

        await processor.processClarifications(
          originalGoal,
          baseSMARTCriteria,
          clarifications
        );

        // Verify the prompt includes original SMART criteria
        const callArgs = mockFetch.mock.calls[0][1] as any;
        const body = JSON.parse(callArgs.body);
        const prompt = body.messages[1].content;
        
        expect(prompt).toContain("Current SMART Criteria");
        expect(prompt).toContain(JSON.stringify(baseSMARTCriteria, null, 2));
      });
    });

    describe('Clarification Question Generation', () => {
      it('should generate relevant follow-up questions', async () => {
        const partialClarifications: ClarificationAnswer[] = [
          {
            question: "What do you want to improve?",
            answer: "Website traffic",
            smartCriterion: "specific"
          }
        ];

        const result = await processor.processClarifications(
          originalGoal,
          baseSMARTCriteria,
          partialClarifications
        );

        // Should still have clarification questions for unclarified areas
        expect(result.clarificationQuestions.length).toBeGreaterThan(0);
        expect(result.clarificationQuestions.some(q => 
          q.toLowerCase().includes('measure') || 
          q.toLowerCase().includes('when') ||
          q.toLowerCase().includes('how much')
        )).toBe(true);
      });
    });

    describe('Edge Cases in Clarification', () => {
      it('should handle empty clarification answers', async () => {
        const emptyClarifications: ClarificationAnswer[] = [
          {
            question: "What specific aspect?",
            answer: "",
            smartCriterion: "specific"
          }
        ];

        const result = await processor.processClarifications(
          originalGoal,
          baseSMARTCriteria,
          emptyClarifications
        );

        // Should not improve confidence significantly with empty answers
        expect(result.smartCriteria.specific.confidence).toBeLessThanOrEqual(baseSMARTCriteria.specific.confidence + 0.1);
      });

      it('should handle vague clarification answers', async () => {
        const vagueClarifications: ClarificationAnswer[] = [
          {
            question: "How will you measure success?",
            answer: "Make it better",
            smartCriterion: "measurable"
          }
        ];

        const result = await processor.processClarifications(
          originalGoal,
          baseSMARTCriteria,
          vagueClarifications
        );

        // Vague answers should provide minimal improvement
        expect(result.smartCriteria.measurable.confidence).toBeLessThan(0.5);
      });

      it('should handle very detailed clarification answers', async () => {
        const detailedClarifications: ClarificationAnswer[] = [
          {
            question: "What specific metrics?",
            answer: "Increase monthly website unique visitors from current baseline of 50,000 to 75,000 (50% increase) by implementing SEO optimization, content marketing strategy, social media campaigns, and paid advertising. Track using Google Analytics, SEMrush, and internal dashboard with daily monitoring and weekly reporting to stakeholders.",
            smartCriterion: "specific"
          }
        ];

        const result = await processor.processClarifications(
          originalGoal,
          baseSMARTCriteria,
          detailedClarifications
        );

        // Detailed answers should significantly improve confidence
        expect(result.smartCriteria.specific.confidence).toBeGreaterThan(0.8);
      });

      it('should handle conflicting clarification answers', async () => {
        const conflictingClarifications: ClarificationAnswer[] = [
          {
            question: "When do you want to achieve this?",
            answer: "By next month",
            smartCriterion: "timeBound"
          },
          {
            question: "How long will this take?",
            answer: "It will take at least 6 months to see real results",
            smartCriterion: "achievable"
          }
        ];

        const result = await processor.processClarifications(
          originalGoal,
          baseSMARTCriteria,
          conflictingClarifications
        );

        // Should identify potential conflicts and suggest resolution
        expect(result.clarificationQuestions.some(q => 
          q.toLowerCase().includes('timeline') || 
          q.toLowerCase().includes('realistic') ||
          q.toLowerCase().includes('conflict')
        )).toBe(true);
      });
    });
  });

  describe('Real-time Chat Simulation', () => {
    it('should simulate a realistic chat conversation flow', async () => {
      // Simulate a complete chat session
      const conversationSteps = [
        {
          question: "I'd like to help you create a SMART goal. What would you like to achieve?",
          answer: "I want to grow my online business",
          expectedImprovement: "specific"
        },
        {
          question: "What specific aspect of your online business do you want to grow?",
          answer: "Increase monthly revenue",
          expectedImprovement: "specific"
        },
        {
          question: "By how much would you like to increase your monthly revenue?",
          answer: "From $5,000 to $8,000 per month",
          expectedImprovement: "measurable"
        },
        {
          question: "When would you like to achieve this revenue increase?",
          answer: "Within the next 4 months",
          expectedImprovement: "timeBound"
        },
        {
          question: "What resources do you have to achieve this goal?",
          answer: "I have a website, social media following of 10k, and can invest $1000/month in marketing",
          expectedImprovement: "achievable"
        }
      ];

      let currentCriteria = baseSMARTCriteria;
      let overallConfidence = 0.3;

      for (const step of conversationSteps) {
        const clarifications: ClarificationAnswer[] = [
          {
            question: step.question,
            answer: step.answer,
            smartCriterion: step.expectedImprovement as keyof SMARTCriteria
          }
        ];

        const result = await processor.processClarifications(
          originalGoal,
          currentCriteria,
          clarifications
        );

        // Each step should improve confidence
        expect(result.confidence).toBeGreaterThan(overallConfidence);
        
        // Update for next iteration
        currentCriteria = result.smartCriteria;
        overallConfidence = result.confidence;
      }

      // Final confidence should be high after complete conversation
      expect(overallConfidence).toBeGreaterThan(0.8);
    });
  });

  describe('Error Handling in Chat Refinement', () => {
    it('should handle API timeouts during clarification', async () => {
      mockFetch.mockRejectedValue(new Error('Request timeout'));

      const clarifications: ClarificationAnswer[] = [
        {
          question: "What specific goal?",
          answer: "Increase sales",
          smartCriterion: "specific"
        }
      ];

      await expect(processor.processClarifications(
        originalGoal,
        baseSMARTCriteria,
        clarifications
      )).rejects.toThrow('Request timeout');
    });

    it('should handle rate limiting during clarification', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ error: { message: "Rate limit exceeded" } })
      });

      const clarifications: ClarificationAnswer[] = [
        {
          question: "What goal?",
          answer: "Test goal",
          smartCriterion: "specific"
        }
      ];

      await expect(processor.processClarifications(
        originalGoal,
        baseSMARTCriteria,
        clarifications
      )).rejects.toThrow('OpenAI API call failed');
    });

    it('should handle malformed AI responses during clarification', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: 'This is not valid JSON'
            }
          }]
        })
      });

      const clarifications: ClarificationAnswer[] = [
        {
          question: "Test question",
          answer: "Test answer",
          smartCriterion: "specific"
        }
      ];

      await expect(processor.processClarifications(
        originalGoal,
        baseSMARTCriteria,
        clarifications
      )).rejects.toThrow('Failed to parse AI response');
    });
  });

  describe('Chat Context Preservation', () => {
    it('should include conversation history in prompts', async () => {
      const clarifications: ClarificationAnswer[] = [
        {
          question: "Previous question about specifics",
          answer: "Detailed answer about goals",
          smartCriterion: "specific"
        },
        {
          question: "Follow-up about metrics",
          answer: "How to measure success",
          smartCriterion: "measurable"
        }
      ];

      await processor.processClarifications(
        originalGoal,
        baseSMARTCriteria,
        clarifications
      );

      const callArgs = mockFetch.mock.calls[0][1] as any;
      const body = JSON.parse(callArgs.body);
      const prompt = body.messages[1].content;

      // Should include all clarification questions and answers
      clarifications.forEach(clarification => {
        expect(prompt).toContain(clarification.question);
        expect(prompt).toContain(clarification.answer);
        expect(prompt).toContain(clarification.smartCriterion);
      });
    });

    it('should maintain context across clarification rounds', async () => {
      const multiRoundClarifications: ClarificationAnswer[] = [
        {
          question: "What business area?",
          answer: "Customer service",
          smartCriterion: "specific"
        },
        {
          question: "What customer service metric?",
          answer: "Response time to customer inquiries",
          smartCriterion: "specific"
        },
        {
          question: "Current response time?",
          answer: "Currently 24 hours, want to reduce to 4 hours",
          smartCriterion: "measurable"
        }
      ];

      await processor.processClarifications(
        originalGoal,
        baseSMARTCriteria,
        multiRoundClarifications
      );

      const callArgs = mockFetch.mock.calls[0][1] as any;
      const body = JSON.parse(callArgs.body);
      const prompt = body.messages[1].content;

      // Should show conversation progression
      expect(prompt).toContain("customer service");
      expect(prompt).toContain("response time");
      expect(prompt).toContain("24 hours");
      expect(prompt).toContain("4 hours");
    });
  });
});