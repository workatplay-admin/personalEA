import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { SMARTGoalProcessor, ClarificationAnswer } from '../../src/services/smart-goal-processor';
import { createMockOpenAIResponse } from '../mocks/openai.mock';

// Mock fetch globally with proper typing
const mockFetch = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
global.fetch = mockFetch as any;

// Performance tracking utilities
interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    delta: {
      heapUsed: number;
      external: number;
    };
  };
  success: boolean;
  error?: string;
}

class PerformanceTracker {
  private metrics: PerformanceMetrics[] = [];

  async track<T>(operation: () => Promise<T>): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const memBefore = process.memoryUsage();
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;
    let result: T;

    try {
      result = await operation();
      success = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      const memAfter = process.memoryUsage();
      const metrics: PerformanceMetrics = {
        responseTime: Date.now() - startTime,
        memoryUsage: {
          before: memBefore,
          after: memAfter,
          delta: {
            heapUsed: memAfter.heapUsed - memBefore.heapUsed,
            external: memAfter.external - memBefore.external
          }
        },
        success,
        error
      };
      this.metrics.push(metrics);
    }

    return { result: result!, metrics: this.metrics[this.metrics.length - 1] };
  }

  getStats() {
    const successfulMetrics = this.metrics.filter(m => m.success);
    if (successfulMetrics.length === 0) return null;

    const responseTimes = successfulMetrics.map(m => m.responseTime);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];
    const p99ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.99)];
    
    return {
      totalRequests: this.metrics.length,
      successfulRequests: successfulMetrics.length,
      failedRequests: this.metrics.filter(m => !m.success).length,
      avgResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes)
    };
  }

  reset() {
    this.metrics = [];
  }
}

