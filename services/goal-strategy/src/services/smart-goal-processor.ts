/**
 * Smart Goal Processor Service
 * 
 * Implements the SMART goal processing workflow for transforming raw user goals
 * into Specific, Measurable, Achievable, Relevant, and Time-bound objectives.
 * 
 * @see {@link file://../../../../docs/goal-strategy-service-specification.md Goal Strategy Service Specification}
 * @see {@link file://../../API_DOCUMENTATION.md API Documentation}
 */

import { logger } from '@/utils/logger';
import { env } from '@/config/environment';

/**
 * Raw goal input from the user
 * @see {@link file://../../../../docs/goal-strategy-service-specification.md#step-1-goal-input Goal Input Specification}
 */
export interface RawGoalInput {
  goal: string;
  context?: {
    timeframe?: string;
    resources?: string[];
    constraints?: string[];
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  mode?: 'automatic' | 'interactive'; // New field to control processing mode
}

/**
 * SMART criteria evaluation result
 * @see {@link file://../../../../docs/goal-strategy-service-specification.md#step-2-smart-goal-translation SMART Goal Translation}
 */
export interface SMARTCriteria {
  specific: {
    value: string;
    confidence: number;
    missing?: string[];
  };
  measurable: {
    value: string;
    metrics: string[];
    confidence: number;
    missing?: string[];
  };
  achievable: {
    value: string;
    confidence: number;
    missing?: string[];
  };
  relevant: {
    value: string;
    confidence: number;
    missing?: string[];
  };
  timeBound: {
    value: string;
    deadline?: string;
    confidence: number;
    missing?: string[];
  };
}

export interface GoalTranslationResult {
  smartGoal: string;
  smartCriteria: SMARTCriteria;
  missingCriteria: string[];
  clarificationQuestions: string[];
  confidence: number;
  mode?: 'automatic' | 'interactive';
  needsRefinement?: boolean;
}

export interface InteractiveAnalysisResult {
  rawGoal: string;
  analysis: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
  smartComponents: {
    specific: { present: boolean; description?: string };
    measurable: { present: boolean; description?: string };
    achievable: { present: boolean; description?: string };
    relevant: { present: boolean; description?: string };
    timeBound: { present: boolean; description?: string };
  };
  confidence: number;
  recommendedQuestions: string[];
}

export interface ClarificationAnswer {
  question: string;
  answer: string;
  smartCriterion: keyof SMARTCriteria;
}

export class SMARTGoalProcessor {
  private readonly aiApiKey: string;
  private readonly aiModel: string;

  constructor() {
    this.aiApiKey = env.OPENAI_API_KEY;
    this.aiModel = env.OPENAI_MODEL || 'gpt-4';
  }

  /**
   * Analyze a goal without automatic transformation (interactive mode)
   */
  async analyzeGoalInteractive(input: RawGoalInput, userApiKey?: string): Promise<InteractiveAnalysisResult> {
    const correlationId = Math.random().toString(36).substring(7);
    
    logger.info('Starting interactive goal analysis', {
      correlationId,
      rawGoal: input.goal,
      hasContext: !!input.context,
      hasUserApiKey: !!userApiKey
    });

    try {
      const prompt = this.buildInteractiveAnalysisPrompt(input);
      const aiResponse = await this.callOpenAI(prompt, correlationId, userApiKey);
      const result = this.parseInteractiveAnalysisResponse(aiResponse);

      logger.info('Interactive goal analysis completed', {
        correlationId,
        confidence: result.confidence,
        recommendedQuestionsCount: result.recommendedQuestions.length
      });

      return result;
    } catch (error) {
      logger.error('Interactive goal analysis failed', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        rawGoal: input.goal
      });
      throw error;
    }
  }

