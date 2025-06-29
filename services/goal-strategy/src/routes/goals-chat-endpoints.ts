import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '@/utils/logger';
import { env } from '@/config/environment';

// Schema for contextual help request
const contextualHelpSchema = z.object({
  goalTitle: z.string(),
  componentKey: z.string(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })),
  goalContext: z.object({
    title: z.string(),
    criteria: z.any().optional(),
    confidence: z.number().optional()
  })
});

// Schema for component question request
const componentQuestionSchema = z.object({
  goalTitle: z.string(),
  componentKey: z.enum(['specific', 'measurable', 'achievable', 'relevant', 'timeBound']),
  currentValue: z.string(),
  confidence: z.number(),
  isHighConfidence: z.boolean(),
  goalContext: z.object({
    title: z.string(),
    criteria: z.any().optional(),
    confidence: z.number().optional()
  })
});

// Schema for interactive refinement session
const interactiveRefinementSchema = z.object({
  sessionId: z.string().optional(),
  goalId: z.string().optional(),
  rawGoal: z.string().optional(),
  action: z.enum(['start', 'continue', 'complete']),
  userMessage: z.string().optional(),
  componentFocus: z.enum(['specific', 'measurable', 'achievable', 'relevant', 'timeBound']).optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional()
});

// Helper function to call OpenAI API with timeout and retry
async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  temperature: number = 0.7,
  maxTokens: number = 300,
  retries: number = 3
): Promise<string> {
  const timeout = env.AI_TIMEOUT_MS || 30000; // Use configured timeout or 30s default
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.text();
        logger.error('OpenAI API call failed', {
          status: response.status,
          error: errorData,
          attempt
        });
        
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('Invalid OpenAI API key. Please check your API key configuration.');
        } else if (response.status === 429) {
          // Rate limit - wait before retry
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
          throw new Error('OpenAI API rate limit exceeded. Please try again later.');
        } else if (response.status >= 500) {
          // Server error - retry with backoff
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
          throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
        }
        
        throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json() as {
        choices: Array<{
          message: {
            content: string;
          };
        }>;
      };
      
      return data.choices[0]?.message?.content || '';
      
    } catch (error: any) {
      // Handle timeout
      if (error.name === 'AbortError') {
        logger.warn(`OpenAI API timeout on attempt ${attempt}`, { timeout });
        if (attempt < retries) {
          continue;
        }
        throw new Error('OpenAI API request timed out. Please try again.');
      }
      
      // Re-throw other errors
      if (attempt === retries) {
        throw error;
      }
    }
  }
  
  throw new Error('Failed to get response from OpenAI after multiple attempts');
}

/**
 * POST /api/v1/goals/contextual-help
 * Generate contextual help message based on conversation history
 */
export async function contextualHelpHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { goalTitle, componentKey, conversationHistory, goalContext } = contextualHelpSchema.parse(req.body);
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);

    logger.info('Contextual help request', {
      correlationId,
      userId: req.user?.id,
      goalTitle,
      componentKey,
      historyLength: conversationHistory.length
    });

    // Use user's API key or fallback to environment key
    const apiKey = req.headers['x-openai-api-key'] as string || env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(400).json({
        error: {
          code: 'API_KEY_MISSING',
          message: 'OpenAI API key is required'
        }
      });
      return;
    }

    // Build the system prompt
    const systemPrompt = `You are a helpful SMART goal refinement assistant. The user is working on refining their goal: "${goalTitle}".
They are currently focusing on the "${componentKey}" component of SMART goals.
Provide helpful, encouraging guidance based on their question or statement.
If they say they don't know or need help, provide specific examples and suggestions relevant to their goal.
Keep responses concise and actionable.`;

    // Build messages array for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory
    ];

    const helpMessage = await callOpenAI(messages, apiKey, 0.7, 300);

    res.json({
      success: true,
      data: {
        helpMessage
      },
      correlationId
    });

  } catch (error) {
    logger.error('Failed to generate contextual help', { error });
    next(error);
  }
}

/**
 * POST /api/v1/goals/generate-prompt
 * Generate dynamic prompts using LLM instead of hardcoded text
 */
