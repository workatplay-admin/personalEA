import { Goal, CriticalSuccessMetric } from '../../types/integration-types';

export class MetricsGenerator {
  constructor() {
    // Initialize any needed configuration
  }

  async generateMetrics(goal: Goal): Promise<CriticalSuccessMetric[]> {
    // Validate input
    if (!goal || !goal.id) {
      throw new Error('Invalid goal provided to MetricsGenerator');
    }

    const metrics: CriticalSuccessMetric[] = [];

    // Extract metrics from SMART criteria
    if (goal.criteria?.measurable?.metrics) {
      const measurableMetrics = await this.generateFromMeasurableCriteria(goal);
      metrics.push(...measurableMetrics);
    }

    // Generate metrics based on goal type and domain
    const domainMetrics = await this.generateDomainSpecificMetrics(goal);
    metrics.push(...domainMetrics);

    // Add default tracking metrics if none exist
    if (metrics.length === 0) {
      const fallbackMetrics = await this.generateFallbackMetrics(goal);
      metrics.push(...fallbackMetrics);
    }

    // Prioritize metrics based on confidence and relevance
    return this.prioritizeMetrics(metrics, goal);
  }

  private async generateFromMeasurableCriteria(goal: Goal): Promise<CriticalSuccessMetric[]> {
    const metrics: CriticalSuccessMetric[] = [];
    const measurableCriteria = goal.criteria.measurable;

    if (!measurableCriteria.metrics || measurableCriteria.metrics.length === 0) {
      return metrics;
    }

    // Parse measurable value for targets
    const targets = this.extractTargetsFromMeasurable(measurableCriteria.value);

    for (let i = 0; i < measurableCriteria.metrics.length; i++) {
      const metricName = measurableCriteria.metrics[i];
      const target = targets[i] || targets[0] || { value: 1, unit: 'count' };

      metrics.push({
        id: `${goal.id}-metric-${i + 1}`,
        goalId: goal.id,
        name: this.formatMetricName(metricName),
        description: `Tracks ${metricName} to measure progress toward: ${goal.title}`,
        type: this.determineMetricType(metricName, target),
        category: this.determineMetricCategory(metricName),
        measurableCriteria: {
          unit: target.unit,
          targetValue: target.value,
          minimumThreshold: target.value * 0.8, // 80% of target as minimum
          maximumThreshold: target.value * 1.2  // 120% of target as maximum
        },
        dataSource: this.suggestDataSource(metricName),
        collectionMethod: this.suggestCollectionMethod(metricName),
        frequency: this.suggestFrequency(goal),
        responsibility: 'Goal Owner', // Default, can be customized
        priority: this.determinePriority(measurableCriteria.confidence),
        createdAt: new Date().toISOString()
      });
    }

    return metrics;
  }

  private async generateDomainSpecificMetrics(goal: Goal): Promise<CriticalSuccessMetric[]> {
    const metrics: CriticalSuccessMetric[] = [];
    const domain = this.identifyGoalDomain(goal.title);

    switch (domain) {
      case 'business':
        metrics.push(...this.generateBusinessMetrics(goal));
        break;
      case 'personal_development':
        metrics.push(...this.generatePersonalDevelopmentMetrics(goal));
        break;
      case 'technical':
        metrics.push(...this.generateTechnicalMetrics(goal));
        break;
      case 'health_fitness':
        metrics.push(...this.generateHealthFitnessMetrics(goal));
        break;
      default:
        // Generic metrics for unidentified domains
        metrics.push(...this.generateGenericMetrics(goal));
    }

    return metrics;
  }

