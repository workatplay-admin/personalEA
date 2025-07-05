/**
 * Neural Chat Coordinator Unit Tests
 * 
 * Unit tests for the NeuralChatCoordinator class
 */

import { NeuralChatCoordinator } from '@/services/neural-chat-coordinator';
import { MemoryPersistenceManager } from '@/services/memory-persistence-manager';
import { SmartScoreTracker } from '@/services/smart-score-tracker';
import { ConversationalStateManager } from '@/services/conversational-state-manager';

// Mock dependencies
jest.mock('@/services/memory-persistence-manager');
jest.mock('@/services/smart-score-tracker');
jest.mock('@/services/conversational-state-manager');
jest.mock('child_process');

describe('NeuralChatCoordinator', () => {
  let coordinator: NeuralChatCoordinator;
  let mockMemoryManager: jest.Mocked<MemoryPersistenceManager>;
  let mockScoreTracker: jest.Mocked<SmartScoreTracker>;
  let mockStateManager: jest.Mocked<ConversationalStateManager>;

  beforeEach(() => {
    coordinator = new NeuralChatCoordinator();
    mockMemoryManager = new MemoryPersistenceManager() as jest.Mocked<MemoryPersistenceManager>;
    mockScoreTracker = new SmartScoreTracker() as jest.Mocked<SmartScoreTracker>;
    mockStateManager = new ConversationalStateManager() as jest.Mocked<ConversationalStateManager>;
  });

  describe('processMessage', () => {
    it('should process a message with neural enhancement', async () => {
      const message = {
        role: 'user' as const,
        content: 'Help me create a learning goal'
      };

      const options = {
        correlationId: 'test-correlation',
        userId: 'test-user',
        sessionId: 'test-session',
        conversationId: 'test-conversation',
        apiKey: 'test-api-key'
      };

      // Mock dependencies
      mockMemoryManager.retrieve.mockResolvedValue([]);
      mockStateManager.getCurrentState.mockResolvedValue({
        conversationId: 'test-conversation',
        context: 'General conversation',
        currentPhase: 'initial',
        smartScores: {}
      });
      mockScoreTracker.extractScores.mockResolvedValue({
        specific: 0.7,
        measurable: 0.6,
        achievable: 0.8,
        relevant: 0.7,
        timeBound: 0.5,
        overall: 0.66
      });
      mockScoreTracker.updateScores.mockResolvedValue({
        previousScores: { specific: 0.5, measurable: 0.4, achievable: 0.6, relevant: 0.5, timeBound: 0.3 },
        newScores: { specific: 0.7, measurable: 0.6, achievable: 0.8, relevant: 0.7, timeBound: 0.5 },
        improvements: ['specific: +20%', 'measurable: +20%'],
        suggestions: ['Add specific metrics']
      });

      // Mock OpenAI response
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: 'I can help you create a SMART learning goal. What specific subject would you like to learn?'
                }
              }],
              usage: {
                total_tokens: 150
              }
            })
          }
        }
      };

      // @ts-ignore
      coordinator.openai = mockOpenAI;

      const result = await coordinator.processMessage(message, options);

      expect(result).toHaveProperty('message');
      expect(result.message.content).toBeDefined();
      expect(result.message.role).toBe('assistant');
      expect(result.smartScores).toBeDefined();
      expect(result.neuralMetrics).toBeDefined();
      expect(result.neuralMetrics.tokensUsed).toBe(150);
    });

    it('should handle different cognitive patterns', async () => {
      const patterns = ['convergent', 'divergent', 'lateral', 'systems', 'critical', 'adaptive'];
      
      for (const pattern of patterns) {
        const message = {
          role: 'user' as const,
          content: 'Test message'
        };

        const options = {
          correlationId: 'test-correlation',
          userId: 'test-user',
          sessionId: 'test-session',
          conversationId: 'test-conversation',
          cognitivePattern: pattern as any,
          apiKey: 'test-api-key'
        };

        // Mock dependencies
        mockMemoryManager.retrieve.mockResolvedValue([]);
        mockStateManager.getCurrentState.mockResolvedValue({
          conversationId: 'test-conversation',
          context: 'General conversation',
          currentPhase: 'initial',
          smartScores: {}
        });

        // Test that the pattern is applied
        const result = await coordinator.processMessage(message, options);
        expect(result.message.metadata?.cognitivePattern).toBe(pattern);
      }
    });

    it('should handle API errors gracefully', async () => {
      const message = {
        role: 'user' as const,
        content: 'Test message'
      };

      const options = {
        correlationId: 'test-correlation',
        userId: 'test-user',
        sessionId: 'test-session',
        conversationId: 'test-conversation',
        apiKey: 'invalid-key'
      };

      // Mock dependencies
      mockMemoryManager.retrieve.mockResolvedValue([]);
      mockStateManager.getCurrentState.mockResolvedValue({
        conversationId: 'test-conversation',
        context: 'General conversation',
        currentPhase: 'initial',
        smartScores: {}
      });

      // Mock OpenAI error
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API Error'))
          }
        }
      };

      // @ts-ignore
      coordinator.openai = mockOpenAI;

      const result = await coordinator.processMessage(message, options);

      expect(result.message.content).toContain('apologize');
      expect(result.neuralMetrics?.tokensUsed).toBe(0);
    });
  });

  describe('streamMessage', () => {
    it('should stream message responses', async () => {
      const message = {
        role: 'user' as const,
        content: 'Tell me about goal setting'
      };

      const options = {
        correlationId: 'test-correlation',
        userId: 'test-user',
        sessionId: 'test-session',
        conversationId: 'test-conversation',
        apiKey: 'test-api-key'
      };

      // Mock dependencies
      mockMemoryManager.retrieve.mockResolvedValue([]);

      // Mock OpenAI streaming response
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: 'Goal ' } }] };
          yield { choices: [{ delta: { content: 'setting ' } }] };
          yield { choices: [{ delta: { content: 'is important.' } }] };
        }
      };

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockStream)
          }
        }
      };

      // @ts-ignore
      coordinator.openai = mockOpenAI;

      const chunks: string[] = [];
      for await (const chunk of coordinator.streamMessage(message, options)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Goal ', 'setting ', 'is important.']);
    });
  });

  describe('getNeuralStatus', () => {
    it('should return neural status', async () => {
      const mockExec = require('child_process').exec as jest.Mock;
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        callback(null, { stdout: '{"status": "active", "agents": 3}' });
      });

      const status = await coordinator.getNeuralStatus('test-session');
      expect(status).toEqual({ status: 'active', agents: 3 });
    });

    it('should handle neural status errors', async () => {
      const mockExec = require('child_process').exec as jest.Mock;
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        callback(new Error('Command failed'), null);
      });

      const status = await coordinator.getNeuralStatus('test-session');
      expect(status).toBeNull();
    });
  });

  describe('trainNeuralPatterns', () => {
    it('should train neural patterns based on positive feedback', async () => {
      const mockExec = require('child_process').exec as jest.Mock;
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        callback(null, { stdout: 'Training complete' });
      });

      await coordinator.trainNeuralPatterns('test-session', {
        success: true,
        rating: 5
      });

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('neural_train --iterations 5'),
        expect.any(Function)
      );
    });

    it('should train neural patterns based on negative feedback', async () => {
      const mockExec = require('child_process').exec as jest.Mock;
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        callback(null, { stdout: 'Training complete' });
      });

      await coordinator.trainNeuralPatterns('test-session', {
        success: false
      });

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('neural_train --iterations 2'),
        expect.any(Function)
      );
    });
  });
});

export {};