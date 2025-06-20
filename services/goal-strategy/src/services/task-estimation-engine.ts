import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import { logger } from '../utils/logger';
import { z } from 'zod';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'],
});

// Validation schemas
const EstimationRequestSchema = z.object({
  taskId: z.string().uuid().optional(),
  taskDescription: z.string().min(1).max(1000),
  complexity: z.enum(['SIMPLE', 'MODERATE', 'COMPLEX']),
  skills: z.array(z.string()).min(1),
  methods: z.array(z.enum(['EXPERT_JUDGMENT', 'ANALOGY', 'THREE_POINT_PERT', 'PARAMETRIC', 'BOTTOM_UP'])).default(['EXPERT_JUDGMENT', 'ANALOGY', 'THREE_POINT_PERT']),
  includeUncertainty: z.boolean().default(true),
  confidenceLevel: z.number().min(0.5).max(0.99).default(0.8),
});

const HistoricalDataSchema = z.object({
  taskTitle: z.string(),
  description: z.string(),
  estimatedHours: z.number(),
  actualHours: z.number(),
  complexity: z.enum(['SIMPLE', 'MODERATE', 'COMPLEX']),
  skills: z.array(z.string()),
  completedAt: z.date(),
  accuracy: z.number(), // Calculated as 1 - |estimated - actual| / actual
});

export interface EstimationResult {
  taskId?: string;
  estimationMethods: EstimationMethod[];
  finalEstimate: {
    optimistic: number;
    mostLikely: number;
    pessimistic: number;
    expected: number;
    standardDeviation: number;
    confidenceInterval: {
      lower: number;
      upper: number;
      level: number;
    };
  };
  confidence: number;
  riskFactors: RiskFactor[];
  recommendations: string[];
  historicalComparisons: HistoricalComparison[];
  metadata: {
    estimatedAt: Date;
    estimatedBy: string;
    methodsUsed: string[];
    dataQuality: 'HIGH' | 'MEDIUM' | 'LOW';
  };
}

export interface EstimationMethod {
  name: string;
  estimate: number;
  confidence: number;
  rationale: string;
  dataPoints: number;
  weight: number;
}

export interface RiskFactor {
  factor: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  probability: number;
  mitigation: string;
  adjustmentFactor: number;
}

export interface HistoricalComparison {
  taskTitle: string;
  similarity: number;
  estimatedHours: number;
  actualHours: number;
  accuracy: number;
  lessons: string[];
}

export interface ThreePointEstimate {
  optimistic: number;
  mostLikely: number;
  pessimistic: number;
  rationale: {
    optimisticReason: string;
    mostLikelyReason: string;
    pessimisticReason: string;
  };
}

