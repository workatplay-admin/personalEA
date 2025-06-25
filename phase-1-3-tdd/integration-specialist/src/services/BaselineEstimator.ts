import { CriticalSuccessMetric, MetricBaseline, TrendAnalysis, BenchmarkComparison } from '../../types/integration-types';

export class BaselineEstimator {
  constructor() {
    // Initialize any needed configuration
  }

  async estimateBaseline(metric: CriticalSuccessMetric): Promise<MetricBaseline> {
    // Simulate baseline estimation based on metric type and data source
    const baseline: MetricBaseline = {
      metricId: metric.id,
      currentValue: await this.estimateCurrentValue(metric),
      historicalTrend: await this.analyzeHistoricalTrend(metric),
      confidence: this.calculateConfidence(metric),
      lastUpdated: new Date().toISOString()
    };

    // Add benchmark data if available
    const benchmarkData = await this.findBenchmarkData(metric);
    if (benchmarkData) {
      baseline.benchmarkData = benchmarkData;
    }

    return baseline;
  }

  private async estimateCurrentValue(metric: CriticalSuccessMetric): Promise<number> {
    // In a real implementation, this would query actual data sources
    // For TDD, we'll simulate realistic baseline values based on metric characteristics
    
    switch (metric.type) {
      case 'quantitative':
        return this.estimateQuantitativeBaseline(metric);
      case 'qualitative':
        return this.estimateQualitativeBaseline(metric);
      case 'binary':
        return this.estimateBinaryBaseline(metric);
      default:
        return 0;
    }
  }

  private estimateQuantitativeBaseline(metric: CriticalSuccessMetric): number {
    const { targetValue, unit } = metric.measurableCriteria;

    // Different baseline estimation strategies based on unit type
    switch (unit.toLowerCase()) {
      case 'percentage':
      case '%':
        // For percentages, baseline is typically 50-80% of target
        return Math.round((targetValue * (0.5 + Math.random() * 0.3)) * 100) / 100;
      
      case 'currency':
      case 'dollars':
      case '$':
        // For financial metrics, baseline is typically 30-70% of target
        return Math.round(targetValue * (0.3 + Math.random() * 0.4));
      
      case 'score':
      case 'rating':
        // For scores, baseline is typically 60-80% of target
        if (targetValue <= 5) {
          return Math.round((targetValue * (0.6 + Math.random() * 0.2)) * 10) / 10;
        }
        return Math.round(targetValue * (0.6 + Math.random() * 0.2));
      
      case 'count':
      case 'number':
        // For counts, baseline is typically 20-60% of target
        return Math.round(targetValue * (0.2 + Math.random() * 0.4));
      
      case 'milliseconds':
      case 'seconds':
        // For performance metrics, baseline is typically worse than target
        return Math.round(targetValue * (1.2 + Math.random() * 0.8));
      
      case 'days':
      case 'hours':
        // For time-based metrics, baseline varies based on context
        return Math.round(targetValue * (0.4 + Math.random() * 0.4));
      
      case 'pounds':
      case 'kg':
        // For weight loss goals, baseline is 0 (no progress yet)
        return 0;
      
      default:
        // Generic baseline: 40-80% of target
        return Math.round(targetValue * (0.4 + Math.random() * 0.4));
    }
  }

  private estimateQualitativeBaseline(metric: CriticalSuccessMetric): number {
    const { targetValue } = metric.measurableCriteria;
    
    // For qualitative metrics, baseline is typically 60-80% of target
    return Math.round((targetValue * (0.6 + Math.random() * 0.2)) * 10) / 10;
  }

  private estimateBinaryBaseline(metric: CriticalSuccessMetric): number {
    // For binary metrics, baseline is typically 0 (not achieved)
    // unless it's a maintenance-type goal
    if (metric.name.toLowerCase().includes('maintain') || 
        metric.name.toLowerCase().includes('continue')) {
      return 1; // Already achieved for maintenance goals
    }
    return 0;
  }

  private async analyzeHistoricalTrend(metric: CriticalSuccessMetric): Promise<TrendAnalysis> {
    // Simulate historical trend analysis
    const trendDirection = this.simulateTrendDirection(metric);
    const dataPoints = this.estimateAvailableDataPoints(metric);
    
    return {
      direction: trendDirection,
      slope: this.calculateTrendSlope(trendDirection),
      dataPoints,
      timespan: this.estimateDataTimespan(metric, dataPoints),
      confidence: this.calculateTrendConfidence(metric, dataPoints)
    };
  }

  private simulateTrendDirection(metric: CriticalSuccessMetric): TrendAnalysis['direction'] {
    // Simulate trend based on metric characteristics
    const random = Math.random();
    
    if (metric.collectionMethod === 'automated') {
      // Automated metrics typically have more reliable trends
      if (random < 0.3) return 'increasing';
      if (random < 0.5) return 'stable';
      if (random < 0.7) return 'decreasing';
      return 'volatile';
    } else {
      // Manual metrics may have less consistent trends
      if (random < 0.2) return 'increasing';
      if (random < 0.4) return 'stable';
      if (random < 0.6) return 'decreasing';
      if (random < 0.8) return 'volatile';
      return 'unknown';
    }
  }

  private estimateAvailableDataPoints(metric: CriticalSuccessMetric): number {
    // Estimate data points based on collection method and frequency
    const basePoints = {
      'automated': 50,
      'manual': 20,
      'hybrid': 35
    };

    const frequencyMultiplier = {
      'daily': 1.5,
      'weekly': 1.0,
      'monthly': 0.5,
      'milestone': 0.2
    };

    const base = basePoints[metric.collectionMethod] || 25;
    const multiplier = frequencyMultiplier[metric.frequency] || 1.0;
    
    return Math.round(base * multiplier * (0.7 + Math.random() * 0.6));
  }