  /**
   * Translate a raw goal into SMART format using AI analysis
   */
  async translateGoal(input: RawGoalInput, userApiKey?: string): Promise<GoalTranslationResult> {
    const correlationId = Math.random().toString(36).substring(7);
    
    logger.info('Starting SMART goal translation', {
      correlationId,
      rawGoal: input.goal,
      hasContext: !!input.context,
      hasUserApiKey: !!userApiKey
    });

    try {
      // If interactive mode is requested, don't auto-transform
      if (input.mode === 'interactive') {
        const analysis = await this.analyzeGoalInteractive(input, userApiKey);
        return {
          smartGoal: input.goal, // Keep original goal
          smartCriteria: this.buildInitialCriteria(analysis),
          missingCriteria: this.identifyMissingCriteria(analysis),
          clarificationQuestions: analysis.recommendedQuestions,
          confidence: analysis.confidence,
          mode: 'interactive',
          needsRefinement: true
        };
      }

      // Original automatic transformation
      const prompt = this.buildTranslationPrompt(input);
      const aiResponse = await this.callOpenAI(prompt, correlationId, userApiKey);
      const result = this.parseAIResponse(aiResponse);

      logger.info('SMART goal translation completed', {
        correlationId,
        confidence: result.confidence,
        missingCriteriaCount: result.missingCriteria.length,
        clarificationQuestionsCount: result.clarificationQuestions.length
      });

      return { ...result, mode: 'automatic' };
    } catch (error) {
      logger.error('SMART goal translation failed', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        rawGoal: input.goal
      });
      throw error;
    }
  }

  /**
   * Process clarification answers to improve SMART goal
   */
  async processClarifications(
    originalGoal: string,
    smartCriteria: SMARTCriteria,
    answers: ClarificationAnswer[],
    userApiKey?: string
  ): Promise<GoalTranslationResult> {
    const correlationId = Math.random().toString(36).substring(7);
    
    logger.info('Processing goal clarifications', {
      correlationId,
      originalGoal,
      answersCount: answers.length,
      hasUserApiKey: !!userApiKey
    });

    try {
      const prompt = this.buildClarificationPrompt(originalGoal, smartCriteria, answers);
      const aiResponse = await this.callOpenAI(prompt, correlationId, userApiKey);
      const result = this.parseAIResponse(aiResponse);

      // Recalculate scores based on actual content
      const updatedResult = this.recalculateScoresAfterClarification(
        result,
        answers,
        smartCriteria
      );

      logger.info('Goal clarification processing completed', {
        correlationId,
        confidence: updatedResult.confidence,
        remainingMissingCriteria: updatedResult.missingCriteria.length,
        scoresRecalculated: true
      });

      return updatedResult;
    } catch (error) {
      logger.error('Goal clarification processing failed', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Analyze goal completeness and suggest improvements
   */
  async analyzeGoalCompleteness(smartCriteria: SMARTCriteria, userApiKey?: string): Promise<{
    completenessScore: number;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  }> {
    const correlationId = Math.random().toString(36).substring(7);
    
    logger.info('Analyzing goal completeness', {
      correlationId,
      hasUserApiKey: !!userApiKey
    });

    try {
      const prompt = this.buildAnalysisPrompt(smartCriteria);
      const aiResponse = await this.callOpenAI(prompt, correlationId, userApiKey);
      const analysis = this.parseAnalysisResponse(aiResponse);

      logger.info('Goal completeness analysis completed', {
        correlationId,
        completenessScore: analysis.completenessScore
      });

      return analysis;
    } catch (error) {
      logger.error('Goal completeness analysis failed', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private buildTranslationPrompt(input: RawGoalInput): string {
    return `
You are an expert goal-setting coach who specializes in understanding informal, conversational goal statements and converting them into SMART format.

IMPORTANT PARSING INSTRUCTIONS:
1. Understand informal language, colloquialisms, and context
2. Identify conditional dependencies (if/then statements)
3. Extract domain-specific terminology and requirements
4. Recognize implicit prerequisites and sequences
5. Parse complex timelines with multiple steps

Raw Goal: "${input.goal}"
${input.context ? `Context: ${JSON.stringify(input.context, null, 2)}` : ''}

ANALYSIS STEPS:
1. First, identify the ULTIMATE GOAL (what the person wants to achieve)
2. Identify any PREREQUISITES or CONDITIONS (if statements, requirements)
3. Extract the TIMELINE (total time and any intermediate deadlines)
4. Understand the DOMAIN/CONTEXT (professional field, hobby, etc.)
5. Parse any MEASURABLE MILESTONES mentioned

For the example "It's stock car racing on the local dirt track. If I take some lessons and pass my race test, I can get my racing license in 10 months":
- Ultimate Goal: Get racing license for stock car racing
- Prerequisites: Take lessons AND pass race test
- Timeline: 10 months total
- Domain: Stock car racing on local dirt track
- Milestones: Complete lessons, pass test, obtain license

Please analyze this goal and provide:

1. A refined SMART goal statement that captures the essence while being specific
2. Detailed analysis for each SMART criterion:
   - Specific: What exactly will be accomplished? Include domain/context details
   - Measurable: How will progress be measured? Include intermediate milestones
   - Achievable: Is this realistic? Consider prerequisites and dependencies
   - Relevant: Why is this goal important? Consider personal/professional context
   - Time-bound: What is the timeline? Include intermediate deadlines if implied

3. For each criterion, provide:
   - Current value/assessment based on what was stated
   - Confidence score (0-1)
   - Missing information (if any)

4. List any missing criteria that need clarification
5. Generate specific clarification questions for missing information
6. Provide an overall confidence score (0-1)

Respond in JSON format:
{
  "smartGoal": "string",
  "smartCriteria": {
    "specific": { "value": "string", "confidence": number, "missing": ["string"] },
    "measurable": { "value": "string", "metrics": ["string"], "confidence": number, "missing": ["string"] },
    "achievable": { "value": "string", "confidence": number, "missing": ["string"] },
    "relevant": { "value": "string", "confidence": number, "missing": ["string"] },
    "timeBound": { "value": "string", "deadline": "string", "confidence": number, "missing": ["string"] }
  },
  "missingCriteria": ["string"],
  "clarificationQuestions": ["string"],
  "confidence": number
}
`;
  }

  private buildClarificationPrompt(
    originalGoal: string,
    smartCriteria: SMARTCriteria,
    answers: ClarificationAnswer[]
  ): string {
    return `
You are an expert goal-setting coach helping refine a goal through conversation.

Original Goal: "${originalGoal}"
Current SMART Criteria: ${JSON.stringify(smartCriteria, null, 2)}

User's Latest Input:
${answers.map(a => `Context: Asked about ${a.smartCriterion}\nUser said: "${a.answer}"`).join('\n\n')}

CRITICAL INSTRUCTIONS:
1. ANALYZE the user's answer for information relevant to ALL SMART components
2. UPDATE ALL components that the user provided information about (not just the one asked about)
3. EXTRACT specific details, timeframes, metrics, feasibility info from their answer
4. DO NOT add assumptions - only use what the user explicitly provided
5. INCREASE confidence significantly (0.8-0.95) when user provides comprehensive details
6. Ask follow-up questions only for components that still lack information

CONFIDENCE SCORING RULES:
- If user provides specific numbers, names, locations, or methods → confidence ≥ 0.8
- If user provides timeframes with dates or durations → confidence ≥ 0.85
- If user provides multiple specific details → confidence ≥ 0.9
- If user says they already specified something, CHECK if it's in their answer → if yes, confidence ≥ 0.85
- Default confidence for vague answers → 0.3-0.5
- Never keep asking for details the user already provided

ANALYSIS CHECKLIST for the user's answer:
- SPECIFIC: Does it contain specific details, locations, methods, or clarifications?
- MEASURABLE: Does it mention numbers, percentages, quantities, metrics, or success criteria?
- ACHIEVABLE: Does it discuss feasibility, resources, skills, or realistic assessment?
- RELEVANT: Does it explain importance, alignment with goals, or personal motivation?
- TIME-BOUND: Does it mention deadlines, timeframes, dates, or duration?

Example: If user says "I want to compete in 3 local races within 6 months, tracking my lap times"
- UPDATE Specific: "compete in local races" (confidence: 0.8)
- UPDATE Measurable: "3 races, track lap times" (confidence: 0.8)  
- UPDATE TimeBound: "within 6 months" (confidence: 0.9)
- KEEP Achievable & Relevant unchanged if not mentioned

Respond in JSON format with comprehensive analysis:
{
  "smartGoal": "Original goal unless user explicitly changed it",
  "smartCriteria": {
    "specific": { 
      "value": "Update with specific details from user's answer if any", 
      "confidence": 0.2-0.9, 
      "missing": ["only what's still missing"] 
    },
    "measurable": { 
      "value": "Update with metrics/numbers from user's answer if any", 
      "metrics": ["extract actual metrics mentioned"], 
      "confidence": 0.2-0.9, 
      "missing": ["only what's still missing"] 
    },
    "achievable": { 
      "value": "Update with feasibility info from user's answer if any", 
      "confidence": 0.2-0.9, 
      "missing": ["only what's still missing"] 
    },
    "relevant": { 
      "value": "Update with importance/motivation from user's answer if any", 
      "confidence": 0.2-0.9, 
      "missing": ["only what's still missing"] 
    },
    "timeBound": { 
      "value": "Update with timeframe from user's answer if any", 
      "confidence": 0.2-0.9, 
      "missing": ["only what's still missing"] 
    }
  },
  "missingCriteria": ["only components still truly missing after this update"],
  "clarificationQuestions": ["questions for remaining gaps only"],
  "confidence": 0.2-0.9
}
`;
  }

  private buildAnalysisPrompt(smartCriteria: SMARTCriteria): string {
    return `
Analyze the completeness and quality of this SMART goal:

${JSON.stringify(smartCriteria, null, 2)}

Provide analysis in JSON format:
{
  "completenessScore": number (0-1),
  "strengths": ["string"],
  "weaknesses": ["string"],
  "recommendations": ["string"]
}
`;
  }

  private async callOpenAI(prompt: string, correlationId: string, userApiKey?: string): Promise<string> {
    const apiKey = userApiKey || this.aiApiKey;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.aiModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert goal-setting coach specializing in SMART goal methodology. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      logger.error('OpenAI API call failed', {
        correlationId,
        status: response.status,
        error: errorData,
        usingUserApiKey: !!userApiKey
      });
      throw new Error(`OpenAI API call failed: ${response.status} ${errorData}`);
    }

    const data = await response.json() as {
      choices: Array<{
        message: {
          content: string;
        };
      }>;
    };
    return data.choices[0]?.message?.content || '';
  }

  private parseAIResponse(response: string): GoalTranslationResult {
    try {
      // Strip markdown code blocks if present
      const cleanedResponse = this.stripMarkdownCodeBlocks(response);
      const parsed = JSON.parse(cleanedResponse);
      
      // Validate required fields
      if (!parsed.smartGoal || !parsed.smartCriteria || typeof parsed.confidence !== 'number') {
        throw new Error('Invalid AI response format - missing required fields');
      }

      // Enhanced validation for SMART criteria
      const criteria = parsed.smartCriteria;
      const requiredCriteriaFields = ['specific', 'measurable', 'achievable', 'relevant', 'timeBound'];
      
      for (const field of requiredCriteriaFields) {
        if (!criteria[field] || typeof criteria[field].confidence !== 'number') {
          throw new Error(`Invalid SMART criteria format - missing or invalid ${field}`);
        }
        
        // Normalize confidence values to 0-1 range
        let confidence = criteria[field].confidence;
        if (confidence > 1) {
          // If confidence is provided as percentage (e.g., 80 instead of 0.8), convert it
          confidence = Math.min(confidence / 100, 1);
        }
        criteria[field].confidence = Math.max(0, Math.min(1, confidence));
        
        // Ensure arrays are properly initialized
        if (field === 'measurable' && !Array.isArray(criteria[field].metrics)) {
          criteria[field].metrics = [];
        }
        if (!Array.isArray(criteria[field].missing)) {
          criteria[field].missing = [];
        }
      }

      // Normalize overall confidence value
      let overallConfidence = Number(parsed.confidence) || 0.5;
      if (overallConfidence > 1) {
        overallConfidence = Math.min(overallConfidence / 100, 1);
      }
      overallConfidence = Math.max(0, Math.min(1, overallConfidence));

      return {
        smartGoal: parsed.smartGoal,
        smartCriteria: criteria,
        missingCriteria: Array.isArray(parsed.missingCriteria) ? parsed.missingCriteria : [],
        clarificationQuestions: Array.isArray(parsed.clarificationQuestions) ? parsed.clarificationQuestions : [],
        confidence: overallConfidence
      };
    } catch (error) {
      logger.error('Failed to parse AI response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        response: response.substring(0, 500),
        parsedResponse: response
      });
      
      // Return a more helpful error with context
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown parsing error'}`);
    }
  }

  private parseAnalysisResponse(response: string): {
    completenessScore: number;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } {
    try {
      // Strip markdown code blocks if present
      const cleanedResponse = this.stripMarkdownCodeBlocks(response);
      const parsed = JSON.parse(cleanedResponse);
      
      return {
        completenessScore: parsed.completenessScore || 0,
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        recommendations: parsed.recommendations || []
      };
    } catch (error) {
      logger.error('Failed to parse analysis response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        response: response.substring(0, 500)
      });
      throw new Error('Failed to parse analysis response');
    }
  }

  /**
   * Strip markdown code blocks from AI response to extract pure JSON
   */
  private buildInteractiveAnalysisPrompt(input: RawGoalInput): string {
    return `
Analyze the following goal WITHOUT transforming or augmenting it. Provide an analysis of its current state.

Goal: "${input.goal}"
${input.context ? `Context: ${JSON.stringify(input.context, null, 2)}` : ''}

Provide:
1. Analysis of strengths and weaknesses
2. Identification of which SMART components are present or missing
3. Specific suggestions for improvement (without rewriting the goal)
4. Questions to ask the user to clarify missing information

DO NOT rewrite or transform the goal. Only analyze its current state.

Respond in JSON format:
{
  "rawGoal": "${input.goal}",
  "analysis": {
    "strengths": ["string"],
    "weaknesses": ["string"],
    "suggestions": ["string"]
  },
  "smartComponents": {
    "specific": { "present": boolean, "description": "string" },
    "measurable": { "present": boolean, "description": "string" },
    "achievable": { "present": boolean, "description": "string" },
    "relevant": { "present": boolean, "description": "string" },
    "timeBound": { "present": boolean, "description": "string" }
  },
  "confidence": number,
  "recommendedQuestions": ["string"]
}
`;
  }

  private parseInteractiveAnalysisResponse(response: string): InteractiveAnalysisResult {
    try {
      const cleanedResponse = this.stripMarkdownCodeBlocks(response);
      const parsed = JSON.parse(cleanedResponse);
      
      return {
        rawGoal: parsed.rawGoal,
        analysis: parsed.analysis || { strengths: [], weaknesses: [], suggestions: [] },
        smartComponents: parsed.smartComponents || {},
        confidence: parsed.confidence || 0.3,
        recommendedQuestions: parsed.recommendedQuestions || []
      };
    } catch (error) {
      logger.error('Failed to parse interactive analysis response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        response: response.substring(0, 500)
      });
      throw new Error('Failed to parse interactive analysis response');
    }
  }

  private buildInitialCriteria(analysis: InteractiveAnalysisResult): SMARTCriteria {
    return {
      specific: {
        value: analysis.smartComponents.specific?.description || 'Not yet defined',
        confidence: analysis.smartComponents.specific?.present ? 0.7 : 0.2,
        missing: analysis.smartComponents.specific?.present ? [] : ['Specific details needed']
      },
      measurable: {
        value: analysis.smartComponents.measurable?.description || 'Not yet defined',
        metrics: [],
        confidence: analysis.smartComponents.measurable?.present ? 0.7 : 0.2,
        missing: analysis.smartComponents.measurable?.present ? [] : ['Measurable metrics needed']
      },
      achievable: {
        value: analysis.smartComponents.achievable?.description || 'Not yet defined',
        confidence: analysis.smartComponents.achievable?.present ? 0.7 : 0.2,
        missing: analysis.smartComponents.achievable?.present ? [] : ['Achievability assessment needed']
      },
      relevant: {
        value: analysis.smartComponents.relevant?.description || 'Not yet defined',
        confidence: analysis.smartComponents.relevant?.present ? 0.7 : 0.2,
        missing: analysis.smartComponents.relevant?.present ? [] : ['Relevance clarification needed']
      },
      timeBound: {
        value: analysis.smartComponents.timeBound?.description || 'Not yet defined',
        confidence: analysis.smartComponents.timeBound?.present ? 0.7 : 0.2,
        missing: analysis.smartComponents.timeBound?.present ? [] : ['Timeline needed']
      }
    };
  }

  private identifyMissingCriteria(analysis: InteractiveAnalysisResult): string[] {
    const missing: string[] = [];
    const components = analysis.smartComponents;
    
    if (!components.specific?.present) missing.push('specific');
    if (!components.measurable?.present) missing.push('measurable');
    if (!components.achievable?.present) missing.push('achievable');
    if (!components.relevant?.present) missing.push('relevant');
    if (!components.timeBound?.present) missing.push('timeBound');
    
    return missing;
  }

  private stripMarkdownCodeBlocks(response: string): string {
    // Remove markdown code blocks (```json ... ``` or ``` ... ```)
    let cleaned = response.trim();
    
    // Handle ```json format
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    }
    // Handle generic ``` format
    else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  /**
   * Recalculate scores based on actual clarification content
   */
  private recalculateScoresAfterClarification(
    result: GoalTranslationResult,
    answers: ClarificationAnswer[],
    previousCriteria: SMARTCriteria
  ): GoalTranslationResult {
    const updatedCriteria = { ...result.smartCriteria };
    const updatedMissingCriteria: string[] = [];
    
    // Process each answer to check if it addresses specific criteria
    answers.forEach(answer => {
      const answerLower = answer.answer.toLowerCase();
      const criterion = answer.smartCriterion;
      
      // Check for specific timeframe patterns
      if (criterion === 'timeBound') {
        const hasTimeframe = this.detectTimeframeInAnswer(answerLower);
        if (hasTimeframe) {
          updatedCriteria.timeBound.confidence = Math.max(0.85, updatedCriteria.timeBound.confidence);
          updatedCriteria.timeBound.missing = [];
        }
      }
      
      // Check for measurable metrics
      if (criterion === 'measurable') {
        const hasMetrics = this.detectMetricsInAnswer(answerLower);
        if (hasMetrics) {
          updatedCriteria.measurable.confidence = Math.max(0.85, updatedCriteria.measurable.confidence);
          updatedCriteria.measurable.missing = [];
        }
      }
      
      // Check for specific details
      if (criterion === 'specific') {
        const hasSpecifics = this.detectSpecificsInAnswer(answer.answer);
        if (hasSpecifics) {
          updatedCriteria.specific.confidence = Math.max(0.85, updatedCriteria.specific.confidence);
          updatedCriteria.specific.missing = [];
        }
      }

      // Check for achievable indicators
      if (criterion === 'achievable') {
        const hasAchievableIndicators = this.detectAchievableInAnswer(answer.answer);
        if (hasAchievableIndicators) {
          updatedCriteria.achievable.confidence = Math.max(0.85, updatedCriteria.achievable.confidence);
          updatedCriteria.achievable.missing = [];
        }
      }

      // Check for relevance indicators
      if (criterion === 'relevant') {
        const hasRelevanceIndicators = this.detectRelevanceInAnswer(answer.answer);
        if (hasRelevanceIndicators) {
          updatedCriteria.relevant.confidence = Math.max(0.85, updatedCriteria.relevant.confidence);
          updatedCriteria.relevant.missing = [];
        }
      }

      // Check if the answer provides substantial content
      if (answer.answer.length > 50) {
        // Update the addressed criterion with higher confidence for detailed answers
        const currentConfidence = updatedCriteria[criterion].confidence;
        updatedCriteria[criterion].confidence = Math.max(0.75, currentConfidence);
      } else if (answer.answer.length > 20) {
        // Update with moderate confidence for shorter answers
        const currentConfidence = updatedCriteria[criterion].confidence;
        updatedCriteria[criterion].confidence = Math.max(0.6, currentConfidence);
      }
    });

    // Recalculate overall confidence based on individual criteria
    const confidenceValues = [
      updatedCriteria.specific.confidence,
      updatedCriteria.measurable.confidence,
      updatedCriteria.achievable.confidence,
      updatedCriteria.relevant.confidence,
      updatedCriteria.timeBound.confidence
    ];
    const overallConfidence = confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length;

    // Update missing criteria list
    Object.entries(updatedCriteria).forEach(([key, value]) => {
      if (value.confidence < 0.7) {
        updatedMissingCriteria.push(key);
      }
    });

    return {
      ...result,
      smartCriteria: updatedCriteria,
      missingCriteria: updatedMissingCriteria,
      confidence: overallConfidence
    };
  }

  /**
   * Detect timeframe patterns in user answer
   */
  private detectTimeframeInAnswer(answer: string): boolean {
    const timeframePatterns = [
      /\d+\s*(day|week|month|year|hour)s?/i,
      /by\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
      /by\s+\d{1,2}\/\d{1,2}\/\d{2,4}/,
      /within\s+\d+/i,
      /before\s+\d+/i,
      /after\s+\d+/i,
      /next\s+(week|month|year|quarter)/i,
      /this\s+(week|month|year|quarter)/i,
      /q[1-4]\s+\d{4}/i,
      /spring|summer|fall|autumn|winter\s+\d{4}/i,
      /in\s+\d+\s*(day|week|month|year)s?/i,  // "in 10 months"
      /over\s+the\s+next\s+\d+/i,
      /for\s+\d+\s*(day|week|month|year)s?/i,
      /duration.*\d+/i,
      /timeline.*\d+/i
    ];
    
    return timeframePatterns.some(pattern => pattern.test(answer));
  }

  /**
   * Detect measurable metrics in user answer
   */
  private detectMetricsInAnswer(answer: string): boolean {
    const metricPatterns = [
      /\d+\s*(%|percent|percentage)/i,
      /\$\s*\d+/,
      /\d+\s*(units?|items?|pieces?|customers?|users?|sales?|revenue)/i,
      /increase.*by\s*\d+/i,
      /decrease.*by\s*\d+/i,
      /reduce.*by\s*\d+/i,
      /improve.*by\s*\d+/i,
      /\d+\s*out\s*of\s*\d+/i,
      /score\s*of\s*\d+/i,
      /rating\s*of\s*\d+/i,
      // Fitness and health metrics
      /\d+\s*(pounds?|lbs?|kg|kilos?|kilograms?)/i,
      /\d+\s*(miles?|km|kilometers?|meters?)/i,
      /\d+\s*(hours?|minutes?|seconds?)/i,
      /\d+\s*(times?|reps?|repetitions?|sets?)/i,
      /\d+\s*(per\s+week|per\s+day|per\s+month|weekly|daily|monthly)/i,
      /\d+\s*(calories?|steps?|workouts?)/i,
      // General quantifiable metrics
      /\d+\s*(sessions?|classes?|lessons?|courses?)/i,
      /\d+\s*(projects?|tasks?|goals?|objectives?)/i,
      /\d+\s*(years?|months?|weeks?|days?)/i
    ];
    
    return metricPatterns.some(pattern => pattern.test(answer));
  }

  /**
   * Detect specific details in user answer
   */
  private detectSpecificsInAnswer(answer: string): boolean {
    // Check for specific indicators:
    // - Answer contains multiple words (not just yes/no)
    // - Contains specific actions, methods, locations, or measurable details
    // - Has adequate detail (more than 20 characters for specific answers)
    
    if (answer.length < 20) return false;
    
    const words = answer.split(/\s+/);
    if (words.length < 4) return false;
    
    // Check for specific action verbs and concrete nouns across multiple domains
    const specificIndicators = [
      // Technology/Business
      /\b(create|build|develop|implement|launch|design|improve|optimize|analyze|establish|deploy|integrate)\b/i,
      /\b(system|platform|product|service|feature|component|module|application|website|app|software)\b/i,
      /\b(customer|client|user|employee|team|department|company|organization|startup|business)\b/i,
      
      // Fitness/Health
      /\b(lose|gain|run|walk|swim|exercise|workout|train|diet|eat|weight|fitness|gym|yoga|cardio)\b/i,
      /\b(pounds|lbs|kg|kilos|miles|km|kilometers|marathon|race|muscle|strength|endurance|nutrition)\b/i,
      /\b(per\s+week|per\s+day|per\s+month|weekly|daily|monthly|times?\s+per|sessions?)\b/i,
      
      // Education/Learning
      /\b(learn|study|practice|master|complete|finish|pass|graduate|certify|skill|course|class|degree)\b/i,
      /\b(language|programming|certification|diploma|university|college|school|training|tutorial)\b/i,
      
      // General specific activities
      /\b(read|write|publish|travel|visit|move|relocate|save|invest|buy|sell|organize|plan)\b/i,
      /\b(book|article|chapter|page|project|task|goal|objective|target|milestone|deadline)\b/i,
      
      // Specific quantifiers and measurements (numbers with units)
      /\d+\s*(pounds?|lbs?|kg|miles?|km|hours?|minutes?|weeks?|months?|years?|times?|sessions?|dollars?|\$)/i,
      
      // Location and context specifics
      /\b(at\s+\w+|in\s+\w+|with\s+\w+|using\s+\w+|through\s+\w+|by\s+\w+|via\s+\w+)\b/i
    ];
    
    return specificIndicators.some(pattern => pattern.test(answer));
  }

  /**
   * Detect achievable indicators in user answer
   */
  private detectAchievableInAnswer(answer: string): boolean {
    const achievablePatterns = [
      // Resource and capability mentions
      /\b(have|possess|own|access|available|can|able|capable|skill|experience|knowledge)\b/i,
      /\b(resource|budget|funding|time|equipment|tool|support|team|help)\b/i,
      
      // Feasibility assessments
      /\b(realistic|achievable|feasible|possible|doable|manageable|attainable)\b/i,
      /\b(challenge|difficult|easy|hard|simple|complex|straightforward)\b/i,
      
      // Past experience or success
      /\b(done|completed|achieved|succeeded|accomplished|managed|handled)\b/i,
      /\b(before|previously|already|experience|background|history)\b/i,
      
      // Constraints and limitations
      /\b(constraint|limitation|restriction|challenge|obstacle|barrier)\b/i,
      /\b(despite|although|even though|considering|given)\b/i,
      
      // Confidence expressions
      /\b(confident|sure|certain|believe|think|feel|know)\b/i,
      /\b(will|can|should|could|would|might)\b/i
    ];
    
    return achievablePatterns.some(pattern => pattern.test(answer));
  }

  /**
   * Process conversation using LLM-first architecture
   */
  async processConversation(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string; timestamp?: Date }>,
    currentState: any,
    userApiKey?: string
  ): Promise<ConversationResponse> {
    const correlationId = Math.random().toString(36).substring(7);
    
    logger.info('Processing conversation', {
      correlationId,
      hasUserMessage: !!userMessage,
      historyLength: conversationHistory.length,
      hasCurrentState: !!currentState,
      hasUserApiKey: !!userApiKey
    });

    try {
      const prompt = this.buildConversationPrompt(userMessage, conversationHistory, currentState);
      const aiResponse = await this.callOpenAI(prompt, correlationId, userApiKey);
      const result = this.parseConversationResponse(aiResponse);

      logger.info('Conversation processing completed', {
        correlationId,
        actionType: result.action_type,
        phase: result.conversation_state.conversation_phase,
        overallConfidence: result.conversation_state.overall_confidence
      });

      return result;
    } catch (error) {
      logger.error('Conversation processing failed', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Build comprehensive conversation prompt for LLM
   */
  private buildConversationPrompt(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string; timestamp?: Date }>,
    currentState: any
  ): string {
    return `You are an AI assistant helping users create SMART goals. You manage the entire conversation flow and state.

CURRENT CONVERSATION STATE:
${JSON.stringify(currentState || {}, null, 2)}

CONVERSATION HISTORY:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

USER INPUT: ${userMessage}

YOUR RESPONSIBILITIES:
1. Analyze the user's goal and identify SMART criteria
2. Track confidence for each criterion (0-1 scale)
3. Decide what action to take next
4. Generate appropriate UI elements
5. Manage the conversation flow naturally

SMART CRITERIA EVALUATION:
- Specific: Clear, well-defined, and unambiguous (who, what, where, when, why)
- Measurable: Quantifiable with concrete criteria (how much, how many, metrics)
- Achievable: Realistic and attainable (resources, skills, constraints)
- Relevant: Aligned with broader objectives (importance, timing, values)
- Time-bound: Has a deadline or timeframe (when, milestones, duration)

CONFIDENCE SCORING RULES:
- 0.0-0.3: Very vague or missing
- 0.3-0.5: Some information but needs clarification
- 0.5-0.7: Good progress but missing key details
- 0.7-0.9: Nearly complete, minor refinements needed
- 0.9-1.0: Fully defined and clear

ACTION DECISION LOGIC:
- If this is the first message, start with a welcoming introduction
- If any criterion is below 0.9, focus on the lowest scoring one
- Ask targeted questions to improve low-confidence criteria
- Show examples when users seem confused or ask for help
- Complete when all criteria are above 0.9 or user is satisfied

CONVERSATION STYLE:
- Be encouraging and supportive
- Use clear, simple language
- Provide specific examples when helpful
- Celebrate progress and improvements
- Guide users step by step

RESPONSE FORMAT:
{
  "action_type": "ask_question|show_example|update_progress|complete|show_tips",
  "conversation_state": {
    "current_goal": "refined goal text based on all information gathered",
    "smart_criteria": {
      "specific": {
        "value": "what exactly will be accomplished",
        "confidence": 0.0-1.0,
        "missing": ["what's still needed"]
      },
      "measurable": {
        "value": "how progress will be measured",
        "metrics": ["specific metrics"],
        "confidence": 0.0-1.0,
        "missing": ["what's still needed"]
      },
      "achievable": {
        "value": "why this is realistic",
        "confidence": 0.0-1.0,
        "missing": ["what's still needed"]
      },
      "relevant": {
        "value": "why this matters",
        "confidence": 0.0-1.0,
        "missing": ["what's still needed"]
      },
      "timeBound": {
        "value": "when it will be completed",
        "deadline": "specific date if provided",
        "confidence": 0.0-1.0,
        "missing": ["what's still needed"]
      }
    },
    "overall_confidence": 0.0-1.0,
    "current_focus": "specific|measurable|achievable|relevant|timeBound",
    "completed_components": ["components with confidence >= 0.9"],
    "conversation_phase": "initial|clarifying|refining|complete"
  },
  "display_elements": [
    {
      "type": "message|question|example|tip|progress",
      "content": "Your response to the user",
      "metadata": {
        "sender": "bot",
        "smart_component": "current component being discussed",
        "visual_style": "primary|info|success|warning"
      }
    }
  ],
  "ui_instructions": {
    "show_tips": boolean,
    "show_progress": true,
    "enable_input": true,
    "show_examples": boolean,
    "completion_ready": boolean
  }
}

IMPORTANT:
- Extract ALL relevant information from the user's input for ALL components
- Update multiple criteria if the user provides information about them
- Don't ask for information the user already provided
- Be adaptive to the user's communication style
- If the user says something like "I already told you" or seems frustrated, acknowledge it and move forward`;
  }

  /**
   * Parse conversation response from LLM
   */
  private parseConversationResponse(response: string): ConversationResponse {
    try {
      const cleanedResponse = this.stripMarkdownCodeBlocks(response);
      const parsed = JSON.parse(cleanedResponse);
      
      // Validate required fields
      if (!parsed.action_type || !parsed.conversation_state || !parsed.display_elements) {
        throw new Error('Invalid conversation response format - missing required fields');
      }

      // Ensure all confidence values are in 0-1 range
      const criteria = parsed.conversation_state.smart_criteria;
      for (const key of Object.keys(criteria)) {
        if (criteria[key].confidence > 1) {
          criteria[key].confidence = criteria[key].confidence / 100;
        }
        criteria[key].confidence = Math.max(0, Math.min(1, criteria[key].confidence));
      }

      // Calculate overall confidence
      const confidenceValues = Object.values(criteria).map((c: any) => c.confidence);
      parsed.conversation_state.overall_confidence = confidenceValues.reduce((a: number, b: number) => a + b, 0) / confidenceValues.length;

      return parsed as ConversationResponse;
    } catch (error) {
      logger.error('Failed to parse conversation response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        response: response.substring(0, 500)
      });
      throw new Error('Failed to parse conversation response');
    }
  }

  /**
   * Detect relevance indicators in user answer
   */
  private detectRelevanceInAnswer(answer: string): boolean {
    const relevancePatterns = [
      // Purpose and motivation
      /\b(because|since|as|for|to|in order to|so that|reason|purpose|why)\b/i,
      /\b(important|crucial|critical|essential|vital|key|significant|meaningful)\b/i,
      /\b(want|need|require|must|should|goal|objective|aim|aspiration)\b/i,
      
      // Alignment with broader goals
      /\b(align|support|contribute|help|enable|facilitate|advance|further)\b/i,
      /\b(career|personal|professional|life|future|long-term|short-term)\b/i,
      /\b(value|priority|focus|strategy|plan|vision|mission)\b/i,
      
      // Benefits and outcomes
      /\b(benefit|advantage|improve|enhance|better|growth|development|progress)\b/i,
      /\b(result|outcome|impact|effect|consequence|lead to|achieve)\b/i,
      
      // Personal connection
      /\b(my|me|I|mine|myself|our|us|we)\b/i,
      /\b(passion|interest|love|enjoy|excited|motivated|inspired)\b/i,
      
      // Problem solving
      /\b(solve|address|fix|resolve|overcome|tackle|handle|deal with)\b/i,
      /\b(problem|issue|challenge|gap|need|opportunity)\b/i
    ];
    
    return relevancePatterns.some(pattern => pattern.test(answer));
  }
}

// Enhanced parsing utilities for complex goal statements
export class GoalParsingUtilities {
  /**
   * Extract conditional dependencies from goal statement
   */
  static extractConditionals(goalText: string): {
    conditions: string[];
    outcome: string;
    hasConditionals: boolean;
  } {
    const conditionalPatterns = [
      /if\s+(.+?),\s*(?:then\s+)?(.+)/i,
      /when\s+(.+?),\s*(?:then\s+)?(.+)/i,
      /after\s+(.+?),\s*(?:then\s+)?(.+)/i,
      /once\s+(.+?),\s*(?:then\s+)?(.+)/i
    ];

    for (const pattern of conditionalPatterns) {
      const match = goalText.match(pattern);
      if (match && match[1] && match[2]) {
        const conditions = match[1].split(/\s*and\s*/i).map(c => c.trim());
        return {
          conditions,
          outcome: match[2].trim(),
          hasConditionals: true
        };
      }
    }

    return {
      conditions: [],
      outcome: goalText,
      hasConditionals: false
    };
  }

  /**
   * Extract domain-specific context
   */
  static extractDomainContext(goalText: string): {
    domain: string;
    context: string[];
  } {
    const domainIndicators = {
      racing: /racing|race|track|license|driver|car/i,
      education: /degree|course|certification|training|class|study/i,
      fitness: /weight|exercise|gym|workout|health|fitness/i,
      business: /revenue|sales|customer|business|company|profit/i,
      technology: /software|app|system|code|develop|programming/i
    };

    let detectedDomain = 'general';
    const contextWords: string[] = [];

    for (const [domain, pattern] of Object.entries(domainIndicators)) {
      const matches = goalText.match(pattern);
      if (matches) {
        detectedDomain = domain;
        contextWords.push(...matches);
      }
    }

    return {
      domain: detectedDomain,
      context: [...new Set(contextWords)]
    };
  }

  /**
   * Parse complex timelines with dependencies
   */
  static parseComplexTimeline(goalText: string): {
    totalTime: string | null;
    milestones: Array<{ action: string; timeframe?: string }>;
  } {
    const timelineMatch = goalText.match(/in\s+(\d+\s*(?:day|week|month|year)s?)/i);
    const totalTime = timelineMatch ? timelineMatch[1] : null;

    // Extract action items that might have their own timelines
    const actionPatterns = [
      /take\s+(?:some\s+)?(.+?)(?:\s+and|,|\.|$)/i,
      /pass\s+(?:my\s+)?(.+?)(?:\s+and|,|\.|$)/i,
      /get\s+(?:my\s+)?(.+?)(?:\s+and|,|\.|$)/i,
      /complete\s+(.+?)(?:\s+and|,|\.|$)/i,
      /finish\s+(.+?)(?:\s+and|,|\.|$)/i
    ];

    const milestones: Array<{ action: string; timeframe?: string }> = [];

    for (const pattern of actionPatterns) {
      const matches = goalText.matchAll(new RegExp(pattern, 'gi'));
      for (const match of matches) {
        if (match[1]) {
          milestones.push({
            action: match[1].trim()
            // timeframe property omitted when undefined
          });
        }
      }
    }

    return { totalTime, milestones };
  }
}

export interface ConversationResponse {
  action_type: 'ask_question' | 'show_example' | 'update_progress' | 'complete' | 'show_tips';
  conversation_state: {
    current_goal: string;
    smart_criteria: SMARTCriteria;
    overall_confidence: number;
    current_focus: 'specific' | 'measurable' | 'achievable' | 'relevant' | 'timeBound';
    completed_components: string[];
    conversation_phase: 'initial' | 'clarifying' | 'refining' | 'complete';
  };
  display_elements: Array<{
    type: 'message' | 'question' | 'example' | 'tip' | 'progress';
    content: string;
    metadata: {
      sender: 'bot' | 'user';
      smart_component?: string;
      visual_style?: 'primary' | 'info' | 'success' | 'warning';
    };
  }>;
  ui_instructions: {
    show_tips: boolean;
    show_progress: boolean;
    enable_input: boolean;
    show_examples: boolean;
    completion_ready: boolean;
  };
}

export const smartGoalProcessor = new SMARTGoalProcessor();