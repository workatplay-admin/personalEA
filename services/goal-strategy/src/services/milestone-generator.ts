import { logger } from '@/utils/logger';
import { env } from '@/config/environment';
import { SMARTCriteria } from './smart-goal-processor';

export interface MilestoneGenerationInput {
  goalId: string;
  goalTitle: string;
  smartCriteria: SMARTCriteria;
  targetDate?: Date;
  preferences?: {
    milestoneCount?: number; // 2-6 milestones
    distributionStrategy?: 'EVEN' | 'FRONT_LOADED' | 'BACK_LOADED';
    includeBufferTime?: boolean;
  } | undefined;
}

export interface GeneratedMilestone {
  title: string;
  description: string;
  targetDate: Date;
  completionCriteria: string;
  orderIndex: number;
  estimatedEffort?: number; // in hours
  dependencies?: string[]; // references to other milestones
}

export interface MilestoneGenerationResult {
  milestones: GeneratedMilestone[];
  rationale: string;
  timeline: {
    startDate: Date;
    endDate: Date;
    totalDuration: number; // in days
  };
  confidence: number;
}

export class MilestoneGenerator {
  private readonly aiApiKey: string;
  private readonly aiModel: string;

  constructor() {
    this.aiApiKey = env.OPENAI_API_KEY;
    this.aiModel = env.OPENAI_MODEL || 'gpt-4';
  }

