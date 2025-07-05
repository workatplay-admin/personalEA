import { describe, beforeEach, it, expect } from '@jest/globals';
import { enhancedSMARTScoring, EnhancedScoringResult } from '../../src/services/enhanced-smart-scoring';

describe('EnhancedSMARTScoring', () => {
  describe('analyzeGoal', () => {
    describe('Well-defined goals', () => {
      it('should score well-defined professional development goal highly', async () => {
        const goal = 'Complete AWS Solutions Architect certification by March 31st, 2024, by studying 2 hours daily and passing practice exams with 85% or higher scores';
        
        const result = await enhancedSMARTScoring.analyzeGoal(goal);
        
        expect(result.overallScore).toBeGreaterThan(0.8);
        expect(result.overallConfidence).toBeGreaterThan(0.8);
        expect(result.criteria.specific.score).toBeGreaterThan(0.8);
        expect(result.criteria.measurable.metrics).toHaveLength(2); // 85% score, 2 hours daily
        expect(result.criteria.timeBound.deadline).toBeDefined();
        expect(result.goalCategory).toBe('Professional Development');
        expect(result.complexityLevel).toBe('moderate');
      });

      it('should score well-defined business goal highly', async () => {
        const goal = 'Increase monthly recurring revenue from $50,000 to $75,000 by December 31st through acquiring 25 new enterprise clients and improving retention rate to 95%';
        
        const result = await enhancedSMARTScoring.analyzeGoal(goal);
        
        expect(result.overallScore).toBeGreaterThan(0.85);
        expect(result.criteria.measurable.metrics).toContainEqual(
          expect.objectContaining({ value: 50000 })
        );
        expect(result.criteria.measurable.metrics).toContainEqual(
          expect.objectContaining({ value: 75000 })
        );
        expect(result.criteria.measurable.metrics).toContainEqual(
          expect.objectContaining({ value: 25 })
        );
        expect(result.goalCategory).toBe('Business/Revenue');
      });

      it('should score well-defined fitness goal highly', async () => {
        const goal = 'Lose 20 pounds in 3 months by exercising 5 times per week for 45 minutes and maintaining a 1800 calorie daily diet, tracking progress weekly';
        
        const result = await enhancedSMARTScoring.analyzeGoal(goal);
        
        expect(result.overallScore).toBeGreaterThan(0.85);
        expect(result.criteria.measurable.components.hasMetrics).toBe(true);
        expect(result.criteria.measurable.components.hasProgressIndicators).toBe(true);
        expect(result.criteria.timeBound.duration).toEqual({ value: 3, unit: 'months' });
        expect(result.goalCategory).toBe('Health/Fitness');
      });
    });

    describe('Vague goals', () => {
      it('should score vague goals lower with specific feedback', async () => {
        const goal = 'I want to be successful';
        
        const result = await enhancedSMARTScoring.analyzeGoal(goal);
        
        expect(result.overallScore).toBeLessThan(0.3);
        expect(result.overallConfidence).toBeLessThan(0.4);
        expect(result.criteria.specific.missing).toContain('Clear action verb (what exactly will you do?)');
        expect(result.criteria.measurable.missing).toContain('Specific metrics to measure progress');
        expect(result.criteria.timeBound.missing).toContain('When do you want to achieve this goal?');
        expect(result.strengthsAndWeaknesses.criticalGaps.length).toBeGreaterThan(2);
      });

      it('should identify missing components in partially defined goals', async () => {
        const goal = 'Learn Python programming';
        
        const result = await enhancedSMARTScoring.analyzeGoal(goal);
        
        expect(result.overallScore).toBeLessThan(0.5);
        expect(result.criteria.specific.components.what.present).toBe(true);
        expect(result.criteria.measurable.missing).toContain('Specific metrics to measure progress');
        expect(result.criteria.timeBound.missing).toContain('When do you want to achieve this goal?');
        expect(result.recommendations.immediate.length).toBeGreaterThan(0);
      });
    });

    describe('Edge cases', () => {
      it('should handle goals with conditional statements', async () => {
        const goal = 'If I can secure $50K funding by Q2, I will launch my startup and reach 1000 users within 6 months';
        
        const result = await enhancedSMARTScoring.analyzeGoal(goal);
        
        expect(result.criteria.achievable.feasibilityFactors.constraints.identified).toBe(true);
        expect(result.criteria.measurable.metrics).toContainEqual(
          expect.objectContaining({ value: 1000 })
        );
        expect(result.complexityLevel).toBe('complex');
      });

      it('should handle goals with multiple stakeholders', async () => {
        const goal = 'Our team will develop and deploy a new customer portal by June 30th, working with the design department and IT support to ensure 99.9% uptime';
        
        const result = await enhancedSMARTScoring.analyzeGoal(goal);
        
        expect(result.criteria.specific.components.who.present).toBe(true);
        expect(result.criteria.specific.components.who.value).toContain('team');
        expect(result.criteria.measurable.metrics).toContainEqual(
          expect.objectContaining({ value: 99.9, unit: '%' })
        );
        expect(result.complexityLevel).toMatch(/complex|highly-complex/);
      });

      it('should handle very long, detailed goals', async () => {
        const longGoal = `Over the next 12 months, I plan to transform my freelance web development business 
        into a full-service digital agency by hiring 3 developers, 2 designers, and 1 project manager, 
        increasing revenue from $100K to $500K annually, establishing partnerships with at least 5 marketing agencies, 
        developing a proprietary project management system, achieving a client satisfaction score of 4.8/5 or higher, 
        and maintaining a profit margin of at least 30% while working with Fortune 500 clients in the technology sector`;
        
        const result = await enhancedSMARTScoring.analyzeGoal(longGoal);
        
        expect(result.complexityLevel).toBe('highly-complex');
        expect(result.criteria.measurable.metrics.length).toBeGreaterThan(5);
        expect(result.criteria.specific.score).toBeGreaterThan(0.8);
        expect(result.recommendations.shortTerm).toContainEqual(
          expect.stringContaining('smaller, more manageable phases')
        );
      });

      it('should handle goals with special characters and formatting', async () => {
        const goal = 'Achieve $1M+ in sales (↑50% YoY) by Q4/2024 w/ NPS > 70';
        
        const result = await enhancedSMARTScoring.analyzeGoal(goal);
        
        expect(result.criteria.measurable.metrics).toContainEqual(
          expect.objectContaining({ value: 1 })
        );
        expect(result.criteria.measurable.metrics).toContainEqual(
          expect.objectContaining({ value: 50, unit: expect.stringContaining('%') })
        );
      });
    });

    describe('Context awareness', () => {
      it('should use context to enhance scoring', async () => {
        const goal = 'Launch the new product successfully';
        const context = {
          domain: 'E-commerce',
          userBackground: 'Senior Product Manager with 10 years experience',
          constraints: ['Limited budget of $50K', '3-month timeline']
        };
        
        const result = await enhancedSMARTScoring.analyzeGoal(goal, context);
        
        expect(result.criteria.achievable.feasibilityFactors.resources.identified).toBe(true);
        expect(result.criteria.achievable.feasibilityFactors.skills.available).toBe(true);
        expect(result.goalCategory).toBe('E-commerce');
      });

      it('should consider previous goals in relevance scoring', async () => {
        const goal = 'Expand to international markets';
        const context = {
          previousGoals: [
            'Establish domestic market presence',
            'Build scalable infrastructure'
          ]
        };
        
        const result = await enhancedSMARTScoring.analyzeGoal(goal, context);
        
        expect(result.criteria.relevant.alignmentFactors.broaderGoals.aligned).toBe(true);
        expect(result.criteria.relevant.score).toBeGreaterThan(0.5);
      });
    });

    describe('Confidence calculation', () => {
      it('should calculate confidence based on component completeness', async () => {
        const goals = [
          { text: 'Learn something new', expectedConfidence: 0.3 },
          { text: 'Learn Python in 6 months', expectedConfidence: 0.5 },
          { text: 'Complete Python course with 90% score by June', expectedConfidence: 0.7 },
          { text: 'Complete MIT Python course (6.00x) with 90% score by June 30th, practicing 2 hours daily', expectedConfidence: 0.85 }
        ];
        
        for (const { text, expectedConfidence } of goals) {
          const result = await enhancedSMARTScoring.analyzeGoal(text);
          expect(result.overallConfidence).toBeCloseTo(expectedConfidence, 1);
        }
      });

      it('should provide detailed confidence breakdown', async () => {
        const goal = 'Increase team productivity by 25% within Q3 through implementing agile methodologies and automated testing';
        
        const result = await enhancedSMARTScoring.analyzeGoal(goal);
        
        expect(result.confidenceBreakdown.dataQuality).toBeGreaterThan(0.6);
        expect(result.confidenceBreakdown.completeness).toBeGreaterThan(0.7);
        expect(result.confidenceBreakdown.clarity).toBeGreaterThan(0.7);
        expect(result.confidenceBreakdown.consistency).toBeGreaterThan(0.7);
      });
    });

    describe('Feedback generation', () => {
      it('should provide actionable feedback for improvements', async () => {
        const goal = 'Improve customer satisfaction';
        
        const result = await enhancedSMARTScoring.analyzeGoal(goal);
        
        expect(result.recommendations.immediate).toContainEqual(
          expect.stringContaining('specific')
        );
        expect(result.recommendations.immediate).toContainEqual(
          expect.stringContaining('measure')
        );
        expect(result.recommendations.immediate).toContainEqual(
          expect.stringContaining('deadline')
        );
      });

      it('should identify strengths in well-defined goals', async () => {
        const goal = 'Reduce customer churn rate from 15% to 10% by implementing a new onboarding process and monthly check-ins over the next 6 months';
        
        const result = await enhancedSMARTScoring.analyzeGoal(goal);
        
        expect(result.strengthsAndWeaknesses.strengths.length).toBeGreaterThan(2);
        expect(result.strengthsAndWeaknesses.strengths).toContainEqual(
          expect.stringContaining('measurable')
        );
        expect(result.strengthsAndWeaknesses.weaknesses.length).toBeLessThan(2);
      });
    });

    describe('Time analysis', () => {
      it('should parse various time formats correctly', async () => {
        const timeGoals = [
          { goal: 'Complete by 12/31/2024', expectedDeadline: '2024-12-31' },
          { goal: 'Finish within 3 months', expectedDuration: { value: 3, unit: 'months' } },
          { goal: 'Launch in Q2 2024', expectedTiming: 'Q2 2024' },
          { goal: 'Achieve by next Friday', expectedTiming: 'relative' },
          { goal: 'Complete over the next 6-8 weeks', expectedDuration: { value: 6, unit: 'weeks' } }
        ];
        
        for (const { goal, expectedDeadline, expectedDuration } of timeGoals) {
          const result = await enhancedSMARTScoring.analyzeGoal(goal);
          
          if (expectedDeadline) {
            expect(result.criteria.timeBound.deadline).toBe(expectedDeadline);
          }
          if (expectedDuration) {
            expect(result.criteria.timeBound.duration).toMatchObject(expectedDuration);
          }
        }
      });

      it('should assess time realism', async () => {
        const unrealisticGoal = 'Become a Python expert in one day';
        const realisticGoal = 'Learn Python basics over 3 months with daily practice';
        
        const unrealisticResult = await enhancedSMARTScoring.analyzeGoal(unrealisticGoal);
        const realisticResult = await enhancedSMARTScoring.analyzeGoal(realisticGoal);
        
        expect(unrealisticResult.criteria.timeBound.timeComponents.isRealistic).toBe(false);
        expect(realisticResult.criteria.timeBound.timeComponents.isRealistic).toBe(true);
        
        expect(unrealisticResult.criteria.timeBound.feedback).toContainEqual(
          expect.stringContaining('ambitious')
        );
      });
    });

    describe('Metric extraction', () => {
      it('should extract quantitative metrics accurately', async () => {
        const goal = 'Increase sales by 30%, from $1.2M to $1.56M, while reducing costs by $50,000 and improving profit margin to 25%';
        
        const result = await enhancedSMARTScoring.analyzeGoal(goal);
        
        const metrics = result.criteria.measurable.metrics;
        expect(metrics).toContainEqual(expect.objectContaining({ value: 30, unit: '%' }));
        expect(metrics).toContainEqual(expect.objectContaining({ value: 1.2 }));
        expect(metrics).toContainEqual(expect.objectContaining({ value: 1.56 }));
        expect(metrics).toContainEqual(expect.objectContaining({ value: 50000 }));
        expect(metrics).toContainEqual(expect.objectContaining({ value: 25, unit: '%' }));
      });

      it('should identify qualitative metrics', async () => {
        const goal = 'Achieve excellent customer satisfaction ratings and high team morale while maintaining good work-life balance';
        
        const result = await enhancedSMARTScoring.analyzeGoal(goal);
        
        const qualMetrics = result.criteria.measurable.metrics.filter(m => m.type === 'qualitative');
        expect(qualMetrics.length).toBeGreaterThan(0);
        expect(qualMetrics).toContainEqual(
          expect.objectContaining({ metric: expect.stringContaining('excellent') })
        );
      });
    });

    describe('Complexity assessment', () => {
      it('should correctly assess goal complexity', async () => {
        const simpleGoal = 'Read one book this month';
        const moderateGoal = 'Complete online course and build 3 projects in 3 months';
        const complexGoal = 'Launch startup with team of 5, secure funding, and reach 1000 users in 6 months while maintaining day job';
        
        const simpleResult = await enhancedSMARTScoring.analyzeGoal(simpleGoal);
        const moderateResult = await enhancedSMARTScoring.analyzeGoal(moderateGoal);
        const complexResult = await enhancedSMARTScoring.analyzeGoal(complexGoal);
        
        expect(simpleResult.complexityLevel).toBe('simple');
        expect(moderateResult.complexityLevel).toBe('moderate');
        expect(complexResult.complexityLevel).toMatch(/complex|highly-complex/);
      });
    });
  });
});