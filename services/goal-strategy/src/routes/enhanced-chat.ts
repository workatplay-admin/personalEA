/**
 * Enhanced Chat Routes
 * 
 * Advanced conversational AI endpoints with neural coordination,
 * memory persistence, and automated SMART score tracking.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '@/utils/logger';
import { authenticateJWT } from '@/middleware/auth';
import { enhancedLLMChatCoordinator } from '@/services/enhanced-llm-chat-coordinator';

const router = Router();

// Validation schemas
const initiateSessionSchema = z.object({
  goal: z.string().min(10, 'Goal must be at least 10 characters'),
  userProfile: z.object({
    expertiseLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
    communicationStyle: z.enum(['formal', 'casual', 'technical', 'simple']).optional(),
    domain: z.string().optional()
  }).optional()
});

const chatMessageSchema = z.object({
  sessionId: z.string(),
  message: z.string().min(1, 'Message cannot be empty'),
  context: z.object({
    component: z.enum(['specific', 'measurable', 'achievable', 'relevant', 'timeBound']).optional(),
    requestType: z.enum(['clarification', 'example', 'help', 'refinement']).optional()
  }).optional()
});

const getSessionSchema = z.object({
  sessionId: z.string()
});

/**
 * POST /api/v1/enhanced-chat/initiate
 * Initialize a new enhanced conversation session
 */
