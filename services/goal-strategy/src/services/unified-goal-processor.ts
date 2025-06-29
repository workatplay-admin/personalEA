/**
 * Unified Goal Processor Service
 * 
 * Implements a comprehensive goal processing pipeline that unifies SMART goal transformation,
 * milestone generation, task breakdown, and conversational refinement in a single service.
 * 
 * @see {@link file://../../../../docs/goal-strategy-service-specification.md Goal Strategy Service Specification}
 * @see {@link file://../../../../docs/LLM_DRIVEN_REFACTORING.md LLM-Driven Refactoring Guide}
 * @see {@link file://../../../../docs/reference/architecture/system-overview.md System Architecture Overview}
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { 
  SMARTGoal, 
  ConversationMessage, 
  GoalClarification,
  Milestone,
  TaskBreakdown,
  GoalState,
  ClarificationCategory
} from '../types/smart-goals';

const ComprehensiveGoalResponseSchema = z.object({
  updatedGoal: z.object({
    title: z.string(),
    category: z.string(),
    specific: z.object({
      what: z.string().optional(),
      who: z.string().optional(),
      where: z.string().optional(),
      why: z.string().optional()
    }),
    measurable: z.object({
      metrics: z.array(z.string()),
      targetValue: z.string().optional(),
      currentValue: z.string().optional()
    }),
    achievable: z.object({
      resources: z.array(z.string()),
      constraints: z.array(z.string()),
      feasibilityScore: z.number().min(0).max(100)
    }),
    relevant: z.object({
      alignment: z.string(),
      benefits: z.array(z.string()),
      stakeholders: z.array(z.string())
    }),
    timeBound: z.object({
      deadline: z.string().optional(),
      milestones: z.array(z.object({
        name: z.string(),
        dueDate: z.string().optional()
      }))
    }),
    status: z.object({
      isComplete: z.boolean(),
      confidenceScores: z.object({
        specific: z.number().min(0).max(100),
        measurable: z.number().min(0).max(100),
        achievable: z.number().min(0).max(100),
        relevant: z.number().min(0).max(100),
        timeBound: z.number().min(0).max(100),
        overall: z.number().min(0).max(100)
      })
    })
  }),
  conversationState: z.object({
    phase: z.enum(['initial', 'clarifying', 'refining', 'complete']),
    nextAction: z.enum(['ask_clarification', 'confirm_details', 'generate_plan', 'complete']),
    missingInformation: z.array(z.string()),
    suggestedQuestions: z.array(z.string()),
    userCommunicationStyle: z.string()
  }),
  clarifications: z.array(z.object({
    category: z.enum(['PENDING', 'ANSWERED', 'SKIPPED']),
    question: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    reason: z.string()
  })).optional(),
  milestones: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    dueDate: z.string().optional(),
    dependencies: z.array(z.string()),
    estimatedDuration: z.number(),
    tasks: z.array(z.object({
      id: z.string(),
      title: z.string(),
      estimatedHours: z.number()
    }))
  })).optional(),
  taskBreakdown: z.object({
    totalEstimatedHours: z.number(),
    criticalPath: z.array(z.string()),
    parallelTracks: z.array(z.array(z.string())),
    riskFactors: z.array(z.string())
  }).optional(),
  response: z.object({
    message: z.string(),
    tone: z.enum(['encouraging', 'professional', 'casual', 'detailed']),
    includeExamples: z.boolean(),
    visualizationData: z.any().optional()
  })
});

type ComprehensiveGoalResponse = z.infer<typeof ComprehensiveGoalResponseSchema>;

export class UnifiedGoalProcessor {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async processGoalConversation(
    conversationHistory: ConversationMessage[],
    currentState: GoalState,
    userInput: string
  ): Promise<ComprehensiveGoalResponse> {
    const systemPrompt = `You are an expert goal-setting coach and project manager. You help users create and refine SMART goals through natural conversation.

Your capabilities include:
1. Analyzing user input to extract goal components
2. Updating SMART criteria based on new information
3. Generating targeted clarification questions
4. Creating detailed milestones and task breakdowns
5. Estimating timelines and identifying dependencies
6. Adapting to user communication styles

Always maintain context from the entire conversation and provide comprehensive, actionable responses.`;

    const userPrompt = `CURRENT GOAL STATE:
${JSON.stringify(currentState, null, 2)}

CONVERSATION HISTORY:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

USER INPUT: ${userInput}

YOUR TASK:
1. Analyze the user's input in context of the conversation
2. Update all SMART criteria based on new information
3. Calculate confidence scores for each criterion
4. Determine the conversation phase and next action
5. Generate appropriate follow-up questions if needed
6. Create milestones and task breakdown if criteria are sufficiently complete
7. Estimate timelines and identify dependencies
8. Craft a contextual response message

Return a comprehensive JSON response that includes:
- Updated goal with all SMART criteria
- Current conversation state and next action
- Clarification questions (if needed)
- Milestones and task breakdown (if appropriate)
- Response message adapted to user's style

Ensure all dates are in ISO format and all numeric values are properly typed.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 4000
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from LLM');
      }

      const parsedResponse = JSON.parse(responseText);
      const validatedResponse = ComprehensiveGoalResponseSchema.parse(parsedResponse);

      return validatedResponse;
    } catch (error) {
      console.error('Error in unified goal processing:', error);
      throw new Error(`Failed to process goal conversation: ${error.message}`);
    }
  }

  async handleError(
    error: Error,
    context: { conversationHistory: ConversationMessage[], currentState: GoalState }
  ): Promise<{
    userMessage: string,
    suggestions: string[],
    fallbackAction: string
  }> {
    const errorPrompt = `An error occurred during goal processing:

ERROR: ${error.message}
CONTEXT: ${JSON.stringify(context, null, 2)}

Provide:
1. A user-friendly explanation of what went wrong
2. 3-5 suggestions for how to proceed
3. A recommended fallback action

Focus on being helpful and maintaining conversation flow.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { 
            role: 'system', 
            content: 'You are a helpful assistant specializing in error recovery for goal-setting conversations.' 
          },
          { role: 'user', content: errorPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      });

      const response = JSON.parse(completion.choices[0]?.message?.content || '{}');
      return {
        userMessage: response.userMessage || "I encountered an issue processing your goal. Let's try a different approach.",
        suggestions: response.suggestions || ["Let's break down your goal into smaller parts", "Can you tell me more about what you want to achieve?"],
        fallbackAction: response.fallbackAction || "restart_clarification"
      };
    } catch (errorHandlingError) {
      return {
        userMessage: "I'm having trouble processing your request. Let's start fresh with your goal.",
        suggestions: ["Try stating your goal in simple terms", "Focus on what you want to achieve"],
        fallbackAction: "restart_conversation"
      };
    }
  }
}