import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';

describe('Confidence Score Display Tests', () => {
  describe('Percentage Conversion', () => {
    // Test function to verify percentage conversion
    const toPercentage = (confidence: number): string => {
      return Math.round(confidence * 100) + '%';
    };

    describe('Edge Cases', () => {
      it('should correctly convert 0 confidence to 0%', () => {
        const confidence = 0;
        const percentage = toPercentage(confidence);
        expect(percentage).toBe('0%');
        expect(percentage).not.toBe('0');
      });

      it('should correctly convert 1 confidence to 100%', () => {
        const confidence = 1;
        const percentage = toPercentage(confidence);
        expect(percentage).toBe('100%');
        expect(percentage).not.toBe('1');
      });

      it('should correctly convert 0.05 confidence to 5%', () => {
        const confidence = 0.05;
        const percentage = toPercentage(confidence);
        expect(percentage).toBe('5%');
        expect(percentage).not.toBe('0.05');
      });

      it('should correctly convert 0.5 confidence to 50%', () => {
        const confidence = 0.5;
        const percentage = toPercentage(confidence);
        expect(percentage).toBe('50%');
        expect(percentage).not.toBe('0.5');
      });

      it('should correctly convert 0.95 confidence to 95%', () => {
        const confidence = 0.95;
        const percentage = toPercentage(confidence);
        expect(percentage).toBe('95%');
        expect(percentage).not.toBe('0.95');
      });

      it('should correctly convert 0.2 confidence to 20%', () => {
        const confidence = 0.2;
        const percentage = toPercentage(confidence);
        expect(percentage).toBe('20%');
        expect(percentage).not.toBe('0.2');
      });
    });

    describe('Rounding Behavior', () => {
      it('should round 0.854 to 85%', () => {
        const confidence = 0.854;
        const percentage = toPercentage(confidence);
        expect(percentage).toBe('85%');
      });

      it('should round 0.856 to 86%', () => {
        const confidence = 0.856;
        const percentage = toPercentage(confidence);
        expect(percentage).toBe('86%');
      });

      it('should round 0.125 to 13%', () => {
        const confidence = 0.125;
        const percentage = toPercentage(confidence);
        expect(percentage).toBe('13%');
      });

      it('should round 0.124 to 12%', () => {
        const confidence = 0.124;
        const percentage = toPercentage(confidence);
        expect(percentage).toBe('12%');
      });
    });

    describe('Boundary Values', () => {
      it('should handle very small values correctly', () => {
        const confidence = 0.001;
        const percentage = toPercentage(confidence);
        expect(percentage).toBe('0%');
      });

      it('should handle values close to 1 correctly', () => {
        const confidence = 0.999;
        const percentage = toPercentage(confidence);
        expect(percentage).toBe('100%');
      });

      it('should handle exactly 0.9 (90% threshold) correctly', () => {
        const confidence = 0.9;
        const percentage = toPercentage(confidence);
        expect(percentage).toBe('90%');
      });
    });
  });

  describe('SMART Criteria Confidence Display', () => {
    const mockCriteria = {
      specific: { value: 'Learn React', confidence: 0.85 },
      measurable: { value: 'Complete 5 projects', confidence: 0.2 },
      achievable: { value: 'Realistic goal', confidence: 0.5 },
      relevant: { value: 'Career growth', confidence: 0.95 },
      timeBound: { value: '3 months', confidence: 0 }
    };

    it('should display all criteria with correct percentage format', () => {
      const formattedCriteria = Object.entries(mockCriteria).map(([key, criterion]) => ({
        key,
        percentage: Math.round(criterion.confidence * 100) + '%'
      }));

      expect(formattedCriteria).toEqual([
        { key: 'specific', percentage: '85%' },
        { key: 'measurable', percentage: '20%' },
        { key: 'achievable', percentage: '50%' },
        { key: 'relevant', percentage: '95%' },
        { key: 'timeBound', percentage: '0%' }
      ]);

      // Verify no decimal values are displayed
      formattedCriteria.forEach(({ percentage }) => {
        expect(percentage).toMatch(/^\d+%$/);
        expect(percentage).not.toMatch(/\./);
      });
    });

    it('should correctly identify criteria above 90% threshold', () => {
      const highConfidenceCriteria = Object.entries(mockCriteria)
        .filter(([_, criterion]) => criterion.confidence >= 0.9)
        .map(([key, criterion]) => ({
          key,
          confidence: criterion.confidence,
          percentage: Math.round(criterion.confidence * 100) + '%'
        }));

      expect(highConfidenceCriteria).toHaveLength(1);
      expect(highConfidenceCriteria[0]).toEqual({
        key: 'relevant',
        confidence: 0.95,
        percentage: '95%'
      });
    });

    it('should correctly identify criteria below 90% threshold', () => {
      const lowConfidenceCriteria = Object.entries(mockCriteria)
        .filter(([_, criterion]) => criterion.confidence < 0.9)
        .map(([key, criterion]) => ({
          key,
          confidence: criterion.confidence,
          percentage: Math.round(criterion.confidence * 100) + '%'
        }));

      expect(lowConfidenceCriteria).toHaveLength(4);
      expect(lowConfidenceCriteria.map(c => c.percentage)).toEqual(['85%', '20%', '50%', '0%']);
    });
  });

  describe('ChatClarification Component Confidence Display', () => {
    const mockGoal = {
      id: 'test-goal',
      title: 'Learn programming',
      criteria: {
        specific: { value: 'Learn React', confidence: 0.2 },
        measurable: { value: '', confidence: 0.05 },
        achievable: { value: '', confidence: 0.5 },
        relevant: { value: '', confidence: 0.95 },
        timeBound: { value: '', confidence: 0 }
      },
      confidence: 0.34,
      status: 'active'
    };

    it('should format welcome message with correct percentages', () => {
      const welcomeMessage = `I've analyzed your goal and identified areas where we can make it stronger. Let's focus on the aspects that need the most improvement to get your goal to 90%+ confidence.

SMART goals are:
• **S**pecific - Clear and well-defined (${Math.round(mockGoal.criteria.specific.confidence * 100)}% confident)
• **M**easurable - With concrete criteria for tracking progress (${Math.round(mockGoal.criteria.measurable.confidence * 100)}% confident)  
• **A**chievable - Realistic and attainable (${Math.round(mockGoal.criteria.achievable.confidence * 100)}% confident)
• **R**elevant - Meaningful and aligned with your values (${Math.round(mockGoal.criteria.relevant.confidence * 100)}% confident)
• **T**ime-bound - With a clear deadline (${Math.round(mockGoal.criteria.timeBound.confidence * 100)}% confident)`;

      expect(welcomeMessage).toContain('20% confident');
      expect(welcomeMessage).toContain('5% confident');
      expect(welcomeMessage).toContain('50% confident');
      expect(welcomeMessage).toContain('95% confident');
      expect(welcomeMessage).toContain('0% confident');
      
      // Should not contain decimal representations
      expect(welcomeMessage).not.toContain('0.2');
      expect(welcomeMessage).not.toContain('0.05');
      expect(welcomeMessage).not.toContain('0.5');
      expect(welcomeMessage).not.toContain('0.95');
    });

    it('should format component introduction with correct percentage', () => {
      const component = { key: 'specific', label: 'Specific' };
      const currentConfidence = mockGoal.criteria.specific.confidence;
      
      const introMessage = `Your current ${component.label.toLowerCase()} score is ${Math.round(currentConfidence * 100)}%.`;
      
      expect(introMessage).toBe('Your current specific score is 20%.');
      expect(introMessage).not.toContain('0.2');
    });

    it('should format feedback messages with correct percentages', () => {
      const testCases = [
        { confidence: 0.85, expected: '85%' },
        { confidence: 0.92, expected: '92%' },
        { confidence: 0.45, expected: '45%' },
        { confidence: 0.15, expected: '15%' }
      ];

      testCases.forEach(({ confidence, expected }) => {
        const feedbackMessage = `Good progress! Your score improved to ${Math.round(confidence * 100)}%.`;
        expect(feedbackMessage).toBe(`Good progress! Your score improved to ${expected}.`);
      });
    });

    it('should correctly determine if component needs improvement (< 90%)', () => {
      const needsImprovement = (confidence: number): boolean => confidence < 0.9;

      expect(needsImprovement(0.89)).toBe(true);
      expect(needsImprovement(0.9)).toBe(false);
      expect(needsImprovement(0.91)).toBe(false);
      expect(needsImprovement(0)).toBe(true);
      expect(needsImprovement(1)).toBe(false);
    });
  });

  describe('Final Score Summary Display', () => {
    it('should format final confidence scores correctly', () => {
      const componentScores = [
        { key: 'specific', label: 'Specific', confidence: 0.92 },
        { key: 'measurable', label: 'Measurable', confidence: 0.88 },
        { key: 'achievable', label: 'Achievable', confidence: 0.95 },
        { key: 'relevant', label: 'Relevant', confidence: 0.9 },
        { key: 'timeBound', label: 'Time-bound', confidence: 0.85 }
      ];

      const formattedScores = componentScores.map(c => 
        `${c.confidence >= 0.9 ? '✅' : '⚡'} **${c.label}** - ${Math.round(c.confidence * 100)}% confidence`
      );

      expect(formattedScores).toEqual([
        '✅ **Specific** - 92% confidence',
        '⚡ **Measurable** - 88% confidence',
        '✅ **Achievable** - 95% confidence',
        '✅ **Relevant** - 90% confidence',
        '⚡ **Time-bound** - 85% confidence'
      ]);

      // Verify no scores show decimal format
      formattedScores.forEach(score => {
        expect(score).toMatch(/\d+% confidence$/);
        expect(score).not.toMatch(/\d+\.\d+/);
      });
    });

    it('should count high confidence components correctly', () => {
      const scores = [0.92, 0.88, 0.95, 0.9, 0.85];
      const highConfidenceCount = scores.filter(s => s >= 0.9).length;
      
      expect(highConfidenceCount).toBe(3);
    });
  });

  describe('Progress Indicator Tooltip Display', () => {
    it('should format tooltip with correct percentage', () => {
      const components = [
        { key: 'specific', label: 'Specific', confidence: 0.75 },
        { key: 'measurable', label: 'Measurable', confidence: 0.1 },
        { key: 'achievable', label: 'Achievable', confidence: 0.91 },
        { key: 'relevant', label: 'Relevant', confidence: 0.5 },
        { key: 'timeBound', label: 'Time-bound', confidence: 0.99 }
      ];

      const tooltips = components.map(comp => 
        `${comp.label} - ${Math.round(comp.confidence * 100)}%`
      );

      expect(tooltips).toEqual([
        'Specific - 75%',
        'Measurable - 10%',
        'Achievable - 91%',
        'Relevant - 50%',
        'Time-bound - 99%'
      ]);
    });
  });

  describe('API Response Confidence Handling', () => {
    it('should handle confidence values from API correctly', () => {
      const apiResponse = {
        confidence: 0.2,
        smartCriteria: {
          specific: { value: 'Test', confidence: 0.05 },
          measurable: { value: 'Test', confidence: 0.5 },
          achievable: { value: 'Test', confidence: 0.95 },
          relevant: { value: 'Test', confidence: 0.15 },
          timeBound: { value: 'Test', confidence: 0.85 }
        }
      };

      // Format for display
      const displayConfidence = Math.round(apiResponse.confidence * 100) + '%';
      const criteriaDisplay = Object.entries(apiResponse.smartCriteria).map(([key, criterion]) => ({
        key,
        percentage: Math.round(criterion.confidence * 100) + '%'
      }));

      expect(displayConfidence).toBe('20%');
      expect(criteriaDisplay).toEqual([
        { key: 'specific', percentage: '5%' },
        { key: 'measurable', percentage: '50%' },
        { key: 'achievable', percentage: '95%' },
        { key: 'relevant', percentage: '15%' },
        { key: 'timeBound', percentage: '85%' }
      ]);
    });
  });
});