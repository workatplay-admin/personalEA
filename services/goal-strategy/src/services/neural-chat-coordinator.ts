/**
 * Neural Chat Coordinator
 * 
 * Integrates conversational AI with ruv-swarm neural networks for enhanced
 * LLM capabilities, persistent memory, and intelligent coordination.
 * 
 * Features:
 * - Neural network integration for cognitive processing
 * - Persistent memory using DAA capabilities
 * - SMART score tracking with phase transitions
 * - Multi-agent coordination for complex conversations
 */

import { OpenAI } from 'openai';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createContextLogger } from '@/utils/logger';
import { env } from '@/config/environment';
import { MemoryPersistenceManager } from './memory-persistence-manager';
import { SmartScoreTracker } from './smart-score-tracker';
import { ConversationalStateManager } from './conversational-state-manager';

const execAsync = promisify(exec);

export interface NeuralChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    cognitivePattern?: string;
    smartScores?: Record<string, number>;
    memoryKeys?: string[];
    agentId?: string;
  };
}

export interface NeuralChatOptions {
  correlationId: string;
  userId: string;
  sessionId: string;
  conversationId: string;
  enableNeuralProcessing?: boolean;
  enableMemoryPersistence?: boolean;
  cognitivePattern?: 'convergent' | 'divergent' | 'lateral' | 'systems' | 'critical' | 'adaptive';
  apiKey?: string;
}

export interface NeuralChatResponse {
  message: NeuralChatMessage;
  smartScores: Record<string, number>;
  phaseTransition?: {
    from: string;
    to: string;
    reason: string;
  };
  neuralMetrics?: {
    processingTime: number;
    tokensUsed: number;
    memoryAccessed: number;
    patternsApplied: string[];
  };
}

export class NeuralChatCoordinator {
  private openai: OpenAI | null = null;
  private memoryManager: MemoryPersistenceManager;
  private scoreTracker: SmartScoreTracker;
  private stateManager: ConversationalStateManager;
  private logger;
  
  constructor() {
    this.memoryManager = new MemoryPersistenceManager();
    this.scoreTracker = new SmartScoreTracker();
    this.stateManager = new ConversationalStateManager(env.OPENAI_API_KEY || '');
    this.logger = createContextLogger('neural-chat-coordinator');
  }

  /**
   * Initialize neural coordination hooks
   */
  private async initializeNeuralHooks(sessionId: string): Promise<void> {
    try {
      const { stdout } = await execAsync(
        `npx ruv-swarm hook pre-task --description "Neural chat session ${sessionId}" --auto-spawn-agents false`
      );
      this.logger.info('Neural hooks initialized', { sessionId, response: stdout });
    } catch (error) {
      this.logger.warn('Failed to initialize neural hooks', { error });
    }
  }

  /**
   * Store conversation in neural memory
   */
  private async storeNeuralMemory(
    sessionId: string,
    message: NeuralChatMessage,
    response: NeuralChatMessage
  ): Promise<void> {
    try {
      const memoryKey = `chat/${sessionId}/${Date.now()}`;
      await this.memoryManager.store(memoryKey, {
        message,
        response,
        timestamp: new Date().toISOString(),
        smartScores: response.metadata?.smartScores,
        cognitivePattern: response.metadata?.cognitivePattern
      });

      // Notify neural network of memory storage
      await execAsync(
        `npx ruv-swarm hook post-edit --file "memory/${memoryKey}" --memory-key "${memoryKey}"`
      );
    } catch (error) {
      this.logger.error('Failed to store neural memory', { error });
    }
  }

  /**
   * Apply cognitive patterns to enhance LLM responses
   */
  private async applyCognitivePattern(
    pattern: string,
    context: string
  ): Promise<string> {
    const patternPrompts = {
      convergent: "Focus on finding the single best solution. Be decisive and conclusive.",
      divergent: "Explore multiple possibilities and creative alternatives. Think broadly.",
      lateral: "Look for unconventional connections and indirect approaches. Be innovative.",
      systems: "Consider the whole system and interconnections. Think holistically.",
      critical: "Analyze assumptions and evaluate evidence carefully. Be rigorous.",
      adaptive: "Adjust your approach based on the context. Be flexible and responsive."
    };

    return `${patternPrompts[pattern] || patternPrompts.adaptive}\n\nContext: ${context}`;
  }

  /**
   * Process a chat message with neural enhancement
   */
  async processMessage(
    message: NeuralChatMessage,
    options: NeuralChatOptions
  ): Promise<NeuralChatResponse> {
    const startTime = Date.now();
    const { correlationId, sessionId, conversationId, cognitivePattern = 'adaptive' } = options;
    
    this.logger.info('Processing neural chat message', {
      correlationId,
      sessionId,
      conversationId,
      cognitivePattern
    });

    // Initialize OpenAI client
    if (!this.openai) {
      const apiKey = options.apiKey || env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not provided');
      }
      this.openai = new OpenAI({ apiKey });
    }

    // Initialize neural hooks for this session
    await this.initializeNeuralHooks(sessionId);

    // Load conversation history from memory
    const history = await this.memoryManager.retrieve(`chat/${sessionId}/*`);
    const conversationHistory = history.map(item => item.value as NeuralChatMessage);

    // Get current conversation state (mock for now)
    const currentState = {
      conversationId,
      context: 'General conversation',
      currentPhase: 'initial',
      smartScores: {}
    };
    