export async function generatePromptHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { promptType, context } = req.body;
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);

    logger.info('Generate prompt request', {
      correlationId,
      userId: req.user?.id,
      promptType,
      context
    });

    // Use user's API key or fallback to environment key
    const apiKey = req.headers['x-openai-api-key'] as string || env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(400).json({
        error: {
          code: 'API_KEY_MISSING',
          message: 'OpenAI API key is required'
        }
      });
      return;
    }

    let systemPrompt = '';
    switch (promptType) {
      case 'welcome':
        systemPrompt = `Generate a warm, encouraging welcome message for a SMART goal refinement assistant. The user's goal is: "${context.goalTitle}". 
        Confidence score: ${context.confidenceScore}%.
        Include:
        1. A friendly greeting
        2. Brief explanation of the SMART components
        3. How the process will work
        4. Encouragement to begin
        Keep it conversational and supportive.`;
        break;
      
      case 'completion':
        systemPrompt = `Generate an enthusiastic completion message for finishing SMART goal refinement.
        The user has improved their goal: "${context.goalTitle}".
        Initial confidence: ${context.initialConfidence}%, Final confidence: ${context.finalConfidence}%.
        Include:
        1. Congratulations
        2. Summary of improvements
        3. Encouragement for next steps
        Keep it celebratory and motivating.`;
        break;
      
      case 'system':
        systemPrompt = `Generate a system prompt for an AI assistant helping with ${context.purpose}.
        Context: ${JSON.stringify(context.details)}
        The prompt should be clear, specific, and guide the AI to provide helpful responses.`;
        break;
      
      case 'component':
        systemPrompt = `Generate a conversational question to help refine the "${context.componentKey}" aspect of a SMART goal.
        Goal: "${context.goalTitle}"
        Current confidence: ${context.confidence}
        High confidence: ${context.isHighConfidence}
        
        Create a natural, supportive question that:
        1. Is specific to their goal
        2. Helps clarify the ${context.componentKey} component
        3. Provides examples or context when helpful
        4. Encourages detailed responses`;
        break;
      
      default:
        systemPrompt = `Generate appropriate content for: ${promptType}. Context: ${JSON.stringify(context)}`;
    }

    const messages = [{ role: 'system', content: systemPrompt }];
    const generatedPrompt = await callOpenAI(messages, apiKey, 0.8, 400);

    res.json({
      success: true,
      data: {
        prompt: generatedPrompt,
        promptType
      },
      correlationId
    });

  } catch (error) {
    logger.error('Failed to generate prompt', { error });
    next(error);
  }
}

/**
 * POST /api/v1/goals/component-question
 * Generate dynamic question for a specific SMART component
 */
export async function componentQuestionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { goalTitle, componentKey, currentValue, confidence, isHighConfidence, goalContext } = 
      componentQuestionSchema.parse(req.body);
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);

    logger.info('Component question request', {
      correlationId,
      userId: req.user?.id,
      goalTitle,
      componentKey,
      confidence,
      isHighConfidence
    });

    // Use user's API key or fallback to environment key
    const apiKey = req.headers['x-openai-api-key'] as string || env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(400).json({
        error: {
          code: 'API_KEY_MISSING',
          message: 'OpenAI API key is required'
        }
      });
      return;
    }

    // Use the dynamic prompt generation endpoint internally
    const dynamicPromptRequest = {
      promptType: 'component',
      context: {
        goalTitle,
        componentKey,
        currentValue,
        confidence,
        isHighConfidence,
        goalContext
      }
    };

    const systemPrompt = `Generate a conversational question to help refine the "${componentKey}" aspect of a SMART goal.
Goal: "${goalTitle}"
Current ${componentKey} value: "${currentValue}"
Confidence level: ${confidence}
Is high confidence: ${isHighConfidence}

Create a natural, supportive question that:
1. Is specific to their goal
2. Helps clarify the ${componentKey} component
3. Provides examples or context when helpful
4. Encourages detailed responses
5. Adapts based on whether the confidence is already high or needs improvement

Keep the question concise and conversational.`;

    const messages = [{ role: 'system', content: systemPrompt }];
    const question = await callOpenAI(messages, apiKey, 0.8, 150);

    res.json({
      success: true,
      data: {
        question
      },
      correlationId
    });

  } catch (error) {
    logger.error('Failed to generate component question', { error });
    next(error);
  }
}

/**
 * POST /api/v1/goals/interactive-refinement-session
 * Manage interactive goal refinement sessions
 */