export class TaskEstimationEngine {
  /**
   * Generate comprehensive task estimation using multiple methods
   */
  async estimateTask(request: z.infer<typeof EstimationRequestSchema>): Promise<EstimationResult> {
    const correlationId = `estimation-${Date.now()}`;
    logger.info('Starting task estimation', { correlationId, request });

    try {
      // Validate request
      const validatedRequest = EstimationRequestSchema.parse(request);

      // Load historical data for comparison
      const historicalData = await this.loadHistoricalData(
        validatedRequest.skills,
        validatedRequest.complexity
      );

      // Apply estimation methods
      const estimationMethods: EstimationMethod[] = [];

      for (const method of validatedRequest.methods) {
        const methodResult = await this.applyEstimationMethod(
          method,
          validatedRequest,
          historicalData,
          correlationId
        );
        estimationMethods.push(methodResult);
      }

      // Calculate weighted final estimate
      const finalEstimate = this.calculateWeightedEstimate(estimationMethods, validatedRequest.confidenceLevel);

      // Identify risk factors
      const riskFactors = await this.identifyRiskFactors(validatedRequest, historicalData);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        estimationMethods,
        riskFactors,
        historicalData
      );

      // Find historical comparisons
      const historicalComparisons = this.findHistoricalComparisons(
        validatedRequest,
        historicalData
      );

      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(estimationMethods, riskFactors);

      const result: EstimationResult = {
        ...(validatedRequest.taskId && { taskId: validatedRequest.taskId }),
        estimationMethods,
        finalEstimate,
        confidence,
        riskFactors,
        recommendations,
        historicalComparisons,
        metadata: {
          estimatedAt: new Date(),
          estimatedBy: 'AI_ESTIMATION_ENGINE',
          methodsUsed: validatedRequest.methods,
          dataQuality: this.assessDataQuality(historicalData),
        },
      };

      // Save estimation for future learning
      await this.saveEstimation(result, correlationId);

      logger.info('Task estimation completed', {
        correlationId,
        finalEstimate: result.finalEstimate.expected,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      logger.error('Task estimation failed', { correlationId, error });
      throw error;
    }
  }

  /**
   * Update estimation with actual completion data for learning
   */
  async updateWithActual(
    taskId: string,
    actualHours: number,
    completionNotes?: string
  ): Promise<void> {
    const correlationId = `update-actual-${Date.now()}`;
    logger.info('Updating estimation with actual data', { correlationId, taskId, actualHours });

    try {
      // Get original estimation
      const estimation = await this.getEstimation(taskId);
      if (!estimation) {
        throw new Error(`No estimation found for task: ${taskId}`);
      }

      // Calculate accuracy
      const accuracy = 1 - Math.abs(estimation.finalEstimate.expected - actualHours) / actualHours;

      // Save historical data
      await this.saveHistoricalData({
        taskId,
        estimatedHours: estimation.finalEstimate.expected,
        actualHours,
        accuracy,
        ...(completionNotes && { completionNotes }),
        completedAt: new Date(),
      });

      // Update learning models
      await this.updateLearningModels(estimation, actualHours, accuracy);

      logger.info('Estimation updated with actual data', { correlationId, accuracy });
    } catch (error) {
      logger.error('Failed to update estimation with actual data', { correlationId, error });
      throw error;
    }
  }

  /**
   * Apply specific estimation method
   */
  private async applyEstimationMethod(
    method: string,
    request: z.infer<typeof EstimationRequestSchema>,
    historicalData: any[],
    correlationId: string
  ): Promise<EstimationMethod> {
    switch (method) {
      case 'EXPERT_JUDGMENT':
        return await this.applyExpertJudgment(request, correlationId);
      case 'ANALOGY':
        return this.applyAnalogyMethod(request, historicalData);
      case 'THREE_POINT_PERT':
        return await this.applyThreePointPERT(request, correlationId);
      case 'PARAMETRIC':
        return this.applyParametricMethod(request, historicalData);
      case 'BOTTOM_UP':
        return await this.applyBottomUpMethod(request, correlationId);
      default:
        throw new Error(`Unknown estimation method: ${method}`);
    }
  }

  /**
   * Apply expert judgment using AI
   */
  private async applyExpertJudgment(
    request: z.infer<typeof EstimationRequestSchema>,
    correlationId: string
  ): Promise<EstimationMethod> {
    const prompt = `
As an expert project manager, estimate the time required for the following task:

**Task Description:** ${request.taskDescription}
**Complexity:** ${request.complexity}
**Required Skills:** ${request.skills.join(', ')}

Consider these factors in your estimation:
1. Task complexity and scope
2. Required skills and expertise level
3. Potential challenges and unknowns
4. Quality assurance and testing time
5. Documentation and communication overhead

Provide your estimate in hours and explain your reasoning.
Focus on realistic estimates based on industry best practices.

Return a JSON object with this structure:
{
  "estimate": <hours as number>,
  "confidence": <0-1 confidence score>,
  "rationale": "<detailed explanation of your reasoning>",
  "assumptions": ["<assumption 1>", "<assumption 2>"],
  "risks": ["<risk 1>", "<risk 2>"]
}
`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert project manager with 15+ years of experience in software development and project estimation. Provide realistic, well-reasoned time estimates.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(content);

      return {
        name: 'Expert Judgment (AI)',
        estimate: result.estimate,
        confidence: result.confidence,
        rationale: result.rationale,
        dataPoints: 1,
        weight: 0.3,
      };
    } catch (error) {
      logger.error('Expert judgment estimation failed', { correlationId, error });
      
      // Fallback to simple heuristic
      const baseHours = request.complexity === 'SIMPLE' ? 2 : request.complexity === 'MODERATE' ? 4 : 8;
      const skillMultiplier = request.skills.length * 0.5;
      
      return {
        name: 'Expert Judgment (Fallback)',
        estimate: baseHours + skillMultiplier,
        confidence: 0.5,
        rationale: 'Fallback heuristic based on complexity and skill requirements',
        dataPoints: 0,
        weight: 0.2,
      };
    }
  }

