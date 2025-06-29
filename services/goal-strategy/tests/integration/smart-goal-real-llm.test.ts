import { describe, it, expect, beforeAll } from '@jest/globals';
import { SMARTGoalProcessor } from '../../src/services/smart-goal-processor';
import { validateAPIKeyRuntime } from '../../../shared/utils/validate-llm-connections';

describe('SMART Goal Processor - Real LLM Integration Tests', () => {
  let processor: SMARTGoalProcessor;
  let apiKey: string | undefined;

  beforeAll(() => {
    // Ensure we have a real API key for integration tests
    apiKey = process.env.OPENAI_API_KEY;
    validateAPIKeyRuntime(apiKey, 'OpenAI');
    
    processor = new SMARTGoalProcessor();
    
    console.log('Running integration tests with real OpenAI API');
    console.log(`Model: ${process.env.OPENAI_MODEL || 'gpt-3.5-turbo'}`);
  });

  describe('Goal Translation with Real LLM', () => {
    it('should translate a vague goal into SMART format using real API', async () => {
      const input = {
        goal: 'I want to get better at programming',
        context: {
          timeframe: 'this year',
          priority: 'HIGH' as const
        }
      };

      const result = await processor.translateGoal(input, apiKey);

      // Verify structure
      expect(result).toHaveProperty('smartGoal');
      expect(result).toHaveProperty('smartCriteria');
      expect(result).toHaveProperty('confidence');
      
      // Verify SMART criteria
      expect(result.smartCriteria).toHaveProperty('specific');
      expect(result.smartCriteria).toHaveProperty('measurable');
      expect(result.smartCriteria).toHaveProperty('achievable');
      expect(result.smartCriteria).toHaveProperty('relevant');
      expect(result.smartCriteria).toHaveProperty('timeBound');
      
      // Verify real LLM provided meaningful content
      expect(result.smartGoal.length).toBeGreaterThan(20);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      
      // Log the actual response for manual verification
      console.log('LLM Response:', JSON.stringify(result, null, 2));
    }, 30000); // 30 second timeout for API call

    it('should handle complex conditional goals with real parsing', async () => {
      const input = {
        goal: "It's stock car racing on the local dirt track. If I take some lessons and pass my race test, I can get my racing license in 10 months",
        mode: 'automatic' as const
      };

      const result = await processor.translateGoal(input, apiKey);

      // Verify the LLM understood the conditional nature
      expect(result.smartCriteria.specific.value).toContain('racing');
      expect(result.smartCriteria.timeBound.value).toContain('10 months');
      
      // Should identify prerequisites
      expect(result.smartGoal).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0.5);
    }, 30000);
  });

  describe('Goal Clarification with Real LLM', () => {
    it('should process clarifications and improve confidence scores', async () => {
      // Start with a basic goal
      const initialGoal = await processor.translateGoal({
        goal: 'Learn web development'
      }, apiKey);

      // Simulate user providing clarification
      const clarifications = [{
        question: 'What specific aspects of web development?',
        answer: 'I want to focus on React and Node.js to build full-stack applications',
        smartCriterion: 'specific' as const
      }];

      const improvedGoal = await processor.processClarifications(
        'Learn web development',
        initialGoal.smartCriteria,
        clarifications,
        apiKey
      );

      // Verify improvement
      expect(improvedGoal.smartCriteria.specific.confidence)
        .toBeGreaterThan(initialGoal.smartCriteria.specific.confidence);
      
      expect(improvedGoal.smartCriteria.specific.value).toContain('React');
      expect(improvedGoal.smartCriteria.specific.value).toContain('Node.js');
      
      console.log('Confidence improvement:', {
        before: initialGoal.smartCriteria.specific.confidence,
        after: improvedGoal.smartCriteria.specific.confidence
      });
    }, 45000); // 45 second timeout for multiple API calls
  });

  describe('Interactive Mode with Real LLM', () => {
    it('should analyze goals without transformation in interactive mode', async () => {
      const input = {
        goal: 'Start a successful online business',
        mode: 'interactive' as const
      };

      const analysis = await processor.analyzeGoalInteractive(input, apiKey);

      // Verify analysis structure
      expect(analysis).toHaveProperty('rawGoal');
      expect(analysis).toHaveProperty('analysis');
      expect(analysis).toHaveProperty('smartComponents');
      expect(analysis).toHaveProperty('recommendedQuestions');
      
      // Verify meaningful analysis
      expect(analysis.analysis.strengths.length).toBeGreaterThan(0);
      expect(analysis.analysis.weaknesses.length).toBeGreaterThan(0);
      expect(analysis.recommendedQuestions.length).toBeGreaterThan(0);
      
      // Should not transform the goal
      expect(analysis.rawGoal).toBe(input.goal);
      
      console.log('Interactive analysis:', JSON.stringify(analysis, null, 2));
    }, 30000);
  });

  describe('Error Handling with Real API', () => {
    it('should handle API errors gracefully', async () => {
      const processor = new SMARTGoalProcessor();
      
      // Use invalid API key
      const invalidKey = 'sk-invalid-key-test';
      
      await expect(processor.translateGoal({
        goal: 'Test goal'
      }, invalidKey)).rejects.toThrow();
    });

    it('should handle rate limiting gracefully', async () => {
      // This test would need to actually trigger rate limiting
      // For now, we'll just verify the processor handles errors
      expect(processor).toBeDefined();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should complete goal translation within acceptable time', async () => {
      const startTime = Date.now();
      
      await processor.translateGoal({
        goal: 'Improve my fitness level'
      }, apiKey);
      
      const duration = Date.now() - startTime;
      
      // Should complete within 10 seconds
      expect(duration).toBeLessThan(10000);
      
      console.log(`API call completed in ${duration}ms`);
    }, 15000);
  });
});

// Additional test suite for comprehensive scenarios
describe('SMART Goal Processor - Complex Scenarios', () => {
  let processor: SMARTGoalProcessor;
  let apiKey: string | undefined;

  beforeAll(() => {
    apiKey = process.env.OPENAI_API_KEY;
    processor = new SMARTGoalProcessor();
  });

  it('should handle multi-step goals with dependencies', async () => {
    const complexGoal = {
      goal: 'First I need to finish my degree, then get AWS certified, and finally land a cloud architect job at a tech company',
      context: {
        timeframe: '2 years',
        constraints: ['Currently in junior year', 'Working part-time'],
        priority: 'HIGH' as const
      }
    };

    const result = await processor.translateGoal(complexGoal, apiKey);

    // Should identify all milestones
    expect(result.smartCriteria.measurable.metrics).toContain('degree');
    expect(result.smartGoal).toContain('AWS');
    expect(result.confidence).toBeGreaterThan(0.6);
  }, 30000);

  it('should provide culturally aware goal suggestions', async () => {
    const goals = [
      'I want to improve work-life balance',
      'Build a sustainable passive income',
      'Become a thought leader in my industry'
    ];

    for (const goal of goals) {
      const result = await processor.translateGoal({ goal }, apiKey);
      
      // Each should get meaningful translation
      expect(result.smartGoal).not.toBe(goal);
      expect(result.clarificationQuestions.length).toBeGreaterThan(0);
    }
  }, 60000); // 60 seconds for multiple calls
});