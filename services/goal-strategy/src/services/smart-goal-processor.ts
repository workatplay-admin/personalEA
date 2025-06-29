import { logger } from '@/utils/logger';
import { env } from '@/config/environment';

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
  private readonly mockMode: boolean;

  constructor() {
    this.aiApiKey = env.OPENAI_API_KEY;
    this.aiModel = env.OPENAI_MODEL || 'gpt-4';
    this.mockMode = env.NODE_ENV === 'development' && (!this.aiApiKey || this.aiApiKey.startsWith('sk-test-'));
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
5. INCREASE confidence significantly (0.7-0.9) when user provides comprehensive details
6. Ask follow-up questions only for components that still lack information

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
        
        // Ensure arrays are properly initialized
        if (field === 'measurable' && !Array.isArray(criteria[field].metrics)) {
          criteria[field].metrics = [];
        }
        if (!Array.isArray(criteria[field].missing)) {
          criteria[field].missing = [];
        }
      }

      return {
        smartGoal: parsed.smartGoal,
        smartCriteria: criteria,
        missingCriteria: Array.isArray(parsed.missingCriteria) ? parsed.missingCriteria : [],
        clarificationQuestions: Array.isArray(parsed.clarificationQuestions) ? parsed.clarificationQuestions : [],
        confidence: Number(parsed.confidence) || 0.5
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
          updatedCriteria.timeBound.confidence = Math.max(0.8, updatedCriteria.timeBound.confidence);
          updatedCriteria.timeBound.missing = [];
        }
      }
      
      // Check for measurable metrics
      if (criterion === 'measurable') {
        const hasMetrics = this.detectMetricsInAnswer(answerLower);
        if (hasMetrics) {
          updatedCriteria.measurable.confidence = Math.max(0.8, updatedCriteria.measurable.confidence);
          updatedCriteria.measurable.missing = [];
        }
      }
      
      // Check for specific details
      if (criterion === 'specific') {
        const hasSpecifics = this.detectSpecificsInAnswer(answer.answer);
        if (hasSpecifics) {
          updatedCriteria.specific.confidence = Math.max(0.8, updatedCriteria.specific.confidence);
          updatedCriteria.specific.missing = [];
        }
      }

      // Check if the answer provides substantial content
      if (answer.answer.length > 20) {
        // Update the addressed criterion with at least moderate confidence
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
      /rating\s*of\s*\d+/i
    ];
    
    return metricPatterns.some(pattern => pattern.test(answer));
  }

  /**
   * Detect specific details in user answer
   */
  private detectSpecificsInAnswer(answer: string): boolean {
    // Check for specific indicators:
    // - Answer contains multiple words (not just yes/no)
    // - Contains location, product, or service names
    // - Contains action verbs
    // - Has adequate detail (more than 30 characters)
    
    if (answer.length < 30) return false;
    
    const words = answer.split(/\s+/);
    if (words.length < 5) return false;
    
    // Check for action verbs or specific nouns
    const specificIndicators = [
      /\b(create|build|develop|implement|launch|design|improve|optimize|analyze|establish)\b/i,
      /\b(system|platform|product|service|feature|component|module|application)\b/i,
      /\b(customer|client|user|employee|team|department|company)\b/i
    ];
    
    return specificIndicators.some(pattern => pattern.test(answer));
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
      if (match) {
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
            action: match[1].trim(),
            timeframe: undefined // Could be enhanced to extract specific timeframes
          });
        }
      }
    }

    return { totalTime, milestones };
  }
}

export const smartGoalProcessor = new SMARTGoalProcessor();