  /**
   * Apply analogy-based estimation
   */
  private applyAnalogyMethod(
    request: z.infer<typeof EstimationRequestSchema>,
    historicalData: any[]
  ): EstimationMethod {
    if (historicalData.length === 0) {
      return {
        name: 'Analogy',
        estimate: 0,
        confidence: 0,
        rationale: 'No historical data available for analogy',
        dataPoints: 0,
        weight: 0,
      };
    }

    // Find similar tasks
    const similarTasks = historicalData
      .map(task => ({
        ...task,
        similarity: this.calculateTaskSimilarity(request, task),
      }))
      .filter(task => task.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    if (similarTasks.length === 0) {
      return {
        name: 'Analogy',
        estimate: 0,
        confidence: 0,
        rationale: 'No sufficiently similar tasks found',
        dataPoints: 0,
        weight: 0,
      };
    }

    // Calculate weighted average based on similarity
    let totalWeight = 0;
    let weightedSum = 0;

    for (const task of similarTasks) {
      const weight = task.similarity * task.accuracy;
      weightedSum += task.actualHours * weight;
      totalWeight += weight;
    }

    const estimate = totalWeight > 0 ? weightedSum / totalWeight : similarTasks[0].actualHours;
    const confidence = Math.min(0.9, totalWeight / similarTasks.length);

    return {
      name: 'Analogy',
      estimate,
      confidence,
      rationale: `Based on ${similarTasks.length} similar tasks with average similarity of ${(similarTasks.reduce((sum, t) => sum + t.similarity, 0) / similarTasks.length).toFixed(2)}`,
      dataPoints: similarTasks.length,
      weight: Math.min(0.4, similarTasks.length * 0.1),
    };
  }

  /**
   * Apply three-point PERT estimation
   */
  private async applyThreePointPERT(
    request: z.infer<typeof EstimationRequestSchema>,
    correlationId: string
  ): Promise<EstimationMethod> {
    const threePointEstimate = await this.generateThreePointEstimate(request, correlationId);

    // PERT formula: (Optimistic + 4 * Most Likely + Pessimistic) / 6
    const pertEstimate = (
      threePointEstimate.optimistic + 
      4 * threePointEstimate.mostLikely + 
      threePointEstimate.pessimistic
    ) / 6;

    return {
      name: 'Three-Point PERT',
      estimate: pertEstimate,
      confidence: 0.8,
      rationale: `PERT estimate based on optimistic (${threePointEstimate.optimistic}h), most likely (${threePointEstimate.mostLikely}h), and pessimistic (${threePointEstimate.pessimistic}h) scenarios`,
      dataPoints: 3,
      weight: 0.35,
    };
  }

  /**
   * Generate three-point estimate using AI
   */
  private async generateThreePointEstimate(
    request: z.infer<typeof EstimationRequestSchema>,
    correlationId: string
  ): Promise<ThreePointEstimate> {
    const prompt = `
Provide three-point estimation for the following task:

**Task:** ${request.taskDescription}
**Complexity:** ${request.complexity}
**Skills:** ${request.skills.join(', ')}

Provide three estimates:
1. **Optimistic**: Best-case scenario (everything goes perfectly)
2. **Most Likely**: Realistic scenario (normal conditions)
3. **Pessimistic**: Worst-case scenario (significant challenges)

Return JSON:
{
  "optimistic": <hours>,
  "mostLikely": <hours>,
  "pessimistic": <hours>,
  "rationale": {
    "optimisticReason": "<why this is the best case>",
    "mostLikelyReason": "<why this is most realistic>",
    "pessimisticReason": "<what could go wrong>"
  }
}
`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert estimator. Provide realistic three-point estimates considering various scenarios.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(content);
    } catch (error) {
      logger.error('Three-point estimation failed', { correlationId, error });
      
      // Fallback to heuristic
      const baseHours = request.complexity === 'SIMPLE' ? 2 : request.complexity === 'MODERATE' ? 4 : 8;
      return {
        optimistic: baseHours * 0.7,
        mostLikely: baseHours,
        pessimistic: baseHours * 1.5,
        rationale: {
          optimisticReason: 'Fallback heuristic - 30% below base estimate',
          mostLikelyReason: 'Fallback heuristic - base complexity estimate',
          pessimisticReason: 'Fallback heuristic - 50% above base estimate',
        },
      };
    }
  }