    // Apply cognitive pattern to the system prompt
    const enhancedSystemPrompt = await this.applyCognitivePattern(
      cognitivePattern,
      currentState?.context || 'General conversation'
    );

    // Build messages for OpenAI
    const messages = [
      {
        role: 'system' as const,
        content: enhancedSystemPrompt
      },
      ...conversationHistory.slice(-10), // Last 10 messages for context
      message
    ];

    try {
      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages,
        temperature: cognitivePattern === 'convergent' ? 0.3 : 0.7,
        max_tokens: 2000,
        presence_penalty: cognitivePattern === 'divergent' ? 0.5 : 0,
        frequency_penalty: cognitivePattern === 'lateral' ? 0.3 : 0
      });

      const responseContent = completion.choices[0].message.content || '';
      const tokensUsed = completion.usage?.total_tokens || 0;

      // Extract and update SMART scores
      const smartScores = await this.scoreTracker.extractScores(responseContent, currentState);
      const scoreUpdate = await this.scoreTracker.updateScores(
        conversationId,
        smartScores
      );

      // Create response message
      const responseMessage: NeuralChatMessage = {
        role: 'assistant',
        content: responseContent,
        metadata: {
          cognitivePattern,
          smartScores,
          memoryKeys: [`chat/${sessionId}/${Date.now()}`]
        }
      };

      // Store in neural memory
      await this.storeNeuralMemory(sessionId, message, responseMessage);

      // Update conversation state (store in memory)
      await this.memoryManager.store(
        `state/${conversationId}`,
        {
          lastMessage: responseMessage,
          smartScores,
          currentPhase: scoreUpdate.newPhase || currentState?.currentPhase
        }
      );

      // Track neural processing metrics
      const processingTime = Date.now() - startTime;
      await execAsync(
        `npx ruv-swarm hook notification --message "Neural chat processed in ${processingTime}ms with ${tokensUsed} tokens" --telemetry true`
      );

      return {
        message: responseMessage,
        smartScores,
        phaseTransition: scoreUpdate.phaseTransition,
        neuralMetrics: {
          processingTime,
          tokensUsed,
          memoryAccessed: history.length,
          patternsApplied: [cognitivePattern]
        }
      };

    } catch (error) {
      this.logger.error('Neural chat processing failed', {
        error,
        correlationId,
        sessionId
      });
      
      // Fallback response with error handling
      const fallbackMessage: NeuralChatMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an issue processing your request. Please try again.',
        metadata: {
          cognitivePattern: 'adaptive',
          smartScores: {}
        }
      };

      return {
        message: fallbackMessage,
        smartScores: {},
        neuralMetrics: {
          processingTime: Date.now() - startTime,
          tokensUsed: 0,
          memoryAccessed: history.length,
          patternsApplied: []
        }
      };
    }
  }

  /**
   * Stream chat responses with neural enhancement
   */
  async *streamMessage(
    message: NeuralChatMessage,
    options: NeuralChatOptions
  ): AsyncGenerator<string, void, unknown> {
    const { correlationId, sessionId, cognitivePattern = 'adaptive' } = options;
    
    this.logger.info('Streaming neural chat message', {
      correlationId,
      sessionId,
      cognitivePattern
    });

    // Initialize OpenAI client
    if (!this.openai) {
      const apiKey = options.apiKey || env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not provided');
      }
      this.openai = new OpenAI({ apiKey });
    }

    // Load conversation history
    const history = await this.memoryManager.retrieve(`chat/${sessionId}/*`);
    const conversationHistory = history.map(item => item.value as NeuralChatMessage);

    // Apply cognitive pattern
    const enhancedSystemPrompt = await this.applyCognitivePattern(
      cognitivePattern,
      'Streaming conversation'
    );

    const messages = [
      {
        role: 'system' as const,
        content: enhancedSystemPrompt
      },
      ...conversationHistory.slice(-10),
      message
    ];

    try {
      const stream = await this.openai.chat.completions.create({
        model: env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          yield content;
        }
      }

      // Store the complete response in memory
      const responseMessage: NeuralChatMessage = {
        role: 'assistant',
        content: fullResponse,
        metadata: {
          cognitivePattern,
          memoryKeys: [`chat/${sessionId}/${Date.now()}`]
        }
      };
      
      await this.storeNeuralMemory(sessionId, message, responseMessage);

    } catch (error) {
      this.logger.error('Neural chat streaming failed', { error });
      yield 'I apologize, but I encountered an issue while streaming the response.';
    }
  }

  /**
   * Get neural coordination status
   */
  async getNeuralStatus(sessionId: string): Promise<any> {
    try {
      const { stdout } = await execAsync('npx ruv-swarm mcp call neural_status');
      return JSON.parse(stdout);
    } catch (error) {
      this.logger.error('Failed to get neural status', { error });
      return null;
    }
  }

  /**
   * Train neural patterns based on conversation success
   */
  async trainNeuralPatterns(
    sessionId: string,
    feedback: { success: boolean; rating?: number }
  ): Promise<void> {
    try {
      const iterations = feedback.success ? 5 : 2;
      await execAsync(
        `npx ruv-swarm mcp call neural_train --iterations ${iterations}`
      );
      
      this.logger.info('Neural patterns trained', {
        sessionId,
        feedback,
        iterations
      });
    } catch (error) {
      this.logger.error('Failed to train neural patterns', { error });
    }
  }
}

export default NeuralChatCoordinator;