describe('Performance and Reliability Benchmarks', () => {
  let processor: SMARTGoalProcessor;
  let tracker: PerformanceTracker;
  const validApiKey = 'sk-test-performance';

  beforeEach(() => {
    processor = new SMARTGoalProcessor();
    tracker = new PerformanceTracker();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Response Time Benchmarks', () => {
    it('should process simple goals within 100ms (mocked)', async () => {
      const simpleGoals = [
        "Lose 10 pounds",
        "Learn Python",
        "Save $5000",
        "Read 20 books",
        "Run a 5K"
      ];

      for (const goal of simpleGoals) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify(createMockOpenAIResponse({
                  smartGoal: goal,
                  confidence: 0.7
                }))
              }
            }]
          })
        });

        const { metrics } = await tracker.track(() => 
          processor.translateGoal({ goal })
        );

        expect(metrics.responseTime).toBeLessThan(100);
      }

      const stats = tracker.getStats();
      expect(stats?.avgResponseTime).toBeLessThan(50);
    });

    it('should handle complex goals within 200ms (mocked)', async () => {
      const complexGoal = {
        goal: "Transform my software consulting business to achieve $500k annual recurring revenue within 18 months by expanding service offerings, hiring 5 senior developers, and establishing partnerships with 3 major tech companies",
        context: {
          currentRevenue: "$200k",
          teamSize: "3 developers",
          constraints: "Limited marketing budget, competitive market"
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify(createMockOpenAIResponse({
                smartGoal: complexGoal.goal,
                confidence: 0.85
              }))
            }
          }]
        })
      });

      const { metrics } = await tracker.track(() => 
        processor.translateGoal(complexGoal)
      );

      expect(metrics.responseTime).toBeLessThan(200);
    });

    it('should maintain consistent performance across multiple clarification rounds', async () => {
      const goal = "Improve my health";
      const baseCriteria = {} as any;

      // Simulate 5 rounds of clarification
      for (let round = 1; round <= 5; round++) {
        const clarifications: ClarificationAnswer[] = Array(round).fill(null).map((_, i) => ({
          question: `Question ${i}`,
          answer: `Detailed answer ${i}`,
          smartCriterion: ["specific", "measurable", "achievable", "relevant", "timeBound"][i % 5] as any
        }));

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify(createMockOpenAIResponse({
                  confidence: 0.5 + (round * 0.1)
                }))
              }
            }]
          })
        });

        const { metrics } = await tracker.track(() => 
          processor.processClarifications(goal, baseCriteria, clarifications)
        );

        // Performance should not degrade significantly with more clarifications
        expect(metrics.responseTime).toBeLessThan(150 + (round * 20));
      }

      const stats = tracker.getStats();
      expect(stats?.p95ResponseTime).toBeLessThan(250);
    });
  });

  describe('Throughput Benchmarks', () => {
    it('should handle 100 concurrent requests efficiently', async () => {
      const concurrentGoals = Array(100).fill(null).map((_, i) => ({
        goal: `Goal ${i}: Achieve target ${i}`
      }));

      // Mock all responses
      concurrentGoals.forEach(() => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify(createMockOpenAIResponse({
                  confidence: 0.7
                }))
              }
            }]
          })
        });
      });

      const startTime = Date.now();
      const promises = concurrentGoals.map(goal => 
        tracker.track(() => processor.translateGoal(goal))
      );

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      expect(results.every(r => r.metrics.success)).toBe(true);
      
      // Should complete 100 requests in under 5 seconds
      expect(totalTime).toBeLessThan(5000);
      
      // Calculate throughput
      const throughput = (100 / totalTime) * 1000; // requests per second
      expect(throughput).toBeGreaterThan(20); // At least 20 req/s
    });

    it('should maintain stable memory usage under load', async () => {
      const iterations = 50;
      const memorySnapshots: number[] = [];

      for (let i = 0; i < iterations; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify(createMockOpenAIResponse({
                  confidence: 0.7
                }))
              }
            }]
          })
        });

        const { metrics } = await tracker.track(() => 
          processor.translateGoal({ goal: `Iteration ${i}` })
        );

        memorySnapshots.push(metrics.memoryUsage.after.heapUsed);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // Check for memory leaks
      const firstQuarter = memorySnapshots.slice(0, iterations / 4);
      const lastQuarter = memorySnapshots.slice(-iterations / 4);
      
      const avgFirstQuarter = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
      const avgLastQuarter = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;
      
      // Memory usage should not increase by more than 50%
      const memoryIncrease = (avgLastQuarter - avgFirstQuarter) / avgFirstQuarter;
      expect(memoryIncrease).toBeLessThan(0.5);
    });
  });

  describe('Reliability Benchmarks', () => {
    it('should handle intermittent API failures with retry logic', async () => {
      const totalAttempts = 10;
      let failureCount = 0;

      for (let i = 0; i < totalAttempts; i++) {
        // Simulate 30% failure rate
        if (Math.random() < 0.3) {
          failureCount++;
          mockFetch.mockRejectedValueOnce(new Error('Network error'));
        } else {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
              choices: [{
                message: {
                  content: JSON.stringify(createMockOpenAIResponse({
                    confidence: 0.7
                  }))
                }
              }]
            })
          });
        }

        try {
          await processor.translateGoal({ goal: `Test ${i}` });
        } catch (e) {
          // Expected for some requests
        }
      }

      const stats = tracker.getStats();
      expect(stats?.successfulRequests).toBeGreaterThan(totalAttempts * 0.6);
    });

    it('should recover from rate limiting gracefully', async () => {
      const requests = 20;
      let rateLimitHit = false;

      for (let i = 0; i < requests; i++) {
        if (i > 10 && !rateLimitHit) {
          // Simulate rate limit after 10 requests
          rateLimitHit = true;
          mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 429,
            headers: { get: () => "60" },
            text: async () => JSON.stringify({
              error: { message: "Rate limit exceeded" }
            })
          });
        } else {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
              choices: [{
                message: {
                  content: JSON.stringify(createMockOpenAIResponse({
                    confidence: 0.7
                  }))
                }
              }]
            })
          });
        }

        try {
          await processor.translateGoal({ goal: `Request ${i}` });
        } catch (e) {
          if (i === 11) {
            expect(e).toBeDefined();
          }
        }
      }

      const stats = tracker.getStats();
      // Should continue processing after rate limit
      expect(stats?.successfulRequests).toBeGreaterThan(10);
    });

    it('should handle timeout scenarios appropriately', async () => {
      const timeoutScenarios = [
        { delay: 50, shouldSucceed: true },
        { delay: 100, shouldSucceed: true },
        { delay: 5000, shouldSucceed: false } // Simulate timeout
      ];

      for (const scenario of timeoutScenarios) {
        mockFetch.mockImplementationOnce(() => 
          new Promise((resolve, reject) => {
            setTimeout(() => {
              if (scenario.delay > 3000) {
                reject(new Error('Request timeout'));
              } else {
                resolve({
                  ok: true,
                  status: 200,
                  json: async () => ({
                    choices: [{
                      message: {
                        content: JSON.stringify(createMockOpenAIResponse({
                          confidence: 0.7
                        }))
                      }
                    }]
                  })
                });
              }
            }, scenario.delay);
          })
        );

        try {
          const { metrics } = await tracker.track(() => 
            processor.translateGoal({ goal: "Timeout test" })
          );

          if (scenario.shouldSucceed) {
            expect(metrics.success).toBe(true);
            expect(metrics.responseTime).toBeGreaterThan(scenario.delay);
          }
        } catch (e) {
          if (!scenario.shouldSucceed) {
            expect(e).toBeDefined();
          }
        }
      }
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid fire requests without degradation', async () => {
      const rapidRequests = 50;
      const responseTimes: number[] = [];

      for (let i = 0; i < rapidRequests; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify(createMockOpenAIResponse({
                  confidence: 0.7
                }))
              }
            }]
          })
        });

        const startTime = Date.now();
        await processor.translateGoal({ goal: `Rapid request ${i}` });
        responseTimes.push(Date.now() - startTime);

        // No delay between requests
      }

      // Check for performance degradation
      const firstHalf = responseTimes.slice(0, rapidRequests / 2);
      const secondHalf = responseTimes.slice(rapidRequests / 2);
      
      const avgFirstHalf = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecondHalf = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      // Second half should not be significantly slower (within 20%)
      expect(avgSecondHalf).toBeLessThan(avgFirstHalf * 1.2);
    });

    it('should handle extremely long conversations without memory issues', async () => {
      const conversationLength = 100;
      const goal = "Long conversation test";
      let currentCriteria = {} as any;
      const memoryCheckpoints: number[] = [];

      for (let i = 0; i < conversationLength; i++) {
        const clarifications: ClarificationAnswer[] = [{
          question: `Question ${i}`,
          answer: `Answer ${i} with lots of details...`.repeat(10),
          smartCriterion: "specific"
        }];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify(createMockOpenAIResponse({
                  confidence: 0.3 + (i * 0.005),
                  smartCriteria: currentCriteria
                }))
              }
            }]
          })
        });

        const result = await processor.processClarifications(
          goal,
          currentCriteria,
          clarifications
        );

        currentCriteria = result.smartCriteria;

        // Check memory every 10 iterations
        if (i % 10 === 0) {
          memoryCheckpoints.push(process.memoryUsage().heapUsed);
        }
      }

      // Memory growth should be linear, not exponential
      for (let i = 1; i < memoryCheckpoints.length; i++) {
        const growth = memoryCheckpoints[i] - memoryCheckpoints[i-1];
        const avgGrowth = (memoryCheckpoints[i] - memoryCheckpoints[0]) / i;
        
        // Individual growth should not be more than 2x average
        expect(growth).toBeLessThan(avgGrowth * 2);
      }
    });
  });

  describe('Error Recovery Benchmarks', () => {
    it('should maintain performance after recovering from errors', async () => {
      const scenarios = [
        { type: 'success', error: false },
        { type: 'network_error', error: true },
        { type: 'parse_error', error: true },
        { type: 'success', error: false }, // Recovery
        { type: 'success', error: false },
      ];

      const successfulResponseTimes: number[] = [];

      for (const scenario of scenarios) {
        if (scenario.error) {
          if (scenario.type === 'network_error') {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));
          } else {
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 200,
              json: async () => { throw new Error('Parse error'); }
            });
          }

          try {
            await processor.translateGoal({ goal: "Error test" });
          } catch (e) {
            // Expected
          }
        } else {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
              choices: [{
                message: {
                  content: JSON.stringify(createMockOpenAIResponse({
                    confidence: 0.7
                  }))
                }
              }]
            })
          });

          const { metrics } = await tracker.track(() => 
            processor.translateGoal({ goal: "Success test" })
          );

          successfulResponseTimes.push(metrics.responseTime);
        }
      }

      // Performance should not degrade after errors
      expect(successfulResponseTimes[1]).toBeLessThan(successfulResponseTimes[0] * 1.5);
      expect(successfulResponseTimes[2]).toBeLessThan(successfulResponseTimes[0] * 1.5);
    });
  });

  describe('Resource Usage Benchmarks', () => {
    it('should efficiently handle large goal descriptions', async () => {
      const sizes = [100, 1000, 5000, 10000]; // Characters
      const metrics: PerformanceMetrics[] = [];

      for (const size of sizes) {
        const largeGoal = "I want to " + "achieve ".repeat(Math.floor(size / 8));

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify(createMockOpenAIResponse({
                  confidence: 0.7
                }))
              }
            }]
          })
        });

        const { metrics: m } = await tracker.track(() => 
          processor.translateGoal({ goal: largeGoal })
        );

        metrics.push(m);
      }

      // Processing time should scale sub-linearly with input size
      for (let i = 1; i < metrics.length; i++) {
        const sizeRatio = sizes[i] / sizes[i-1];
        const timeRatio = metrics[i].responseTime / metrics[i-1].responseTime;
        
        // Time should increase slower than size
        expect(timeRatio).toBeLessThan(sizeRatio);
      }
    });

    it('should handle various goal complexities with appropriate resource usage', async () => {
      const complexityLevels = [
        {
          name: 'simple',
          goal: 'Lose weight',
          expectedTime: 50,
          expectedMemory: 1000000 // 1MB
        },
        {
          name: 'moderate',
          goal: 'Start an online business selling handmade crafts with monthly revenue of $5000',
          expectedTime: 75,
          expectedMemory: 1500000 // 1.5MB
        },
        {
          name: 'complex',
          goal: 'Transform my traditional retail business into a fully digital e-commerce operation with omnichannel presence, automated inventory management, AI-powered customer service, and achieve 200% revenue growth within 18 months while maintaining 95% customer satisfaction',
          expectedTime: 100,
          expectedMemory: 2000000 // 2MB
        }
      ];

      for (const level of complexityLevels) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify(createMockOpenAIResponse({
                  confidence: 0.7
                }))
              }
            }]
          })
        });

        const { metrics } = await tracker.track(() => 
          processor.translateGoal({ goal: level.goal })
        );

        expect(metrics.responseTime).toBeLessThan(level.expectedTime);
        expect(metrics.memoryUsage.delta.heapUsed).toBeLessThan(level.expectedMemory);
      }
    });
  });
});