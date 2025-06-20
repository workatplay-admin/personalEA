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
      const prompt = this.buildTranslationPrompt(input);
      const aiResponse = await this.callOpenAI(prompt, correlationId, userApiKey);
      const result = this.parseAIResponse(aiResponse);

      logger.info('SMART goal translation completed', {
        correlationId,
        confidence: result.confidence,
        missingCriteriaCount: result.missingCriteria.length,
        clarificationQuestionsCount: result.clarificationQuestions.length
      });

      return result;
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

      logger.info('Goal clarification processing completed', {
        correlationId,
        confidence: result.confidence,
        remainingMissingCriteria: result.missingCriteria.length
      });

      return result;
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
You are an expert goal-setting coach. Analyze the following goal and convert it into SMART format.

Raw Goal: "${input.goal}"
${input.context ? `Context: ${JSON.stringify(input.context, null, 2)}` : ''}

Please analyze this goal against SMART criteria and provide:

1. A refined SMART goal statement
2. Detailed analysis for each SMART criterion:
   - Specific: What exactly will be accomplished?
   - Measurable: How will progress and success be measured?
   - Achievable: Is this realistic given available resources?
   - Relevant: Why is this goal important and worthwhile?
   - Time-bound: What is the deadline or timeframe?

3. For each criterion, provide:
   - Current value/assessment
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
You are an expert goal-setting coach. Update the SMART goal based on clarification answers.

Original Goal: "${originalGoal}"
Current SMART Criteria: ${JSON.stringify(smartCriteria, null, 2)}

Clarification Answers:
${answers.map(a => `Q: ${a.question}\nA: ${a.answer}\nCriterion: ${a.smartCriterion}`).join('\n\n')}

Please update the SMART goal and criteria based on these answers. Provide the same JSON format as before with updated information and improved confidence scores.
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
        max_tokens: 2000,
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
      if (!parsed.smartGoal || !parsed.smartCriteria || !parsed.confidence) {
        throw new Error('Invalid AI response format');
      }

      return {
        smartGoal: parsed.smartGoal,
        smartCriteria: parsed.smartCriteria,
        missingCriteria: parsed.missingCriteria || [],
        clarificationQuestions: parsed.clarificationQuestions || [],
        confidence: parsed.confidence
      };
    } catch (error) {
      logger.error('Failed to parse AI response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        response: response.substring(0, 500)
      });
      throw new Error('Failed to parse AI response');
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
}

export const smartGoalProcessor = new SMARTGoalProcessor();