  /**
   * Apply parametric estimation method
   */
  private applyParametricMethod(
    request: z.infer<typeof EstimationRequestSchema>,
    historicalData: any[]
  ): EstimationMethod {
    if (historicalData.length < 5) {
      return {
        name: 'Parametric',
        estimate: 0,
        confidence: 0,
        rationale: 'Insufficient historical data for parametric estimation',
        dataPoints: historicalData.length,
        weight: 0,
      };
    }

    // Calculate parameters based on historical data
    const complexityFactors = {
      SIMPLE: historicalData.filter(t => t.complexity === 'SIMPLE').map(t => t.actualHours),
      MODERATE: historicalData.filter(t => t.complexity === 'MODERATE').map(t => t.actualHours),
      COMPLEX: historicalData.filter(t => t.complexity === 'COMPLEX').map(t => t.actualHours),
    };

    const complexityHours = complexityFactors[request.complexity];
    if (complexityHours.length === 0) {
      return {
        name: 'Parametric',
        estimate: 0,
        confidence: 0,
        rationale: `No historical data for ${request.complexity} complexity tasks`,
        dataPoints: 0,
        weight: 0,
      };
    }

    const avgComplexityHours = complexityHours.reduce((sum, h) => sum + h, 0) / complexityHours.length;
    const skillFactor = request.skills.length * 0.3; // 30% per additional skill
    const estimate = avgComplexityHours * (1 + skillFactor);

    return {
      name: 'Parametric',
      estimate,
      confidence: Math.min(0.8, complexityHours.length / 10),
      rationale: `Based on average ${request.complexity} task duration (${avgComplexityHours.toFixed(1)}h) with skill factor adjustment`,
      dataPoints: complexityHours.length,
      weight: Math.min(0.3, complexityHours.length * 0.05),
    };
  }

