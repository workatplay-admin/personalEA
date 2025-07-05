/**
 * Neural Chat Routes
 * 
 * API endpoints for neural-enhanced conversational AI with persistent memory,
 * SMART score tracking, and cognitive pattern application.
 * 
 * Endpoints:
 * - POST /neural-chat/message - Process a message with neural enhancement
 * - POST /neural-chat/stream - Stream responses with neural processing
 * - GET /neural-chat/history/:conversationId - Get conversation history
 * - GET /neural-chat/scores/:conversationId - Get SMART score history
 * - POST /neural-chat/feedback - Submit feedback for neural training
 * - GET /neural-chat/status/:sessionId - Get neural coordination status
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createContextLogger } from '@/utils/logger';
import { authenticateJWT } from '@/middleware/auth';
import { validateAPIKey } from '@/middleware/validate-api-key';

// Simple validation middleware
const validateRequest = (schema: any) => (req: any, res: any, next: any) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data'
      }
    });
  }
};
import { NeuralChatCoordinator } from '@/services/neural-chat-coordinator';
import { MemoryPersistenceManager } from '@/services/memory-persistence-manager';
import { SmartScoreTracker } from '@/services/smart-score-tracker';
import { performanceMonitor } from '@/middleware/performance-monitor';

const router = Router();
const logger = createContextLogger('neural-chat-routes');
const neuralChat = new NeuralChatCoordinator();
const memoryManager = new MemoryPersistenceManager();
const scoreTracker = new SmartScoreTracker();

// Request schemas
const MessageSchema = z.object({
  conversationId: z.string().min(1),
  sessionId: z.string().min(1),
  message: z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1).max(10000)
  }),
  options: z.object({
    cognitivePattern: z.enum([
      'convergent', 
      'divergent', 
      'lateral', 
      'systems', 
      'critical', 
      'adaptive'
    ]).optional().default('adaptive'),
    enableNeuralProcessing: z.boolean().optional().default(true),
    enableMemoryPersistence: z.boolean().optional().default(true)
  }).optional()
});

const StreamMessageSchema = MessageSchema.extend({
  streamOptions: z.object({
    chunkSize: z.number().min(1).max(1000).optional().default(100),
    includeMetrics: z.boolean().optional().default(false)
  }).optional()
});

const FeedbackSchema = z.object({
  conversationId: z.string().min(1),
  sessionId: z.string().min(1),
  feedback: z.object({
    success: z.boolean(),
    rating: z.number().min(1).max(5).optional(),
    comments: z.string().optional(),
    improvements: z.array(z.string()).optional()
  })
});

/**
 * Process a message with neural enhancement
 */
router.post(
  '/message',
  authenticateJWT,
  validateAPIKey,
  validateRequest(MessageSchema),
  performanceMonitor('neural-chat-message'),
  async (req: Request, res: Response) => {
    const { conversationId, sessionId, message, options = {} } = req.body;
    const userId = req.user!.id;
    const correlationId = req.correlationId!;
    const apiKey = req.headers['x-openai-api-key'] as string;

    try {
      logger.info('Processing neural chat message', {
        correlationId,
        conversationId,
        sessionId,
        cognitivePattern: options.cognitivePattern
      });

      // Process message with neural coordination
      const response = await neuralChat.processMessage(message, {
        correlationId,
        userId,
        sessionId,
        conversationId,
        ...options,
        apiKey
      });

      // Log performance metrics
      if (response.neuralMetrics) {
        logger.info('Neural processing complete', {
          correlationId,
          metrics: response.neuralMetrics
        });
      }

      res.json({
        success: true,
        data: {
          message: response.message,
          smartScores: response.smartScores,
          phaseTransition: response.phaseTransition,
          metrics: response.neuralMetrics
        }
      });

    } catch (error) {
      logger.error('Neural chat processing failed', {
        error,
        correlationId,
        conversationId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'NEURAL_CHAT_ERROR',
          message: 'Failed to process message with neural enhancement'
        }
      });
    }
  }
);

/**
 * Stream responses with neural processing
 */
