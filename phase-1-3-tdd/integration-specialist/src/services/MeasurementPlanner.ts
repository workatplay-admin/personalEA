import { 
  Goal, 
  CriticalSuccessMetric, 
  MetricBaseline, 
  MeasurementStrategy,
  TrackingSchedule,
  ReportingPlan,
  AlertThreshold
} from '../../types/integration-types';

export class MeasurementPlanner {
  constructor() {
    // Initialize any needed configuration
  }

  async createMeasurementStrategy(
    goal: Goal,
    metrics: CriticalSuccessMetric[],
    baselines: MetricBaseline[]
  ): Promise<MeasurementStrategy> {
    
    if (!goal || !metrics || metrics.length === 0) {
      throw new Error('Invalid inputs provided to MeasurementPlanner');
    }

    const strategy: MeasurementStrategy = {
      goalId: goal.id,
      overallApproach: this.determineOverallApproach(goal, metrics),
      trackingSchedule: this.createTrackingSchedule(goal, metrics),
      reportingPlan: this.createReportingPlan(goal, metrics),
      alerting: {
        enabled: true,
        thresholds: this.createAlertThresholds(metrics, baselines),
        escalationRules: this.createEscalationRules(metrics)
      },
      qualityAssurance: this.createQualityAssurancePlan(metrics),
      createdAt: new Date().toISOString()
    };

    return strategy;
  }

  private determineOverallApproach(goal: Goal, metrics: CriticalSuccessMetric[]): string {
    const quantitativeCount = metrics.filter(m => m.type === 'quantitative').length;
    const qualitativeCount = metrics.filter(m => m.type === 'qualitative').length;
    const automatedCount = metrics.filter(m => m.collectionMethod === 'automated').length;
    
    const timeline = this.getGoalTimelineInDays(goal);
    const complexity = metrics.length;
    
    let approach = '';
    
    // Determine primary measurement philosophy
    if (quantitativeCount > qualitativeCount) {
      approach += 'Data-driven measurement approach with ';
    } else {
      approach += 'Balanced quantitative-qualitative measurement approach with ';
    }
    
    // Determine automation level
    if (automatedCount > metrics.length * 0.7) {
      approach += 'heavy automation and real-time monitoring. ';
    } else if (automatedCount > metrics.length * 0.4) {
      approach += 'mixed automated and manual tracking. ';
    } else {
      approach += 'primarily manual measurement and regular review cycles. ';
    }
    
    // Add timeline considerations
    if (timeline <= 30) {
      approach += 'High-frequency monitoring due to short timeline. ';
    } else if (timeline <= 90) {
      approach += 'Moderate frequency tracking with weekly reviews. ';
    } else {
      approach += 'Monthly measurement cycles with quarterly deep reviews. ';
    }
    
    // Add complexity considerations
    if (complexity > 5) {
      approach += 'Systematic prioritization of critical metrics to avoid measurement overload.';
    } else {
      approach += 'Comprehensive tracking of all defined success metrics.';
    }
    
    return approach;
  }

  private createTrackingSchedule(goal: Goal, metrics: CriticalSuccessMetric[]): TrackingSchedule {
    const timeline = this.getGoalTimelineInDays(goal);
    const automatedRatio = metrics.filter(m => m.collectionMethod === 'automated').length / metrics.length;
    
    // Determine primary frequency
    let frequency: TrackingSchedule['frequency'];
    if (timeline <= 30) {
      frequency = 'daily';
    } else if (timeline <= 90) {
      frequency = 'weekly';
    } else if (timeline <= 365) {
      frequency = 'monthly';
    } else {
      frequency = 'quarterly';
    }
    
    // Create responsibility mapping
    const responsibilities: Record<string, string[]> = {};
    
    metrics.forEach(metric => {
      const responsible = metric.responsibility || 'Goal Owner';
      if (!responsibilities[responsible]) {
        responsibilities[responsible] = [];
      }
      responsibilities[responsible].push(metric.name);
    });
    
    return {
      frequency,
      daysOfWeek: this.determineBestDaysOfWeek(frequency),
      timeOfDay: this.determineBestTimeOfDay(metrics),
      automated: automatedRatio > 0.5,
      responsibilities
    };
  }

  private createReportingPlan(goal: Goal, metrics: CriticalSuccessMetric[]): ReportingPlan {
    const timeline = this.getGoalTimelineInDays(goal);
    const criticalMetrics = metrics.filter(m => m.priority === 'critical');
    
    // Determine reporting frequency
    let frequency: ReportingPlan['frequency'];
    if (timeline <= 30) {
      frequency = 'weekly';
    } else if (timeline <= 180) {
      frequency = 'monthly';
    } else {
      frequency = 'quarterly';
    }
    
    // Determine stakeholders
    const stakeholders = this.identifyStakeholders(goal, metrics);
    
    // Determine best format
    const format = this.determineBestReportingFormat(metrics, stakeholders);
    
    return {
      frequency,
      format,
      stakeholders,
      customizations: this.createReportingCustomizations(metrics, stakeholders)
    };
  }

