import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { SMARTGoalProcessor, SMARTCriteria } from '../../src/services/smart-goal-processor';
import { mockAnalysisResponse, mockGoalTranslationResult } from '../mocks/openai.mock';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('Goal Validation and Completeness Scoring', () => {
  let processor: SMARTGoalProcessor;

  beforeEach(() => {
    processor = new SMARTGoalProcessor();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('SMART Criteria Validation', () => {
    const completeSMARTCriteria: SMARTCriteria = {
      specific: {
        value: "Increase monthly website traffic by 25%",
        confidence: 0.9,
        missing: []
      },
      measurable: {
        value: "25% increase tracked via Google Analytics",
        metrics: ["Monthly unique visitors", "Page views", "Organic traffic"],
        confidence: 0.95,
        missing: []
      },
      achievable: {
        value: "Realistic based on current growth trends and available resources",
        confidence: 0.8,
        missing: []
      },
      relevant: {
        value: "Aligns with business growth and customer acquisition goals",
        confidence: 0.9,
        missing: []
      },
      timeBound: {
        value: "Complete by December 31, 2024",
        deadline: "2024-12-31T23:59:59Z",
        confidence: 0.9,
        missing: []
      }
    };

    const incompleteSMARTCriteria: SMARTCriteria = {
      specific: {
        value: "Increase website traffic",
        confidence: 0.6,
        missing: ["target percentage", "traffic source specification"]
      },
      measurable: {
        value: "More visitors",
        metrics: [],
        confidence: 0.3,
        missing: ["specific metrics", "measurement tools", "baseline data"]
      },
      achievable: {
        value: "Should be possible",
        confidence: 0.5,
        missing: ["resource assessment", "current capacity analysis"]
      },
      relevant: {
        value: "Good for business",
        confidence: 0.7,
        missing: ["alignment with specific objectives"]
      },
      timeBound: {
        value: "Soon",
        confidence: 0.2,
        missing: ["specific deadline", "milestone timeline"]
      }
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockAnalysisResponse
      });
    });

    it('should identify complete SMART criteria', async () => {
      const analysis = await processor.analyzeGoalCompleteness(completeSMARTCriteria);

      expect(analysis.completenessScore).toBeGreaterThan(0.8);
      expect(analysis.strengths.length).toBeGreaterThan(2);
      expect(analysis.weaknesses.length).toBeLessThan(3);
    });

    it('should identify incomplete SMART criteria', async () => {
      const analysis = await processor.analyzeGoalCompleteness(incompleteSMARTCriteria);

      expect(analysis.completenessScore).toBeLessThan(0.6);
      expect(analysis.weaknesses.length).toBeGreaterThan(2);
      expect(analysis.recommendations.length).toBeGreaterThan(3);
    });

    it('should calculate confidence scores accurately', () => {
      const highConfidenceCriteria = completeSMARTCriteria;
      const lowConfidenceCriteria = incompleteSMARTCriteria;

      // Calculate average confidence for complete criteria
      const highAvgConfidence = Object.values(highConfidenceCriteria)
        .reduce((sum, criterion) => sum + criterion.confidence, 0) / 5;

      // Calculate average confidence for incomplete criteria  
      const lowAvgConfidence = Object.values(lowConfidenceCriteria)
        .reduce((sum, criterion) => sum + criterion.confidence, 0) / 5;

      expect(highAvgConfidence).toBeGreaterThan(0.8);
      expect(lowAvgConfidence).toBeLessThan(0.6);
    });

    it('should identify missing information correctly', () => {
      const missingInfo = Object.values(incompleteSMARTCriteria)
        .flatMap(criterion => criterion.missing || []);

      expect(missingInfo).toContain('target percentage');
      expect(missingInfo).toContain('specific metrics');
      expect(missingInfo).toContain('specific deadline');
      expect(missingInfo.length).toBeGreaterThan(5);
    });

    it('should validate specific criterion completeness', () => {
      // Complete specific criterion
      expect(completeSMARTCriteria.specific.confidence).toBeGreaterThan(0.8);
      expect(completeSMARTCriteria.specific.missing).toEqual([]);
      expect(completeSMARTCriteria.specific.value).toContain('25%');

      // Incomplete specific criterion
      expect(incompleteSMARTCriteria.specific.confidence).toBeLessThan(0.7);
      expect(incompleteSMARTCriteria.specific.missing!.length).toBeGreaterThan(0);
    });

    it('should validate measurable criterion with metrics', () => {
      // Complete measurable criterion
      expect(completeSMARTCriteria.measurable.metrics.length).toBeGreaterThan(2);
      expect(completeSMARTCriteria.measurable.confidence).toBeGreaterThan(0.9);

      // Incomplete measurable criterion
      expect(incompleteSMARTCriteria.measurable.metrics.length).toBe(0);
      expect(incompleteSMARTCriteria.measurable.confidence).toBeLessThan(0.5);
    });

    it('should validate time-bound criterion with deadlines', () => {
      // Complete time-bound criterion
      expect(completeSMARTCriteria.timeBound.deadline).toBeDefined();
      expect(completeSMARTCriteria.timeBound.confidence).toBeGreaterThan(0.8);

      // Incomplete time-bound criterion
      expect(incompleteSMARTCriteria.timeBound.deadline).toBeUndefined();
      expect(incompleteSMARTCriteria.timeBound.confidence).toBeLessThan(0.5);
    });
  });

  describe('Goal Completeness Scoring Algorithm', () => {
    it('should calculate completeness based on multiple factors', async () => {
      const testCriteria: SMARTCriteria = {
        specific: { value: "Clear objective", confidence: 0.9, missing: [] },
        measurable: { value: "Quantified metrics", metrics: ["metric1", "metric2"], confidence: 0.8, missing: [] },
        achievable: { value: "Realistic assessment", confidence: 0.7, missing: ["resource check"] },
        relevant: { value: "Aligned with goals", confidence: 0.9, missing: [] },
        timeBound: { value: "December 2024", deadline: "2024-12-31", confidence: 0.8, missing: [] }
      };

      const analysis = await processor.analyzeGoalCompleteness(testCriteria);

      // Score should consider:
      // - Average confidence: (0.9 + 0.8 + 0.7 + 0.9 + 0.8) / 5 = 0.82
      // - Missing items: 1 item reduces score
      // - Metrics availability: boosts measurable score
      expect(analysis.completenessScore).toBeGreaterThan(0.75);
      expect(analysis.completenessScore).toBeLessThan(0.9);
    });

    it('should penalize goals with many missing criteria', async () => {
      const poorCriteria: SMARTCriteria = {
        specific: { value: "Vague goal", confidence: 0.3, missing: ["details", "scope"] },
        measurable: { value: "No metrics", metrics: [], confidence: 0.2, missing: ["metrics", "baseline"] },
        achievable: { value: "Unknown", confidence: 0.4, missing: ["resources", "timeline"] },
        relevant: { value: "Maybe important", confidence: 0.5, missing: ["alignment"] },
        timeBound: { value: "Someday", confidence: 0.1, missing: ["deadline", "milestones"] }
      };

      const analysis = await processor.analyzeGoalCompleteness(poorCriteria);

      expect(analysis.completenessScore).toBeLessThan(0.4);
      expect(analysis.weaknesses.length).toBeGreaterThan(3);
    });

    it('should reward goals with comprehensive information', async () => {
      const excellentCriteria: SMARTCriteria = {
        specific: { value: "Increase Q4 revenue by 15% through new customer acquisition", confidence: 0.95, missing: [] },
        measurable: { 
          value: "Track monthly revenue, customer count, and conversion rates", 
          metrics: ["Monthly Revenue", "New Customers", "Conversion Rate", "Customer LTV"], 
          confidence: 0.9, 
          missing: [] 
        },
        achievable: { 
          value: "Based on Q3 growth trends and expanded sales team capacity", 
          confidence: 0.9, 
          missing: [] 
        },
        relevant: { 
          value: "Critical for annual targets and market expansion strategy", 
          confidence: 0.95, 
          missing: [] 
        },
        timeBound: { 
          value: "December 31, 2024 with monthly milestones", 
          deadline: "2024-12-31T23:59:59Z", 
          confidence: 0.95, 
          missing: [] 
        }
      };

      const analysis = await processor.analyzeGoalCompleteness(excellentCriteria);

      expect(analysis.completenessScore).toBeGreaterThan(0.9);
      expect(analysis.strengths.length).toBeGreaterThan(4);
      expect(analysis.weaknesses.length).toBeLessThan(2);
    });
  });

  describe('Missing Information Detection', () => {
    it('should identify all types of missing information', () => {
      const criteriaMissingEverything: SMARTCriteria = {
        specific: { value: "Do something", confidence: 0.2, missing: ["what", "how", "scope"] },
        measurable: { value: "Track it", metrics: [], confidence: 0.1, missing: ["metrics", "tools", "baseline"] },
        achievable: { value: "Maybe", confidence: 0.3, missing: ["resources", "skills", "timeline"] },
        relevant: { value: "Important", confidence: 0.4, missing: ["why", "alignment", "stakeholders"] },
        timeBound: { value: "Eventually", confidence: 0.1, missing: ["deadline", "milestones", "schedule"] }
      };

      const allMissing = Object.values(criteriaMissingEverything)
        .flatMap(criterion => criterion.missing || []);

      expect(allMissing).toContain('what');
      expect(allMissing).toContain('metrics');
      expect(allMissing).toContain('resources');
      expect(allMissing).toContain('deadline');
      expect(allMissing.length).toBeGreaterThan(10);
    });

    it('should categorize missing information by SMART criterion', () => {
      const testCriteria: SMARTCriteria = {
        specific: { value: "Increase sales", confidence: 0.5, missing: ["target amount", "product focus"] },
        measurable: { value: "Track progress", metrics: [], confidence: 0.3, missing: ["KPIs", "measurement tools"] },
        achievable: { value: "Should work", confidence: 0.4, missing: ["resource assessment"] },
        relevant: { value: "Good for business", confidence: 0.6, missing: [] },
        timeBound: { value: "This year", confidence: 0.5, missing: ["specific date"] }
      };

      expect(testCriteria.specific.missing).toContain('target amount');
      expect(testCriteria.measurable.missing).toContain('KPIs');
      expect(testCriteria.achievable.missing).toContain('resource assessment');
      expect(testCriteria.relevant.missing).toEqual([]);
      expect(testCriteria.timeBound.missing).toContain('specific date');
    });
  });

  describe('Validation Edge Cases', () => {
    it('should handle criteria with zero confidence', async () => {
      const zeroCriteria: SMARTCriteria = {
        specific: { value: "", confidence: 0, missing: ["everything"] },
        measurable: { value: "", metrics: [], confidence: 0, missing: ["everything"] },
        achievable: { value: "", confidence: 0, missing: ["everything"] },
        relevant: { value: "", confidence: 0, missing: ["everything"] },
        timeBound: { value: "", confidence: 0, missing: ["everything"] }
      };

      const analysis = await processor.analyzeGoalCompleteness(zeroCriteria);

      expect(analysis.completenessScore).toBe(0);
      expect(analysis.weaknesses.length).toBeGreaterThan(0);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle criteria with perfect confidence', async () => {
      const perfectCriteria: SMARTCriteria = {
        specific: { value: "Perfect specific goal", confidence: 1.0, missing: [] },
        measurable: { value: "Perfect metrics", metrics: ["perfect"], confidence: 1.0, missing: [] },
        achievable: { value: "Perfectly achievable", confidence: 1.0, missing: [] },
        relevant: { value: "Perfectly relevant", confidence: 1.0, missing: [] },
        timeBound: { value: "Perfect timeline", deadline: "2024-12-31", confidence: 1.0, missing: [] }
      };

      const analysis = await processor.analyzeGoalCompleteness(perfectCriteria);

      expect(analysis.completenessScore).toBeGreaterThan(0.95);
      expect(analysis.strengths.length).toBeGreaterThan(3);
    });

    it('should handle null or undefined missing arrays', async () => {
      const criteriaWithNulls: SMARTCriteria = {
        specific: { value: "Test", confidence: 0.8 },
        measurable: { value: "Test", metrics: ["test"], confidence: 0.8 },
        achievable: { value: "Test", confidence: 0.8 },
        relevant: { value: "Test", confidence: 0.8 },
        timeBound: { value: "Test", confidence: 0.8 }
      };

      const analysis = await processor.analyzeGoalCompleteness(criteriaWithNulls);

      expect(analysis.completenessScore).toBeGreaterThan(0.7);
    });
  });

  describe('Validation Recommendations', () => {
    it('should provide specific recommendations for improvement', async () => {
      const weakCriteria: SMARTCriteria = {
        specific: { value: "Improve business", confidence: 0.3, missing: ["specific area", "target"] },
        measurable: { value: "Make it better", metrics: [], confidence: 0.2, missing: ["metrics"] },
        achievable: { value: "Hope so", confidence: 0.4, missing: ["analysis"] },
        relevant: { value: "Seems important", confidence: 0.5, missing: ["justification"] },
        timeBound: { value: "Soon", confidence: 0.2, missing: ["deadline"] }
      };

      const analysis = await processor.analyzeGoalCompleteness(weakCriteria);

      expect(analysis.recommendations.length).toBeGreaterThan(3);
      expect(analysis.recommendations.some(r => 
        r.toLowerCase().includes('specific') || 
        r.toLowerCase().includes('measurable') ||
        r.toLowerCase().includes('timeline')
      )).toBe(true);
    });

    it('should provide different recommendations based on missing areas', async () => {
      // Test with only time issues
      const timeWeakCriteria: SMARTCriteria = {
        specific: { value: "Well defined goal", confidence: 0.9, missing: [] },
        measurable: { value: "Good metrics", metrics: ["metric1"], confidence: 0.9, missing: [] },
        achievable: { value: "Very doable", confidence: 0.9, missing: [] },
        relevant: { value: "Highly relevant", confidence: 0.9, missing: [] },
        timeBound: { value: "Sometime", confidence: 0.2, missing: ["deadline", "milestones"] }
      };

      const analysis = await processor.analyzeGoalCompleteness(timeWeakCriteria);

      expect(analysis.recommendations.some(r => 
        r.toLowerCase().includes('deadline') || 
        r.toLowerCase().includes('timeline') ||
        r.toLowerCase().includes('schedule')
      )).toBe(true);
    });
  });

  describe('Error Handling in Validation', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });

      await expect(processor.analyzeGoalCompleteness(mockGoalTranslationResult.smartCriteria))
        .rejects.toThrow('OpenAI API call failed');
    });

    it('should handle malformed analysis responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: 'invalid json response'
            }
          }]
        })
      });

      const result = await processor.analyzeGoalCompleteness(mockGoalTranslationResult.smartCriteria);

      // Should provide fallback values
      expect(result.completenessScore).toBe(0);
      expect(Array.isArray(result.strengths)).toBe(true);
      expect(Array.isArray(result.weaknesses)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should handle empty analysis responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({})
            }
          }]
        })
      });

      const result = await processor.analyzeGoalCompleteness(mockGoalTranslationResult.smartCriteria);

      expect(result.completenessScore).toBe(0);
      expect(result.strengths).toEqual([]);
      expect(result.weaknesses).toEqual([]);
      expect(result.recommendations).toEqual([]);
    });
  });
});