router.post(
  '/stream',
  authenticateJWT,
  validateAPIKey,
  validateRequest(StreamMessageSchema),
  async (req: Request, res: Response) => {
    const { conversationId, sessionId, message, options = {}, streamOptions = {} } = req.body;
    const userId = req.user!.id;
    const correlationId = req.correlationId!;
    const apiKey = req.headers['x-openai-api-key'] as string;

    try {
      logger.info('Starting neural chat stream', {
        correlationId,
        conversationId,
        sessionId
      });

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Stream response
      const stream = neuralChat.streamMessage(message, {
        correlationId,
        userId,
        sessionId,
        conversationId,
        ...options,
        apiKey
      });

      let buffer = '';
      let chunkCount = 0;

      for await (const chunk of stream) {
        buffer += chunk;
        
        // Send chunks based on size or natural breaks
        if (
          buffer.length >= streamOptions.chunkSize ||
          buffer.endsWith('.') ||
          buffer.endsWith('!') ||
          buffer.endsWith('?')
        ) {
          res.write(`data: ${JSON.stringify({ 
            content: buffer,
            chunk: chunkCount++
          })}\n\n`);
          buffer = '';
        }
      }

      // Send any remaining content
      if (buffer.length > 0) {
        res.write(`data: ${JSON.stringify({ 
          content: buffer,
          chunk: chunkCount++
        })}\n\n`);
      }

      // Send completion event
      res.write(`data: ${JSON.stringify({ 
        event: 'complete',
        chunks: chunkCount
      })}\n\n`);

      res.end();

    } catch (error) {
      logger.error('Neural chat streaming failed', {
        error,
        correlationId,
        conversationId
      });

      res.write(`data: ${JSON.stringify({ 
        event: 'error',
        error: 'Stream processing failed'
      })}\n\n`);
      res.end();
    }
  }
);

/**
 * Get conversation history with memory
 */
router.get(
  '/history/:conversationId',
  authenticateJWT,
  performanceMonitor('neural-chat-history'),
  async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const { limit = 50, includeMetadata = false } = req.query;
    const correlationId = req.correlationId!;

    try {
      logger.info('Retrieving conversation history', {
        correlationId,
        conversationId,
        limit
      });

      // Retrieve from memory
      const entries = await memoryManager.retrieve({
        pattern: `chat/*/${conversationId}/*`,
        sortBy: 'timestamp',
        limit: Number(limit)
      });

      const history = entries.map(entry => {
        const data = entry.value;
        return includeMetadata === 'true' ? {
          ...data,
          metadata: entry.metadata
        } : data;
      });

      res.json({
        success: true,
        data: {
          conversationId,
          history,
          count: history.length
        }
      });

    } catch (error) {
      logger.error('Failed to retrieve conversation history', {
        error,
        correlationId,
        conversationId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'HISTORY_RETRIEVAL_ERROR',
          message: 'Failed to retrieve conversation history'
        }
      });
    }
  }
);

/**
 * Get SMART score history
 */
router.get(
  '/scores/:conversationId',
  authenticateJWT,
  performanceMonitor('neural-chat-scores'),
  async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const { limit = 20 } = req.query;
    const correlationId = req.correlationId!;

    try {
      logger.info('Retrieving SMART score history', {
        correlationId,
        conversationId
      });

      const history = await scoreTracker.getScoreHistory(
        conversationId,
        Number(limit)
      );

      // Calculate trends
      const trends = history.length > 1 ? {
        specific: history[history.length - 1].scores.specific - history[0].scores.specific,
        measurable: history[history.length - 1].scores.measurable - history[0].scores.measurable,
        achievable: history[history.length - 1].scores.achievable - history[0].scores.achievable,
        relevant: history[history.length - 1].scores.relevant - history[0].scores.relevant,
        timeBound: history[history.length - 1].scores.timeBound - history[0].scores.timeBound
      } : null;

      res.json({
        success: true,
        data: {
          conversationId,
          currentScores: history[history.length - 1]?.scores || null,
          currentPhase: history[history.length - 1]?.phase || 'initial',
          history,
          trends
        }
      });

    } catch (error) {
      logger.error('Failed to retrieve score history', {
        error,
        correlationId,
        conversationId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'SCORE_RETRIEVAL_ERROR',
          message: 'Failed to retrieve SMART score history'
        }
      });
    }
  }
);