export async function interactiveRefinementSessionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = interactiveRefinementSchema.parse(req.body);
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);
    const userApiKey = req.headers['x-openai-api-key'] as string || env.OPENAI_API_KEY;

    logger.info('Interactive refinement session', {
      correlationId,
      userId: req.user?.id,
      action: validatedData.action,
      hasSessionId: !!validatedData.sessionId
    });

    if (!userApiKey) {
      res.status(400).json({
        error: {
          code: 'API_KEY_MISSING',
          message: 'OpenAI API key is required'
        }
      });
      return;
    }

    let responseData: any = {};

    switch (validatedData.action) {
      case 'start': {
        // Start a new refinement session
        const sessionId = validatedData.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        // If starting with a raw goal, analyze it first
        if (validatedData.rawGoal) {
          const analysisPrompt = `Analyze this goal without transforming it: "${validatedData.rawGoal}"

Identify:
1. Which SMART components are present or missing
2. The current clarity level (1-10)
3. Suggested starting point for refinement

Respond in conversational JSON:
{
  "greeting": "A friendly greeting acknowledging their goal",
  "analysis": "Brief analysis of current state",
  "suggestedStartComponent": "specific/measurable/achievable/relevant/timeBound",
  "firstQuestion": "An engaging question to start the refinement"
}`;

          const messages = [{ role: 'system', content: analysisPrompt }];
          const aiResponse = await callOpenAI(messages, userApiKey, 0.7, 300);
          const parsed = JSON.parse(aiResponse.replace(/```json|```/g, '').trim());

          responseData = {
            sessionId,
            status: 'active',
            currentComponent: parsed.suggestedStartComponent,
            message: `${parsed.greeting}\n\n${parsed.analysis}\n\n${parsed.firstQuestion}`,
            conversationHistory: [
              { role: 'assistant', content: parsed.firstQuestion }
            ],
            progress: {
              overall: 20,
              components: {
                specific: 0,
                measurable: 0,
                achievable: 0,
                relevant: 0,
                timeBound: 0
              }
            }
          };
        } else {
          // Starting without a goal - just provide introduction
          responseData = {
            sessionId,
            status: 'active',
            message: "Hi! I'm here to help you refine your goal using the SMART framework. Could you start by telling me what you'd like to achieve?",
            conversationHistory: [
              { role: 'assistant', content: "Hi! I'm here to help you refine your goal using the SMART framework. Could you start by telling me what you'd like to achieve?" }
            ]
          };
        }
        break;
      }

      case 'continue': {
        // Continue an existing session
        if (!validatedData.userMessage) {
          res.status(400).json({
            error: {
              code: 'MESSAGE_REQUIRED',
              message: 'User message is required for continuing session'
            }
          });
          return;
        }

        const conversationHistory = validatedData.conversationHistory || [];
        conversationHistory.push({ role: 'user', content: validatedData.userMessage });

        const continuePrompt = `You are helping refine a goal interactively. 
Current focus: ${validatedData.componentFocus || 'general'}
Conversation so far: ${JSON.stringify(conversationHistory)}

Based on the user's latest input, provide:
1. Acknowledgment of their input
2. How it improves the goal
3. Next question or suggestion
4. Updated confidence for current component (0-100)

Respond in JSON:
{
  "acknowledgment": "string",
  "improvement": "string",
  "nextStep": "string",
  "componentConfidence": number,
  "suggestMoveToNext": boolean
}`;

        const messages = [
          { role: 'system', content: continuePrompt },
          ...conversationHistory
        ];

        const aiResponse = await callOpenAI(messages, userApiKey, 0.7, 400);
        const parsed = JSON.parse(aiResponse.replace(/```json|```/g, '').trim());

        const fullResponse = `${parsed.acknowledgment}\n\n${parsed.improvement}\n\n${parsed.nextStep}`;
        conversationHistory.push({ role: 'assistant', content: fullResponse });

        responseData = {
          sessionId: validatedData.sessionId,
          status: 'active',
          message: fullResponse,
          conversationHistory,
          componentConfidence: parsed.componentConfidence,
          suggestMoveToNext: parsed.suggestMoveToNext
        };
        break;
      }

      case 'complete': {
        // Complete the session and generate final goal
        const completePrompt = `Based on this conversation about goal refinement:
${JSON.stringify(validatedData.conversationHistory)}

Generate:
1. A final refined goal statement (keeping the user's intent but making it clearer)
2. Summary of improvements made
3. Confidence score
4. Next steps recommendation

Respond in JSON:
{
  "refinedGoal": "string",
  "improvements": ["string"],
  "confidence": number,
  "nextSteps": ["string"]
}`;

        const messages = [{ role: 'system', content: completePrompt }];
        const aiResponse = await callOpenAI(messages, userApiKey, 0.7, 400);
        const parsed = JSON.parse(aiResponse.replace(/```json|```/g, '').trim());

        responseData = {
          sessionId: validatedData.sessionId,
          status: 'completed',
          refinedGoal: parsed.refinedGoal,
          improvements: parsed.improvements,
          confidence: parsed.confidence,
          nextSteps: parsed.nextSteps,
          message: `Great work! Here's your refined goal:\n\n"${parsed.refinedGoal}"\n\nImprovements made:\n${parsed.improvements.join('\n- ')}\n\nNext steps:\n${parsed.nextSteps.join('\n- ')}`
        };
        break;
      }
    }

    res.json({
      success: true,
      data: responseData,
      correlationId
    });

  } catch (error) {
    logger.error('Failed to handle interactive refinement session', { error });
    next(error);
  }
}