  private generateBusinessMetrics(goal: Goal): CriticalSuccessMetric[] {
    const baseId = `${goal.id}-business`;
    return [
      {
        id: `${baseId}-revenue`,
        goalId: goal.id,
        name: 'Revenue Impact',
        description: 'Financial impact of achieving this goal',
        type: 'quantitative',
        category: 'outcome',
        measurableCriteria: {
          unit: 'currency',
          targetValue: 10000, // Default, should be customized
          minimumThreshold: 8000,
          maximumThreshold: 15000
        },
        dataSource: 'Financial Systems',
        collectionMethod: 'automated',
        frequency: 'monthly',
        responsibility: 'Finance Team',
        priority: 'critical',
        createdAt: new Date().toISOString()
      },
      {
        id: `${baseId}-customers`,
        goalId: goal.id,
        name: 'Customer Impact',
        description: 'Effect on customer satisfaction and retention',
        type: 'quantitative',
        category: 'outcome',
        measurableCriteria: {
          unit: 'score',
          targetValue: 4.5,
          minimumThreshold: 4.0,
          maximumThreshold: 5.0
        },
        dataSource: 'Customer Feedback Systems',
        collectionMethod: 'automated',
        frequency: 'weekly',
        responsibility: 'Customer Success Team',
        priority: 'important',
        createdAt: new Date().toISOString()
      }
    ];
  }

  private generatePersonalDevelopmentMetrics(goal: Goal): CriticalSuccessMetric[] {
    const baseId = `${goal.id}-personal`;
    return [
      {
        id: `${baseId}-progress`,
        goalId: goal.id,
        name: 'Learning Progress',
        description: 'Measurable progress in skill or knowledge development',
        type: 'quantitative',
        category: 'output',
        measurableCriteria: {
          unit: 'percentage',
          targetValue: 100,
          minimumThreshold: 80,
          maximumThreshold: 100
        },
        dataSource: 'Learning Management System',
        collectionMethod: 'manual',
        frequency: 'weekly',
        responsibility: 'Self',
        priority: 'critical',
        createdAt: new Date().toISOString()
      },
      {
        id: `${baseId}-application`,
        goalId: goal.id,
        name: 'Practical Application',
        description: 'Ability to apply learned skills in real situations',
        type: 'qualitative',
        category: 'outcome',
        measurableCriteria: {
          unit: 'score',
          targetValue: 4.0,
          minimumThreshold: 3.0,
          maximumThreshold: 5.0
        },
        dataSource: 'Self Assessment',
        collectionMethod: 'manual',
        frequency: 'monthly',
        responsibility: 'Self',
        priority: 'important',
        createdAt: new Date().toISOString()
      }
    ];
  }

  private generateTechnicalMetrics(goal: Goal): CriticalSuccessMetric[] {
    const baseId = `${goal.id}-technical`;
    return [
      {
        id: `${baseId}-performance`,
        goalId: goal.id,
        name: 'System Performance',
        description: 'Technical performance metrics for system improvements',
        type: 'quantitative',
        category: 'output',
        measurableCriteria: {
          unit: 'milliseconds',
          targetValue: 200,
          minimumThreshold: 300,
          maximumThreshold: 100
        },
        dataSource: 'Monitoring Systems',
        collectionMethod: 'automated',
        frequency: 'daily',
        responsibility: 'Engineering Team',
        priority: 'critical',
        createdAt: new Date().toISOString()
      },
      {
        id: `${baseId}-quality`,
        goalId: goal.id,
        name: 'Code Quality',
        description: 'Measures of code quality and maintainability',
        type: 'quantitative',
        category: 'process',
        measurableCriteria: {
          unit: 'score',
          targetValue: 8.0,
          minimumThreshold: 7.0,
          maximumThreshold: 10.0
        },
        dataSource: 'Code Analysis Tools',
        collectionMethod: 'automated',
        frequency: 'weekly',
        responsibility: 'Engineering Team',
        priority: 'important',
        createdAt: new Date().toISOString()
      }
    ];
  }