  private createAlertThresholds(metrics: CriticalSuccessMetric[], baselines: MetricBaseline[]): AlertThreshold[] {
    const thresholds: AlertThreshold[] = [];
    
    metrics.forEach(metric => {
      const baseline = baselines.find(b => b.metricId === metric.id);
      const recipients = this.determineAlertRecipients(metric);
      
      // Create minimum threshold alert
      thresholds.push({
        metricId: metric.id,
        type: 'below_minimum',
        value: metric.measurableCriteria.minimumThreshold,
        severity: metric.priority === 'critical' ? 'critical' : 'warning',
        recipients
      });
      
      // Create maximum threshold alert (if applicable)
      if (metric.measurableCriteria.unit !== 'milliseconds') { // For performance metrics, higher is worse
        thresholds.push({
          metricId: metric.id,
          type: 'above_maximum',
          value: metric.measurableCriteria.maximumThreshold,
          severity: 'warning',
          recipients
        });
      }
      
      // Create trend-based alerts if we have baseline trend data
      if (baseline && baseline.historicalTrend.direction !== 'unknown') {
        thresholds.push({
          metricId: metric.id,
          type: 'trend_negative',
          value: this.calculateTrendThreshold(baseline),
          severity: 'warning',
          recipients
        });
      }
      
      // Create stagnation alert for critical metrics
      if (metric.priority === 'critical') {
        thresholds.push({
          metricId: metric.id,
          type: 'stagnant',
          value: 7, // Days without improvement
          severity: 'warning',
          recipients
        });
      }
    });
    
    return thresholds;
  }

  private createEscalationRules(metrics: CriticalSuccessMetric[]): Record<string, string> {
    const rules: Record<string, string> = {};
    
    // Create escalation rules based on severity and metric priority
    rules['critical_threshold_breach'] = 'Immediate notification to Goal Owner and stakeholders';
    rules['multiple_warning_alerts'] = 'Escalate to Goal Owner after 3 warnings in 24 hours';
    rules['trend_deterioration'] = 'Weekly review meeting with key stakeholders';
    rules['data_quality_issues'] = 'Technical team notification and data source investigation';
    
    // Add specific rules for high-priority metrics
    const criticalMetrics = metrics.filter(m => m.priority === 'critical');
    if (criticalMetrics.length > 0) {
      rules['critical_metric_failure'] = 'Emergency goal review session within 48 hours';
    }
    
    return rules;
  }

  private createQualityAssurancePlan(metrics: CriticalSuccessMetric[]) {
    const automatedMetrics = metrics.filter(m => m.collectionMethod === 'automated');
    const manualMetrics = metrics.filter(m => m.collectionMethod === 'manual');
    
    return {
      dataValidationRules: [
        'Verify data source connectivity and accuracy',
        'Cross-validate manual entries with supporting documentation',
        'Check for outliers and investigate anomalies',
        'Ensure consistent measurement methodology across time periods',
        'Validate baseline assumptions quarterly'
      ],
      auditFrequency: automatedMetrics.length > manualMetrics.length ? 'monthly' : 'weekly',
      backupSources: this.identifyBackupDataSources(metrics)
    };
  }

  // Helper methods
  private getGoalTimelineInDays(goal: Goal): number {
    if (!goal.criteria?.timeBound?.deadline) {
      return 180; // Default to 6 months
    }
    
    const deadline = new Date(goal.criteria.timeBound.deadline);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(1, diffDays); // At least 1 day
  }

  private determineBestDaysOfWeek(frequency: TrackingSchedule['frequency']): number[] | undefined {
    switch (frequency) {
      case 'daily':
        return [1, 2, 3, 4, 5]; // Monday to Friday
      case 'weekly':
        return [1]; // Monday
      default:
        return undefined; // Not applicable for monthly/quarterly
    }
  }

  private determineBestTimeOfDay(metrics: CriticalSuccessMetric[]): string {
    const hasBusinessMetrics = metrics.some(m => 
      m.dataSource.toLowerCase().includes('financial') ||
      m.dataSource.toLowerCase().includes('business') ||
      m.dataSource.toLowerCase().includes('sales')
    );
    
    const hasWebMetrics = metrics.some(m =>
      m.dataSource.toLowerCase().includes('analytics') ||
      m.dataSource.toLowerCase().includes('web')
    );
    
    if (hasBusinessMetrics) {
      return '09:00'; // Business hours start
    } else if (hasWebMetrics) {
      return '10:00'; // After morning web traffic analysis
    } else {
      return '14:00'; // Afternoon - good for manual data entry
    }
  }

