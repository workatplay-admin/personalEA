/**
 * SMART Scoring Integration Layer
 * 
 * Integrates the enhanced SMART scoring algorithm with the existing goal processor
 * to provide improved scoring, confidence calculation, and feedback generation.
 */

import { logger } from '@/utils/logger';
import { enhancedSMARTScoring, EnhancedScoringResult } from './enhanced-smart-scoring';
import { 
  SMARTCriteria, 
  GoalTranslationResult,
  RawGoalInput,
  InteractiveAnalysisResult,
  ConversationResponse
} from './smart-goal-processor';

/**
 * Integration adapter for enhanced SMART scoring
 */
export class SMARTScoringIntegration {
  /**
   * Enhance existing SMART criteria with advanced scoring
   */
  async enhanceGoalTranslation(
    input: RawGoalInput,
    basicResult: GoalTranslationResult,
    userContext?: any
  ): Promise<GoalTranslationResult> {
    const correlationId = Math.random().toString(36).substring(7);
    
    logger.info('Enhancing goal translation with advanced scoring', {
      correlationId,
      goalText: input.goal,
      basicConfidence: basicResult.confidence
    });

    try {
      // Run enhanced analysis
      const enhancedResult = await enhancedSMARTScoring.analyzeGoal(
        input.goal,
        {
          domain: (input.context as any)?.category,
          userBackground: (input.context as any)?.userRole,
          constraints: input.context?.constraints
        }
      );

      // Merge enhanced scoring with basic result
      const enhancedTranslation = this.mergeResults(basicResult, enhancedResult);

      logger.info('Enhanced goal translation completed', {
        correlationId,
        originalConfidence: basicResult.confidence,
        enhancedConfidence: enhancedTranslation.confidence,
        scoreImprovement: enhancedTranslation.confidence - basicResult.confidence
      });

      return enhancedTranslation;
    } catch (error) {
      logger.error('Enhanced scoring failed, falling back to basic result', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return basicResult;
    }
  }

  /**
   * Enhance confidence calculation with detailed scoring
   */
  enhanceConfidenceCalculation(
    criteria: SMARTCriteria,
    enhancedResult: EnhancedScoringResult
  ): number {
    // Use the enhanced confidence breakdown for more accurate scoring
    const breakdown = enhancedResult.confidenceBreakdown;
    
    // Weighted confidence calculation
    const weights = {
      dataQuality: 0.25,
      completeness: 0.30,
      clarity: 0.25,
      consistency: 0.20
    };

    const weightedConfidence = 
      breakdown.dataQuality * weights.dataQuality +
      breakdown.completeness * weights.completeness +
      breakdown.clarity * weights.clarity +
      breakdown.consistency * weights.consistency;

    // Apply complexity penalty
    const complexityPenalty = this.getComplexityPenalty(enhancedResult.complexityLevel);
    
    return Math.max(0.1, Math.min(0.95, weightedConfidence - complexityPenalty));
  }

  /**
   * Generate enhanced clarification questions
   */
  generateEnhancedClarificationQuestions(
    enhancedResult: EnhancedScoringResult
  ): string[] {
    const questions: string[] = [];
    const criteria = enhancedResult.criteria;

    // Priority 1: Critical gaps
    enhancedResult.strengthsAndWeaknesses.criticalGaps.forEach(gap => {
      questions.push(this.gapToQuestion(gap));
    });

    // Priority 2: Low-scoring components
    const components = [
      { name: 'specific', criterion: criteria.specific },
      { name: 'measurable', criterion: criteria.measurable },
      { name: 'achievable', criterion: criteria.achievable },
      { name: 'relevant', criterion: criteria.relevant },
      { name: 'timeBound', criterion: criteria.timeBound }
    ];

    components
      .sort((a, b) => a.criterion.score - b.criterion.score)
      .slice(0, 2)
      .forEach(({ name, criterion }) => {
        if (criterion.missing.length > 0) {
          questions.push(this.createTargetedQuestion(name, criterion.missing[0]));
        }
      });

    // Priority 3: Consistency issues
    if (enhancedResult.confidenceBreakdown.consistency < 0.7) {
      questions.push(this.createConsistencyQuestion(enhancedResult));
    }

    return [...new Set(questions)].slice(0, 5); // Return top 5 unique questions
  }

  /**
   * Process clarification answers with enhanced scoring
   */
  async processEnhancedClarifications(
    originalGoal: string,
    answers: Array<{ question: string; answer: string }>,
    previousResult: EnhancedScoringResult
  ): Promise<EnhancedScoringResult> {
    // Combine original goal with clarification answers
    const enhancedGoalText = this.combineGoalWithAnswers(originalGoal, answers);
    
    // Re-run enhanced analysis with updated information
    const newResult = await enhancedSMARTScoring.analyzeGoal(enhancedGoalText);
    
    // Merge improvements from clarifications
    return this.mergeEnhancedResults(previousResult, newResult, answers);
  }

  /**
   * Generate actionable feedback based on enhanced scoring
   */
  generateActionableFeedback(
    enhancedResult: EnhancedScoringResult
  ): {
    immediate: string[];
    improvements: string[];
    examples: string[];
  } {
    const feedback = {
      immediate: enhancedResult.recommendations.immediate,
      improvements: enhancedResult.recommendations.improvements,
      examples: [] as string[]
    };

    // Generate contextual examples for weak areas
    const weakestCriterion = this.findWeakestCriterion(enhancedResult.criteria);
    if (weakestCriterion) {
      feedback.examples = this.generateExamplesForCriterion(
        weakestCriterion.name,
        weakestCriterion.criterion,
        enhancedResult.goalCategory
      );
    }

    return feedback;
  }

  /**
   * Convert enhanced result to conversation response
   */
  enhanceConversationResponse(
    basicResponse: ConversationResponse,
    enhancedResult: EnhancedScoringResult
  ): ConversationResponse {
    // Update confidence scores with enhanced values
    const enhancedCriteria = basicResponse.conversation_state.smart_criteria;
    
    enhancedCriteria.specific.confidence = enhancedResult.criteria.specific.confidence;
    enhancedCriteria.measurable.confidence = enhancedResult.criteria.measurable.confidence;
    enhancedCriteria.achievable.confidence = enhancedResult.criteria.achievable.confidence;
    enhancedCriteria.relevant.confidence = enhancedResult.criteria.relevant.confidence;
    enhancedCriteria.timeBound.confidence = enhancedResult.criteria.timeBound.confidence;

    // Update overall confidence
    basicResponse.conversation_state.overall_confidence = enhancedResult.overallConfidence;

    // Add enhanced feedback to display elements
    if (enhancedResult.recommendations.immediate.length > 0) {
      basicResponse.display_elements.push({
        type: 'tip',
        content: `💡 Quick tip: ${enhancedResult.recommendations.immediate[0]}`,
        metadata: {
          sender: 'bot',
          visual_style: 'info'
        }
      });
    }

    // Add progress indicator based on enhanced scoring
    const progressMessage = this.generateProgressMessage(enhancedResult);
    basicResponse.display_elements.push({
      type: 'progress',
      content: progressMessage,
      metadata: {
        sender: 'bot',
        visual_style: this.getProgressStyle(enhancedResult.overallScore)
      }
    });

    return basicResponse;
  }

  // Private helper methods

  private mergeResults(
    basic: GoalTranslationResult,
    enhanced: EnhancedScoringResult
  ): GoalTranslationResult {
    // Update confidence values with enhanced scoring
    const mergedCriteria = { ...basic.smartCriteria };
    
    mergedCriteria.specific.confidence = enhanced.criteria.specific.confidence;
    mergedCriteria.measurable.confidence = enhanced.criteria.measurable.confidence;
    mergedCriteria.achievable.confidence = enhanced.criteria.achievable.confidence;
    mergedCriteria.relevant.confidence = enhanced.criteria.relevant.confidence;
    mergedCriteria.timeBound.confidence = enhanced.criteria.timeBound.confidence;

    // Add missing information from enhanced analysis
    mergedCriteria.specific.missing = enhanced.criteria.specific.missing;
    mergedCriteria.measurable.missing = enhanced.criteria.measurable.missing;
    mergedCriteria.achievable.missing = enhanced.criteria.achievable.missing;
    mergedCriteria.relevant.missing = enhanced.criteria.relevant.missing;
    mergedCriteria.timeBound.missing = enhanced.criteria.timeBound.missing;

    // Enhance clarification questions
    const enhancedQuestions = this.generateEnhancedClarificationQuestions(enhanced);
    
    return {
      ...basic,
      smartCriteria: mergedCriteria,
      confidence: enhanced.overallConfidence,
      clarificationQuestions: enhancedQuestions,
      missingCriteria: this.extractMissingCriteria(enhanced)
    };
  }

  private getComplexityPenalty(complexity: string): number {
    switch (complexity) {
      case 'simple': return 0;
      case 'moderate': return 0.05;
      case 'complex': return 0.10;
      case 'highly-complex': return 0.15;
      default: return 0;
    }
  }

  private gapToQuestion(gap: string): string {
    const questionMap: Record<string, string> = {
      'Clear action verb': 'What specific action will you take to achieve this goal?',
      'Specific target or object': 'What exactly are you trying to accomplish or create?',
      'Specific metrics': 'How will you measure progress? What numbers or indicators will you track?',
      'Quantifiable targets': 'What specific target or number are you aiming for?',
      'Current baseline': 'What is your current starting point or baseline?',
      'Resources needed': 'What resources (budget, tools, support) will you need?',
      'Skills required': 'What skills or expertise are required to achieve this?',
      'Timeline': 'When do you want to achieve this goal by?',
      'Deadline': 'What is your target completion date?',
      'Why important': 'Why is this goal important to you or your organization?',
      'Impact': 'What impact will achieving this goal have?'
    };

    // Find best matching question
    for (const [key, question] of Object.entries(questionMap)) {
      if (gap.toLowerCase().includes(key.toLowerCase())) {
        return question;
      }
    }

    // Default question format
    return `Could you provide more details about: ${gap}?`;
  }

  private createTargetedQuestion(criterion: string, missing: string): string {
    const templates: Record<string, Record<string, string>> = {
      specific: {
        default: 'Can you be more specific about what you want to achieve?',
        who: 'Who will be involved in or affected by this goal?',
        where: 'Where will this goal be implemented or take place?',
        how: 'How do you plan to achieve this goal?'
      },
      measurable: {
        default: 'How will you measure success for this goal?',
        metrics: 'What specific metrics or KPIs will you track?',
        baseline: 'What is your current baseline or starting point?',
        target: 'What is your specific target or desired outcome?'
      },
      achievable: {
        default: 'What makes you confident this goal is achievable?',
        resources: 'What resources do you have or need for this goal?',
        constraints: 'Are there any constraints or challenges to consider?',
        skills: 'Do you have the necessary skills and experience?'
      },
      relevant: {
        default: 'Why is this goal important to you right now?',
        alignment: 'How does this goal align with your broader objectives?',
        impact: 'What impact will achieving this goal have?',
        timing: 'Why is this the right time to pursue this goal?'
      },
      timeBound: {
        default: 'When do you want to achieve this goal?',
        deadline: 'What is your target completion date?',
        milestones: 'What are the key milestones along the way?',
        duration: 'How long do you expect this to take?'
      }
    };

    const criterionTemplates = templates[criterion] || templates.specific;
    
    // Find matching template based on missing info
    for (const [key, template] of Object.entries(criterionTemplates)) {
      if (missing.toLowerCase().includes(key)) {
        return template;
      }
    }

    return criterionTemplates.default;
  }

  private createConsistencyQuestion(result: EnhancedScoringResult): string {
    const { criteria, complexityLevel } = result;
    
    // Check for timeline vs complexity mismatch
    if (complexityLevel === 'complex' || complexityLevel === 'highly-complex') {
      if (criteria.timeBound.duration && 
          criteria.timeBound.duration.value < 3 && 
          criteria.timeBound.duration.unit === 'months') {
        return 'This seems like a complex goal. Is the timeline realistic, or would you prefer to break it into phases?';
      }
    }

    // Check for resource vs ambition mismatch
    if (criteria.achievable.riskLevel === 'high' && 
        criteria.achievable.feasibilityFactors.resources.score < 0.5) {
      return 'Given the ambitious nature of this goal, what additional resources might you need?';
    }

    return 'Can you help clarify how the different aspects of your goal fit together?';
  }

  private combineGoalWithAnswers(
    originalGoal: string,
    answers: Array<{ question: string; answer: string }>
  ): string {
    let combined = originalGoal;
    
    answers.forEach(({ question, answer }) => {
      // Add context from answers
      combined += ` ${answer}`;
    });

    return combined;
  }

  private mergeEnhancedResults(
    previous: EnhancedScoringResult,
    current: EnhancedScoringResult,
    answers: Array<{ question: string; answer: string }>
  ): EnhancedScoringResult {
    // Take the better score for each criterion
    const mergedCriteria = { ...current.criteria };
    
    Object.keys(mergedCriteria).forEach(key => {
      const prevCriterion = (previous.criteria as any)[key];
      const currCriterion = (current.criteria as any)[key];
      
      if (prevCriterion.score > currCriterion.score) {
        (mergedCriteria as any)[key] = prevCriterion;
      }
    });

    // Update feedback based on improvements
    const improvements: string[] = [];
    answers.forEach(({ question }) => {
      improvements.push(`Clarified: ${question.substring(0, 50)}...`);
    });

    return {
      ...current,
      criteria: mergedCriteria,
      recommendations: {
        ...current.recommendations,
        improvements: [...improvements, ...current.recommendations.improvements].slice(0, 5)
      }
    };
  }

  private findWeakestCriterion(criteria: any): { name: string; criterion: any } | null {
    let weakest = { name: '', criterion: { score: 1 } };
    
    Object.entries(criteria).forEach(([name, criterion]: [string, any]) => {
      if (criterion.score < weakest.criterion.score) {
        weakest = { name, criterion };
      }
    });

    return weakest.name ? weakest : null;
  }

  private generateExamplesForCriterion(
    criterionName: string,
    criterion: any,
    category: string
  ): string[] {
    const examples: Record<string, Record<string, string[]>> = {
      specific: {
        'Professional Development': [
          'Instead of "improve skills", try "complete AWS certification course and pass exam"',
          'Instead of "learn programming", try "build 3 Python web applications using Django"'
        ],
        'Business/Revenue': [
          'Instead of "increase sales", try "acquire 50 new B2B clients in the healthcare sector"',
          'Instead of "grow business", try "launch online store and achieve $10K monthly revenue"'
        ],
        'Health/Fitness': [
          'Instead of "get fit", try "run a 5K race in under 30 minutes"',
          'Instead of "lose weight", try "reduce body fat percentage from 25% to 20%"'
        ]
      },
      measurable: {
        'Professional Development': [
          'Track: Course completion %, quiz scores, projects completed',
          'Measure: Skills assessments before/after, peer reviews, certifications earned'
        ],
        'Business/Revenue': [
          'Track: Weekly sales numbers, conversion rates, customer acquisition cost',
          'Measure: Revenue growth %, market share, customer satisfaction scores'
        ],
        'Health/Fitness': [
          'Track: Weekly weight, body measurements, workout frequency',
          'Measure: Running pace, strength gains, energy levels (1-10 scale)'
        ]
      },
      timeBound: {
        'Professional Development': [
          'Example: "Complete by March 31st with milestones each month"',
          'Example: "6-month timeline: 2 months learning, 3 months practice, 1 month certification"'
        ],
        'Business/Revenue': [
          'Example: "Q1: Setup, Q2: Launch, Q3: Scale to $5K/month, Q4: Reach $10K/month"',
          'Example: "12-week sprint: Weeks 1-4 planning, 5-8 execution, 9-12 optimization"'
        ],
        'Health/Fitness': [
          'Example: "12 weeks: Weeks 1-4 build base, 5-8 increase intensity, 9-12 peak training"',
          'Example: "Monthly targets: Month 1: -3 lbs, Month 2: -3 lbs, Month 3: -2 lbs"'
        ]
      }
    };

    const categoryExamples = examples[criterionName]?.[category] || 
                            examples[criterionName]?.['Professional Development'] || [];
    
    return categoryExamples.slice(0, 2);
  }

  private extractMissingCriteria(enhanced: EnhancedScoringResult): string[] {
    const missing: string[] = [];
    const criteria = enhanced.criteria;

    if (criteria.specific.score < 0.6) missing.push('specific');
    if (criteria.measurable.score < 0.6) missing.push('measurable');
    if (criteria.achievable.score < 0.6) missing.push('achievable');
    if (criteria.relevant.score < 0.6) missing.push('relevant');
    if (criteria.timeBound.score < 0.6) missing.push('timeBound');

    return missing;
  }

  private generateProgressMessage(result: EnhancedScoringResult): string {
    const score = Math.round(result.overallScore * 100);
    const level = 
      score >= 80 ? 'Excellent' :
      score >= 60 ? 'Good' :
      score >= 40 ? 'Fair' :
      'Needs Work';

    const criteriaCount = Object.values(result.criteria)
      .filter(c => c.score >= 0.7).length;

    return `Goal Strength: ${level} (${score}%) | ${criteriaCount}/5 SMART criteria well-defined`;
  }

  private getProgressStyle(score: number): 'success' | 'warning' | 'info' | 'primary' {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'info';
    if (score >= 0.4) return 'warning';
    return 'primary';
  }
}

// Export singleton instance
export const smartScoringIntegration = new SMARTScoringIntegration();