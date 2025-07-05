/**
 * Enhanced SMART Scoring Algorithm
 * 
 * Implements improved SMART goal scoring with better accuracy, confidence calculation,
 * edge case handling, and actionable feedback generation.
 */

import { logger } from '@/utils/logger';

/**
 * Enhanced SMART Criteria with detailed scoring
 */
export interface EnhancedSMARTCriteria {
  specific: {
    value: string;
    confidence: number;
    score: number;
    components: {
      what: { present: boolean; value?: string; weight: number };
      who: { present: boolean; value?: string; weight: number };
      where: { present: boolean; value?: string; weight: number };
      why: { present: boolean; value?: string; weight: number };
      how: { present: boolean; value?: string; weight: number };
    };
    feedback: string[];
    missing: string[];
  };
  measurable: {
    value: string;
    confidence: number;
    score: number;
    metrics: Array<{
      metric: string;
      value?: number | string;
      unit?: string;
      type: 'quantitative' | 'qualitative';
      confidence: number;
    }>;
    components: {
      hasMetrics: boolean;
      hasTargets: boolean;
      hasBaseline: boolean;
      hasProgressIndicators: boolean;
    };
    feedback: string[];
    missing: string[];
  };
  achievable: {
    value: string;
    confidence: number;
    score: number;
    feasibilityFactors: {
      resources: { identified: boolean; adequate?: boolean; score: number };
      skills: { identified: boolean; available?: boolean; score: number };
      time: { realistic: boolean; score: number };
      constraints: { identified: boolean; manageable?: boolean; score: number };
    };
    riskLevel: 'low' | 'medium' | 'high';
    feedback: string[];
    missing: string[];
  };
  relevant: {
    value: string;
    confidence: number;
    score: number;
    alignmentFactors: {
      personalMotivation: { present: boolean; strength: number };
      broaderGoals: { aligned: boolean; strength: number };
      timing: { appropriate: boolean; urgency: number };
      impact: { identified: boolean; significance: number };
    };
    feedback: string[];
    missing: string[];
  };
  timeBound: {
    value: string;
    confidence: number;
    score: number;
    timeComponents: {
      hasDeadline: boolean;
      hasStartDate: boolean;
      hasMilestones: boolean;
      hasTimeframe: boolean;
      isRealistic: boolean;
    };
    deadline?: string;
    duration?: {
      value: number;
      unit: 'days' | 'weeks' | 'months' | 'years';
    };
    milestones?: Array<{
      name: string;
      timing: string;
      confidence: number;
    }>;
    feedback: string[];
    missing: string[];
  };
}

/**
 * Enhanced scoring result with detailed insights
 */
export interface EnhancedScoringResult {
  overallScore: number;
  overallConfidence: number;
  criteria: EnhancedSMARTCriteria;
  strengthsAndWeaknesses: {
    strengths: string[];
    weaknesses: string[];
    criticalGaps: string[];
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    improvements: string[];
  };
  confidenceBreakdown: {
    dataQuality: number;
    completeness: number;
    clarity: number;
    consistency: number;
  };
  goalCategory: string;
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'highly-complex';
}

/**
 * Enhanced SMART Scoring Engine
 */
export class EnhancedSMARTScoring {
  // Weights for each SMART component
  private readonly COMPONENT_WEIGHTS = {
    specific: 0.25,
    measurable: 0.25,
    achievable: 0.20,
    relevant: 0.15,
    timeBound: 0.15
  };

