/**
 * Enhanced Goals Chat Endpoints
 * 
 * Implements improved conversational AI endpoints with adaptive responses,
 * natural language variations, and intelligent conversation flow management.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '@/utils/logger';
import { env } from '@/config/environment';
import { EnhancedConversationalStateManager } from './enhanced-conversational-state-manager';

// Initialize enhanced state manager
let stateManager: EnhancedConversationalStateManager | null = null;

function getStateManager(apiKey: string): EnhancedConversationalStateManager {
  if (!stateManager) {
    stateManager = new EnhancedConversationalStateManager(apiKey);
  }
  return stateManager;
}

// Enhanced schemas with more context
const enhancedChatRequestSchema = z.object({
  sessionId: z.string(),
  userId: z.string().optional(),
  userMessage: z.string(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    timestamp: z.string().optional(),
    metadata: z.any().optional()
  })),
  currentGoalState: z.any().optional(),
  userPreferences: z.object({
    verbosity: z.enum(['brief', 'balanced', 'detailed']).optional(),
    pace: z.enum(['quick', 'moderate', 'thorough']).optional(),
    style: z.enum(['casual', 'professional', 'friendly']).optional()
  }).optional()
});

const adaptiveHelpRequestSchema = z.object({
  context: z.enum(['stuck', 'confused', 'options', 'example', 'skip']),
  currentComponent: z.string().optional(),
  userInput: z.string(),
  conversationState: z.any(),
  frustrationLevel: z.number().min(0).max(10).optional()
});

/**
 * POST /api/v1/goals/chat/adaptive
 * Main adaptive chat endpoint that handles all conversation flow
 */
export async function adaptiveChatHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = enhancedChatRequestSchema.parse(req.body);
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);
    
    logger.info('Adaptive chat request', {
      correlationId,
      userId: validatedData.userId,
      sessionId: validatedData.sessionId,
      messageLength: validatedData.userMessage.length
    });

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

    const manager = getStateManager(apiKey);
    
    // Analyze conversation and get enhanced state
    const enhancedState = await manager.analyzeConversation(
      validatedData.conversationHistory,
      validatedData.userMessage,
      validatedData.currentGoalState,
      validatedData.userId
    );
    
    // Check for confusion and apply recovery if needed
    const confusionCheck = await manager.detectAndRecoverFromConfusion(
      validatedData.userMessage,
      validatedData.conversationHistory
    );
    
    let response;
    
    if (confusionCheck.isConfused) {
      // Handle confusion with recovery strategy
      response = {
        message: confusionCheck.recoveryMessage,
        metadata: {
          wasConfused: true,
          recoveryStrategy: confusionCheck.recoveryStrategy,
          alternatives: confusionCheck.alternativeApproaches
        }
      };
    } else {
      // Generate adaptive response based on state
      const responseType = determineResponseType(enhancedState);
      const adaptiveResponse = await manager.generateAdaptiveResponse(
        enhancedState,
        responseType,
        { goalState: validatedData.currentGoalState }
      );
      
      response = {
        message: adaptiveResponse.message,
        metadata: {
          tone: adaptiveResponse.tone,
          adaptations: adaptiveResponse.adaptations,
          alternatives: adaptiveResponse.variations,
          followUpOptions: adaptiveResponse.followUpOptions
        }
      };
    }
    
    // Build complete response
    res.json({
      success: true,
      data: {
        response,
        conversationState: {
          phase: enhancedState.phase.current,
          subPhase: enhancedState.phase.subPhase,
          momentum: enhancedState.conversationFlow.momentum,
          naturalness: enhancedState.conversationFlow.naturalness,
          currentComponent: enhancedState.componentProgress.inProgress,
          progress: calculateOverallProgress(enhancedState.componentProgress),
          nextActions: enhancedState.intelligentGuidance.suggestedPrompts
        },
        userProfile: {
          style: enhancedState.adaptiveProfile.communicationStyle,
          preferences: enhancedState.adaptiveProfile.responsePreferences
        },
        sessionId: validatedData.sessionId
      },
      correlationId
    });

  } catch (error) {
    logger.error('Failed to handle adaptive chat', { error });
    next(error);
  }
}

/**
 * POST /api/v1/goals/chat/start-natural
 * Initialize a natural conversation flow
 */