  /**
   * Apply bottom-up estimation method
   */
  private async applyBottomUpMethod(
    request: z.infer<typeof EstimationRequestSchema>,
    correlationId: string
  ): Promise<EstimationMethod> {
    // This would typically break down the task into smaller components
    // For now, we'll use AI to simulate this breakdown
    const prompt = `
Break down the following task into smaller components and estimate each:

**Task:** ${request.taskDescription}
**Complexity:** ${request.complexity}
**Skills:** ${request.skills.join(', ')}

Break this into 3-7 smaller subtasks and estimate each component.
Consider: planning, implementation, testing, documentation, integration.

Return JSON:
{
  "subtasks": [
    {
      "name": "<subtask name>",
      "description": "<brief description>",
      "estimatedHours": <hours>
    }
  ],
  "totalEstimate": <sum of all subtasks>,
  "rationale": "<explanation of breakdown approach>"
}
`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at breaking down complex tasks into manageable components. Provide detailed, realistic breakdowns.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1200,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(content);

      return {
        name: 'Bottom-Up',
        estimate: result.totalEstimate,
        confidence: 0.85,
        rationale: `${result.rationale} (${result.subtasks.length} subtasks)`,
        dataPoints: result.subtasks.length,
        weight: 0.4,
      };
    } catch (error) {
      logger.error('Bottom-up estimation failed', { correlationId, error });
      
      return {
        name: 'Bottom-Up (Fallback)',
        estimate: 0,
        confidence: 0,
        rationale: 'Failed to generate bottom-up breakdown',
        dataPoints: 0,
        weight: 0,
      };
    }
  }

  /**
   * Calculate weighted final estimate
   */
  private calculateWeightedEstimate(
    methods: EstimationMethod[],
    confidenceLevel: number
  ): EstimationResult['finalEstimate'] {
    const validMethods = methods.filter(m => m.weight > 0 && m.estimate > 0);
    
    if (validMethods.length === 0) {
      throw new Error('No valid estimation methods produced results');
    }

    // Calculate weighted average
    let totalWeight = 0;
    let weightedSum = 0;

    for (const method of validMethods) {
      const adjustedWeight = method.weight * method.confidence;
      weightedSum += method.estimate * adjustedWeight;
      totalWeight += adjustedWeight;
    }

    const expected = totalWeight > 0 ? weightedSum / totalWeight : validMethods[0]?.estimate || 0;

    // Calculate variance for confidence interval
    let variance = 0;
    for (const method of validMethods) {
      const adjustedWeight = method.weight * method.confidence;
      variance += adjustedWeight * Math.pow(method.estimate - expected, 2);
    }
    variance = variance / totalWeight;

    const standardDeviation = Math.sqrt(variance);

    // Calculate confidence interval (assuming normal distribution)
    const zScore = this.getZScore(confidenceLevel);
    const marginOfError = zScore * standardDeviation;

    // For three-point estimates, also consider optimistic/pessimistic
    const threePointMethod = methods.find(m => m.name === 'Three-Point PERT');
    let optimistic = expected - marginOfError;
    let pessimistic = expected + marginOfError;
    let mostLikely = expected;

    if (threePointMethod) {
      // Use PERT estimates if available
      optimistic = Math.min(optimistic, expected * 0.7);
      pessimistic = Math.max(pessimistic, expected * 1.3);
    }

    return {
      optimistic: Math.max(0.25, optimistic),
      mostLikely,
      pessimistic,
      expected,
      standardDeviation,
      confidenceInterval: {
        lower: Math.max(0.25, expected - marginOfError),
        upper: expected + marginOfError,
        level: confidenceLevel,
      },
    };
  }

  /**
   * Get Z-score for confidence level
   */
  private getZScore(confidenceLevel: number): number {
    // Common Z-scores for confidence levels
    const zScores: Record<string, number> = {
      '0.5': 0.674,
      '0.6': 0.842,
      '0.7': 1.036,
      '0.8': 1.282,
      '0.9': 1.645,
      '0.95': 1.960,
      '0.99': 2.576,
    };

    const key = confidenceLevel.toString();
    return zScores[key] || 1.645; // Default to 90% confidence
  }

  /**
   * Calculate task similarity for analogy method
   */
  private calculateTaskSimilarity(
    request: z.infer<typeof EstimationRequestSchema>,
    historicalTask: any
  ): number {
    let similarity = 0;

    // Complexity similarity (40% weight)
    if (request.complexity === historicalTask.complexity) {
      similarity += 0.4;
    }

    // Skills similarity (40% weight)
    const requestSkills = new Set(request.skills);
    const historicalSkills = new Set(historicalTask.skills);
    const intersection = new Set([...requestSkills].filter(x => historicalSkills.has(x)));
    const union = new Set([...requestSkills, ...historicalSkills]);
    const skillSimilarity = intersection.size / union.size;
    similarity += skillSimilarity * 0.4;

    // Description similarity (20% weight) - simple keyword matching
    const requestWords = new Set(request.taskDescription.toLowerCase().split(/\s+/));
    const historicalWords = new Set(historicalTask.description.toLowerCase().split(/\s+/));
    const wordIntersection = new Set([...requestWords].filter(x => historicalWords.has(x)));
    const wordUnion = new Set([...requestWords, ...historicalWords]);
    const descriptionSimilarity = wordIntersection.size / wordUnion.size;
    similarity += descriptionSimilarity * 0.2;

    return similarity;
  }

  /**
   * Identify risk factors
   */
  private async identifyRiskFactors(
    request: z.infer<typeof EstimationRequestSchema>,
    historicalData: any[]
  ): Promise<RiskFactor[]> {
    const riskFactors: RiskFactor[] = [];

    // Complexity risk
    if (request.complexity === 'COMPLEX') {
      riskFactors.push({
        factor: 'High Complexity',
        impact: 'HIGH',
        probability: 0.7,
        mitigation: 'Break down into smaller tasks, add buffer time',
        adjustmentFactor: 1.3,
      });
    }

    // Multiple skills risk
    if (request.skills.length > 3) {
      riskFactors.push({
        factor: 'Multiple Skills Required',
        impact: 'MEDIUM',
        probability: 0.5,
        mitigation: 'Ensure skill availability, consider training time',
        adjustmentFactor: 1.2,
      });
    }

    // Historical accuracy risk
    const similarTasks = historicalData.filter(task => 
      this.calculateTaskSimilarity(request, task) > 0.5
    );

    if (similarTasks.length > 0) {
      const avgAccuracy = similarTasks.reduce((sum, task) => sum + task.accuracy, 0) / similarTasks.length;
      if (avgAccuracy < 0.7) {
        riskFactors.push({
          factor: 'Poor Historical Accuracy',
          impact: 'HIGH',
          probability: 0.8,
          mitigation: 'Add significant buffer, improve estimation process',
          adjustmentFactor: 1.4,
        });
      }
    }

    return riskFactors;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    methods: EstimationMethod[],
    riskFactors: RiskFactor[],
    historicalData: any[]
  ): string[] {
    const recommendations: string[] = [];

    // Method-based recommendations
    const highConfidenceMethods = methods.filter(m => m.confidence > 0.7);
    if (highConfidenceMethods.length === 0) {
      recommendations.push('Consider gathering more historical data to improve estimation accuracy');
    }

    // Risk-based recommendations
    const highRisks = riskFactors.filter(r => r.impact === 'HIGH');
    if (highRisks.length > 0) {
      recommendations.push('Add 20-30% buffer time due to identified high-risk factors');
    }

    // Data quality recommendations
    if (historicalData.length < 10) {
      recommendations.push('Start collecting more detailed task completion data for better future estimates');
    }

    // Variance recommendations
    const estimates = methods.filter(m => m.estimate > 0).map(m => m.estimate);
    if (estimates.length > 1) {
      const variance = this.calculateVariance(estimates);
      const mean = estimates.reduce((sum, e) => sum + e, 0) / estimates.length;
      const coefficientOfVariation = Math.sqrt(variance) / mean;

      if (coefficientOfVariation > 0.3) {
        recommendations.push('High variance between estimation methods - consider breaking down the task further');
      }
    }

    return recommendations;
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  /**
   * Find historical comparisons
   */
  private findHistoricalComparisons(
    request: z.infer<typeof EstimationRequestSchema>,
    historicalData: any[]
  ): HistoricalComparison[] {
    return historicalData
      .map(task => ({
        taskTitle: task.taskTitle,
        similarity: this.calculateTaskSimilarity(request, task),
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
        accuracy: task.accuracy,
        lessons: this.extractLessons(task),
      }))
      .filter(comp => comp.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
  }

  /**
   * Extract lessons from historical task
   */
  private extractLessons(task: any): string[] {
    const lessons: string[] = [];

    if (task.accuracy < 0.7) {
      lessons.push('Previous similar task was significantly underestimated');
    }

    if (task.actualHours > task.estimatedHours * 1.5) {
      lessons.push('Consider additional complexity factors and dependencies');
    }

    return lessons;
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(
    methods: EstimationMethod[],
    riskFactors: RiskFactor[]
  ): number {
    const validMethods = methods.filter(m => m.weight > 0);
    if (validMethods.length === 0) return 0;

    // Base confidence from methods
    const avgConfidence = validMethods.reduce((sum, m) => sum + m.confidence * m.weight, 0) / 
                         validMethods.reduce((sum, m) => sum + m.weight, 0);

    // Adjust for risk factors
    const riskAdjustment = riskFactors.reduce((adj, risk) => {
      const riskImpact = risk.impact === 'HIGH' ? 0.2 : risk.impact === 'MEDIUM' ? 0.1 : 0.05;
      return adj - (riskImpact * risk.probability);
    }, 0);

    return Math.max(0.1, Math.min(0.95, avgConfidence + riskAdjustment));
  }

  /**
   * Load historical data for estimation
   */
  private async loadHistoricalData(skills: string[], complexity: string): Promise<any[]> {
    try {
      // This would load from a historical data table
      // For now, return empty array as we haven't implemented historical data storage yet
      return [];
    } catch (error) {
      logger.error('Failed to load historical data', { error });
      return [];
    }
  }

  /**
   * Assess data quality
   */
  private assessDataQuality(historicalData: any[]): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (historicalData.length >= 20) return 'HIGH';
    if (historicalData.length >= 5) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Save estimation for future reference
   */
  private async saveEstimation(result: EstimationResult, correlationId: string): Promise<void> {
    try {
      // This would save to a task_estimations table
      // For now, just log the save operation
      logger.info('Estimation saved', {
        correlationId,
        taskId: result.taskId,
        estimate: result.finalEstimate.expected
      });
    } catch (error) {
      logger.error('Failed to save estimation', { correlationId, error });
    }
  }

  /**
   * Get existing estimation
   */
  private async getEstimation(taskId: string): Promise<EstimationResult | null> {
    try {
      // This would retrieve from task_estimations table
      // For now, return null
      return null;
    } catch (error) {
      logger.error('Failed to get estimation', { taskId, error });
      return null;
    }
  }

  /**
   * Save historical data for learning
   */
  private async saveHistoricalData(data: {
    taskId: string;
    estimatedHours: number;
    actualHours: number;
    accuracy: number;
    completionNotes?: string;
    completedAt: Date;
  }): Promise<void> {
    try {
      // This would save to a task_history table
      logger.info('Historical data saved', {
        taskId: data.taskId,
        accuracy: data.accuracy
      });
    } catch (error) {
      logger.error('Failed to save historical data', { error });
    }
  }

  /**
   * Update learning models with actual completion data
   */
  private async updateLearningModels(
    estimation: EstimationResult,
    actualHours: number,
    accuracy: number
  ): Promise<void> {
    try {
      // This would update ML models or statistical parameters
      // For now, just log the update
      logger.info('Learning models updated', {
        estimatedHours: estimation.finalEstimate.expected,
        actualHours,
        accuracy
      });
    } catch (error) {
      logger.error('Failed to update learning models', { error });
    }
  }
}

export const taskEstimationEngine = new TaskEstimationEngine();