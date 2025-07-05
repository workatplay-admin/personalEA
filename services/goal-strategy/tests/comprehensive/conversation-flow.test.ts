import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { SMARTGoalProcessor, ClarificationAnswer, SMARTCriteria } from '../../src/services/smart-goal-processor';
import { mockOpenAIResponse, createMockOpenAIResponse } from '../mocks/openai.mock';

// Mock fetch globally with proper typing
const mockFetch = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
global.fetch = mockFetch as any;

describe('Comprehensive Conversation Flow Testing', () => {
  let processor: SMARTGoalProcessor;
  const validApiKey = 'sk-test-comprehensive-flow';

  beforeEach(() => {
    processor = new SMARTGoalProcessor();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Multi-Stage Conversation Flows', () => {
    describe('Complete User Journey - Business Goal', () => {
      it('should handle a complete multi-round conversation for business goals', async () => {
        const businessGoal = "I want to grow my startup";
        
        // Stage 1: Initial goal processing
        const initialResponse = createMockOpenAIResponse({
          smartGoal: "Grow my startup",
          confidence: 0.3,
          smartCriteria: {
            specific: { value: "Grow startup", confidence: 0.3, missing: ["growth metrics", "business area"] },
            measurable: { value: "Growth", metrics: [], confidence: 0.2, missing: ["quantifiable metrics"] },
            achievable: { value: "Possible", confidence: 0.4, missing: ["resource assessment"] },
            relevant: { value: "Important for business", confidence: 0.7, missing: [] },
            timeBound: { value: "Unspecified", confidence: 0.1, missing: ["timeline", "deadline"] }
          },
          clarificationQuestions: [
            "What specific aspect of your startup do you want to grow (revenue, customers, team)?",
            "What are your current metrics (revenue, customer count, etc.)?",
            "What resources do you have available?"
          ]
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: JSON.stringify(initialResponse) } }] })
        });

        const initialResult = await processor.translateGoal({ goal: businessGoal });
        expect(initialResult.confidence).toBeLessThan(0.5);
        expect(initialResult.clarificationQuestions.length).toBeGreaterThan(0);

        // Stage 2: First clarification round
        const round1Clarifications: ClarificationAnswer[] = [
          {
            question: "What specific aspect of your startup do you want to grow?",
            answer: "I want to increase monthly recurring revenue (MRR)",
            smartCriterion: "specific"
          }
        ];

        const round1Response = createMockOpenAIResponse({
          smartGoal: "Increase monthly recurring revenue (MRR) for my startup",
          confidence: 0.5,
          smartCriteria: {
            specific: { value: "Increase MRR", confidence: 0.7, missing: [] },
            measurable: { value: "MRR growth", metrics: ["MRR"], confidence: 0.4, missing: ["current baseline", "target amount"] },
            achievable: { value: "Possible", confidence: 0.4, missing: ["resource assessment"] },
            relevant: { value: "Critical for startup growth", confidence: 0.8, missing: [] },
            timeBound: { value: "Unspecified", confidence: 0.1, missing: ["timeline", "deadline"] }
          },
          clarificationQuestions: [
            "What is your current MRR?",
            "What is your target MRR?",
            "By when do you want to achieve this?"
          ]
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: JSON.stringify(round1Response) } }] })
        });

        const round1Result = await processor.processClarifications(
          businessGoal,
          initialResult.smartCriteria,
          round1Clarifications
        );

        expect(round1Result.confidence).toBeGreaterThan(initialResult.confidence);
        expect(round1Result.smartCriteria.specific.confidence).toBeGreaterThan(0.6);

        // Stage 3: Second clarification round
        const round2Clarifications: ClarificationAnswer[] = [
          {
            question: "What is your current MRR?",
            answer: "Currently at $5,000 per month",
            smartCriterion: "measurable"
          },
          {
            question: "What is your target MRR?",
            answer: "I want to reach $20,000 per month",
            smartCriterion: "measurable"
          }
        ];

        const round2Response = createMockOpenAIResponse({
          smartGoal: "Increase monthly recurring revenue from $5,000 to $20,000",
          confidence: 0.7,
          smartCriteria: {
            specific: { value: "Increase MRR from $5k to $20k", confidence: 0.8, missing: [] },
            measurable: { value: "300% MRR growth", metrics: ["current: $5k", "target: $20k", "growth: 300%"], confidence: 0.9, missing: [] },
            achievable: { value: "Ambitious but possible", confidence: 0.5, missing: ["growth strategy"] },
            relevant: { value: "Critical for startup growth and funding", confidence: 0.9, missing: [] },
            timeBound: { value: "Unspecified", confidence: 0.1, missing: ["timeline", "milestones"] }
          },
          clarificationQuestions: [
            "By when do you want to achieve $20k MRR?",
            "What's your growth strategy?"
          ]
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: JSON.stringify(round2Response) } }] })
        });

        const round2Result = await processor.processClarifications(
          businessGoal,
          round1Result.smartCriteria,
          round2Clarifications
        );

        expect(round2Result.confidence).toBeGreaterThan(0.6);
        expect(round2Result.smartCriteria.measurable.confidence).toBeGreaterThan(0.8);

        // Stage 4: Final clarification round
        const finalClarifications: ClarificationAnswer[] = [
          {
            question: "By when do you want to achieve $20k MRR?",
            answer: "Within 12 months, by end of 2025",
            smartCriterion: "timeBound"
          },
          {
            question: "What's your growth strategy?",
            answer: "Launching premium features, expanding to enterprise clients, and doubling sales team",
            smartCriterion: "achievable"
          }
        ];

        const finalResponse = createMockOpenAIResponse({
          smartGoal: "Increase monthly recurring revenue from $5,000 to $20,000 (300% growth) by December 2025 through premium features, enterprise expansion, and sales team growth",
          confidence: 0.9,
          smartCriteria: {
            specific: { value: "Increase MRR from $5k to $20k through premium features and enterprise expansion", confidence: 0.95, missing: [] },
            measurable: { value: "300% MRR growth ($5k to $20k)", metrics: ["current: $5k", "target: $20k", "growth: 300%", "monthly tracking"], confidence: 0.95, missing: [] },
            achievable: { value: "Achievable with premium features, enterprise focus, and expanded sales team", confidence: 0.85, missing: [] },
            relevant: { value: "Critical for Series A funding and sustainable growth", confidence: 0.95, missing: [] },
            timeBound: { value: "12 months (by December 2025)", confidence: 0.9, missing: [] }
          },
          clarificationQuestions: [],
          missingCriteria: []
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: JSON.stringify(finalResponse) } }] })
        });

        const finalResult = await processor.processClarifications(
          businessGoal,
          round2Result.smartCriteria,
          finalClarifications
        );

        // Validate complete transformation
        expect(finalResult.confidence).toBeGreaterThan(0.85);
        expect(finalResult.missingCriteria.length).toBe(0);
        expect(finalResult.clarificationQuestions.length).toBe(0);
        
        // All criteria should have high confidence
        Object.values(finalResult.smartCriteria).forEach(criterion => {
          expect(criterion.confidence).toBeGreaterThan(0.8);
        });
      });
    });

    describe('Complete User Journey - Personal Development', () => {
      it('should handle personal development goals with emotional and practical aspects', async () => {
        const personalGoal = "I want to be happier";
        
        // Stage 1: Initial vague goal
        const initialResponse = createMockOpenAIResponse({
          smartGoal: "Become happier",
          confidence: 0.2,
          smartCriteria: {
            specific: { value: "Be happier", confidence: 0.2, missing: ["specific aspects of happiness", "actionable steps"] },
            measurable: { value: "Happiness", metrics: [], confidence: 0.1, missing: ["measurement methods", "indicators"] },
            achievable: { value: "Possible", confidence: 0.3, missing: ["current state", "obstacles"] },
            relevant: { value: "Important for wellbeing", confidence: 0.8, missing: [] },
            timeBound: { value: "Ongoing", confidence: 0.1, missing: ["timeline", "checkpoints"] }
          },
          clarificationQuestions: [
            "What specific aspects of your life would make you happier?",
            "How would you measure or recognize increased happiness?",
            "What's currently preventing you from being happier?"
          ]
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: JSON.stringify(initialResponse) } }] })
        });

        const initialResult = await processor.translateGoal({ goal: personalGoal });
        expect(initialResult.confidence).toBeLessThan(0.3);

        // Multiple rounds of clarification leading to concrete goal
        const clarificationRounds = [
          {
            clarifications: [{
              question: "What specific aspects would make you happier?",
              answer: "Better work-life balance and more meaningful relationships",
              smartCriterion: "specific" as const
            }],
            expectedConfidence: 0.4
          },
          {
            clarifications: [{
              question: "How would you measure increased happiness?",
              answer: "Daily mood tracking (1-10 scale), quality time with family (hours/week), stress levels",
              smartCriterion: "measurable" as const
            }],
            expectedConfidence: 0.6
          },
          {
            clarifications: [{
              question: "What's your timeline for improvement?",
              answer: "6 months to establish new habits and see meaningful change",
              smartCriterion: "timeBound" as const
            }],
            expectedConfidence: 0.8
          }
        ];

        let currentCriteria = initialResult.smartCriteria;
        let currentConfidence = initialResult.confidence;

        for (const round of clarificationRounds) {
          const response = createMockOpenAIResponse({
            confidence: round.expectedConfidence,
            smartCriteria: {
              ...currentCriteria,
              [round.clarifications[0].smartCriterion]: {
                ...currentCriteria[round.clarifications[0].smartCriterion],
                confidence: round.expectedConfidence + 0.2
              }
            }
          });

          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] })
          });

          const result = await processor.processClarifications(
            personalGoal,
            currentCriteria,
            round.clarifications
          );

          expect(result.confidence).toBeGreaterThanOrEqual(round.expectedConfidence);
          currentCriteria = result.smartCriteria;
          currentConfidence = result.confidence;
        }

        expect(currentConfidence).toBeGreaterThan(0.7);
      });
    });

    describe('Conversation Flow Patterns', () => {
      it('should handle iterative refinement with conflicting information', async () => {
        const goal = "I want to start exercising";
        const clarifications: ClarificationAnswer[] = [
          {
            question: "How often do you want to exercise?",
            answer: "Every day for 2 hours",
            smartCriterion: "measurable"
          },
          {
            question: "What's your current fitness level?",
            answer: "I haven't exercised in 5 years and have health issues",
            smartCriterion: "achievable"
          }
        ];

        // AI should recognize the conflict and adjust accordingly
        const response = createMockOpenAIResponse({
          smartGoal: "Start with 3 days per week, 30 minutes of light exercise, gradually increasing intensity",
          confidence: 0.7,
          smartCriteria: {
            specific: { value: "Light exercise routine", confidence: 0.8, missing: [] },
            measurable: { value: "3x/week, 30 min sessions", metrics: ["frequency: 3x/week", "duration: 30 min"], confidence: 0.9, missing: [] },
            achievable: { value: "Realistic given health constraints", confidence: 0.8, missing: [] },
            relevant: { value: "Important for health improvement", confidence: 0.9, missing: [] },
            timeBound: { value: "Start immediately, reassess in 4 weeks", confidence: 0.8, missing: [] }
          },
          clarificationQuestions: ["Have you consulted with a doctor about exercise?"]
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

        expect(result.smartGoal).toContain("gradually");
        expect(result.smartCriteria.achievable.confidence).toBeGreaterThan(0.7);
      });

      it('should maintain context across multiple conversation turns', async () => {
        const goal = "Learn programming";
        const conversationHistory: ClarificationAnswer[] = [];
        
        // Simulate a natural conversation flow
        const turns = [
          { q: "What programming language?", a: "Python", criterion: "specific" },
          { q: "For what purpose?", a: "Data science and machine learning", criterion: "specific" },
          { q: "Current skill level?", a: "Complete beginner", criterion: "achievable" },
          { q: "How much time can you dedicate?", a: "2 hours daily", criterion: "achievable" },
          { q: "Target proficiency?", a: "Build ML models independently", criterion: "measurable" },
          { q: "Timeline?", a: "6 months", criterion: "timeBound" }
        ];

        for (const turn of turns) {
          conversationHistory.push({
            question: turn.q,
            answer: turn.a,
            smartCriterion: turn.criterion as keyof SMARTCriteria
          });

          const response = createMockOpenAIResponse({
            confidence: 0.3 + (conversationHistory.length * 0.1),
            smartGoal: `Learn Python for data science: ${conversationHistory.map(h => h.answer).join(', ')}`
          });

          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] })
          });

          const result = await processor.processClarifications(
            goal,
            {} as SMARTCriteria,
            conversationHistory
          );

          // Each turn should increase confidence
          expect(result.confidence).toBeGreaterThan(0.2 + (conversationHistory.length * 0.05));
        }
      });
    });

    describe('Edge Cases in Conversation Flow', () => {
      it('should handle users changing their mind mid-conversation', async () => {
        const goal = "I want to lose weight";
        const clarifications: ClarificationAnswer[] = [
          {
            question: "How much weight?",
            answer: "Actually, I think I want to focus on building muscle instead",
            smartCriterion: "specific"
          }
        ];

        const response = createMockOpenAIResponse({
          smartGoal: "Build lean muscle mass while maintaining current weight",
          confidence: 0.6,
          clarificationQuestions: [
            "How much muscle mass do you want to gain?",
            "Are you open to body recomposition (losing fat while gaining muscle)?"
          ]
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

        expect(result.smartGoal).toContain("muscle");
        expect(result.clarificationQuestions.length).toBeGreaterThan(0);
      });

      it('should handle very detailed initial responses that need minimal clarification', async () => {
        const detailedGoal = {
          goal: "I want to increase my company's quarterly revenue from $100k to $150k within the next 3 months by launching our new SaaS product to enterprise clients, with a dedicated sales team of 5 people and a marketing budget of $20k",
          context: {
            timeframe: "3 months",
            priority: "high",
            constraints: "Limited to current team, cannot hire"
          }
        };

        const response = createMockOpenAIResponse({
          smartGoal: detailedGoal.goal,
          confidence: 0.95,
          smartCriteria: {
            specific: { value: "Launch SaaS to enterprise, increase revenue $100k to $150k", confidence: 0.98, missing: [] },
            measurable: { value: "50% revenue increase ($50k)", metrics: ["current: $100k", "target: $150k", "increase: 50%"], confidence: 0.98, missing: [] },
            achievable: { value: "Achievable with 5-person team and $20k budget", confidence: 0.9, missing: [] },
            relevant: { value: "Critical for company growth", confidence: 0.95, missing: [] },
            timeBound: { value: "3 months (1 quarter)", confidence: 0.98, missing: [] }
          },
          clarificationQuestions: [],
          missingCriteria: []
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] })
        });

        const result = await processor.translateGoal(detailedGoal);

        expect(result.confidence).toBeGreaterThan(0.9);
        expect(result.clarificationQuestions.length).toBe(0);
        expect(result.missingCriteria.length).toBe(0);
      });

      it('should handle conversation abandonment and resumption', async () => {
        const goal = "Improve my health";
        
        // First session - partial clarification
        const session1Clarifications: ClarificationAnswer[] = [
          {
            question: "What aspect of health?",
            answer: "Physical fitness and diet",
            smartCriterion: "specific"
          }
        ];

        const session1Response = createMockOpenAIResponse({
          confidence: 0.4,
          smartCriteria: {
            specific: { value: "Improve physical fitness and diet", confidence: 0.6, missing: ["specific goals"] }
          }
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: JSON.stringify(session1Response) } }] })
        });

        const session1Result = await processor.processClarifications(
          goal,
          {} as SMARTCriteria,
          session1Clarifications
        );

        // Simulate resumption with previous context
        const session2Clarifications: ClarificationAnswer[] = [
          ...session1Clarifications,
          {
            question: "What are your specific fitness goals?",
            answer: "Run a 5K and lose 20 pounds",
            smartCriterion: "measurable"
          }
        ];

        const session2Response = createMockOpenAIResponse({
          confidence: 0.7,
          smartGoal: "Run a 5K race and lose 20 pounds through improved diet and training",
          smartCriteria: {
            specific: { value: "Run 5K and lose 20 lbs", confidence: 0.8, missing: [] },
            measurable: { value: "5K completion, 20 lbs weight loss", metrics: ["distance: 5K", "weight: -20 lbs"], confidence: 0.9, missing: [] }
          }
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: JSON.stringify(session2Response) } }] })
        });

        const session2Result = await processor.processClarifications(
          goal,
          session1Result.smartCriteria,
          session2Clarifications
        );

        expect(session2Result.confidence).toBeGreaterThan(session1Result.confidence);
        expect(session2Result.smartCriteria.measurable.confidence).toBeGreaterThan(0.8);
      });
    });

    describe('Conversation Quality Metrics', () => {
      it('should track conversation efficiency (fewer rounds to high confidence)', async () => {
        const efficientGoal = "Launch mobile app in 6 months";
        const inefficientGoal = "Do something with technology";

        // Efficient conversation - should reach high confidence quickly
        const efficientResponse = createMockOpenAIResponse({
          confidence: 0.8,
          smartCriteria: {
            specific: { confidence: 0.85 },
            measurable: { confidence: 0.8 },
            achievable: { confidence: 0.7 },
            relevant: { confidence: 0.9 },
            timeBound: { confidence: 0.95 }
          }
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: JSON.stringify(efficientResponse) } }] })
        });

        const efficientResult = await processor.translateGoal({ goal: efficientGoal });

        // Inefficient conversation - needs many clarifications
        const inefficientResponse = createMockOpenAIResponse({
          confidence: 0.2,
          clarificationQuestions: [
            "What kind of technology?",
            "What do you want to achieve?",
            "For what purpose?",
            "When do you want to do this?",
            "Who is your target audience?"
          ]
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: JSON.stringify(inefficientResponse) } }] })
        });

        const inefficientResult = await processor.translateGoal({ goal: inefficientGoal });

        // Efficient goals should have fewer clarification questions
        expect(efficientResult.clarificationQuestions.length).toBeLessThan(
          inefficientResult.clarificationQuestions.length
        );
        expect(efficientResult.confidence).toBeGreaterThan(inefficientResult.confidence);
      });

      it('should measure clarification answer quality impact', async () => {
        const goal = "Improve sales";
        
        // High quality answer
        const highQualityClarification: ClarificationAnswer[] = [{
          question: "By how much do you want to improve sales?",
          answer: "Increase B2B software sales by 40% ($2M to $2.8M ARR) through enterprise partnerships",
          smartCriterion: "measurable"
        }];

        const highQualityResponse = createMockOpenAIResponse({
          confidence: 0.8,
          smartCriteria: {
            measurable: { confidence: 0.95, metrics: ["current: $2M", "target: $2.8M", "increase: 40%"] }
          }
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: JSON.stringify(highQualityResponse) } }] })
        });

        const highQualityResult = await processor.processClarifications(
          goal,
          {} as SMARTCriteria,
          highQualityClarification
        );

        // Low quality answer
        const lowQualityClarification: ClarificationAnswer[] = [{
          question: "By how much do you want to improve sales?",
          answer: "A lot more",
          smartCriterion: "measurable"
        }];

        const lowQualityResponse = createMockOpenAIResponse({
          confidence: 0.4,
          smartCriteria: {
            measurable: { confidence: 0.3, metrics: [] }
          }
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: JSON.stringify(lowQualityResponse) } }] })
        });

        const lowQualityResult = await processor.processClarifications(
          goal,
          {} as SMARTCriteria,
          lowQualityClarification
        );

        // High quality answers should yield better confidence improvements
        expect(highQualityResult.confidence).toBeGreaterThan(lowQualityResult.confidence);
        expect(highQualityResult.smartCriteria.measurable.confidence).toBeGreaterThan(
          lowQualityResult.smartCriteria.measurable.confidence
        );
      });
    });
  });

  describe('Real-World Conversation Scenarios', () => {
    it('should handle career transition conversations', async () => {
      const careerGoal = "I want to switch careers";
      
      // Multi-stage conversation simulating real user interaction
      const stages = [
        {
          clarifications: [{
            question: "What career are you transitioning from and to?",
            answer: "From accounting to software development",
            smartCriterion: "specific" as const
          }],
          expectedQuestions: ["current skills", "timeline", "financial considerations"]
        },
        {
          clarifications: [{
            question: "What's your current programming experience?",
            answer: "I've completed some online Python courses and built a few small projects",
            smartCriterion: "achievable" as const
          }],
          expectedQuestions: ["learning plan", "target role", "salary expectations"]
        },
        {
          clarifications: [{
            question: "What's your target timeline and how will you manage financially?",
            answer: "I want to land a junior developer role within 12 months. I have 6 months of savings and plan to freelance part-time",
            smartCriterion: "timeBound" as const
          }],
          expectedQuestions: ["skill gaps", "portfolio development"]
        }
      ];

      let confidence = 0.2;
      for (const stage of stages) {
        const response = createMockOpenAIResponse({
          confidence: confidence + 0.25,
          clarificationQuestions: stage.expectedQuestions
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] })
        });

        const result = await processor.processClarifications(
          careerGoal,
          {} as SMARTCriteria,
          stage.clarifications
        );

        confidence = result.confidence;
        expect(result.clarificationQuestions.some(q => 
          stage.expectedQuestions.some(eq => q.toLowerCase().includes(eq))
        )).toBe(true);
      }

      expect(confidence).toBeGreaterThan(0.7);
    });

    it('should handle health and wellness conversations with sensitivity', async () => {
      const healthGoal = "I want to overcome my anxiety";
      
      const clarifications: ClarificationAnswer[] = [
        {
          question: "What specific aspects of anxiety do you want to address?",
          answer: "Social anxiety that prevents me from networking and advancing my career",
          smartCriterion: "specific"
        },
        {
          question: "How would you measure improvement?",
          answer: "Attending 2 networking events per month and initiating conversations with 5 new people",
          smartCriterion: "measurable"
        }
      ];

      const response = createMockOpenAIResponse({
        smartGoal: "Manage social anxiety to attend 2 networking events monthly and initiate conversations with 5 new people",
        confidence: 0.75,
        smartCriteria: {
          specific: { value: "Address social anxiety affecting career networking", confidence: 0.85 },
          measurable: { value: "2 events/month, 5 new conversations", metrics: ["events: 2/month", "conversations: 5/event"], confidence: 0.9 },
          achievable: { value: "Gradual exposure with support", confidence: 0.7 },
          relevant: { value: "Critical for career advancement", confidence: 0.9 },
          timeBound: { value: "Ongoing with monthly targets", confidence: 0.8 }
        },
        clarificationQuestions: ["Are you working with a therapist or counselor?", "What support systems do you have?"]
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] })
      });

      const result = await processor.processClarifications(
        healthGoal,
        {} as SMARTCriteria,
        clarifications
      );

      // Should include supportive elements
      expect(result.clarificationQuestions.some(q => 
        q.includes('support') || q.includes('therapist')
      )).toBe(true);
      expect(result.smartCriteria.achievable.value).toContain('support');
    });
  });
});