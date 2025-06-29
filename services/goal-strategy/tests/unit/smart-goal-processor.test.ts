import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { SMARTGoalProcessor, RawGoalInput, ClarificationAnswer } from '../../src/services/smart-goal-processor';
import { 
  mockOpenAIResponse, 
  mockLowConfidenceResponse, 
  mockAnalysisResponse,
  mockErrorResponse,
  mockInvalidAPIKeyResponse,
  createMockOpenAIFetch,
  mockGoalTranslationResult 
} from '../mocks/openai.mock';
import { 
  validGoalInputs, 
  vagueGoalInputs, 
  complexGoalInputs, 
  edgeCaseInputs,
  wellDefinedGoalInputs,
  incompleteGoalInputs
} from '../fixtures/goal-inputs';

// Mock fetch globally with proper typing
const mockFetch = jest.fn<Promise<Response>, [input: RequestInfo | URL, init?: RequestInit]>();
global.fetch = mockFetch as any;

describe('SMARTGoalProcessor', () => {
  let processor: SMARTGoalProcessor;
  const validApiKey = 'sk-test-1234567890abcdef';
  const invalidApiKey = 'invalid-key';

  beforeEach(() => {
    processor = new SMARTGoalProcessor();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with environment configuration', () => {
      expect(processor).toBeInstanceOf(SMARTGoalProcessor);
    });

    it('should handle missing OpenAI API key gracefully', () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      
      const newProcessor = new SMARTGoalProcessor();
      expect(newProcessor).toBeInstanceOf(SMARTGoalProcessor);
      
      process.env.OPENAI_API_KEY = originalKey;
    });
  });

  describe('translateGoal', () => {
    describe('Successful translations', () => {
      beforeEach(() => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockOpenAIResponse
        });
      });

      it('should translate a valid goal input successfully', async () => {
        const input = validGoalInputs[0];
        const result = await processor.translateGoal(input);

        expect(result).toBeValidSMARTGoal();
        expect(result.confidence).toBeGreaterThan(0.8);
        expect(result.smartGoal).toBeTruthy();
        expect(result.smartCriteria).toBeDefined();
        expect(Array.isArray(result.clarificationQuestions)).toBe(true);
        expect(Array.isArray(result.missingCriteria)).toBe(true);
      });

      it('should handle goal input with context', async () => {
        const input = validGoalInputs[0];
        const result = await processor.translateGoal(input);

        expect(result).toBeValidSMARTGoal();
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.openai.com/v1/chat/completions',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': expect.stringContaining('Bearer'),
              'Content-Type': 'application/json'
            })
          })
        );

        // Verify the prompt includes context
        const callArgs = mockFetch.mock.calls[0][1] as any;
        const body = JSON.parse(callArgs.body);
        expect(body.messages[1].content).toContain(input.context?.timeframe);
        expect(body.messages[1].content).toContain(input.context?.priority);
      });

      it('should handle goal input without context', async () => {
        const input: RawGoalInput = { goal: "Learn to code" };
        const result = await processor.translateGoal(input);

        expect(result).toBeValidSMARTGoal();
      });

      it('should use user-provided API key when available', async () => {
        const input = validGoalInputs[0];
        await processor.translateGoal(input, validApiKey);

        const callArgs = mockFetch.mock.calls[0][1] as any;
        expect(callArgs.headers.Authorization).toBe(`Bearer ${validApiKey}`);
      });

      it('should handle complex multi-faceted goals', async () => {
        const input = complexGoalInputs[0];
        const result = await processor.translateGoal(input);

        expect(result).toBeValidSMARTGoal();
        expect(result.smartCriteria.specific.value).toBeTruthy();
        expect(result.smartCriteria.measurable.metrics.length).toBeGreaterThan(0);
      });

      it('should handle well-defined goals with high confidence', async () => {
        const input = wellDefinedGoalInputs[0];
        const result = await processor.translateGoal(input);

        expect(result).toBeValidSMARTGoal();
        expect(result).toHaveHighConfidence();
        expect(result.missingCriteria.length).toBeLessThan(3);
      });
    });

    describe('Low confidence scenarios', () => {
      beforeEach(() => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockLowConfidenceResponse
        });
      });

      it('should handle vague goals with low confidence', async () => {
        const input = vagueGoalInputs[0];
        const result = await processor.translateGoal(input);

        expect(result).toBeValidSMARTGoal();
        expect(result.confidence).toBeLessThan(0.5);
        expect(result.missingCriteria.length).toBeGreaterThan(2);
        expect(result.clarificationQuestions.length).toBeGreaterThan(3);
      });

      it('should identify missing criteria for incomplete goals', async () => {
        const input = incompleteGoalInputs[0];
        const result = await processor.translateGoal(input);

        expect(result).toBeValidSMARTGoal();
        expect(result.missingCriteria).toContain('measurable');
        expect(result.clarificationQuestions.length).toBeGreaterThan(0);
      });
    });

    describe('Error handling', () => {
      it('should throw error when API key is missing', async () => {
        const originalKey = process.env.OPENAI_API_KEY;
        delete process.env.OPENAI_API_KEY;
        
        const newProcessor = new SMARTGoalProcessor();
        const input = validGoalInputs[0];

        await expect(newProcessor.translateGoal(input)).rejects.toThrow('OpenAI API key not configured');
        
        process.env.OPENAI_API_KEY = originalKey;
      });

      it('should handle OpenAI API rate limiting', async () => {
        mockFetch.mockResolvedValue(mockErrorResponse);
        
        const input = validGoalInputs[0];
        await expect(processor.translateGoal(input)).rejects.toThrow('OpenAI API call failed');
      });

      it('should handle invalid API key errors', async () => {
        mockFetch.mockResolvedValue(mockInvalidAPIKeyResponse);
        
        const input = validGoalInputs[0];
        await expect(processor.translateGoal(input, invalidApiKey)).rejects.toThrow('OpenAI API call failed');
      });

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));
        
        const input = validGoalInputs[0];
        await expect(processor.translateGoal(input)).rejects.toThrow('Network error');
      });

      it('should handle malformed AI responses', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: 'invalid json' } }] })
        });
        
        const input = validGoalInputs[0];
        await expect(processor.translateGoal(input)).rejects.toThrow('Failed to parse AI response');
      });

      it('should handle empty AI responses', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ choices: [] })
        });
        
        const input = validGoalInputs[0];
        await expect(processor.translateGoal(input)).rejects.toThrow();
      });
    });

    describe('Edge cases', () => {
      beforeEach(() => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockOpenAIResponse
        });
      });

      it('should handle empty goal input', async () => {
        const input = edgeCaseInputs[0];
        const result = await processor.translateGoal(input);
        
        expect(result).toBeValidSMARTGoal();
      });

      it('should handle very long goal input', async () => {
        const input = edgeCaseInputs[1];
        const result = await processor.translateGoal(input);
        
        expect(result).toBeValidSMARTGoal();
      });

      it('should handle special characters in goal input', async () => {
        const input = edgeCaseInputs[2];
        const result = await processor.translateGoal(input);
        
        expect(result).toBeValidSMARTGoal();
      });

      it('should handle unicode characters in goal input', async () => {
        const input = edgeCaseInputs[3];
        const result = await processor.translateGoal(input);
        
        expect(result).toBeValidSMARTGoal();
      });
    });

    describe('Prompt generation', () => {
      beforeEach(() => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockOpenAIResponse
        });
      });

      it('should generate proper prompts with context', async () => {
        const input = validGoalInputs[0];
        await processor.translateGoal(input);

        const callArgs = mockFetch.mock.calls[0][1] as any;
        const body = JSON.parse(callArgs.body);
        
        expect(body.messages).toHaveLength(2);
        expect(body.messages[0].role).toBe('system');
        expect(body.messages[1].role).toBe('user');
        expect(body.messages[1].content).toContain(input.goal);
        expect(body.model).toBeDefined();
        expect(body.temperature).toBe(0.3);
        expect(body.max_tokens).toBe(2000);
      });

      it('should include all context information in prompt', async () => {
        const input = validGoalInputs[0];
        await processor.translateGoal(input);

        const callArgs = mockFetch.mock.calls[0][1] as any;
        const body = JSON.parse(callArgs.body);
        const prompt = body.messages[1].content;

        expect(prompt).toContain(input.context?.timeframe);
        expect(prompt).toContain(input.context?.priority);
        expect(prompt).toContain('SMART');
        expect(prompt).toContain('JSON');
      });
    });
  });

  describe('processClarifications', () => {
    const originalGoal = "I want to increase website traffic";
    const mockClarifications: ClarificationAnswer[] = [
      {
        question: "What is your current monthly website traffic baseline?",
        answer: "About 5,000 unique visitors per month",
        smartCriterion: "measurable"
      },
      {
        question: "When do you want to achieve this goal?",
        answer: "By the end of this year",
        smartCriterion: "timeBound"
      }
    ];

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockOpenAIResponse
      });
    });

    it('should process clarification answers successfully', async () => {
      const result = await processor.processClarifications(
        originalGoal,
        mockGoalTranslationResult.smartCriteria,
        mockClarifications
      );

      expect(result).toBeValidSMARTGoal();
      expect(result.confidence).toBeGreaterThan(mockGoalTranslationResult.confidence);
    });

    it('should include clarification answers in the prompt', async () => {
      await processor.processClarifications(
        originalGoal,
        mockGoalTranslationResult.smartCriteria,
        mockClarifications
      );

      const callArgs = mockFetch.mock.calls[0][1] as any;
      const body = JSON.parse(callArgs.body);
      const prompt = body.messages[1].content;

      mockClarifications.forEach(clarification => {
        expect(prompt).toContain(clarification.question);
        expect(prompt).toContain(clarification.answer);
        expect(prompt).toContain(clarification.smartCriterion);
      });
    });

    it('should use user-provided API key when available', async () => {
      await processor.processClarifications(
        originalGoal,
        mockGoalTranslationResult.smartCriteria,
        mockClarifications,
        validApiKey
      );

      const callArgs = mockFetch.mock.calls[0][1] as any;
      expect(callArgs.headers.Authorization).toBe(`Bearer ${validApiKey}`);
    });

    it('should handle empty clarifications array', async () => {
      const result = await processor.processClarifications(
        originalGoal,
        mockGoalTranslationResult.smartCriteria,
        []
      );

      expect(result).toBeValidSMARTGoal();
    });

    it('should handle API errors during clarification processing', async () => {
      mockFetch.mockResolvedValue(mockErrorResponse);

      await expect(processor.processClarifications(
        originalGoal,
        mockGoalTranslationResult.smartCriteria,
        mockClarifications
      )).rejects.toThrow('OpenAI API call failed');
    });
  });

  describe('analyzeGoalCompleteness', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockAnalysisResponse
      });
    });

    it('should analyze goal completeness successfully', async () => {
      const result = await processor.analyzeGoalCompleteness(mockGoalTranslationResult.smartCriteria);

      expect(result.completenessScore).toBeGreaterThan(0);
      expect(result.completenessScore).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.strengths)).toBe(true);
      expect(Array.isArray(result.weaknesses)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should use user-provided API key when available', async () => {
      await processor.analyzeGoalCompleteness(mockGoalTranslationResult.smartCriteria, validApiKey);

      const callArgs = mockFetch.mock.calls[0][1] as any;
      expect(callArgs.headers.Authorization).toBe(`Bearer ${validApiKey}`);
    });

    it('should handle API errors during analysis', async () => {
      mockFetch.mockResolvedValue(mockErrorResponse);

      await expect(processor.analyzeGoalCompleteness(mockGoalTranslationResult.smartCriteria))
        .rejects.toThrow('OpenAI API call failed');
    });

    it('should validate analysis response format', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: '{"invalidFormat": true}'
            }
          }]
        })
      });

      const result = await processor.analyzeGoalCompleteness(mockGoalTranslationResult.smartCriteria);

      // Should handle invalid format gracefully
      expect(result.completenessScore).toBe(0);
      expect(result.strengths).toEqual([]);
      expect(result.weaknesses).toEqual([]);
      expect(result.recommendations).toEqual([]);
    });
  });

  describe('Response parsing', () => {
    it('should strip markdown code blocks from responses', async () => {
      const responseWithMarkdown = {
        choices: [{
          message: {
            content: '```json\n' + JSON.stringify(mockOpenAIResponse.choices[0].message.content) + '\n```'
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => responseWithMarkdown
      });

      const input = validGoalInputs[0];
      const result = await processor.translateGoal(input);

      expect(result).toBeValidSMARTGoal();
    });

    it('should handle responses with generic code blocks', async () => {
      const responseWithGenericMarkdown = {
        choices: [{
          message: {
            content: '```\n' + JSON.stringify(mockOpenAIResponse.choices[0].message.content) + '\n```'
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => responseWithGenericMarkdown
      });

      const input = validGoalInputs[0];
      const result = await processor.translateGoal(input);

      expect(result).toBeValidSMARTGoal();
    });

    it('should validate required fields in AI response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                smartGoal: "Valid goal",
                // Missing smartCriteria and confidence
              })
            }
          }]
        })
      });

      const input = validGoalInputs[0];
      await expect(processor.translateGoal(input)).rejects.toThrow('Invalid AI response format');
    });
  });

  describe('Logging and correlation', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockOpenAIResponse
      });
    });

    it('should generate correlation IDs for tracking', async () => {
      const input = validGoalInputs[0];
      
      // Mock the logger to capture calls
      const logSpy = jest.spyOn(console, 'info');
      
      await processor.translateGoal(input);

      expect(logSpy).toHaveBeenCalledWith(
        'Starting SMART goal translation',
        expect.objectContaining({
          correlationId: expect.any(String),
          rawGoal: input.goal,
          hasContext: true,
          hasUserApiKey: false
        })
      );
    });

    it('should log completion with metrics', async () => {
      const input = validGoalInputs[0];
      
      const logSpy = jest.spyOn(console, 'info');
      
      await processor.translateGoal(input);

      expect(logSpy).toHaveBeenCalledWith(
        'SMART goal translation completed',
        expect.objectContaining({
          correlationId: expect.any(String),
          confidence: expect.any(Number),
          missingCriteriaCount: expect.any(Number),
          clarificationQuestionsCount: expect.any(Number)
        })
      );
    });

    it('should log errors with context', async () => {
      mockFetch.mockRejectedValue(new Error('Test error'));
      
      const errorSpy = jest.spyOn(console, 'error');
      const input = validGoalInputs[0];

      await expect(processor.translateGoal(input)).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalledWith(
        'SMART goal translation failed',
        expect.objectContaining({
          correlationId: expect.any(String),
          error: 'Test error',
          rawGoal: input.goal
        })
      );
    });
  });
});