  /**
   * Generate milestone breakdown for a goal using AI analysis
   */
  async generateMilestones(input: MilestoneGenerationInput): Promise<MilestoneGenerationResult> {
    const correlationId = Math.random().toString(36).substring(7);
    
    logger.info('Starting milestone generation', {
      correlationId,
      goalId: input.goalId,
      goalTitle: input.goalTitle,
      hasTargetDate: !!input.targetDate
    });

    try {
      const prompt = this.buildMilestonePrompt(input);
      const aiResponse = await this.callOpenAI(prompt, correlationId);
      const result = this.parseAIResponse(aiResponse, input);

      logger.info('Milestone generation completed', {
        correlationId,
        goalId: input.goalId,
        milestoneCount: result.milestones.length,
        confidence: result.confidence
      });

      return result;
    } catch (error) {
      logger.error('Milestone generation failed', {
        correlationId,
        goalId: input.goalId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Validate milestone sequence and dependencies
   */
  async validateMilestoneSequence(milestones: GeneratedMilestone[]): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const correlationId = Math.random().toString(36).substring(7);
    
    logger.info('Validating milestone sequence', {
      correlationId,
      milestoneCount: milestones.length
    });

    try {
      const prompt = this.buildValidationPrompt(milestones);
      const aiResponse = await this.callOpenAI(prompt, correlationId);
      const validation = this.parseValidationResponse(aiResponse);

      logger.info('Milestone validation completed', {
        correlationId,
        isValid: validation.isValid,
        issueCount: validation.issues.length
      });

      return validation;
    } catch (error) {
      logger.error('Milestone validation failed', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Optimize milestone timeline based on constraints
   */
  async optimizeTimeline(
    milestones: GeneratedMilestone[],
    constraints: {
      maxDuration?: number; // in days
      availableHoursPerWeek?: number;
      blackoutDates?: Date[];
      priorityMilestones?: number[]; // indices of high-priority milestones
    }
  ): Promise<{
    optimizedMilestones: GeneratedMilestone[];
    adjustments: string[];
    feasibilityScore: number;
  }> {
    const correlationId = Math.random().toString(36).substring(7);
    
    logger.info('Optimizing milestone timeline', {
      correlationId,
      milestoneCount: milestones.length,
      constraints
    });

    try {
      const prompt = this.buildOptimizationPrompt(milestones, constraints);
      const aiResponse = await this.callOpenAI(prompt, correlationId);
      const optimization = this.parseOptimizationResponse(aiResponse);

      logger.info('Timeline optimization completed', {
        correlationId,
        feasibilityScore: optimization.feasibilityScore,
        adjustmentCount: optimization.adjustments.length
      });

      return optimization;
    } catch (error) {
      logger.error('Timeline optimization failed', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private buildMilestonePrompt(input: MilestoneGenerationInput): string {
    const targetDateStr = input.targetDate ? input.targetDate.toISOString().split('T')[0] : 'Not specified';
    const preferences = input.preferences || {};
    
    return `
You are an expert project manager and goal strategist. Break down the following SMART goal into 2-6 measurable milestones.

Goal: "${input.goalTitle}"
SMART Criteria: ${JSON.stringify(input.smartCriteria, null, 2)}
Target Date: ${targetDateStr}
Preferences: ${JSON.stringify(preferences, null, 2)}

Requirements for milestone breakdown:
1. Create ${preferences.milestoneCount || '3-5'} milestones that ladder up to the main goal
2. Each milestone must be:
   - Measurable with clear completion criteria
   - Necessary for goal achievement
   - Achievable within the timeframe
   - Logically sequenced

3. Timeline distribution strategy: ${preferences.distributionStrategy || 'EVEN'}
   - EVEN: Distribute milestones evenly across timeline
   - FRONT_LOADED: More milestones early in timeline
   - BACK_LOADED: More milestones later in timeline

4. Include buffer time: ${preferences.includeBufferTime !== false}

5. For each milestone provide:
   - Clear, actionable title
   - Detailed description of what will be accomplished
   - Specific completion criteria (definition of done)
   - Target date
   - Estimated effort in hours
   - Dependencies on other milestones (if any)

6. Provide rationale for the breakdown approach
7. Include timeline analysis with start/end dates and total duration
8. Assign confidence score (0-1) for achievability

Respond in JSON format:
{
  "milestones": [
    {
      "title": "string",
      "description": "string",
      "targetDate": "YYYY-MM-DD",
      "completionCriteria": "string",
      "orderIndex": number,
      "estimatedEffort": number,
      "dependencies": ["milestone_title"]
    }
  ],
  "rationale": "string",
  "timeline": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "totalDuration": number
  },
  "confidence": number
}
`;
  }

  private buildValidationPrompt(milestones: GeneratedMilestone[]): string {
    return `
Validate the following milestone sequence for logical consistency and achievability:

Milestones: ${JSON.stringify(milestones, null, 2)}

Check for:
1. Logical sequencing - do milestones build upon each other?
2. Dependency conflicts - are there circular or impossible dependencies?
3. Timeline feasibility - are target dates realistic?
4. Completion criteria clarity - are success criteria measurable?
5. Effort estimation reasonableness - do hour estimates make sense?
6. Goal coverage - do milestones collectively achieve the main goal?

Respond in JSON format:
{
  "isValid": boolean,
  "issues": ["string"],
  "suggestions": ["string"]
}
`;
  }

  private buildOptimizationPrompt(
    milestones: GeneratedMilestone[],
    constraints: any
  ): string {
    return `
Optimize the timeline for these milestones given the constraints:

Milestones: ${JSON.stringify(milestones, null, 2)}
Constraints: ${JSON.stringify(constraints, null, 2)}

Optimization goals:
1. Respect maximum duration if specified
2. Account for available hours per week
3. Avoid blackout dates
4. Prioritize high-priority milestones
5. Maintain logical dependencies
6. Maximize parallel execution where possible

Respond in JSON format:
{
  "optimizedMilestones": [
    {
      "title": "string",
      "description": "string",
      "targetDate": "YYYY-MM-DD",
      "completionCriteria": "string",
      "orderIndex": number,
      "estimatedEffort": number,
      "dependencies": ["string"]
    }
  ],
  "adjustments": ["string"],
  "feasibilityScore": number
}
`;
  }

  private async callOpenAI(prompt: string, correlationId: string): Promise<string> {
    if (!this.aiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.aiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.aiModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert project manager specializing in milestone planning and goal breakdown. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      logger.error('OpenAI API call failed', {
        correlationId,
        status: response.status,
        error: errorData
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

  private parseAIResponse(response: string, input: MilestoneGenerationInput): MilestoneGenerationResult {
    try {
      const parsed = JSON.parse(response);
      
      // Validate required fields
      if (!parsed.milestones || !Array.isArray(parsed.milestones)) {
        throw new Error('Invalid milestone array in AI response');
      }

      // Convert date strings to Date objects and validate milestones
      const milestones: GeneratedMilestone[] = parsed.milestones.map((m: any, index: number) => ({
        title: m.title || `Milestone ${index + 1}`,
        description: m.description || '',
        targetDate: new Date(m.targetDate),
        completionCriteria: m.completionCriteria || '',
        orderIndex: m.orderIndex || index,
        estimatedEffort: m.estimatedEffort || 0,
        dependencies: m.dependencies || []
      }));

      const timeline = {
        startDate: new Date(parsed.timeline?.startDate || new Date()),
        endDate: new Date(parsed.timeline?.endDate || input.targetDate || new Date()),
        totalDuration: parsed.timeline?.totalDuration || 0
      };

      return {
        milestones,
        rationale: parsed.rationale || 'AI-generated milestone breakdown',
        timeline,
        confidence: parsed.confidence || 0.8
      };
    } catch (error) {
      logger.error('Failed to parse milestone generation response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        response: response.substring(0, 500)
      });
      throw new Error('Failed to parse AI response');
    }
  }

  private parseValidationResponse(response: string): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    try {
      const parsed = JSON.parse(response);
      
      return {
        isValid: parsed.isValid || false,
        issues: parsed.issues || [],
        suggestions: parsed.suggestions || []
      };
    } catch (error) {
      logger.error('Failed to parse validation response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        response: response.substring(0, 500)
      });
      throw new Error('Failed to parse validation response');
    }
  }

  private parseOptimizationResponse(response: string): {
    optimizedMilestones: GeneratedMilestone[];
    adjustments: string[];
    feasibilityScore: number;
  } {
    try {
      const parsed = JSON.parse(response);
      
      const optimizedMilestones: GeneratedMilestone[] = (parsed.optimizedMilestones || []).map((m: any, index: number) => ({
        title: m.title || `Milestone ${index + 1}`,
        description: m.description || '',
        targetDate: new Date(m.targetDate),
        completionCriteria: m.completionCriteria || '',
        orderIndex: m.orderIndex || index,
        estimatedEffort: m.estimatedEffort || 0,
        dependencies: m.dependencies || []
      }));

      return {
        optimizedMilestones,
        adjustments: parsed.adjustments || [],
        feasibilityScore: parsed.feasibilityScore || 0.5
      };
    } catch (error) {
      logger.error('Failed to parse optimization response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        response: response.substring(0, 500)
      });
      throw new Error('Failed to parse optimization response');
    }
  }
}

export const milestoneGenerator = new MilestoneGenerator();