export async function startNaturalConversationHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, goalHint, timeOfDay, returning } = req.body;
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);
    
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

    // Generate personalized greeting
    const greetingPrompt = `Generate a natural, personalized greeting for a goal-setting conversation.

Context:
- Time of day: ${timeOfDay || 'unknown'}
- Returning user: ${returning || false}
- Goal hint: ${goalHint || 'none'}

Create a greeting that:
1. Feels warm and genuine
2. Acknowledges the context naturally
3. Invites goal sharing without being pushy
4. Includes 2-3 follow-up prompts

Response format:
{
  "greeting": "main greeting message",
  "tone": "friendly/professional/casual",
  "followUpPrompts": ["prompt1", "prompt2", "prompt3"]
}`;

    const response = await callOpenAI(
      [{ role: 'system', content: 'You create warm, natural conversation starters.' },
       { role: 'user', content: greetingPrompt }],
      apiKey,
      0.8,
      200
    );

    const parsed = JSON.parse(response);
    
    res.json({
      success: true,
      data: {
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        greeting: parsed.greeting,
        tone: parsed.tone,
        followUpPrompts: parsed.followUpPrompts,
        conversationStarter: true
      },
      correlationId
    });

  } catch (error) {
    logger.error('Failed to start natural conversation', { error });
    next(error);
  }
}

/**
 * POST /api/v1/goals/chat/adaptive-help
 * Provide context-aware help based on user's situation
 */
export async function adaptiveHelpHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = adaptiveHelpRequestSchema.parse(req.body);
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);
    
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

    let helpStrategy;
    
    switch (validatedData.context) {
      case 'stuck':
        helpStrategy = {
          approach: 'unblock',
          message: "I see you might be stuck. Let's approach this differently.",
          suggestions: [
            "Break it down into smaller pieces",
            "Think about a similar situation you've handled",
            "Focus on just the next small step"
          ]
        };
        break;
        
      case 'confused':
        helpStrategy = {
          approach: 'clarify',
          message: "Let me clarify what we're looking for here.",
          suggestions: [
            "Think of it this way...",
            "The main idea is...",
            "Here's what this means for your goal..."
          ]
        };
        break;
        
      case 'options':
        helpStrategy = {
          approach: 'choices',
          message: "Here are some common approaches people use:",
          suggestions: await generateContextualOptions(validatedData.currentComponent, apiKey)
        };
        break;
        
      case 'example':
        helpStrategy = {
          approach: 'demonstrate',
          message: "Here's an example that might help:",
          suggestions: await generateRelevantExamples(validatedData.currentComponent, validatedData.conversationState, apiKey)
        };
        break;
        
      case 'skip':
        helpStrategy = {
          approach: 'defer',
          message: "No problem! We can come back to this later.",
          suggestions: [
            "Let's move on to the next aspect",
            "We'll revisit this when you're ready",
            "The other parts might help clarify this one"
          ]
        };
        break;
        
      default:
        helpStrategy = {
          approach: 'general',
          message: "I'm here to help. What would make this easier for you?",
          suggestions: [
            "Would an example help?",
            "Should we break this down?",
            "Want to skip this for now?"
          ]
        };
    }
    
    // Generate personalized help message
    const personalizedHelp = await personalizeHelpMessage(
      helpStrategy,
      validatedData.conversationState,
      validatedData.frustrationLevel,
      apiKey
    );
    
    res.json({
      success: true,
      data: {
        help: personalizedHelp,
        context: validatedData.context,
        handled: true
      },
      correlationId
    });

  } catch (error) {
    logger.error('Failed to provide adaptive help', { error });
    next(error);
  }
}

/**
 * POST /api/v1/goals/chat/quick-actions
 * Handle quick action buttons for common user needs
 */
export async function quickActionsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { action, context, sessionId } = req.body;
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);
    
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

    let response;
    
    switch (action) {
      case 'need_example':
        response = await generateQuickExample(context, apiKey);
        break;
        
      case 'too_complex':
        response = await simplifyCurrentTopic(context, apiKey);
        break;
        
      case 'show_progress':
        response = await generateProgressSummary(context, apiKey);
        break;
        
      case 'change_style':
        response = await adjustCommunicationStyle(context, apiKey);
        break;
        
      case 'take_break':
        response = {
          message: "Good idea! Taking breaks helps with clarity. When you're ready, we'll pick up right where we left off. Your progress is saved.",
          action: 'pause',
          resumeData: context
        };
        break;
        
      default:
        response = {
          message: "How can I help you with your goal?",
          action: 'unknown'
        };
    }
    
    res.json({
      success: true,
      data: response,
      correlationId
    });

  } catch (error) {
    logger.error('Failed to handle quick action', { error });
    next(error);
  }
}

// Helper functions

function determineResponseType(state: any): 'question' | 'clarification' | 'encouragement' | 'summary' | 'transition' {
  const { phase, conversationFlow, componentProgress } = state;
  
  if (phase.current === 'discovery' && componentProgress.completed.length === 0) {
    return 'question';
  } else if (conversationFlow.momentum === 'slowing') {
    return 'encouragement';
  } else if (componentProgress.completed.length >= 3 && !componentProgress.inProgress) {
    return 'summary';
  } else if (phase.current === 'refinement' && componentProgress.inProgress) {
    return 'clarification';
  } else {
    return 'transition';
  }
}

