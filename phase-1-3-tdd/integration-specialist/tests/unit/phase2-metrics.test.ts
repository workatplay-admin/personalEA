import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Goal, CriticalSuccessMetric, MetricBaseline, MeasurementStrategy } from '../../types/integration-types';
import { MetricsGenerator } from '../../src/components/MetricsGenerator';
import { BaselineEstimator } from '../../src/services/BaselineEstimator';
import { MeasurementPlanner } from '../../src/services/MeasurementPlanner';

describe('Phase 2: Critical Success Metrics', () => {
  let metricsGenerator: MetricsGenerator;
  let baselineEstimator: BaselineEstimator;
  let measurementPlanner: MeasurementPlanner;
  
  beforeEach(() => {
    metricsGenerator = new MetricsGenerator();
    baselineEstimator = new BaselineEstimator();
    measurementPlanner = new MeasurementPlanner();
  });

  describe('MetricsGenerator', () => {
    it('should generate quantitative metrics for measurable SMART goals', async () => {
      // Given: A SMART goal with quantitative targets
      const smartGoal: Goal = {
        id: 'goal-1',
        title: 'Increase website conversion rate to 5% within 6 months',
        criteria: {
          specific: { value: 'Increase website conversion rate', confidence: 0.9 },
          measurable: { 
            value: '5% conversion rate', 
            confidence: 0.95,
            metrics: ['conversion_rate', 'monthly_visitors', 'completed_purchases']
          },
          achievable: { value: 'Based on current 2.5% rate', confidence: 0.8 },
          relevant: { value: 'Directly impacts revenue growth', confidence: 0.9 },
          timeBound: { value: '6 months', confidence: 0.95, deadline: '2025-12-23' }
        },
        missingCriteria: [],
        clarificationQuestions: [],
        confidence: 0.88
      };

      // When: Generating metrics for the goal
      const metrics = await metricsGenerator.generateMetrics(smartGoal);

      // Then: Should produce appropriate quantitative metrics
      expect(metrics).toHaveLength(3);
      expect(metrics[0]).toMatchObject({
        name: 'Website Conversion Rate',
        type: 'quantitative',
        category: 'outcome',
        measurableCriteria: {
          unit: 'percentage',
          targetValue: 5.0,
          minimumThreshold: 4.0,
          maximumThreshold: 6.0
        }
      });
    });

    it('should generate qualitative metrics for subjective SMART goals', async () => {
      // Given: A SMART goal with qualitative aspects
      const smartGoal: Goal = {
        id: 'goal-2',
        title: 'Improve team communication effectiveness by implementing daily standups',
        criteria: {
          specific: { value: 'Implement daily standups', confidence: 0.95 },
          measurable: { 
            value: 'Team satisfaction scores and communication metrics', 
            confidence: 0.7,
            metrics: ['team_satisfaction', 'communication_clarity', 'meeting_effectiveness']
          },
          achievable: { value: 'With current team size and tools', confidence: 0.85 },
          relevant: { value: 'Addresses current communication gaps', confidence: 0.9 },
          timeBound: { value: '3 months implementation', confidence: 0.9, deadline: '2025-09-23' }
        },
        missingCriteria: [],
        clarificationQuestions: [],
        confidence: 0.82
      };

      // When: Generating metrics for the goal
      const metrics = await metricsGenerator.generateMetrics(smartGoal);

      // Then: Should produce appropriate qualitative metrics
      expect(metrics).toHaveLength(3);
      expect(metrics.some(m => m.type === 'qualitative')).toBe(true);
      expect(metrics[0]).toMatchObject({
        name: 'Team Communication Satisfaction',
        type: 'qualitative',
        category: 'outcome'
      });
    });

    it('should handle goals with missing measurable criteria', async () => {
      // Given: A goal with weak measurable criteria
      const smartGoal: Goal = {
        id: 'goal-3',
        title: 'Be more successful in my career',
        criteria: {
          specific: { value: 'Career success', confidence: 0.4 },
          measurable: { 
            value: 'Success indicators', 
            confidence: 0.3,
            metrics: []
          },
          achievable: { value: 'With effort', confidence: 0.5 },
          relevant: { value: 'Personal development', confidence: 0.7 },
          timeBound: { value: 'This year', confidence: 0.6 }
        },
        missingCriteria: ['measurable'],
        clarificationQuestions: ['How do you define career success?'],
        confidence: 0.45
      };

      // When: Attempting to generate metrics
      const metrics = await metricsGenerator.generateMetrics(smartGoal);

      // Then: Should suggest clarification-based metrics
      expect(metrics).toHaveLength(2);
      expect(metrics[0]).toMatchObject({
        name: 'Career Success Clarification',
        type: 'qualitative',
        category: 'outcome',
        description: expect.stringContaining('clarification needed')
      });
    });

    it('should prioritize metrics based on SMART criteria confidence', async () => {
      // Given: A goal with varying confidence levels
      const smartGoal: Goal = {
        id: 'goal-4',
        title: 'Launch mobile app with 1000 downloads in first month',
        criteria: {
          specific: { value: 'Launch mobile app', confidence: 0.95 },
          measurable: { 
            value: '1000 downloads in first month', 
            confidence: 0.9,
            metrics: ['app_downloads', 'user_retention', 'app_rating']
          },
          achievable: { value: 'Based on market research', confidence: 0.6 },
          relevant: { value: 'Aligns with business strategy', confidence: 0.85 },
          timeBound: { value: 'First month', confidence: 0.95 }
        },
        missingCriteria: [],
        clarificationQuestions: [],
        confidence: 0.85
      };

      // When: Generating metrics
      const metrics = await metricsGenerator.generateMetrics(smartGoal);

      // Then: Should prioritize based on confidence
      expect(metrics[0].priority).toBe('critical');
      expect(metrics.every(m => m.priority)).toBe(true);
      
      // High confidence metrics should be marked as critical
      const criticalMetrics = metrics.filter(m => m.priority === 'critical');
      expect(criticalMetrics.length).toBeGreaterThan(0);
    });
  });

  describe('BaselineEstimator', () => {
    it('should estimate baseline values for quantitative metrics', async () => {
      // Given: A quantitative metric
      const metric: CriticalSuccessMetric = {
        id: 'metric-1',
        goalId: 'goal-1',
        name: 'Website Conversion Rate',
        description: 'Percentage of visitors who complete a purchase',
        type: 'quantitative',
        category: 'outcome',
        measurableCriteria: {
          unit: 'percentage',
          targetValue: 5.0,
          minimumThreshold: 4.0,
          maximumThreshold: 6.0
        },
        dataSource: 'Google Analytics',
        collectionMethod: 'automated',
        frequency: 'weekly',
        responsibility: 'Marketing Team',
        priority: 'critical'
      };

      // When: Estimating baseline
      const baseline = await baselineEstimator.estimateBaseline(metric);

      // Then: Should provide reasonable baseline estimation
      expect(baseline).toMatchObject({
        metricId: 'metric-1',
        currentValue: expect.any(Number),
        confidence: expect.any(Number)
      });
      expect(baseline.currentValue).toBeGreaterThan(0);
      expect(baseline.currentValue).toBeLessThan(metric.measurableCriteria.targetValue);
      expect(baseline.confidence).toBeGreaterThan(0.5);
    });

    it('should handle metrics without historical data', async () => {
      // Given: A new metric without historical data
      const metric: CriticalSuccessMetric = {
        id: 'metric-2',
        goalId: 'goal-2',
        name: 'New Feature Adoption Rate',
        description: 'Percentage of users adopting new feature',
        type: 'quantitative',
        category: 'output',
        measurableCriteria: {
          unit: 'percentage',
          targetValue: 30.0,
          minimumThreshold: 20.0,
          maximumThreshold: 40.0
        },
        dataSource: 'User Analytics',
        collectionMethod: 'automated',
        frequency: 'daily',
        responsibility: 'Product Team',
        priority: 'important'
      };

      // When: Estimating baseline for new metric
      const baseline = await baselineEstimator.estimateBaseline(metric);

      // Then: Should provide estimated baseline with lower confidence
      expect(baseline.currentValue).toBe(0);
      expect(baseline.confidence).toBeLessThan(0.7);
      expect(baseline.historicalTrend).toMatchObject({
        direction: 'unknown',
        dataPoints: 0
      });
    });
  });

  describe('MeasurementPlanner', () => {
    it('should create comprehensive measurement strategy', async () => {
      // Given: A goal with multiple metrics
      const goal: Goal = {
        id: 'goal-1',
        title: 'Increase website conversion rate to 5% within 6 months',
        criteria: {
          specific: { value: 'Increase website conversion rate', confidence: 0.9 },
          measurable: { 
            value: '5% conversion rate', 
            confidence: 0.95,
            metrics: ['conversion_rate', 'monthly_visitors', 'completed_purchases']
          },
          achievable: { value: 'Based on current 2.5% rate', confidence: 0.8 },
          relevant: { value: 'Directly impacts revenue growth', confidence: 0.9 },
          timeBound: { value: '6 months', confidence: 0.95, deadline: '2025-12-23' }
        },
        missingCriteria: [],
        clarificationQuestions: [],
        confidence: 0.88
      };

      const metrics = await metricsGenerator.generateMetrics(goal);
      const baselines = await Promise.all(
        metrics.map(m => baselineEstimator.estimateBaseline(m))
      );

      // When: Creating measurement strategy
      const strategy = await measurementPlanner.createMeasurementStrategy(
        goal, 
        metrics, 
        baselines
      );

      // Then: Should provide comprehensive measurement plan
      expect(strategy).toMatchObject({
        goalId: 'goal-1',
        overallApproach: expect.any(String),
        trackingSchedule: expect.any(Object),
        reportingPlan: expect.any(Object),
        alerting: expect.any(Object)
      });

      expect(strategy.trackingSchedule.frequency).toBe('weekly');
      expect(strategy.reportingPlan.stakeholders).toContain('Marketing Team');
      expect(strategy.alerting.thresholds).toBeDefined();
    });

    it('should adapt measurement frequency based on goal timeline', async () => {
      // Given: Short-term goal (1 month)
      const shortTermGoal: Goal = {
        id: 'goal-short',
        title: 'Complete user research study within 1 month',
        criteria: {
          timeBound: { value: '1 month', confidence: 0.95, deadline: '2025-07-23' }
        } as any,
        missingCriteria: [],
        clarificationQuestions: [],
        confidence: 0.8
      };

      // Given: Long-term goal (2 years)
      const longTermGoal: Goal = {
        id: 'goal-long',
        title: 'Establish market leadership position within 2 years',
        criteria: {
          timeBound: { value: '2 years', confidence: 0.8, deadline: '2027-06-23' }
        } as any,
        missingCriteria: [],
        clarificationQuestions: [],
        confidence: 0.7
      };

      // When: Creating measurement strategies
      const shortTermMetrics = await metricsGenerator.generateMetrics(shortTermGoal);
      const longTermMetrics = await metricsGenerator.generateMetrics(longTermGoal);

      const shortTermStrategy = await measurementPlanner.createMeasurementStrategy(
        shortTermGoal, shortTermMetrics, []
      );
      const longTermStrategy = await measurementPlanner.createMeasurementStrategy(
        longTermGoal, longTermMetrics, []
      );

      // Then: Should adapt frequency appropriately
      expect(shortTermStrategy.trackingSchedule.frequency).toBe('daily');
      expect(longTermStrategy.trackingSchedule.frequency).toBe('monthly');
    });
  });

  describe('Phase 2 Integration', () => {
    it('should integrate all Phase 2 components successfully', async () => {
      // Given: Complete Phase 1 output
      const phase1Output = {
        goal: {
          id: 'integration-goal',
          title: 'Achieve product-market fit for SaaS product within 12 months',
          criteria: {
            specific: { value: 'Achieve product-market fit', confidence: 0.9 },
            measurable: { 
              value: 'Customer satisfaction >4.5/5, retention >85%, NPS >50', 
              confidence: 0.85,
              metrics: ['customer_satisfaction', 'retention_rate', 'net_promoter_score']
            },
            achievable: { value: 'Based on current traction', confidence: 0.75 },
            relevant: { value: 'Critical for business success', confidence: 0.95 },
            timeBound: { value: '12 months', confidence: 0.9, deadline: '2026-06-23' }
          },
          missingCriteria: [],
          clarificationQuestions: [],
          confidence: 0.87
        },
        smartCriteria: {} as any,
        confidence: 0.87
      };

      // When: Processing through Phase 2
      const metrics = await metricsGenerator.generateMetrics(phase1Output.goal);
      const baselines = await Promise.all(
        metrics.map(m => baselineEstimator.estimateBaseline(m))
      );
      const measurementPlan = await measurementPlanner.createMeasurementStrategy(
        phase1Output.goal,
        metrics,
        baselines
      );

      // Then: Should produce complete Phase 2 output
      const phase2Output = {
        ...phase1Output,
        metrics,
        baselines,
        measurementPlan
      };

      expect(phase2Output.metrics.length).toBeGreaterThan(0);
      expect(phase2Output.baselines.length).toBe(phase2Output.metrics.length);
      expect(phase2Output.measurementPlan.goalId).toBe('integration-goal');
      
      // Verify data quality
      expect(phase2Output.metrics.every(m => m.goalId === 'integration-goal')).toBe(true);
      expect(phase2Output.baselines.every(b => 
        phase2Output.metrics.some(m => m.id === b.metricId)
      )).toBe(true);
    });
  });
});