  private generateHealthFitnessMetrics(goal: Goal): CriticalSuccessMetric[] {
    const baseId = `${goal.id}-health`;
    return [
      {
        id: `${baseId}-physical`,
        goalId: goal.id,
        name: 'Physical Measurement',
        description: 'Objective physical health metrics',
        type: 'quantitative',
        category: 'outcome',
        measurableCriteria: {
          unit: 'pounds',
          targetValue: 20, // Default weight loss
          minimumThreshold: 15,
          maximumThreshold: 25
        },
        dataSource: 'Health Tracking App',
        collectionMethod: 'manual',
        frequency: 'weekly',
        responsibility: 'Self',
        priority: 'critical',
        createdAt: new Date().toISOString()
      },
      {
        id: `${baseId}-behavioral`,
        goalId: goal.id,
        name: 'Behavior Change',
        description: 'Consistency in healthy behaviors',
        type: 'quantitative',
        category: 'process',
        measurableCriteria: {
          unit: 'days',
          targetValue: 5, // Days per week
          minimumThreshold: 4,
          maximumThreshold: 7
        },
        dataSource: 'Habit Tracking App',
        collectionMethod: 'manual',
        frequency: 'daily',
        responsibility: 'Self',
        priority: 'important',
        createdAt: new Date().toISOString()
      }
    ];
  }

  private generateGenericMetrics(goal: Goal): CriticalSuccessMetric[] {
    const baseId = `${goal.id}-generic`;
    return [
      {
        id: `${baseId}-completion`,
        goalId: goal.id,
        name: 'Goal Completion Progress',
        description: 'Overall progress toward goal completion',
        type: 'quantitative',
        category: 'output',
        measurableCriteria: {
          unit: 'percentage',
          targetValue: 100,
          minimumThreshold: 80,
          maximumThreshold: 100
        },
        dataSource: 'Manual Tracking',
        collectionMethod: 'manual',
        frequency: 'weekly',
        responsibility: 'Goal Owner',
        priority: 'critical',
        createdAt: new Date().toISOString()
      }
    ];
  }

  private async generateFallbackMetrics(goal: Goal): Promise<CriticalSuccessMetric[]> {
    // Generate basic metrics when specific criteria are missing
    return [
      {
        id: `${goal.id}-fallback-1`,
        goalId: goal.id,
        name: 'Goal Clarity',
        description: 'Clarity and understanding of the goal requirements',
        type: 'qualitative',
        category: 'process',
        measurableCriteria: {
          unit: 'score',
          targetValue: 4.0,
          minimumThreshold: 3.0,
          maximumThreshold: 5.0
        },
        dataSource: 'Self Assessment',
        collectionMethod: 'manual',
        frequency: 'monthly',
        responsibility: 'Goal Owner',
        priority: 'monitoring',
        createdAt: new Date().toISOString()
      },
      {
        id: `${goal.id}-fallback-2`,
        goalId: goal.id,
        name: 'Progress Momentum',
        description: 'Consistent progress and momentum toward goal',
        type: 'qualitative',
        category: 'process',
        measurableCriteria: {
          unit: 'score',
          targetValue: 4.0,
          minimumThreshold: 3.0,
          maximumThreshold: 5.0
        },
        dataSource: 'Weekly Review',
        collectionMethod: 'manual',
        frequency: 'weekly',
        responsibility: 'Goal Owner',
        priority: 'important',
        createdAt: new Date().toISOString()
      }
    ];
  }

