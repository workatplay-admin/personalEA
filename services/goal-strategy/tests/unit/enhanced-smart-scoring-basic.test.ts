import { describe, it, expect } from '@jest/globals';
import { enhancedSMARTScoring } from '../../src/services/enhanced-smart-scoring';

describe('EnhancedSMARTScoring Basic Tests', () => {
  it('should analyze a simple goal', async () => {
    const goal = 'Learn Python programming in 3 months';
    const result = await enhancedSMARTScoring.analyzeGoal(goal);
    
    expect(result).toBeDefined();
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThanOrEqual(1);
    expect(result.criteria).toBeDefined();
    expect(result.criteria.specific).toBeDefined();
    expect(result.criteria.measurable).toBeDefined();
    expect(result.criteria.achievable).toBeDefined();
    expect(result.criteria.relevant).toBeDefined();
    expect(result.criteria.timeBound).toBeDefined();
  });

  it('should score well-defined goals higher', async () => {
    const vagueGoal = 'Be successful';
    const specificGoal = 'Complete AWS certification by March 31st with 85% score';
    
    const vagueResult = await enhancedSMARTScoring.analyzeGoal(vagueGoal);
    const specificResult = await enhancedSMARTScoring.analyzeGoal(specificGoal);
    
    expect(specificResult.overallScore).toBeGreaterThan(vagueResult.overallScore);
    expect(specificResult.overallConfidence).toBeGreaterThan(vagueResult.overallConfidence);
  });

  it('should identify missing components', async () => {
    const incompleteGoal = 'Lose weight';
    const result = await enhancedSMARTScoring.analyzeGoal(incompleteGoal);
    
    expect(result.criteria.measurable.missing.length).toBeGreaterThan(0);
    expect(result.criteria.timeBound.missing.length).toBeGreaterThan(0);
    expect(result.recommendations.immediate.length).toBeGreaterThan(0);
  });

  it('should extract metrics correctly', async () => {
    const goalWithMetrics = 'Increase revenue by 25% from $100K to $125K in Q3 2024';
    const result = await enhancedSMARTScoring.analyzeGoal(goalWithMetrics);
    
    expect(result.criteria.measurable.metrics.length).toBeGreaterThan(2);
    expect(result.criteria.measurable.metrics).toContainEqual(
      expect.objectContaining({ value: 25, unit: '%' })
    );
  });

  it('should handle fitness goals appropriately', async () => {
    const fitnessGoal = 'Run 5K in 30 minutes by training 3 times per week for 2 months';
    const result = await enhancedSMARTScoring.analyzeGoal(fitnessGoal);
    
    expect(result.goalCategory).toBe('Health/Fitness');
    expect(result.criteria.measurable.metrics).toContainEqual(
      expect.objectContaining({ value: 30 })
    );
    expect(result.criteria.timeBound.duration).toEqual({ value: 2, unit: 'months' });
  });
});