function calculateOverallProgress(componentProgress: any): number {
  const components = ['specific', 'measurable', 'achievable', 'relevant', 'timeBound'];
  const completed = componentProgress.completed.length;
  const avgConfidence = Object.values(componentProgress.confidenceScores)
    .reduce((sum: number, score: any) => sum + score, 0) / components.length;
  
  return Math.round((completed / components.length) * 50 + (avgConfidence / 100) * 50);
}

async function generateContextualOptions(component: string, apiKey: string): Promise<string[]> {
  const prompt = `Generate 3 contextual options for the ${component} component of SMART goals.
Make them practical and varied to cover different situations.
Return as JSON array of strings.`;

  try {
    const response = await callOpenAI(
      [{ role: 'user', content: prompt }],
      apiKey,
      0.7,
      150
    );
    return JSON.parse(response);
  } catch {
    return [
      "Option based on time",
      "Option based on resources",  
      "Option based on impact"
    ];
  }
}

async function generateRelevantExamples(component: string, state: any, apiKey: string): Promise<string[]> {
  const prompt = `Generate 2 relevant examples for the ${component} component.
Context: ${JSON.stringify(state?.userContext || {}, null, 2)}
Make examples relatable and clear.
Return as JSON array of strings.`;

  try {
    const response = await callOpenAI(
      [{ role: 'user', content: prompt }],
      apiKey,
      0.8,
      200
    );
    return JSON.parse(response);
  } catch {
    return [
      `Example: For a ${component} goal...`,
      `Another approach: Consider ${component} as...`
    ];
  }
}

async function personalizeHelpMessage(
  strategy: any,
  state: any,
  frustrationLevel: number | undefined,
  apiKey: string
): Promise<any> {
  const highFrustration = frustrationLevel && frustrationLevel > 6;
  
  if (highFrustration) {
    strategy.message = "I understand this can be frustrating. Let's make it easier. " + strategy.message;
    strategy.tone = 'empathetic';
  }
  
  return {
    ...strategy,
    personalized: true,
    adaptedToUser: true
  };
}

async function generateQuickExample(context: any, apiKey: string): Promise<any> {
  const prompt = `Generate a quick, relevant example for:
Component: ${context.component}
Goal type: ${context.goalType}
User level: ${context.userLevel || 'intermediate'}

Make it concise and immediately helpful.`;

  const example = await callOpenAI(
    [{ role: 'user', content: prompt }],
    apiKey,
    0.8,
    150
  );
  
  return {
    message: example,
    action: 'example_provided',
    helpful: true
  };
}

async function simplifyCurrentTopic(context: any, apiKey: string): Promise<any> {
  const prompt = `Simplify this concept:
Topic: ${context.currentTopic}
Component: ${context.component}

Explain in the simplest terms possible, like explaining to a friend.`;

  const simplified = await callOpenAI(
    [{ role: 'user', content: prompt }],
    apiKey,
    0.7,
    150
  );
  
  return {
    message: simplified,
    action: 'simplified',
    originalComplexity: 'reduced'
  };
}

async function generateProgressSummary(context: any, apiKey: string): Promise<any> {
  const { componentProgress, goalState } = context;
  
  const completed = componentProgress.completed.join(', ');
  const remaining = ['specific', 'measurable', 'achievable', 'relevant', 'timeBound']
    .filter(c => !componentProgress.completed.includes(c))
    .join(', ');
  
  return {
    message: `Great progress! You've completed: ${completed}. Still working on: ${remaining}. You're ${calculateOverallProgress(componentProgress)}% done!`,
    action: 'progress_shown',
    visual: {
      completed: componentProgress.completed,
      remaining: remaining.split(', '),
      percentage: calculateOverallProgress(componentProgress)
    }
  };
}

async function adjustCommunicationStyle(context: any, apiKey: string): Promise<any> {
  const { currentStyle, desiredStyle } = context;
  
  return {
    message: `I'll adjust my communication style to be more ${desiredStyle}. Let me know if this works better for you!`,
    action: 'style_changed',
    previousStyle: currentStyle,
    newStyle: desiredStyle
  };
}

// Shared helper from original implementation
async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  temperature: number = 0.7,
  maxTokens: number = 300,
  retries: number = 3
): Promise<string> {
  const timeout = env.AI_TIMEOUT_MS || 30000;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || 'gpt-4-turbo-preview',
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
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
      if (error.name === 'AbortError' && attempt < retries) {
        continue;
      }
      
      if (attempt === retries) {
        throw error;
      }
    }
  }
  
  throw new Error('Failed to get response from OpenAI after multiple attempts');
}