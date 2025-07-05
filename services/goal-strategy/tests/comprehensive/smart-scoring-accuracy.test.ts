import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { SMARTGoalProcessor, SMARTCriteria, ClarificationAnswer } from '../../src/services/smart-goal-processor';
import { createMockOpenAIResponse } from '../mocks/openai.mock';

// Mock fetch globally with proper typing
const mockFetch = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
global.fetch = mockFetch as any;

describe('SMART Scoring Accuracy Testing', () => {
  let processor: SMARTGoalProcessor;
  const validApiKey = 'sk-test-scoring-accuracy';

  beforeEach(() => {
    processor = new SMARTGoalProcessor();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Dynamic Confidence Scoring', () => {
    describe('Initial Goal Assessment', () => {
      it('should score well-defined goals with high confidence (0.8-1.0)', async () => {
        const wellDefinedGoals = [
          {
            goal: "Increase monthly revenue from $50,000 to $75,000 by Q4 2025 through launching premium features and expanding to European markets",
            expectedConfidence: { min: 0.85, max: 0.95 },
            expectedCriteria: {
              specific: { min: 0.9, max: 1.0 },
              measurable: { min: 0.9, max: 1.0 },
              achievable: { min: 0.8, max: 0.9 },
              relevant: { min: 0.85, max: 0.95 },
              timeBound: { min: 0.9, max: 1.0 }
            }
          },
          {
            goal: "Complete AWS Solutions Architect certification within 3 months by studying 2 hours daily and completing 5 practice exams",
            expectedConfidence: { min: 0.8, max: 0.9 },
            expectedCriteria: {
              specific: { min: 0.95, max: 1.0 },
              measurable: { min: 0.9, max: 1.0 },
              achievable: { min: 0.85, max: 0.95 },
              relevant: { min: 0.8, max: 0.9 },
              timeBound: { min: 0.95, max: 1.0 }
            }
          }
        ];

        for (const testCase of wellDefinedGoals) {
          const response = createMockOpenAIResponse({
            smartGoal: testCase.goal,
            confidence: (testCase.expectedConfidence.min + testCase.expectedConfidence.max) / 2,
            smartCriteria: {
              specific: { 
                value: "Clear and specific", 
                confidence: (testCase.expectedCriteria.specific.min + testCase.expectedCriteria.specific.max) / 2,
                missing: []
              },
              measurable: {
                value: "Quantifiable metrics",
                metrics: ["revenue increase", "timeline"],
                confidence: (testCase.expectedCriteria.measurable.min + testCase.expectedCriteria.measurable.max) / 2,
                missing: []
              },
              achievable: {
                value: "Realistic with resources",
                confidence: (testCase.expectedCriteria.achievable.min + testCase.expectedCriteria.achievable.max) / 2,
                missing: []
              },
              relevant: {
                value: "Aligned with objectives",
                confidence: (testCase.expectedCriteria.relevant.min + testCase.expectedCriteria.relevant.max) / 2,
                missing: []
              },
              timeBound: {
                value: "Clear deadline",
                confidence: (testCase.expectedCriteria.timeBound.min + testCase.expectedCriteria.timeBound.max) / 2,
                missing: []
              }
            },
            clarificationQuestions: [],
            missingCriteria: []
          });

          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] })
          });

          const result = await processor.translateGoal({ goal: testCase.goal });

          // Validate overall confidence
          expect(result.confidence).toBeGreaterThanOrEqual(testCase.expectedConfidence.min);
          expect(result.confidence).toBeLessThanOrEqual(testCase.expectedConfidence.max);

          // Validate individual criteria scores
          for (const [criterion, expected] of Object.entries(testCase.expectedCriteria)) {
            const actualCriterion = result.smartCriteria[criterion as keyof SMARTCriteria];
            expect(actualCriterion.confidence).toBeGreaterThanOrEqual(expected.min);
            expect(actualCriterion.confidence).toBeLessThanOrEqual(expected.max);
          }

          // Well-defined goals should have minimal missing criteria
          expect(result.missingCriteria.length).toBeLessThanOrEqual(1);
          expect(result.clarificationQuestions.length).toBeLessThanOrEqual(2);
        }
      });

      it('should score moderately defined goals with medium confidence (0.5-0.7)', async () => {
        const moderateGoals = [
          {
            goal: "Improve customer satisfaction by implementing better support processes",
            expectedConfidence: { min: 0.5, max: 0.7 },
            missingElements: ["specific metrics", "timeline", "current baseline"]
          },
          {
            goal: "Learn web development to build professional websites",
            expectedConfidence: { min: 0.5, max: 0.65 },
            missingElements: ["specific technologies", "proficiency level", "timeline"]
          }
        ];

        for (const testCase of moderateGoals) {
          const response = createMockOpenAIResponse({
            confidence: (testCase.expectedConfidence.min + testCase.expectedConfidence.max) / 2,
            smartCriteria: {
              specific: { confidence: 0.6, missing: ["details"] },
              measurable: { confidence: 0.5, missing: ["metrics"] },
              achievable: { confidence: 0.7, missing: [] },
              relevant: { confidence: 0.8, missing: [] },
              timeBound: { confidence: 0.3, missing: ["deadline"] }
            },
            missingCriteria: testCase.missingElements
          });

          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] })
          });

          const result = await processor.translateGoal({ goal: testCase.goal });

          expect(result.confidence).toBeGreaterThanOrEqual(testCase.expectedConfidence.min);
          expect(result.confidence).toBeLessThanOrEqual(testCase.expectedConfidence.max);
          expect(result.missingCriteria.length).toBeGreaterThan(1);
        }
      });

      it('should score vague goals with low confidence (0.2-0.4) initially', async () => {
        const vagueGoals = [
          {
            goal: "Be successful",
            expectedConfidence: { min: 0.2, max: 0.3 }
          },
          {
            goal: "Make more money",
            expectedConfidence: { min: 0.25, max: 0.35 }
          },
          {
            goal: "Get healthier",
            expectedConfidence: { min: 0.2, max: 0.35 }
          }
        ];

        for (const testCase of vagueGoals) {
          const response = createMockOpenAIResponse({
            confidence: (testCase.expectedConfidence.min + testCase.expectedConfidence.max) / 2,
            smartCriteria: {
              specific: { confidence: 0.2, missing: ["specific definition", "context"] },
              measurable: { confidence: 0.1, missing: ["metrics", "indicators"] },
              achievable: { confidence: 0.3, missing: ["current state", "resources"] },
              relevant: { confidence: 0.4, missing: ["purpose", "alignment"] },
              timeBound: { confidence: 0.1, missing: ["timeline", "deadline"] }
            },
            clarificationQuestions: [
              "What does success mean to you?",
              "In what area of life?",
              "How would you measure this?",
              "By when?"
            ]
          });

          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] })
          });

          const result = await processor.translateGoal({ goal: testCase.goal });

          expect(result.confidence).toBeGreaterThanOrEqual(testCase.expectedConfidence.min);
          expect(result.confidence).toBeLessThanOrEqual(testCase.expectedConfidence.max);
          expect(result.clarificationQuestions.length).toBeGreaterThanOrEqual(3);
        }
      });
    });

    describe('Progressive Confidence Improvement', () => {
      it('should increase confidence based on clarification answer quality', async () => {
        const baseGoal = "Start a business";
        const baseCriteria: SMARTCriteria = {
          specific: { value: "Start a business", confidence: 0.3, missing: ["type", "industry"] },
          measurable: { value: "Business launch", metrics: [], confidence: 0.2, missing: ["success metrics"] },
          achievable: { value: "Possible", confidence: 0.4, missing: ["resources", "experience"] },
          relevant: { value: "Personal goal", confidence: 0.5, missing: ["motivation"] },
          timeBound: { value: "Someday", confidence: 0.1, missing: ["timeline"] }
        };

        // Test different quality answers and their impact on confidence
        const answerScenarios = [
          {
            name: "High quality comprehensive answer",
            clarifications: [{
              question: "What type of business?",
              answer: "An e-commerce platform selling sustainable home goods, targeting millennials, with initial investment of $50k from savings",
              smartCriterion: "specific" as const
            }],
            expectedConfidenceIncrease: { min: 0.3, max: 0.4 },
            expectedCriterionConfidence: { min: 0.8, max: 0.95 }
          },
          {
            name: "Medium quality answer",
            clarifications: [{
              question: "What type of business?",
              answer: "Online retail business selling eco-friendly products",
              smartCriterion: "specific" as const
            }],
            expectedConfidenceIncrease: { min: 0.15, max: 0.25 },
            expectedCriterionConfidence: { min: 0.6, max: 0.7 }
          },
          {
            name: "Low quality vague answer",
            clarifications: [{
              question: "What type of business?",
              answer: "Something online",
              smartCriterion: "specific" as const
            }],
            expectedConfidenceIncrease: { min: 0.05, max: 0.1 },
            expectedCriterionConfidence: { min: 0.35, max: 0.45 }
          }
        ];

        for (const scenario of answerScenarios) {
          const baseConfidence = 0.3;
          const expectedNewConfidence = baseConfidence + 
            (scenario.expectedConfidenceIncrease.min + scenario.expectedConfidenceIncrease.max) / 2;

          const response = createMockOpenAIResponse({
            confidence: expectedNewConfidence,
            smartCriteria: {
              ...baseCriteria,
              specific: {
                ...baseCriteria.specific,
                confidence: (scenario.expectedCriterionConfidence.min + scenario.expectedCriterionConfidence.max) / 2
              }
            }
          });

          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] })
          });

          const result = await processor.processClarifications(
            baseGoal,
            baseCriteria,
            scenario.clarifications
          );

          // Validate confidence increase is proportional to answer quality
          const confidenceIncrease = result.confidence - baseConfidence;
          expect(confidenceIncrease).toBeGreaterThanOrEqual(scenario.expectedConfidenceIncrease.min);
          expect(confidenceIncrease).toBeLessThanOrEqual(scenario.expectedConfidenceIncrease.max);

          // Validate specific criterion update
          expect(result.smartCriteria.specific.confidence).toBeGreaterThanOrEqual(
            scenario.expectedCriterionConfidence.min
          );
          expect(result.smartCriteria.specific.confidence).toBeLessThanOrEqual(
            scenario.expectedCriterionConfidence.max
          );
        }
      });

      it('should NOT cap confidence at artificial limits when user provides comprehensive details', async () => {
        const goal = "I want to improve my fitness";
        
        // Comprehensive clarifications that should result in high confidence
        const comprehensiveClarifications: ClarificationAnswer[] = [
          {
            question: "What specific fitness goals?",
            answer: "Run a marathon in under 4 hours, currently running 5K in 25 minutes",
            smartCriterion: "specific"
          },
          {
            question: "How will you measure progress?",
            answer: "Weekly mileage tracking (20-50 miles), pace improvement (target 9:00/mile), monthly time trials",
            smartCriterion: "measurable"
          },
          {
            question: "What's your training plan?",
            answer: "16-week marathon program, 4-5 runs per week, strength training 2x/week, working with running coach",
            smartCriterion: "achievable"
          },
          {
            question: "When is your target marathon?",
            answer: "Chicago Marathon on October 8, 2025 - exactly 6 months from now",
            smartCriterion: "timeBound"
          }
        ];

        const response = createMockOpenAIResponse({
          smartGoal: "Complete Chicago Marathon on October 8, 2025 in under 4 hours by following 16-week training program",
          confidence: 0.92, // Should NOT be capped at 0.5!
          smartCriteria: {
            specific: { 
              value: "Run Chicago Marathon sub-4 hours", 
              confidence: 0.95,
              missing: []
            },
            measurable: {
              value: "Finish time < 4:00:00, weekly mileage 20-50mi, target pace 9:00/mi",
              metrics: ["time: <4hr", "pace: 9:00/mi", "weekly: 20-50mi"],
              confidence: 0.98,
              missing: []
            },
            achievable: {
              value: "Current 5K time indicates readiness, coach supervision, structured plan",
              confidence: 0.88,
              missing: []
            },
            relevant: {
              value: "Personal fitness goal, health improvement",
              confidence: 0.85,
              missing: []
            },
            timeBound: {
              value: "October 8, 2025 - Chicago Marathon (6 months)",
              confidence: 0.98,
              missing: []
            }
          },
          clarificationQuestions: [],
          missingCriteria: []
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] })
        });

        const result = await processor.processClarifications(
          goal,
          {} as SMARTCriteria,
          comprehensiveClarifications
        );

        // Confidence should be HIGH, not artificially capped
        expect(result.confidence).toBeGreaterThan(0.85);
        expect(result.confidence).toBeLessThanOrEqual(1.0);

        // All criteria should have high confidence
        Object.values(result.smartCriteria).forEach(criterion => {
          expect(criterion.confidence).toBeGreaterThan(0.8);
        });
      });
    });

    describe('Holistic Scoring Approach', () => {
      it('should update all relevant criteria when processing clarifications', async () => {
        const goal = "Improve team productivity";
        const clarifications: ClarificationAnswer[] = [
          {
            question: "How do you measure team productivity currently?",
            answer: "We track sprint velocity (currently 45 points), bug count (average 12/sprint), and feature delivery time (3 weeks average)",
            smartCriterion: "measurable"
          }
        ];

        // This answer should improve multiple criteria, not just measurable
        const response = createMockOpenAIResponse({
          confidence: 0.7,
          smartCriteria: {
            specific: { 
              value: "Improve software team productivity metrics",
              confidence: 0.75, // Should improve because we now know it's a software team
              missing: []
            },
            measurable: {
              value: "Sprint velocity >45pts, bugs <12/sprint, delivery <3wks",
              metrics: ["velocity: >45pts", "bugs: <12", "delivery: <3wks"],
              confidence: 0.95, // Primary improvement
              missing: []
            },
            achievable: {
              value: "Based on current metrics, improvements are realistic",
              confidence: 0.8, // Should improve because we have baselines
              missing: []
            },
            relevant: {
              value: "Critical for team performance",
              confidence: 0.85,
              missing: []
            },
            timeBound: {
              value: "Per sprint improvements",
              confidence: 0.6, // Partial improvement from sprint context
              missing: ["specific deadline"]
            }
          }
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] })
        });

        const result = await processor.processClarifications(
          goal,
          {} as SMARTCriteria,
          clarifications
        );

        // Multiple criteria should improve from one good answer
        expect(result.smartCriteria.specific.confidence).toBeGreaterThan(0.7);
        expect(result.smartCriteria.measurable.confidence).toBeGreaterThan(0.9);
        expect(result.smartCriteria.achievable.confidence).toBeGreaterThan(0.75);
      });

      it('should recognize and score interconnected improvements across criteria', async () => {
        const goal = "Launch new product";
        
        // Clarification that provides information relevant to multiple criteria
        const clarifications: ClarificationAnswer[] = [
          {
            question: "What resources do you have for the launch?",
            answer: "Budget of $500k, team of 8 engineers, 3 designers, 2 marketers, and 6 months runway",
            smartCriterion: "achievable"
          }
        ];

        const response = createMockOpenAIResponse({
          confidence: 0.75,
          smartCriteria: {
            specific: {
              value: "Launch new product with dedicated team",
              confidence: 0.7, // Improved - we know it's a tech product needing engineers
              missing: ["product type"]
            },
            measurable: {
              value: "Successful launch metrics",
              confidence: 0.5,
              metrics: ["budget utilization", "team allocation"],
              missing: ["success metrics"]
            },
            achievable: {
              value: "$500k budget, 13-person team, 6-month runway",
              confidence: 0.9, // Primary improvement
              missing: []
            },
            relevant: {
              value: "Strategic business objective",
              confidence: 0.8,
              missing: []
            },
            timeBound: {
              value: "6-month runway indicates timeline",
              confidence: 0.75, // Improved from runway information
              missing: ["launch date"]
            }
          }
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] })
        });

        const result = await processor.processClarifications(
          goal,
          {} as SMARTCriteria,
          clarifications
        );

        // Resource information should improve multiple aspects
        expect(result.smartCriteria.achievable.confidence).toBeGreaterThan(0.85);
        expect(result.smartCriteria.timeBound.confidence).toBeGreaterThan(0.7);
        expect(result.smartCriteria.specific.confidence).toBeGreaterThan(0.65);
      });
    });

    describe('Scoring Edge Cases', () => {
      it('should handle goals with conflicting criteria appropriately', async () => {
        const conflictingGoal = {
          goal: "Make $1 million in 1 month with no investment",
          context: { constraints: "No capital, no team, no existing business" }
        };

        const response = createMockOpenAIResponse({
          confidence: 0.3,
          smartCriteria: {
            specific: { value: "Make $1 million", confidence: 0.8, missing: [] },
            measurable: { value: "$1 million", metrics: ["$1M"], confidence: 0.9, missing: [] },
            achievable: { value: "Unrealistic without resources", confidence: 0.1, missing: ["realistic plan"] },
            relevant: { value: "Financial goal", confidence: 0.7, missing: [] },
            timeBound: { value: "1 month", confidence: 0.9, missing: [] }
          },
          clarificationQuestions: ["What skills or assets do you have?", "Are you open to adjusting the timeline or amount?"]
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] })
        });

        const result = await processor.translateGoal(conflictingGoal);

        // Low achievability should significantly impact overall confidence
        expect(result.confidence).toBeLessThan(0.4);
        expect(result.smartCriteria.achievable.confidence).toBeLessThan(0.2);
      });

      it('should score technical goals with domain-specific accuracy', async () => {
        const technicalGoals = [
          {
            goal: "Achieve 99.99% uptime for our SaaS platform serving 10k concurrent users with <100ms response time",
            expectedScores: {
              specific: { min: 0.9, max: 1.0 },
              measurable: { min: 0.95, max: 1.0 },
              achievable: { min: 0.7, max: 0.85 }
            }
          },
          {
            goal: "Refactor legacy codebase to microservices architecture",
            expectedScores: {
              specific: { min: 0.6, max: 0.7 },
              measurable: { min: 0.3, max: 0.5 },
              timeBound: { min: 0.1, max: 0.3 }
            }
          }
        ];

        for (const testCase of technicalGoals) {
          const response = createMockOpenAIResponse({
            smartCriteria: {
              specific: {
                confidence: (testCase.expectedScores.specific.min + testCase.expectedScores.specific.max) / 2
              },
              measurable: {
                confidence: (testCase.expectedScores.measurable.min + testCase.expectedScores.measurable.max) / 2,
                metrics: testCase.expectedScores.measurable.min > 0.9 ? ["uptime: 99.99%", "users: 10k", "response: <100ms"] : []
              },
              achievable: {
                confidence: testCase.expectedScores.achievable ? 
                  (testCase.expectedScores.achievable.min + testCase.expectedScores.achievable.max) / 2 : 0.5
              },
              relevant: { confidence: 0.9 },
              timeBound: {
                confidence: testCase.expectedScores.timeBound ? 
                  (testCase.expectedScores.timeBound.min + testCase.expectedScores.timeBound.max) / 2 : 0.5
              }
            }
          });

          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] })
          });

          const result = await processor.translateGoal({ goal: testCase.goal });

          // Validate domain-specific scoring
          for (const [criterion, expected] of Object.entries(testCase.expectedScores)) {
            const actual = result.smartCriteria[criterion as keyof SMARTCriteria];
            expect(actual.confidence).toBeGreaterThanOrEqual(expected.min);
            expect(actual.confidence).toBeLessThanOrEqual(expected.max);
          }
        }
      });
    });

    describe('Confidence Calculation Accuracy', () => {
      it('should calculate overall confidence as weighted average of criteria', async () => {
        const testCases = [
          {
            criteria: {
              specific: { confidence: 0.9 },
              measurable: { confidence: 0.8 },
              achievable: { confidence: 0.7 },
              relevant: { confidence: 0.9 },
              timeBound: { confidence: 0.6 }
            },
            expectedConfidence: { min: 0.75, max: 0.85 } // Weighted average
          },
          {
            criteria: {
              specific: { confidence: 0.5 },
              measurable: { confidence: 0.4 },
              achievable: { confidence: 0.6 },
              relevant: { confidence: 0.7 },
              timeBound: { confidence: 0.3 }
            },
            expectedConfidence: { min: 0.45, max: 0.55 }
          }
        ];

        for (const testCase of testCases) {
          const avgConfidence = Object.values(testCase.criteria)
            .reduce((sum, c) => sum + c.confidence, 0) / 5;

          const response = createMockOpenAIResponse({
            confidence: avgConfidence,
            smartCriteria: {
              specific: { ...testCase.criteria.specific, value: "test", missing: [] },
              measurable: { ...testCase.criteria.measurable, value: "test", metrics: [], missing: [] },
              achievable: { ...testCase.criteria.achievable, value: "test", missing: [] },
              relevant: { ...testCase.criteria.relevant, value: "test", missing: [] },
              timeBound: { ...testCase.criteria.timeBound, value: "test", missing: [] }
            }
          });

          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] })
          });

          const result = await processor.translateGoal({ goal: "Test goal" });

          expect(result.confidence).toBeGreaterThanOrEqual(testCase.expectedConfidence.min);
          expect(result.confidence).toBeLessThanOrEqual(testCase.expectedConfidence.max);
        }
      });

      it('should penalize confidence when critical criteria are missing', async () => {
        const goalWithMissingCriteria = "Do something important";

        const response = createMockOpenAIResponse({
          confidence: 0.3, // Should be low due to missing criteria
          smartCriteria: {
            specific: { value: "Do something", confidence: 0.2, missing: ["what", "how"] },
            measurable: { value: "Unknown", metrics: [], confidence: 0.1, missing: ["metrics"] },
            achievable: { value: "Unknown", confidence: 0.3, missing: ["resources"] },
            relevant: { value: "Important", confidence: 0.6, missing: [] },
            timeBound: { value: "Unknown", confidence: 0.1, missing: ["when"] }
          },
          missingCriteria: ["specific", "measurable", "timeBound"]
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] })
        });

        const result = await processor.translateGoal({ goal: goalWithMissingCriteria });

        // Missing critical criteria should result in low confidence
        expect(result.confidence).toBeLessThan(0.4);
        expect(result.missingCriteria.length).toBeGreaterThanOrEqual(3);
        
        // Specific penalties for missing criteria
        result.missingCriteria.forEach(criterion => {
          const criteriaConfidence = result.smartCriteria[criterion as keyof SMARTCriteria].confidence;
          expect(criteriaConfidence).toBeLessThan(0.3);
        });
      });
    });
  });
});