/**
 * Submit feedback for neural training
 */
router.post(
  '/feedback',
  authenticateJWT,
  validateRequest(FeedbackSchema),
  performanceMonitor('neural-chat-feedback'),
  async (req: Request, res: Response) => {
    const { conversationId, sessionId, feedback } = req.body;
    const correlationId = req.correlationId!;

    try {
      logger.info('Processing neural feedback', {
        correlationId,
        conversationId,
        sessionId,
        feedback
      });

      // Store feedback in memory
      await memoryManager.store(
        `feedback/${conversationId}/${Date.now()}`,
        {
          ...feedback,
          timestamp: new Date().toISOString(),
          conversationId,
          sessionId
        },
        {
          tags: ['feedback', conversationId, feedback.success ? 'positive' : 'negative'],
          importance: feedback.rating ? feedback.rating / 5 : 0.5
        }
      );

      // Train neural patterns based on feedback
      await neuralChat.trainNeuralPatterns(sessionId, feedback);

      res.json({
        success: true,
        data: {
          message: 'Feedback processed and neural patterns updated',
          trainingInitiated: true
        }
      });

    } catch (error) {
      logger.error('Failed to process feedback', {
        error,
        correlationId,
        conversationId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'FEEDBACK_ERROR',
          message: 'Failed to process feedback'
        }
      });
    }
  }
);

/**
 * Get neural coordination status
 */
router.get(
  '/status/:sessionId',
  authenticateJWT,
  performanceMonitor('neural-chat-status'),
  async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const correlationId = req.correlationId!;

    try {
      logger.info('Retrieving neural status', {
        correlationId,
        sessionId
      });

      const status = await neuralChat.getNeuralStatus(sessionId);

      // Get memory statistics
      const memoryStats = await memoryManager.retrieve({
        pattern: `chat/${sessionId}/*`,
        limit: 1000
      });

      res.json({
        success: true,
        data: {
          sessionId,
          neuralStatus: status,
          memoryStats: {
            entriesCount: memoryStats.length,
            totalSize: JSON.stringify(memoryStats).length,
            oldestEntry: memoryStats[0]?.metadata.timestamp,
            newestEntry: memoryStats[memoryStats.length - 1]?.metadata.timestamp
          }
        }
      });

    } catch (error) {
      logger.error('Failed to retrieve neural status', {
        error,
        correlationId,
        sessionId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'STATUS_ERROR',
          message: 'Failed to retrieve neural coordination status'
        }
      });
    }
  }
);

/**
 * Create memory snapshot
 */
router.post(
  '/snapshot',
  authenticateJWT,
  performanceMonitor('neural-chat-snapshot'),
  async (req: Request, res: Response) => {
    const { snapshotId } = req.body;
    const correlationId = req.correlationId!;

    try {
      logger.info('Creating memory snapshot', {
        correlationId,
        snapshotId
      });

      const id = await memoryManager.createSnapshot(snapshotId);

      res.json({
        success: true,
        data: {
          snapshotId: id,
          message: 'Memory snapshot created successfully'
        }
      });

    } catch (error) {
      logger.error('Failed to create snapshot', {
        error,
        correlationId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'SNAPSHOT_ERROR',
          message: 'Failed to create memory snapshot'
        }
      });
    }
  }
);

/**
 * Restore from snapshot
 */
router.post(
  '/snapshot/restore',
  authenticateJWT,
  performanceMonitor('neural-chat-restore'),
  async (req: Request, res: Response) => {
    const { snapshotId } = req.body;
    const correlationId = req.correlationId!;

    try {
      logger.info('Restoring from snapshot', {
        correlationId,
        snapshotId
      });

      await memoryManager.restoreSnapshot(snapshotId);

      res.json({
        success: true,
        data: {
          snapshotId,
          message: 'Memory restored from snapshot successfully'
        }
      });

    } catch (error) {
      logger.error('Failed to restore snapshot', {
        error,
        correlationId,
        snapshotId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'RESTORE_ERROR',
          message: 'Failed to restore from snapshot'
        }
      });
    }
  }
);

export default router;