router.post('/initiate', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { goal, userProfile } = initiateSessionSchema.parse(req.body);
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);
    const userId = req.user?.id;

    logger.info('Initiating enhanced chat session', {
      correlationId,
      userId,
      goalLength: goal.length,
      userProfile
    });

    // Generate unique session ID
    const sessionId = `enhanced-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Initialize conversation with enhanced coordinator
    const conversationMemory = await enhancedLLMChatCoordinator.initializeSession(
      sessionId,
      goal,
      userId,
      userProfile
    );

    // Generate initial response
    const initialResponse = await enhancedLLMChatCoordinator.processMessage(
      sessionId,
      "Let's work on refining your goal to make it SMART. What aspects would you like to focus on first?",
      req.headers['x-openai-api-key'] as string
    );

    res.json({
      success: true,
      data: {
        sessionId,
        conversationMemory: {
          phase: conversationMemory.conversationPhase,
          scores: conversationMemory.currentGoal.scores,
          targetThreshold: conversationMemory.currentGoal.targetThreshold,
          iterationCount: conversationMemory.contextData.sessionMetrics.iterationCount
        },
        initialResponse: {
          content: initialResponse.content,
          actionItems: initialResponse.actionItems,
          uiUpdates: initialResponse.uiUpdates
        },
        neuralState: {
          confidenceLevel: conversationMemory.neuralState.confidenceLevel,
          patternsCount: conversationMemory.neuralState.patterns.length
        }
      }
    });

  } catch (error) {
    logger.error('Failed to initiate enhanced chat session', { error, correlationId: req.correlationId });
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to initiate chat session'
    });
  }
});

/**
 * POST /api/v1/enhanced-chat/message
 * Send a message in an existing conversation
 */
router.post('/message', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { sessionId, message, context } = chatMessageSchema.parse(req.body);
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);

    logger.info('Processing enhanced chat message', {
      correlationId,
      sessionId,
      messageLength: message.length,
      context
    });

    // Process message with enhanced coordinator
    const response = await enhancedLLMChatCoordinator.processMessage(
      sessionId,
      message,
      req.headers['x-openai-api-key'] as string
    );

    // Get updated conversation state
    const conversationMemory = enhancedLLMChatCoordinator.getConversationMemory(sessionId);
    if (!conversationMemory) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      });
      return;
    }

    // Check if goal is complete
    const isComplete = enhancedLLMChatCoordinator.isGoalComplete(sessionId);
    let completionSummary: string | undefined;

    if (isComplete) {
      completionSummary = await enhancedLLMChatCoordinator.generateCompletionSummary(sessionId);
    }

    res.json({
      success: true,
      data: {
        response: {
          content: response.content,
          actionItems: response.actionItems,
          uiUpdates: response.uiUpdates
        },
        conversationState: {
          phase: conversationMemory.conversationPhase,
          scores: conversationMemory.currentGoal.scores,
          targetThreshold: conversationMemory.currentGoal.targetThreshold,
          iterationCount: conversationMemory.contextData.sessionMetrics.iterationCount,
          isComplete
        },
        neuralState: {
          confidenceLevel: conversationMemory.neuralState.confidenceLevel,
          patternsCount: conversationMemory.neuralState.patterns.length,
          adaptations: conversationMemory.neuralState.adaptationHistory.length
        },
        completionSummary
      }
    });

  } catch (error) {
    logger.error('Failed to process enhanced chat message', { error, correlationId: req.correlationId });
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
      return;
    }

    if (error instanceof Error && error.message.includes('Session not found')) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process message'
    });
  }
});

/**
 * GET /api/v1/enhanced-chat/session/:sessionId
 * Get current conversation state
 */
router.get('/session/:sessionId', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { sessionId } = getSessionSchema.parse({ sessionId: req.params.sessionId });
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);

    logger.info('Retrieving enhanced chat session', {
      correlationId,
      sessionId
    });

    const conversationMemory = enhancedLLMChatCoordinator.getConversationMemory(sessionId);
    if (!conversationMemory) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      });
      return;
    }

    const isComplete = enhancedLLMChatCoordinator.isGoalComplete(sessionId);

    res.json({
      success: true,
      data: {
        sessionId,
        conversationState: {
          phase: conversationMemory.conversationPhase,
          scores: conversationMemory.currentGoal.scores,
          targetThreshold: conversationMemory.currentGoal.targetThreshold,
          iterationCount: conversationMemory.contextData.sessionMetrics.iterationCount,
          isComplete
        },
        currentGoal: {
          rawInput: conversationMemory.currentGoal.rawInput,
          smartAnalysis: conversationMemory.currentGoal.smartAnalysis
        },
        conversationHistory: conversationMemory.messages.slice(-10), // Last 10 messages
        userProfile: conversationMemory.contextData.userProfile,
        neuralState: {
          confidenceLevel: conversationMemory.neuralState.confidenceLevel,
          patternsCount: conversationMemory.neuralState.patterns.length,
          adaptations: conversationMemory.neuralState.adaptationHistory.length
        }
      }
    });

  } catch (error) {
    logger.error('Failed to retrieve enhanced chat session', { error, correlationId: req.correlationId });
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session'
    });
  }
});

/**
 * POST /api/v1/enhanced-chat/session/:sessionId/complete
 * Mark session as complete and get final summary
 */
router.post('/session/:sessionId/complete', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { sessionId } = getSessionSchema.parse({ sessionId: req.params.sessionId });
    const correlationId = req.correlationId || Math.random().toString(36).substring(7);

    logger.info('Completing enhanced chat session', {
      correlationId,
      sessionId
    });

    const conversationMemory = enhancedLLMChatCoordinator.getConversationMemory(sessionId);
    if (!conversationMemory) {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      });
      return;
    }

    const isComplete = enhancedLLMChatCoordinator.isGoalComplete(sessionId);
    const completionSummary = await enhancedLLMChatCoordinator.generateCompletionSummary(sessionId);

    res.json({
      success: true,
      data: {
        sessionId,
        isComplete,
        completionSummary,
        finalScores: conversationMemory.currentGoal.scores,
        sessionMetrics: conversationMemory.contextData.sessionMetrics,
        finalGoal: {
          raw: conversationMemory.currentGoal.rawInput,
          smartAnalysis: conversationMemory.currentGoal.smartAnalysis
        }
      }
    });

  } catch (error) {
    logger.error('Failed to complete enhanced chat session', { error, correlationId: req.correlationId });
    
    res.status(500).json({
      success: false,
      error: 'Failed to complete session'
    });
  }
});

/**
 * GET /api/v1/enhanced-chat/health
 * Health check for enhanced chat system
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check if coordinator is responsive
    const healthCheck = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      components: {
        llmCoordinator: 'active',
        neuralIntegration: 'active',
        memorySystem: 'active'
      },
      metrics: {
        activeSessions: 0, // Could track active sessions
        totalProcessed: 0 // Could track total messages processed
      }
    };

    res.json({
      success: true,
      data: healthCheck
    });

  } catch (error) {
    logger.error('Enhanced chat health check failed', { error });
    
    res.status(503).json({
      success: false,
      error: 'Service unhealthy',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;