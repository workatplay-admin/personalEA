import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { SMARTGoalProcessor, RawGoalInput } from '../../src/services/smart-goal-processor';

// Integration tests require real or near-real API interactions
// These tests should be run with actual API keys in a controlled environment

describe('OpenAI API Integration Tests', () => {
  let processor: SMARTGoalProcessor;
  const testApiKey = process.env['OPENAI_TEST_API_KEY'] || 'sk-test-mock-key';
  const shouldRunIntegrationTests = process.env['RUN_INTEGRATION_TESTS'] === 'true';

  beforeEach(() => {
    processor = new SMARTGoalProcessor();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Skip integration tests if not explicitly enabled
  const conditionalDescribe = shouldRunIntegrationTests ? describe : describe.skip;

  conditionalDescribe('Real OpenAI API Calls', () => {
    it('should successfully translate a goal with real API', async () => {
      const input: RawGoalInput = {
        goal: "I want to learn Python programming",
        context: {
          timeframe: "3 months",
          resources: ["Online courses", "Practice projects"],
          constraints: ["Limited time due to work"],
          priority: "MEDIUM"
        }
      };

      const result = await processor.translateGoal(input, testApiKey);

      expect(result.smartGoal).toBeDefined();
      expect(result.smartGoal.length).toBeGreaterThan(20);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.smartCriteria).toBeDefined();
      expect(Array.isArray(result.clarificationQuestions)).toBe(true);
      expect(Array.isArray(result.missingCriteria)).toBe(true);
    }, 30000); // 30 second timeout for real API calls

    it('should handle complex goals with real API', async () => {
      const input: RawGoalInput = {
        goal: "Build a successful e-commerce platform that generates significant revenue while providing excellent customer experience",
        context: {
          timeframe: "12 months",
          resources: ["Development team", "Marketing budget", "AWS infrastructure"],
          constraints: ["Budget limitations", "Market competition", "Technical complexity"],
          priority: "CRITICAL"
        }
      };

      const result = await processor.translateGoal(input, testApiKey);

      expect(result.smartGoal).toContain("e-commerce");
      expect(result.smartCriteria.specific.value).toBeTruthy();
      expect(result.smartCriteria.measurable.metrics.length).toBeGreaterThan(0);
      expect(result.smartCriteria.timeBound.value).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0.5);
    }, 30000);

    it('should process clarifications with real API', async () => {
      const originalGoal = "Improve my website";
      const smartCriteria = {
        specific: { value: "Improve website", confidence: 0.3, missing: ["specific improvements"] },
        measurable: { value: "Better performance", confidence: 0.2, missing: ["metrics"] },
        achievable: { value: "Should be doable", confidence: 0.5, missing: ["resources"] },
        relevant: { value: "Important for business", confidence: 0.7, missing: [] },
        timeBound: { value: "Soon", confidence: 0.2, missing: ["deadline"] }
      };

      const clarifications = [
        {
          question: "What specific improvements do you want to make?",
          answer: "Increase page load speed and improve mobile responsiveness",
          smartCriterion: "specific" as const
        },
        {
          question: "How will you measure these improvements?",
          answer: "Target page load time under 2 seconds and 95+ mobile performance score",
          smartCriterion: "measurable" as const
        }
      ];

      const result = await processor.processClarifications(
        originalGoal,
        smartCriteria as any,
        clarifications,
        testApiKey
      );

      expect(result.smartCriteria.specific.confidence).toBeGreaterThan(0.3);
      expect(result.smartCriteria.measurable.confidence).toBeGreaterThan(0.2);
      expect(result.confidence).toBeGreaterThan(0.4);
    }, 30000);
  });

  describe('API Error Handling and Resilience', () => {
    // Mock fetch for error simulation tests
    const mockFetch = jest.fn();
    
    beforeEach(() => {
      global.fetch = mockFetch as any;
    });

    it('should handle rate limiting (429) with proper error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({
          error: {
            message: "Rate limit reached for requests",
            type: "requests",
            param: null,
            code: "rate_limit_exceeded"
          }
        })
      });

      const input: RawGoalInput = { goal: "Test goal" };

      await expect(processor.translateGoal(input, testApiKey))
        .rejects.toThrow(/OpenAI API call failed.*429/);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${testApiKey}`,
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should handle invalid API key (401) errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({
          error: {
            message: "Incorrect API key provided",
            type: "invalid_request_error",
            param: null,
            code: "invalid_api_key"
          }
        })
      });

      const input: RawGoalInput = { goal: "Test goal" };

      await expect(processor.translateGoal(input, 'invalid-key'))
        .rejects.toThrow(/OpenAI API call failed.*401/);
    });

    it('should handle quota exceeded (429) errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({
          error: {
            message: "You exceeded your current quota",
            type: "insufficient_quota",
            param: null,
            code: "insufficient_quota"
          }
        })
      });

      const input: RawGoalInput = { goal: "Test goal" };

      await expect(processor.translateGoal(input, testApiKey))
        .rejects.toThrow(/OpenAI API call failed.*429/);
    });

    it('should handle server errors (500) gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error"
      });

      const input: RawGoalInput = { goal: "Test goal" };

      await expect(processor.translateGoal(input, testApiKey))
        .rejects.toThrow(/OpenAI API call failed.*500/);
    });

    it('should handle network timeouts', async () => {
      mockFetch.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100);
        });
      });

      const input: RawGoalInput = { goal: "Test goal" };

      await expect(processor.translateGoal(input, testApiKey))
        .rejects.toThrow('Network timeout');
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      const input: RawGoalInput = { goal: "Test goal" };

      await expect(processor.translateGoal(input, testApiKey))
        .rejects.toThrow('Invalid JSON');
    });

    it('should handle empty API responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({})
      });

      const input: RawGoalInput = { goal: "Test goal" };

      await expect(processor.translateGoal(input, testApiKey))
        .rejects.toThrow();
    });

    it('should handle API responses with missing choices', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: "chatcmpl-123",
          object: "chat.completion",
          created: 1677652288,
          choices: []
        })
      });

      const input: RawGoalInput = { goal: "Test goal" };

      await expect(processor.translateGoal(input, testApiKey))
        .rejects.toThrow();
    });
  });

  describe('API Request Validation', () => {
    const mockFetch = jest.fn();
    
    beforeEach(() => {
      global.fetch = mockFetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                smartGoal: "Test goal",
                smartCriteria: {
                  specific: { value: "test", confidence: 0.8, missing: [] },
                  measurable: { value: "test", metrics: [], confidence: 0.8, missing: [] },
                  achievable: { value: "test", confidence: 0.8, missing: [] },
                  relevant: { value: "test", confidence: 0.8, missing: [] },
                  timeBound: { value: "test", confidence: 0.8, missing: [] }
                },
                missingCriteria: [],
                clarificationQuestions: [],
                confidence: 0.8
              })
            }
          }]
        })
      });
    });

    it('should send correct request structure to OpenAI API', async () => {
      const input: RawGoalInput = {
        goal: "Learn machine learning",
        context: {
          timeframe: "6 months",
          resources: ["Online courses"],
          priority: "HIGH"
        }
      };

      await processor.translateGoal(input, testApiKey);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${testApiKey}`,
            'Content-Type': 'application/json'
          },
          body: expect.stringContaining('"model"')
        })
      );

      const callBody = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(callBody).toMatchObject({
        model: expect.any(String),
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' })
        ]),
        temperature: 0.3,
        max_tokens: 2000
      });
    });

    it('should include goal and context in the prompt', async () => {
      const input: RawGoalInput = {
        goal: "Build a mobile app",
        context: {
          timeframe: "8 months",
          resources: ["Development team", "Budget"],
          constraints: ["iOS and Android compatibility"],
          priority: "CRITICAL"
        }
      };

      await processor.translateGoal(input, testApiKey);

      const callBody = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      const userMessage = callBody.messages.find((m: any) => m.role === 'user');
      
      expect(userMessage.content).toContain("Build a mobile app");
      expect(userMessage.content).toContain("8 months");
      expect(userMessage.content).toContain("Development team");
      expect(userMessage.content).toContain("CRITICAL");
    });

    it('should use correct model configuration', async () => {
      const input: RawGoalInput = { goal: "Test goal" };

      await processor.translateGoal(input, testApiKey);

      const callBody = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      
      expect(callBody.model).toBeDefined();
      expect(callBody.temperature).toBe(0.3);
      expect(callBody.max_tokens).toBe(2000);
      expect(callBody.messages).toHaveLength(2); // system + user
    });
  });

  describe('Response Processing and Validation', () => {
    const mockFetch = jest.fn();
    
    beforeEach(() => {
      global.fetch = mockFetch as any;
    });

    it('should correctly parse valid OpenAI responses', async () => {
      const mockResponse = {
        smartGoal: "Increase website traffic by 30% within 6 months",
        smartCriteria: {
          specific: { value: "Increase website traffic", confidence: 0.9, missing: [] },
          measurable: { value: "30% increase", metrics: ["unique visitors"], confidence: 0.9, missing: [] },
          achievable: { value: "Realistic with SEO", confidence: 0.8, missing: [] },
          relevant: { value: "Business growth", confidence: 0.9, missing: [] },
          timeBound: { value: "6 months", deadline: "2024-06-30", confidence: 0.9, missing: [] }
        },
        missingCriteria: [],
        clarificationQuestions: [],
        confidence: 0.88
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify(mockResponse)
            }
          }]
        })
      });

      const input: RawGoalInput = { goal: "Grow website traffic" };
      const result = await processor.translateGoal(input, testApiKey);

      expect(result.smartGoal).toBe(mockResponse.smartGoal);
      expect(result.confidence).toBe(mockResponse.confidence);
      expect(result.smartCriteria.specific.confidence).toBe(0.9);
    });

    it('should handle markdown code blocks in responses', async () => {
      const jsonContent = {
        smartGoal: "Test goal",
        smartCriteria: {
          specific: { value: "test", confidence: 0.8, missing: [] },
          measurable: { value: "test", metrics: [], confidence: 0.8, missing: [] },
          achievable: { value: "test", confidence: 0.8, missing: [] },
          relevant: { value: "test", confidence: 0.8, missing: [] },
          timeBound: { value: "test", confidence: 0.8, missing: [] }
        },
        missingCriteria: [],
        clarificationQuestions: [],
        confidence: 0.8
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: `\`\`\`json\n${JSON.stringify(jsonContent)}\n\`\`\``
            }
          }]
        })
      });

      const input: RawGoalInput = { goal: "Test goal" };
      const result = await processor.translateGoal(input, testApiKey);

      expect(result.smartGoal).toBe("Test goal");
      expect(result.confidence).toBe(0.8);
    });

    it('should validate required fields in API responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                smartGoal: "Test goal"
                // Missing required fields: smartCriteria, confidence
              })
            }
          }]
        })
      });

      const input: RawGoalInput = { goal: "Test goal" };

      await expect(processor.translateGoal(input, testApiKey))
        .rejects.toThrow('Invalid AI response format');
    });
  });

  describe('Performance and Timeout Handling', () => {
    const mockFetch = jest.fn();
    
    beforeEach(() => {
      global.fetch = mockFetch as any;
    });

    it('should handle slow API responses within timeout', async () => {
      mockFetch.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: async () => ({
                choices: [{
                  message: {
                    content: JSON.stringify({
                      smartGoal: "Slow response goal",
                      smartCriteria: {
                        specific: { value: "test", confidence: 0.8, missing: [] },
                        measurable: { value: "test", metrics: [], confidence: 0.8, missing: [] },
                        achievable: { value: "test", confidence: 0.8, missing: [] },
                        relevant: { value: "test", confidence: 0.8, missing: [] },
                        timeBound: { value: "test", confidence: 0.8, missing: [] }
                      },
                      missingCriteria: [],
                      clarificationQuestions: [],
                      confidence: 0.8
                    })
                  }
                }]
              })
            });
          }, 5000); // 5 second delay
        });
      });

      const input: RawGoalInput = { goal: "Test slow response" };
      
      const startTime = Date.now();
      const result = await processor.translateGoal(input, testApiKey);
      const endTime = Date.now();

      expect(result.smartGoal).toBe("Slow response goal");
      expect(endTime - startTime).toBeGreaterThan(4900); // At least 5 seconds
    }, 10000); // 10 second test timeout

    it('should provide meaningful error context in failures', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({
          error: {
            message: "Invalid request format",
            type: "invalid_request_error",
            param: "messages",
            code: "invalid_format"
          }
        })
      });

      const input: RawGoalInput = { goal: "Test error context" };

      try {
        await processor.translateGoal(input, testApiKey);
        fail('Expected error to be thrown');
      } catch (error) {
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain('400');
        expect(errorMessage).toContain('Invalid request format');
      }
    });
  });

  describe('API Key Management', () => {
    it('should prioritize user-provided API key over environment', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                smartGoal: "User key goal",
                smartCriteria: {
                  specific: { value: "test", confidence: 0.8, missing: [] },
                  measurable: { value: "test", metrics: [], confidence: 0.8, missing: [] },
                  achievable: { value: "test", confidence: 0.8, missing: [] },
                  relevant: { value: "test", confidence: 0.8, missing: [] },
                  timeBound: { value: "test", confidence: 0.8, missing: [] }
                },
                missingCriteria: [],
                clarificationQuestions: [],
                confidence: 0.8
              })
            }
          }]
        })
      });

      global.fetch = mockFetch as any;

      const userApiKey = 'sk-user-provided-key';
      const input: RawGoalInput = { goal: "Test user key priority" };

      await processor.translateGoal(input, userApiKey);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${userApiKey}`
          })
        })
      );
    });

    it('should handle missing API keys gracefully', async () => {
      const originalKey = process.env['OPENAI_API_KEY'];
      delete process.env['OPENAI_API_KEY'];

      const processorWithoutKey = new SMARTGoalProcessor();
      const input: RawGoalInput = { goal: "Test missing key" };

      await expect(processorWithoutKey.translateGoal(input))
        .rejects.toThrow('OpenAI API key not configured');

      if (originalKey) {
        process.env['OPENAI_API_KEY'] = originalKey;
      }
    });
  });
});