  private identifyStakeholders(goal: Goal, metrics: CriticalSuccessMetric[]): string[] {
    const stakeholders = new Set<string>();
    
    // Add goal owner
    stakeholders.add('Goal Owner');
    
    // Add metric responsibilities
    metrics.forEach(metric => {
      if (metric.responsibility && metric.responsibility !== 'Self') {
        stakeholders.add(metric.responsibility);
      }
    });
    
    // Add domain-specific stakeholders based on goal content
    const goalText = goal.title.toLowerCase();
    
    if (goalText.includes('revenue') || goalText.includes('business') || goalText.includes('sales')) {
      stakeholders.add('Executive Team');
      stakeholders.add('Finance Team');
    }
    
    if (goalText.includes('customer') || goalText.includes('user')) {
      stakeholders.add('Customer Success Team');
      stakeholders.add('Product Team');
    }
    
    if (goalText.includes('technical') || goalText.includes('system') || goalText.includes('software')) {
      stakeholders.add('Engineering Team');
      stakeholders.add('Technical Lead');
    }
    
    return Array.from(stakeholders);
  }

  private determineBestReportingFormat(metrics: CriticalSuccessMetric[], stakeholders: string[]): ReportingPlan['format'] {
    const executiveStakeholders = stakeholders.filter(s => 
      s.toLowerCase().includes('executive') || 
      s.toLowerCase().includes('ceo') || 
      s.toLowerCase().includes('director')
    );
    
    const technicalStakeholders = stakeholders.filter(s =>
      s.toLowerCase().includes('engineering') ||
      s.toLowerCase().includes('technical') ||
      s.toLowerCase().includes('developer')
    );
    
    if (executiveStakeholders.length > 0) {
      return 'all'; // Executives need multiple formats
    } else if (technicalStakeholders.length > 0) {
      return 'dashboard'; // Technical teams prefer dashboards
    } else {
      return 'email'; // Default for smaller teams
    }
  }

  private createReportingCustomizations(metrics: CriticalSuccessMetric[], stakeholders: string[]): Record<string, any> {
    return {
      executiveSummary: stakeholders.some(s => s.toLowerCase().includes('executive')),
      technicalDetails: stakeholders.some(s => s.toLowerCase().includes('technical')),
      trendAnalysis: metrics.length > 3,
      benchmarkComparisons: metrics.some(m => m.priority === 'critical'),
      actionableInsights: true,
      visualizations: {
        charts: metrics.filter(m => m.type === 'quantitative').length > 0,
        dashboards: metrics.length > 5,
        trendlines: true
      }
    };
  }

  private determineAlertRecipients(metric: CriticalSuccessMetric): string[] {
    const recipients = ['Goal Owner'];
    
    if (metric.responsibility && metric.responsibility !== 'Self' && metric.responsibility !== 'Goal Owner') {
      recipients.push(metric.responsibility);
    }
    
    if (metric.priority === 'critical') {
      recipients.push('Key Stakeholders');
    }
    
    return recipients;
  }

  private calculateTrendThreshold(baseline: MetricBaseline): number {
    // Calculate threshold for trend-based alerts
    // If trend is positive, alert when it goes negative
    // If trend is negative, alert when it gets worse
    
    const currentSlope = baseline.historicalTrend.slope || 0;
    
    if (currentSlope > 0) {
      return -0.1; // Alert if trend becomes negative
    } else if (currentSlope < 0) {
      return currentSlope * 1.5; // Alert if negative trend gets 50% worse
    } else {
      return -0.05; // Alert if stable trend becomes negative
    }
  }

  private identifyBackupDataSources(metrics: CriticalSuccessMetric[]): string[] {
    const backupSources = new Set<string>();
    
    metrics.forEach(metric => {
      switch (metric.dataSource.toLowerCase()) {
        case 'google analytics':
          backupSources.add('Adobe Analytics');
          backupSources.add('Manual Web Traffic Reports');
          break;
        case 'financial systems':
          backupSources.add('Manual Financial Reports');
          backupSources.add('Accounting Software Export');
          break;
        case 'customer feedback systems':
          backupSources.add('Manual Survey Data');
          backupSources.add('Support Ticket Analysis');
          break;
        case 'monitoring systems':
          backupSources.add('Log File Analysis');
          backupSources.add('Manual Performance Testing');
          break;
        default:
          backupSources.add('Manual Data Collection');
          backupSources.add('Alternative Tools/Systems');
      }
    });
    
    return Array.from(backupSources);
  }

  // Validation methods for testing
  public validateMeasurementStrategy(strategy: MeasurementStrategy): boolean {
    // Validate required fields
    if (!strategy.goalId || !strategy.overallApproach || !strategy.trackingSchedule || !strategy.reportingPlan) {
      return false;
    }
    
    // Validate frequency alignment
    const trackingFreq = strategy.trackingSchedule.frequency;
    const reportingFreq = strategy.reportingPlan.frequency;
    
    const freqOrder = { daily: 4, weekly: 3, monthly: 2, quarterly: 1 };
    
    // Reporting frequency should not be higher than tracking frequency
    if (freqOrder[reportingFreq] > freqOrder[trackingFreq]) {
      return false;
    }
    
    // Validate alert thresholds
    if (strategy.alerting.enabled && strategy.alerting.thresholds.length === 0) {
      return false;
    }
    
    return true;
  }
}