  private prioritizeMetrics(metrics: CriticalSuccessMetric[], goal: Goal): CriticalSuccessMetric[] {
    // Sort by priority and confidence
    return metrics.sort((a, b) => {
      const priorityOrder = { critical: 3, important: 2, monitoring: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // Secondary sort by metric type (quantitative first)
      if (a.type === 'quantitative' && b.type !== 'quantitative') return -1;
      if (b.type === 'quantitative' && a.type !== 'quantitative') return 1;

      return 0;
    });
  }

  // Helper methods
  private extractTargetsFromMeasurable(value: string): Array<{ value: number; unit: string }> {
    const targets: Array<{ value: number; unit: string }> = [];
    
    // Simple regex patterns to extract numbers and units
    const patterns = [
      /(\d+(?:\.\d+)?)\s*(%|percent)/gi,
      /(\d+(?:\.\d+)?)\s*([a-z]+)/gi,
      /(\d+(?:\.\d+)?)/gi
    ];

    for (const pattern of patterns) {
      const matches = [...value.matchAll(pattern)];
      for (const match of matches) {
        targets.push({
          value: parseFloat(match[1]),
          unit: match[2] || 'count'
        });
      }
    }

    return targets.length > 0 ? targets : [{ value: 1, unit: 'count' }];
  }

  private formatMetricName(name: string): string {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private determineMetricType(name: string, target: { value: number; unit: string }): 'quantitative' | 'qualitative' | 'binary' {
    if (target.unit === 'percentage' || target.unit === '%' || !isNaN(target.value)) {
      return 'quantitative';
    }
    if (name.includes('satisfaction') || name.includes('quality') || name.includes('rating')) {
      return 'qualitative';
    }
    return 'quantitative'; // Default
  }

  private determineMetricCategory(name: string): 'outcome' | 'output' | 'process' | 'leading' | 'lagging' {
    if (name.includes('satisfaction') || name.includes('revenue') || name.includes('profit')) {
      return 'outcome';
    }
    if (name.includes('completion') || name.includes('delivery') || name.includes('production')) {
      return 'output';
    }
    if (name.includes('activity') || name.includes('effort') || name.includes('time')) {
      return 'process';
    }
    return 'output'; // Default
  }

  private suggestDataSource(name: string): string {
    if (name.includes('web') || name.includes('conversion')) return 'Google Analytics';
    if (name.includes('customer') || name.includes('satisfaction')) return 'Customer Feedback Systems';
    if (name.includes('revenue') || name.includes('financial')) return 'Financial Systems';
    if (name.includes('code') || name.includes('technical')) return 'Development Tools';
    return 'Manual Tracking';
  }

  private suggestCollectionMethod(name: string): 'manual' | 'automated' | 'hybrid' {
    if (name.includes('web') || name.includes('system') || name.includes('automated')) {
      return 'automated';
    }
    if (name.includes('satisfaction') || name.includes('personal') || name.includes('quality')) {
      return 'manual';
    }
    return 'hybrid';
  }

  private suggestFrequency(goal: Goal): 'daily' | 'weekly' | 'monthly' | 'milestone' {
    const deadline = goal.criteria?.timeBound?.deadline;
    if (!deadline) return 'weekly';

    const targetDate = new Date(deadline);
    const now = new Date();
    const daysRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 30) return 'daily';
    if (daysRemaining <= 90) return 'weekly';
    if (daysRemaining <= 365) return 'monthly';
    return 'monthly';
  }

  private determinePriority(confidence: number): 'critical' | 'important' | 'monitoring' {
    if (confidence >= 0.8) return 'critical';
    if (confidence >= 0.6) return 'important';
    return 'monitoring';
  }

  private identifyGoalDomain(title: string): string {
    const lower = title.toLowerCase();
    
    if (lower.includes('revenue') || lower.includes('business') || lower.includes('sales') || 
        lower.includes('customer') || lower.includes('market') || lower.includes('product')) {
      return 'business';
    }
    
    if (lower.includes('learn') || lower.includes('skill') || lower.includes('education') || 
        lower.includes('training') || lower.includes('develop') || lower.includes('career')) {
      return 'personal_development';
    }
    
    if (lower.includes('system') || lower.includes('code') || lower.includes('software') || 
        lower.includes('app') || lower.includes('website') || lower.includes('technical')) {
      return 'technical';
    }
    
    if (lower.includes('weight') || lower.includes('fitness') || lower.includes('health') || 
        lower.includes('exercise') || lower.includes('diet')) {
      return 'health_fitness';
    }
    
    return 'general';
  }
}