  // Patterns for advanced detection
  private readonly DETECTION_PATTERNS = {
    timeframe: {
      explicit: [
        /\b(\d+)\s*(day|week|month|year|quarter|hour)s?\b/gi,
        /\b(by|before|until|within|in|over)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/gi,
        /\b(q[1-4]|quarter\s+[1-4])\s+\d{4}\b/gi,
        /\b(spring|summer|fall|autumn|winter)\s+\d{4}\b/gi,
        /\b(next|this|coming)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month|year|quarter)\b/gi,
        /\b(end\s+of|beginning\s+of|middle\s+of)\s+(the\s+)?(week|month|year|quarter)\b/gi
      ],
      implicit: [
        /\b(soon|eventually|someday|later|future|long-term|short-term)\b/gi,
        /\b(asap|immediately|urgent|priority)\b/gi
      ],
      duration: [
        /\b(for|over|during|throughout)\s+(\d+|a|an|the)\s*(day|week|month|year|quarter)s?\b/gi,
        /\b(\d+)[-–]\s*(\d+)\s*(day|week|month|year)s?\b/gi
      ]
    },
    metrics: {
      quantitative: [
        /\b(\d+(?:\.\d+)?)\s*(%|percent|percentage)\b/gi,
        /\b[$€£¥]\s*(\d+(?:,\d{3})*(?:\.\d+)?)\b/g,
        /\b(\d+(?:,\d{3})*(?:\.\d+)?)\s*(units?|items?|pieces?|customers?|users?|sales?|revenue|dollars?|euros?|pounds?)\b/gi,
        /\b(increase|decrease|improve|reduce|grow|expand)\s+by\s+(\d+(?:\.\d+)?)\s*(%|percent|times?|x)?\b/gi,
        /\b(\d+)\s*out\s*of\s*(\d+)\b/gi,
        /\b(score|rating|grade)\s*(?:of\s*)?(\d+(?:\.\d+)?)\b/gi,
        /\b(\d+(?:\.\d+)?)\s*(lbs?|kg|kilos?|grams?|miles?|km|meters?|feet|inches)\b/gi
      ],
      qualitative: [
        /\b(better|worse|improved|enhanced|optimal|minimal|maximal)\b/gi,
        /\b(high|medium|low|good|excellent|poor|satisfactory)\s+(quality|performance|satisfaction)\b/gi,
        /\b(positive|negative|neutral)\s+(feedback|response|outcome)\b/gi
      ],
      comparison: [
        /\b(more|less|fewer|greater)\s+than\b/gi,
        /\b(at\s+least|at\s+most|minimum|maximum)\s+(\d+)\b/gi,
        /\b(double|triple|quadruple|half|quarter)\b/gi
      ]
    },
    specificity: {
      actions: [
        /\b(create|build|develop|implement|launch|design|write|complete|finish|achieve|establish|organize|plan|execute|deliver|produce|publish)\b/gi,
        /\b(learn|master|study|practice|understand|analyze|research|investigate|explore|discover)\b/gi,
        /\b(improve|enhance|optimize|streamline|upgrade|refine|polish|perfect)\b/gi,
        /\b(sell|buy|acquire|invest|save|earn|generate|secure)\b/gi
      ],
      objects: [
        /\b(system|platform|application|website|app|software|tool|framework|database|API)\b/gi,
        /\b(product|service|feature|component|module|function|process|workflow)\b/gi,
        /\b(report|document|presentation|proposal|plan|strategy|policy|procedure)\b/gi,
        /\b(course|certification|degree|skill|competency|expertise)\b/gi
      ],
      context: [
        /\b(for|using|with|through|via|by\s+means\s+of)\s+(\w+)\b/gi,
        /\b(at|in|on|within|during)\s+(the\s+)?(\w+)\b/gi,
        /\b(department|team|organization|company|group|division)\b/gi
      ]
    },
    feasibility: {
      resources: [
        /\b(budget|funding|money|capital|investment)\s*(?:of\s*)?[$€£¥]?\s*(\d+)\b/gi,
        /\b(team|staff|personnel|employees?|people|resources?)\s*(?:of\s*)?(\d+)?\b/gi,
        /\b(equipment|tools?|software|hardware|infrastructure)\b/gi,
        /\b(available|allocated|dedicated|assigned)\s+(resources?|budget|time|staff)\b/gi
      ],
      constraints: [
        /\b(limited|constrained|restricted)\s+(by|to)\b/gi,
        /\b(challenge|obstacle|barrier|limitation|constraint)\b/gi,
        /\b(depend(?:s|ing)?\s+on|require(?:s|ing)?|need(?:s|ing)?)\b/gi,
        /\b(subject\s+to|contingent\s+upon|conditional\s+on)\b/gi
      ],
      experience: [
        /\b(\d+)\s*years?\s*(of\s*)?(experience|expertise)\b/gi,
        /\b(experienced|skilled|proficient|competent|qualified)\s+(in|with|at)\b/gi,
        /\b(beginner|intermediate|advanced|expert|novice)\s*(level)?\b/gi
      ]
    },
    relevance: {
      motivation: [
        /\b(want|desire|wish|hope|aspire|aim|intend)\s+to\b/gi,
        /\b(passionate|enthusiastic|motivated|driven|committed)\s+(about|to)\b/gi,
        /\b(important|crucial|critical|essential|vital|key|significant)\s+(to|for)\b/gi,
        /\b(because|since|as|in\s+order\s+to|so\s+that|for\s+the\s+purpose\s+of)\b/gi
      ],
      alignment: [
        /\b(align(?:s|ed|ing)?\s+with|support(?:s|ing)?|contribute(?:s|ing)?\s+to)\b/gi,
        /\b(part\s+of|component\s+of|element\s+of|aspect\s+of)\b/gi,
        /\b(career|personal|professional|life|business|organizational)\s+(goal|objective|plan|strategy)\b/gi
      ],
      impact: [
        /\b(impact|effect|influence|consequence|result|outcome)\b/gi,
        /\b(benefit|advantage|value|worth|gain|improvement)\b/gi,
        /\b(transform|change|revolutionize|disrupt|innovate)\b/gi
      ]
    }
  };

  /**
   * Analyze goal text and generate enhanced SMART scoring
   */
  async analyzeGoal(
    goalText: string,
    context?: {
      domain?: string;
      userBackground?: string;
      previousGoals?: string[];
      constraints?: string[];
    }
  ): Promise<EnhancedScoringResult> {
    const correlationId = this.generateCorrelationId();
    
    logger.info('Starting enhanced SMART analysis', {
      correlationId,
      goalLength: goalText.length,
      hasContext: !!context
    });

    try {
      // Analyze each SMART component
      const specific = this.analyzeSpecificity(goalText, context);
      const measurable = this.analyzeMeasurability(goalText, context);
      const achievable = this.analyzeAchievability(goalText, context);
      const relevant = this.analyzeRelevance(goalText, context);
      const timeBound = this.analyzeTimeBound(goalText, context);

      // Calculate overall scores
      const overallScore = this.calculateWeightedScore({
        specific: specific.score,
        measurable: measurable.score,
        achievable: achievable.score,
        relevant: relevant.score,
        timeBound: timeBound.score
      });

      const overallConfidence = this.calculateOverallConfidence({
        specific: specific.confidence,
        measurable: measurable.confidence,
        achievable: achievable.confidence,
        relevant: relevant.confidence,
        timeBound: timeBound.confidence
      });

      // Generate insights
      const insights = this.generateInsights({
        specific,
        measurable,
        achievable,
        relevant,
        timeBound
      });

      // Determine complexity
      const complexity = this.assessComplexity(goalText, {
        specific,
        measurable,
        achievable,
        relevant,
        timeBound
      });

      const result: EnhancedScoringResult = {
        overallScore,
        overallConfidence,
        criteria: {
          specific,
          measurable,
          achievable,
          relevant,
          timeBound
        },
        strengthsAndWeaknesses: insights.strengthsAndWeaknesses,
        recommendations: insights.recommendations,
        confidenceBreakdown: this.calculateConfidenceBreakdown({
          specific,
          measurable,
          achievable,
          relevant,
          timeBound
        }),
        goalCategory: this.categorizeGoal(goalText, context),
        complexityLevel: complexity
      };

      logger.info('Enhanced SMART analysis completed', {
        correlationId,
        overallScore,
        overallConfidence,
        complexity
      });

      return result;
    } catch (error) {
      logger.error('Enhanced SMART analysis failed', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Analyze Specific criterion with component breakdown
   */
  private analyzeSpecificity(
    goalText: string,
    context?: any
  ): EnhancedSMARTCriteria['specific'] {
    const components = {
      what: { present: false, weight: 0.3 } as any,
      who: { present: false, weight: 0.2 } as any,
      where: { present: false, weight: 0.15 } as any,
      why: { present: false, weight: 0.2 } as any,
      how: { present: false, weight: 0.15 } as any
    };

    const feedback: string[] = [];
    const missing: string[] = [];

    // Analyze WHAT - Action and object
    const actionMatches = this.findMatches(goalText, this.DETECTION_PATTERNS.specificity.actions);
    const objectMatches = this.findMatches(goalText, this.DETECTION_PATTERNS.specificity.objects);
    
    if (actionMatches.length > 0 && objectMatches.length > 0) {
      components.what.present = true;
      components.what.value = `${actionMatches[0]} ${objectMatches[0]}`;
      feedback.push(`Clear action identified: "${actionMatches[0]}" with object "${objectMatches[0]}"`);
    } else if (actionMatches.length > 0) {
      components.what.present = true;
      components.what.value = actionMatches[0];
      feedback.push(`Action identified: "${actionMatches[0]}", but the object/target could be more specific`);
      missing.push('Specific target or object of the action');
    } else {
      missing.push('Clear action verb (what exactly will you do?)');
      missing.push('Specific object or target of the goal');
    }

    // Analyze WHO - Stakeholders
    const whoPatterns = [
      /\b(I|me|my|we|our|us)\b/gi,
      /\b(team|department|company|organization|group)\b/gi,
      /\b(customer|client|user|stakeholder|partner)\b/gi,
      /\b(with|for|to)\s+(\w+\s+)?(team|person|group|department)\b/gi
    ];
    
    const whoMatches = this.findMatches(goalText, whoPatterns);
    if (whoMatches.length > 0) {
      components.who.present = true;
      components.who.value = whoMatches.join(', ');
      feedback.push(`Stakeholders identified: ${whoMatches.join(', ')}`);
    } else {
      missing.push('Who is involved or affected by this goal?');
    }

    // Analyze WHERE - Location/Context
    const contextMatches = this.findMatches(goalText, this.DETECTION_PATTERNS.specificity.context);
    if (contextMatches.length > 0 || context?.domain) {
      components.where.present = true;
      components.where.value = contextMatches[0] || context.domain;
      feedback.push(`Context identified: ${components.where.value}`);
    } else {
      missing.push('Where or in what context will this happen?');
    }

    // Analyze WHY - Purpose/Motivation
    const motivationMatches = this.findMatches(goalText, this.DETECTION_PATTERNS.relevance.motivation);
    if (motivationMatches.length > 0) {
      components.why.present = true;
      components.why.value = 'Motivation expressed';
      feedback.push('Purpose or motivation is clear');
    } else {
      missing.push('Why is this goal important?');
    }

    // Analyze HOW - Method/Approach
    const methodPatterns = [
      /\b(by|through|using|via|with)\s+(\w+(?:\s+\w+){0,3})\b/gi,
      /\b(method|approach|strategy|technique|process)\b/gi
    ];
    
    const methodMatches = this.findMatches(goalText, methodPatterns);
    if (methodMatches.length > 0) {
      components.how.present = true;
      components.how.value = methodMatches[0];
      feedback.push(`Method/approach identified: ${methodMatches[0]}`);
    } else {
      missing.push('How will you achieve this goal?');
    }

    // Calculate score and confidence
    const componentScores = Object.entries(components).map(([key, comp]) => 
      comp.present ? comp.weight : 0
    );
    const score = componentScores.reduce((a, b) => a + b, 0);
    
    // Confidence based on clarity and completeness
    const presentComponents = Object.values(components).filter(c => c.present).length;
    const confidence = this.calculateComponentConfidence(presentComponents, 5, goalText.length);

    return {
      value: this.constructSpecificStatement(components),
      confidence,
      score,
      components,
      feedback,
      missing
    };
  }

  /**
   * Analyze Measurable criterion with detailed metrics
   */
  private analyzeMeasurability(
    goalText: string,
    context?: any
  ): EnhancedSMARTCriteria['measurable'] {
    const metrics: EnhancedSMARTCriteria['measurable']['metrics'] = [];
    const feedback: string[] = [];
    const missing: string[] = [];

    // Extract quantitative metrics
    const quantMatches = this.extractMetricsWithDetails(
      goalText, 
      this.DETECTION_PATTERNS.metrics.quantitative
    );
    
    quantMatches.forEach(match => {
      metrics.push({
        metric: match.text,
        value: match.value,
        unit: match.unit,
        type: 'quantitative',
        confidence: 0.9
      });
      feedback.push(`Quantitative metric found: ${match.text}`);
    });

    // Extract qualitative metrics
    const qualMatches = this.findMatches(goalText, this.DETECTION_PATTERNS.metrics.qualitative);
    qualMatches.forEach(match => {
      metrics.push({
        metric: match,
        type: 'qualitative',
        confidence: 0.7
      });
      feedback.push(`Qualitative metric found: ${match}`);
    });

    // Extract comparison metrics
    const compMatches = this.findMatches(goalText, this.DETECTION_PATTERNS.metrics.comparison);
    compMatches.forEach(match => {
      metrics.push({
        metric: match,
        type: 'quantitative',
        confidence: 0.8
      });
      feedback.push(`Comparison metric found: ${match}`);
    });

    // Analyze components
    const components = {
      hasMetrics: metrics.length > 0,
      hasTargets: metrics.some(m => m.value !== undefined),
      hasBaseline: /\b(current|existing|baseline|now|today)\b/i.test(goalText),
      hasProgressIndicators: /\b(track|monitor|measure|assess|evaluate)\b/i.test(goalText)
    };

    if (!components.hasMetrics) {
      missing.push('Specific metrics to measure progress');
      missing.push('Quantifiable targets or success criteria');
    } else {
      if (!components.hasTargets) {
        missing.push('Specific target values for your metrics');
      }
      if (!components.hasBaseline) {
        missing.push('Current baseline or starting point');
      }
      if (!components.hasProgressIndicators) {
        feedback.push('Consider how you will track progress over time');
      }
    }

    // Calculate score
    const componentCount = Object.values(components).filter(Boolean).length;
    const score = (componentCount / 4) * 0.7 + (metrics.length > 0 ? 0.3 : 0);
    
    // Calculate confidence
    const avgMetricConfidence = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + m.confidence, 0) / metrics.length 
      : 0;
    const confidence = avgMetricConfidence * 0.7 + (componentCount / 4) * 0.3;

    return {
      value: this.constructMeasurableStatement(metrics, components),
      confidence,
      score,
      metrics,
      components,
      feedback,
      missing
    };
  }

  /**
   * Analyze Achievable criterion with feasibility assessment
   */
  private analyzeAchievability(
    goalText: string,
    context?: any
  ): EnhancedSMARTCriteria['achievable'] {
    const feedback: string[] = [];
    const missing: string[] = [];

    // Analyze feasibility factors
    const resourceMatches = this.findMatches(goalText, this.DETECTION_PATTERNS.feasibility.resources);
    const constraintMatches = this.findMatches(goalText, this.DETECTION_PATTERNS.feasibility.constraints);
    const experienceMatches = this.findMatches(goalText, this.DETECTION_PATTERNS.feasibility.experience);

    const feasibilityFactors = {
      resources: {
        identified: resourceMatches.length > 0,
        adequate: resourceMatches.some(m => /\b(sufficient|adequate|enough|available)\b/i.test(m)),
        score: resourceMatches.length > 0 ? 0.7 : 0.3
      },
      skills: {
        identified: experienceMatches.length > 0 || /\b(skill|ability|capability|competence)\b/i.test(goalText),
        available: experienceMatches.some(m => /\b(have|possess|experienced|skilled)\b/i.test(m)),
        score: experienceMatches.length > 0 ? 0.8 : 0.4
      },
      time: {
        realistic: this.assessTimeRealism(goalText),
        score: this.assessTimeRealism(goalText) ? 0.8 : 0.4
      },
      constraints: {
        identified: constraintMatches.length > 0,
        manageable: constraintMatches.length < 3 && !constraintMatches.some(m => /\b(impossible|cannot|unable)\b/i.test(m)),
        score: constraintMatches.length === 0 ? 0.7 : (constraintMatches.length < 3 ? 0.5 : 0.3)
      }
    };

    // Provide feedback
    if (feasibilityFactors.resources.identified) {
      feedback.push(`Resources mentioned: ${resourceMatches.join(', ')}`);
    } else {
      missing.push('What resources (budget, tools, support) are needed?');
    }

    if (feasibilityFactors.skills.identified) {
      feedback.push('Skills and capabilities addressed');
    } else {
      missing.push('What skills or experience are required?');
    }

    if (!feasibilityFactors.time.realistic) {
      feedback.push('Timeline may be ambitious - consider breaking into phases');
    }

    if (feasibilityFactors.constraints.identified) {
      feedback.push(`Constraints identified: ${constraintMatches.join(', ')}`);
      if (!feasibilityFactors.constraints.manageable) {
        feedback.push('Multiple constraints may impact achievability');
      }
    }

    // Assess risk level
    const riskScore = Object.values(feasibilityFactors).reduce((sum, f) => sum + f.score, 0) / 4;
    const riskLevel: 'low' | 'medium' | 'high' = 
      riskScore > 0.7 ? 'low' : 
      riskScore > 0.5 ? 'medium' : 'high';

    // Calculate overall score and confidence
    const score = riskScore;
    const confidence = this.calculateFeasibilityConfidence(feasibilityFactors, goalText);

    return {
      value: this.constructAchievableStatement(feasibilityFactors, riskLevel),
      confidence,
      score,
      feasibilityFactors,
      riskLevel,
      feedback,
      missing
    };
  }

  /**
   * Analyze Relevant criterion with alignment assessment
   */
  private analyzeRelevance(
    goalText: string,
    context?: any
  ): EnhancedSMARTCriteria['relevant'] {
    const feedback: string[] = [];
    const missing: string[] = [];

    // Extract relevance indicators
    const motivationMatches = this.findMatches(goalText, this.DETECTION_PATTERNS.relevance.motivation);
    const alignmentMatches = this.findMatches(goalText, this.DETECTION_PATTERNS.relevance.alignment);
    const impactMatches = this.findMatches(goalText, this.DETECTION_PATTERNS.relevance.impact);

    const alignmentFactors = {
      personalMotivation: {
        present: motivationMatches.length > 0,
        strength: Math.min(motivationMatches.length / 2, 1)
      },
      broaderGoals: {
        aligned: alignmentMatches.length > 0 || context?.previousGoals?.length > 0,
        strength: alignmentMatches.length > 0 ? 0.8 : 0.4
      },
      timing: {
        appropriate: this.assessTimingAppropriateness(goalText),
        urgency: this.assessUrgency(goalText)
      },
      impact: {
        identified: impactMatches.length > 0,
        significance: impactMatches.length > 0 ? Math.min(impactMatches.length / 2, 1) : 0.3
      }
    };

    // Provide feedback
    if (alignmentFactors.personalMotivation.present) {
      feedback.push('Personal motivation is clear');
    } else {
      missing.push('Why is this goal important to you?');
    }

    if (alignmentFactors.broaderGoals.aligned) {
      feedback.push('Goal aligns with broader objectives');
    } else {
      missing.push('How does this goal fit into your larger plans?');
    }

    if (alignmentFactors.impact.identified) {
      feedback.push(`Expected impact: ${impactMatches.join(', ')}`);
    } else {
      missing.push('What impact or benefit will achieving this goal have?');
    }

    if (!alignmentFactors.timing.appropriate) {
      feedback.push('Consider if this is the right time for this goal');
    }

    // Calculate score and confidence
    const factorScores = [
      alignmentFactors.personalMotivation.strength,
      alignmentFactors.broaderGoals.strength,
      alignmentFactors.timing.appropriate ? 0.8 : 0.4,
      alignmentFactors.impact.significance
    ];
    const score = factorScores.reduce((a, b) => a + b, 0) / 4;
    const confidence = this.calculateRelevanceConfidence(alignmentFactors, goalText);

    return {
      value: this.constructRelevantStatement(alignmentFactors),
      confidence,
      score,
      alignmentFactors,
      feedback,
      missing
    };
  }

  /**
   * Analyze Time-Bound criterion with comprehensive time analysis
   */
  private analyzeTimeBound(
    goalText: string,
    context?: any
  ): EnhancedSMARTCriteria['timeBound'] {
    const feedback: string[] = [];
    const missing: string[] = [];
    const milestones: any[] = [];

    // Extract time information
    const explicitTimeMatches = this.extractTimeframes(
      goalText, 
      this.DETECTION_PATTERNS.timeframe.explicit
    );
    const implicitTimeMatches = this.findMatches(
      goalText, 
      this.DETECTION_PATTERNS.timeframe.implicit
    );
    const durationMatches = this.extractDurations(
      goalText,
      this.DETECTION_PATTERNS.timeframe.duration
    );

    // Parse deadline if found
    let deadline: string | undefined;
    let duration: any;
    
    if (explicitTimeMatches.length > 0) {
      const parsed = this.parseTimeframe(explicitTimeMatches[0]);
      deadline = parsed.deadline;
      duration = parsed.duration;
      feedback.push(`Clear deadline identified: ${explicitTimeMatches[0].text}`);
    } else if (implicitTimeMatches.length > 0) {
      feedback.push(`Implicit timing mentioned: ${implicitTimeMatches[0]}`);
      missing.push('Specific deadline or timeframe needed');
    }

    if (durationMatches.length > 0) {
      duration = duration || this.parseDuration(durationMatches[0]);
      feedback.push(`Duration specified: ${durationMatches[0]}`);
    }

    // Extract potential milestones
    const milestonePatterns = [
      /\b(first|then|next|after|finally)\s+(.+?)(?:\.|,|;|$)/gi,
      /\b(phase|stage|step|milestone)\s*(\d+)?\s*:?\s*(.+?)(?:\.|,|;|$)/gi,
      /\b(\d+)\.\s*(.+?)(?:\.|,|;|$)/gi
    ];
    
    milestonePatterns.forEach(pattern => {
      const matches = Array.from(goalText.matchAll(pattern));
      matches.forEach(match => {
        milestones.push({
          name: match[2] || match[1],
          timing: 'To be determined',
          confidence: 0.6
        });
      });
    });

    // Analyze time components
    const timeComponents = {
      hasDeadline: !!deadline,
      hasStartDate: /\b(start|begin|commence)\s+(on|at|from)\b/i.test(goalText),
      hasMilestones: milestones.length > 0,
      hasTimeframe: !!duration || explicitTimeMatches.length > 0,
      isRealistic: this.assessTimeRealism(goalText)
    };

    // Provide missing feedback
    if (!timeComponents.hasDeadline && !timeComponents.hasTimeframe) {
      missing.push('When do you want to achieve this goal?');
      missing.push('What is your target completion date?');
    }
    
    if (!timeComponents.hasMilestones && duration && duration.value > 30) {
      feedback.push('Consider breaking this into milestones for better tracking');
    }

    if (!timeComponents.isRealistic) {
      feedback.push('Timeline may be ambitious - ensure it\'s realistic');
    }

    // Calculate score and confidence
    const componentCount = Object.values(timeComponents).filter(Boolean).length;
    const score = componentCount / 5;
    const confidence = this.calculateTimeConfidence(timeComponents, explicitTimeMatches.length);

    return {
      value: this.constructTimeBoundStatement(deadline, duration, milestones),
      confidence,
      score,
      timeComponents,
      deadline,
      duration,
      milestones: milestones.length > 0 ? milestones : undefined,
      feedback,
      missing
    };
  }

  // Helper methods

  private findMatches(text: string, patterns: RegExp[]): string[] {
    const matches = new Set<string>();
    patterns.forEach(pattern => {
      const found = text.match(pattern);
      if (found) {
        found.forEach(match => matches.add(match.trim()));
      }
    });
    return Array.from(matches);
  }

  private extractMetricsWithDetails(text: string, patterns: RegExp[]): Array<{
    text: string;
    value?: number | string;
    unit?: string;
  }> {
    const results: any[] = [];
    
    patterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      matches.forEach(match => {
        const result: any = { text: match[0] };
        
        // Extract numeric value if present
        const numMatch = match[0].match(/\d+(?:\.\d+)?/);
        if (numMatch) {
          result.value = parseFloat(numMatch[0]);
        }
        
        // Extract unit if present
        const unitMatch = match[0].match(/\b(percent|%|dollars?|\$|hours?|days?|weeks?|months?|years?|units?|items?)\b/i);
        if (unitMatch) {
          result.unit = unitMatch[1];
        }
        
        results.push(result);
      });
    });
    
    return results;
  }

  private extractTimeframes(text: string, patterns: RegExp[]): Array<{
    text: string;
    type: 'explicit' | 'relative';
  }> {
    const results: any[] = [];
    
    patterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      matches.forEach(match => {
        results.push({
          text: match[0],
          type: /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(match[0]) ? 'explicit' : 'relative'
        });
      });
    });
    
    return results;
  }

  private extractDurations(text: string, patterns: RegExp[]): string[] {
    const durations = new Set<string>();
    patterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      matches.forEach(match => durations.add(match[0]));
    });
    return Array.from(durations);
  }

  private parseTimeframe(timeMatch: { text: string; type: string }): {
    deadline?: string;
    duration?: { value: number; unit: string };
  } {
    const text = timeMatch.text;
    const now = new Date();
    
    // Parse explicit dates
    const dateMatch = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
    if (dateMatch) {
      const [_, month, day, year] = dateMatch;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return { deadline: `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` };
    }
    
    // Parse relative times
    const relativeMatch = text.match(/(\d+)\s*(day|week|month|year|quarter)s?/i);
    if (relativeMatch) {
      const [_, value, unit] = relativeMatch;
      return { duration: { value: parseInt(value), unit: unit.toLowerCase() } };
    }
    
    // Parse named periods
    if (/next\s+(week|month|year|quarter)/i.test(text)) {
      const period = text.match(/next\s+(\w+)/i)?.[1].toLowerCase();
      return { duration: { value: 1, unit: period || 'month' } };
    }
    
    return {};
  }

  private parseDuration(durationText: string): { value: number; unit: string } | undefined {
    const match = durationText.match(/(\d+)\s*(day|week|month|year|quarter)s?/i);
    if (match) {
      return { value: parseInt(match[1]), unit: match[2].toLowerCase() };
    }
    return undefined;
  }

  private assessTimeRealism(goalText: string): boolean {
    // Check for unrealistic time indicators
    const unrealisticPatterns = [
      /\b(overnight|instantly|immediately)\s+(success|results?|change)\b/i,
      /\b(one|1)\s*day\s+.*(master|expert|transform|revolutionize)\b/i,
      /\b(few|couple)\s*(days?|hours?)\s+.*(complete|finish|achieve)\s+.*(complex|major|significant)\b/i
    ];
    
    const hasUnrealistic = unrealisticPatterns.some(pattern => pattern.test(goalText));
    
    // Check for realistic time indicators
    const realisticPatterns = [
      /\b(gradual|steady|consistent|phased|incremental)\b/i,
      /\b(months?|years?|quarters?)\s+.*(develop|build|learn|improve)\b/i,
      /\b(realistic|achievable|manageable|feasible)\s+(timeline|timeframe|deadline)\b/i
    ];
    
    const hasRealistic = realisticPatterns.some(pattern => pattern.test(goalText));
    
    return !hasUnrealistic || hasRealistic;
  }

  private assessTimingAppropriateness(goalText: string): boolean {
    const urgencyIndicators = /\b(urgent|immediate|asap|critical|emergency)\b/i.test(goalText);
    const planningIndicators = /\b(plan|prepare|research|consider|evaluate)\b/i.test(goalText);
    
    // If it's urgent but requires planning, timing might not be appropriate
    if (urgencyIndicators && planningIndicators) {
      return false;
    }
    
    return true;
  }

  private assessUrgency(goalText: string): number {
    const highUrgency = /\b(urgent|immediate|asap|critical|emergency|deadline)\b/i.test(goalText);
    const mediumUrgency = /\b(soon|priority|important|timely)\b/i.test(goalText);
    const lowUrgency = /\b(eventually|someday|future|long-term)\b/i.test(goalText);
    
    if (highUrgency) return 0.9;
    if (mediumUrgency) return 0.6;
    if (lowUrgency) return 0.3;
    return 0.5;
  }

  private calculateComponentConfidence(
    presentComponents: number,
    totalComponents: number,
    textLength: number
  ): number {
    const completeness = presentComponents / totalComponents;
    const clarity = Math.min(textLength / 200, 1); // Assume 200 chars is good clarity
    const baseConfidence = completeness * 0.7 + clarity * 0.3;
    
    // Adjust for edge cases
    if (presentComponents === 0) return 0.1;
    if (presentComponents === totalComponents && textLength > 100) return Math.min(baseConfidence + 0.1, 0.95);
    
    return Math.max(0.1, Math.min(baseConfidence, 0.9));
  }

  private calculateFeasibilityConfidence(factors: any, goalText: string): number {
    const factorConfidences = Object.values(factors).map((f: any) => f.score);
    const avgFactorConfidence = factorConfidences.reduce((a, b) => a + b, 0) / factorConfidences.length;
    
    // Adjust based on detail level
    const hasDetails = /\b(budget|team|resources|skills|experience)\s*[:=]\s*\w+/i.test(goalText);
    const detailBonus = hasDetails ? 0.1 : 0;
    
    return Math.min(avgFactorConfidence + detailBonus, 0.95);
  }

  private calculateRelevanceConfidence(factors: any, goalText: string): number {
    const weights = {
      personalMotivation: 0.3,
      broaderGoals: 0.25,
      timing: 0.2,
      impact: 0.25
    };
    
    let weightedSum = 0;
    weightedSum += factors.personalMotivation.strength * weights.personalMotivation;
    weightedSum += factors.broaderGoals.strength * weights.broaderGoals;
    weightedSum += (factors.timing.appropriate ? 0.8 : 0.4) * weights.timing;
    weightedSum += factors.impact.significance * weights.impact;
    
    return Math.max(0.2, Math.min(weightedSum, 0.9));
  }

  private calculateTimeConfidence(components: any, explicitMatches: number): number {
    const componentScore = Object.values(components).filter(Boolean).length / 5;
    const explicitBonus = Math.min(explicitMatches * 0.2, 0.3);
    
    return Math.min(componentScore + explicitBonus, 0.95);
  }

  private calculateWeightedScore(scores: Record<string, number>): number {
    let weightedSum = 0;
    
    Object.entries(scores).forEach(([key, score]) => {
      const weight = this.COMPONENT_WEIGHTS[key as keyof typeof this.COMPONENT_WEIGHTS];
      weightedSum += score * weight;
    });
    
    return Math.round(weightedSum * 100) / 100;
  }

  private calculateOverallConfidence(confidences: Record<string, number>): number {
    const values = Object.values(confidences);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    
    // Penalize if any component has very low confidence
    if (min < 0.3) {
      return Math.max(avg - 0.1, min);
    }
    
    return avg;
  }

  private calculateConfidenceBreakdown(criteria: any): EnhancedScoringResult['confidenceBreakdown'] {
    // Data quality: How specific and detailed is the information
    const dataQuality = Object.values(criteria).reduce((sum: number, c: any) => {
      const hasDetails = c.feedback.length > 2;
      const hasSpecifics = c.value.length > 50;
      return sum + (hasDetails && hasSpecifics ? 0.2 : 0.1);
    }, 0) as number;

    // Completeness: How many components are present
    const completeness = Object.values(criteria).reduce((sum: number, c: any) => {
      return sum + (c.missing.length === 0 ? 0.2 : 0.1);
    }, 0) as number;

    // Clarity: How clear and unambiguous is the goal
    const clarity = Object.values(criteria).reduce((sum: number, c: any) => {
      return sum + (c.confidence > 0.7 ? 0.2 : 0.1);
    }, 0) as number;

    // Consistency: How well do components align
    const consistency = this.assessConsistency(criteria);

    return {
      dataQuality: Math.min(dataQuality, 1),
      completeness: Math.min(completeness, 1),
      clarity: Math.min(clarity, 1),
      consistency
    };
  }

  private assessConsistency(criteria: any): number {
    let consistencyScore = 1;
    
    // Check if timeframe aligns with complexity
    if (criteria.timeBound.duration && criteria.achievable.riskLevel === 'high' && 
        criteria.timeBound.duration.value < 3 && criteria.timeBound.duration.unit === 'months') {
      consistencyScore -= 0.2;
    }
    
    // Check if metrics align with goal
    if (criteria.measurable.metrics.length === 0 && criteria.specific.score > 0.7) {
      consistencyScore -= 0.15;
    }
    
    // Check if relevance aligns with effort
    if (criteria.relevant.alignmentFactors.impact.significance < 0.5 && 
        criteria.achievable.feasibilityFactors.resources.score > 0.7) {
      consistencyScore -= 0.15;
    }
    
    return Math.max(0.3, consistencyScore);
  }

  private generateInsights(criteria: any): {
    strengthsAndWeaknesses: EnhancedScoringResult['strengthsAndWeaknesses'];
    recommendations: EnhancedScoringResult['recommendations'];
  } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const criticalGaps: string[] = [];
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const improvements: string[] = [];

    // Analyze each criterion
    Object.entries(criteria).forEach(([key, criterion]: [string, any]) => {
      if (criterion.score > 0.7) {
        strengths.push(`Strong ${key} component: ${criterion.feedback[0] || 'Well defined'}`);
      } else if (criterion.score < 0.4) {
        weaknesses.push(`Weak ${key} component: ${criterion.missing[0] || 'Needs improvement'}`);
        
        if (criterion.missing.length > 0) {
          criticalGaps.push(...criterion.missing.slice(0, 2));
          immediate.push(`Address ${key}: ${criterion.missing[0]}`);
        }
      }
      
      // Generate specific recommendations
      if (key === 'measurable' && criterion.metrics.length === 0) {
        shortTerm.push('Define at least 2-3 specific metrics to track progress');
      }
      
      if (key === 'timeBound' && !criterion.timeComponents.hasDeadline) {
        immediate.push('Set a specific target completion date');
      }
      
      if (key === 'achievable' && criterion.riskLevel === 'high') {
        shortTerm.push('Break down the goal into smaller, more manageable phases');
        shortTerm.push('Identify and address the main constraints or obstacles');
      }
    });

    // General improvements
    if (strengths.length > weaknesses.length) {
      improvements.push('Build on your strong foundation by addressing the remaining gaps');
    } else {
      improvements.push('Focus on strengthening the weak areas before refining details');
    }

    return {
      strengthsAndWeaknesses: {
        strengths: strengths.slice(0, 5),
        weaknesses: weaknesses.slice(0, 5),
        criticalGaps: [...new Set(criticalGaps)].slice(0, 3)
      },
      recommendations: {
        immediate: [...new Set(immediate)].slice(0, 3),
        shortTerm: [...new Set(shortTerm)].slice(0, 3),
        improvements: [...new Set(improvements)].slice(0, 3)
      }
    };
  }

  private assessComplexity(
    goalText: string, 
    criteria: any
  ): 'simple' | 'moderate' | 'complex' | 'highly-complex' {
    let complexityScore = 0;
    
    // Length and detail
    if (goalText.length > 200) complexityScore += 1;
    if (goalText.length > 400) complexityScore += 1;
    
    // Number of components
    const totalComponents = Object.values(criteria).reduce((sum: number, c: any) => {
      if (c.components) {
        return sum + Object.values(c.components).filter((comp: any) => comp.present || comp).length;
      }
      return sum;
    }, 0) as number;
    
    if (totalComponents > 10) complexityScore += 1;
    if (totalComponents > 15) complexityScore += 1;
    
    // Dependencies and constraints
    if (/\b(depend|require|contingent|subject to|if|when|after)\b/i.test(goalText)) {
      complexityScore += 1;
    }
    
    // Multiple stakeholders
    if (/\b(team|department|organization|stakeholder|partner)\b/gi.test(goalText)) {
      complexityScore += 1;
    }
    
    // Risk level
    if (criteria.achievable.riskLevel === 'high') complexityScore += 1;
    
    // Time span
    if (criteria.timeBound.duration && criteria.timeBound.duration.value > 6 && 
        ['months', 'years'].includes(criteria.timeBound.duration.unit)) {
      complexityScore += 1;
    }
    
    if (complexityScore <= 2) return 'simple';
    if (complexityScore <= 4) return 'moderate';
    if (complexityScore <= 6) return 'complex';
    return 'highly-complex';
  }

  private categorizeGoal(goalText: string, context?: any): string {
    const categories = {
      'Professional Development': /\b(career|professional|skill|certification|training|learn)\b/i,
      'Business/Revenue': /\b(revenue|sales|profit|business|customer|market)\b/i,
      'Health/Fitness': /\b(health|fitness|weight|exercise|diet|wellness)\b/i,
      'Financial': /\b(save|invest|money|budget|financial|income)\b/i,
      'Project/Product': /\b(project|product|launch|develop|build|create)\b/i,
      'Personal Growth': /\b(personal|self|improve|habit|mindfulness)\b/i,
      'Academic': /\b(study|degree|course|university|academic|research)\b/i,
      'Technology': /\b(software|app|system|technology|digital|code)\b/i
    };
    
    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(goalText)) {
        return category;
      }
    }
    
    return context?.domain || 'General';
  }

  private constructSpecificStatement(components: any): string {
    const parts: string[] = [];
    
    if (components.what.value) parts.push(components.what.value);
    if (components.who.value) parts.push(`involving ${components.who.value}`);
    if (components.where.value) parts.push(`in ${components.where.value}`);
    if (components.why.present) parts.push('with clear purpose');
    if (components.how.value) parts.push(`using ${components.how.value}`);
    
    return parts.join(' ') || 'Goal needs more specific details';
  }

  private constructMeasurableStatement(metrics: any[], components: any): string {
    if (metrics.length === 0) {
      return 'No measurable metrics defined yet';
    }
    
    const metricStrings = metrics.slice(0, 3).map(m => 
      m.value ? `${m.metric} (${m.value}${m.unit || ''})` : m.metric
    );
    
    let statement = `Measured by: ${metricStrings.join(', ')}`;
    
    if (components.hasBaseline) statement += ' from current baseline';
    if (components.hasProgressIndicators) statement += ' with progress tracking';
    
    return statement;
  }

  private constructAchievableStatement(factors: any, riskLevel: string): string {
    const parts: string[] = [];
    
    if (factors.resources.identified) {
      parts.push(factors.resources.adequate ? 'Resources available' : 'Resources identified');
    }
    
    if (factors.skills.identified) {
      parts.push(factors.skills.available ? 'Skills present' : 'Skills needed identified');
    }
    
    if (factors.time.realistic) {
      parts.push('Timeline appears realistic');
    }
    
    parts.push(`Risk level: ${riskLevel}`);
    
    return parts.join('; ') || 'Achievability needs assessment';
  }

  private constructRelevantStatement(factors: any): string {
    const parts: string[] = [];
    
    if (factors.personalMotivation.present) {
      parts.push('Strong personal motivation');
    }
    
    if (factors.broaderGoals.aligned) {
      parts.push('Aligns with broader objectives');
    }
    
    if (factors.impact.identified) {
      parts.push(`Impact: ${factors.impact.significance > 0.7 ? 'High' : 'Moderate'}`);
    }
    
    if (factors.timing.appropriate) {
      parts.push('Good timing');
    }
    
    return parts.join('; ') || 'Relevance needs clarification';
  }

  private constructTimeBoundStatement(
    deadline?: string, 
    duration?: any, 
    milestones?: any[]
  ): string {
    const parts: string[] = [];
    
    if (deadline) {
      parts.push(`Deadline: ${deadline}`);
    }
    
    if (duration) {
      parts.push(`Duration: ${duration.value} ${duration.unit}`);
    }
    
    if (milestones && milestones.length > 0) {
      parts.push(`${milestones.length} milestones identified`);
    }
    
    return parts.join('; ') || 'No specific timeframe defined';
  }

  private generateCorrelationId(): string {
    return `smart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const enhancedSMARTScoring = new EnhancedSMARTScoring();