  private calculateTrendSlope(direction: TrendAnalysis['direction']): number {
    switch (direction) {
      case 'increasing':
        return 0.1 + Math.random() * 0.4; // 0.1 to 0.5
      case 'decreasing':
        return -(0.1 + Math.random() * 0.4); // -0.1 to -0.5
      case 'stable':
        return (-0.05 + Math.random() * 0.1); // -0.05 to 0.05
      case 'volatile':
        return (-0.3 + Math.random() * 0.6); // -0.3 to 0.3
      case 'unknown':
      default:
        return 0;
    }
  }

  private estimateDataTimespan(metric: CriticalSuccessMetric, dataPoints: number): string {
    const frequencyDays = {
      'daily': 1,
      'weekly': 7,
      'monthly': 30,
      'milestone': 90
    };

    const days = dataPoints * (frequencyDays[metric.frequency] || 7);
    
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.round(days / 30)} months`;
    return `${Math.round(days / 365)} years`;
  }

  private calculateTrendConfidence(metric: CriticalSuccessMetric, dataPoints: number): number {
    let confidence = 0.3; // Base confidence

    // Increase confidence based on data points
    if (dataPoints > 50) confidence += 0.3;
    else if (dataPoints > 20) confidence += 0.2;
    else if (dataPoints > 10) confidence += 0.1;

    // Increase confidence for automated collection
    if (metric.collectionMethod === 'automated') confidence += 0.2;
    else if (metric.collectionMethod === 'hybrid') confidence += 0.1;

    // Increase confidence for frequent measurement
    if (metric.frequency === 'daily') confidence += 0.1;
    else if (metric.frequency === 'weekly') confidence += 0.05;

    return Math.min(0.95, Math.max(0.1, confidence));
  }

  private calculateConfidence(metric: CriticalSuccessMetric): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for automated data sources
    if (metric.collectionMethod === 'automated') confidence += 0.2;
    else if (metric.collectionMethod === 'hybrid') confidence += 0.1;

    // Higher confidence for quantitative metrics
    if (metric.type === 'quantitative') confidence += 0.15;
    else if (metric.type === 'binary') confidence += 0.1;

    // Higher confidence for reliable data sources
    const reliableDataSources = [
      'Google Analytics', 'Financial Systems', 'Monitoring Systems',
      'Customer Feedback Systems', 'Development Tools'
    ];
    if (reliableDataSources.some(source => 
        metric.dataSource.toLowerCase().includes(source.toLowerCase()))) {
      confidence += 0.15;
    }

    // Higher confidence for frequent measurement
    if (metric.frequency === 'daily') confidence += 0.1;
    else if (metric.frequency === 'weekly') confidence += 0.05;

    return Math.min(0.95, Math.max(0.1, confidence));
  }

  private async findBenchmarkData(metric: CriticalSuccessMetric): Promise<BenchmarkComparison | undefined> {
    // In a real implementation, this would query industry benchmark databases
    // For TDD, we'll simulate benchmark data for common metrics
    
    const benchmarkMap: Record<string, Partial<BenchmarkComparison>> = {
      'conversion': {
        industry: 'E-commerce',
        averageValue: 2.86,
        topQuartile: 5.31,
        source: 'Industry Report 2024'
      },
      'satisfaction': {
        industry: 'Software',
        averageValue: 3.8,
        topQuartile: 4.5,
        source: 'Customer Satisfaction Survey'
      },
      'revenue': {
        industry: 'SaaS',
        averageValue: 100000,
        topQuartile: 250000,
        source: 'SaaS Metrics Report'
      },
      'performance': {
        industry: 'Web Applications',
        averageValue: 850,
        topQuartile: 200,
        source: 'Performance Benchmark Study'
      }
    };

    // Find matching benchmark based on metric name
    const metricNameLower = metric.name.toLowerCase();
    for (const [key, benchmark] of Object.entries(benchmarkMap)) {
      if (metricNameLower.includes(key)) {
        return {
          industry: benchmark.industry!,
          averageValue: benchmark.averageValue!,
          topQuartile: benchmark.topQuartile!,
          source: benchmark.source!,
          confidence: 0.7 + Math.random() * 0.2 // 0.7 to 0.9
        };
      }
    }

    // Return undefined if no benchmark found
    return undefined;
  }

  // Utility methods for testing and validation
  public async validateBaseline(baseline: MetricBaseline, metric: CriticalSuccessMetric): Promise<boolean> {
    // Validate that baseline makes sense for the metric
    const { targetValue, minimumThreshold, maximumThreshold } = metric.measurableCriteria;

    // Current value should typically be between 0 and target
    if (baseline.currentValue < 0 && !this.isNegativeValueValid(metric)) {
      return false;
    }

    // For performance metrics (lower is better), baseline should be higher than target
    if (metric.measurableCriteria.unit === 'milliseconds' && 
        baseline.currentValue < targetValue) {
      return false;
    }

    // Confidence should be reasonable
    if (baseline.confidence < 0.1 || baseline.confidence > 1.0) {
      return false;
    }

    return true;
  }

  private isNegativeValueValid(metric: CriticalSuccessMetric): boolean {
    // Some metrics can have negative values (e.g., temperature, financial loss)
    const allowNegativeUnits = ['temperature', 'change', 'delta', 'variance'];
    return allowNegativeUnits.some(unit => 
      metric.measurableCriteria.unit.toLowerCase().includes(unit)
    );
  }
}