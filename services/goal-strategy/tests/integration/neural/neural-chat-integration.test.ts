/**
 * Neural Chat Integration Tests
 * 
 * Comprehensive tests for neural chat functionality with ruv-swarm integration
 */

import request from 'supertest';
import app from '@/index';
import { NeuralChatCoordinator } from '@/services/neural-chat-coordinator';
import { MemoryPersistenceManager } from '@/services/memory-persistence-manager';
import { SmartScoreTracker } from '@/services/smart-score-tracker';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Neural Chat Integration', () => {
  let authToken: string;
  let userId: string;
  let conversationId: string;
  let sessionId: string;
  
  beforeAll(async () => {
    // Setup test environment
    conversationId = `test-conv-${Date.now()}`;
    sessionId = `test-session-${Date.now()}`;
    
    // Initialize ruv-swarm for testing
    try {
      await execAsync('npx ruv-swarm swarm init --topology mesh --maxAgents 3');
    } catch (error) {
      console.warn('Failed to initialize swarm for testing:', error);
    }
    
    // Create test user and get auth token
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'neural-test@example.com',
        password: 'testpassword123',
        name: 'Neural Test User'
      });
    
    userId = userResponse.body.data.user.id;
    authToken = userResponse.body.data.token;
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await execAsync('npx ruv-swarm swarm cleanup');
    } catch (error) {
      console.warn('Failed to cleanup swarm:', error);
    }
  });

  describe('Neural Chat Message Processing', () => {
    it('should process a simple message with neural enhancement', async () => {
      const response = await request(app)
        .post('/api/v1/neural-chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-OpenAI-API-Key', process.env.OPENAI_API_KEY || 'test-key')
        .send({
          conversationId,
          sessionId,
          message: {
            role: 'user',
            content: 'Help me create a goal to learn Python programming'
          },
          options: {
            cognitivePattern: 'adaptive',
            enableNeuralProcessing: true,
            enableMemoryPersistence: true
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBeDefined();
      expect(response.body.data.message.content).toBeDefined();
      expect(response.body.data.smartScores).toBeDefined();
      expect(response.body.data.metrics).toBeDefined();
    });

    it('should apply different cognitive patterns', async () => {
      const patterns = ['convergent', 'divergent', 'lateral', 'systems', 'critical'];
      
      for (const pattern of patterns) {
        const response = await request(app)
          .post('/api/v1/neural-chat/message')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-OpenAI-API-Key', process.env.OPENAI_API_KEY || 'test-key')
          .send({
            conversationId: `${conversationId}-${pattern}`,
            sessionId: `${sessionId}-${pattern}`,
            message: {
              role: 'user',
              content: 'How can I improve my productivity?'
            },
            options: {
              cognitivePattern: pattern
            }
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.message.metadata.cognitivePattern).toBe(pattern);
      }
    });

    it('should track SMART scores and detect improvements', async () => {
      // First message with vague goal
      const firstResponse = await request(app)
        .post('/api/v1/neural-chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-OpenAI-API-Key', process.env.OPENAI_API_KEY || 'test-key')
        .send({
          conversationId,
          sessionId,
          message: {
            role: 'user',
            content: 'I want to get better at programming'
          }
        });

      expect(firstResponse.body.data.smartScores).toBeDefined();
      const firstScores = firstResponse.body.data.smartScores;

      // Second message with more specific goal
      const secondResponse = await request(app)
        .post('/api/v1/neural-chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-OpenAI-API-Key', process.env.OPENAI_API_KEY || 'test-key')
        .send({
          conversationId,
          sessionId,
          message: {
            role: 'user',
            content: 'I want to learn Python specifically for data science projects, completing 3 online courses within 6 months'
          }
        });

      expect(secondResponse.body.data.smartScores).toBeDefined();
      const secondScores = secondResponse.body.data.smartScores;

      // Scores should improve
      expect(secondScores.specific).toBeGreaterThan(firstScores.specific);
      expect(secondScores.timeBound).toBeGreaterThan(firstScores.timeBound);
    });

    it('should handle phase transitions when scores reach thresholds', async () => {
      // Create a high-quality SMART goal
      const response = await request(app)
        .post('/api/v1/neural-chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-OpenAI-API-Key', process.env.OPENAI_API_KEY || 'test-key')
        .send({
          conversationId,
          sessionId,
          message: {
            role: 'user',
            content: 'I want to learn Python by completing 5 specific data science projects, tracking my progress with weekly assessments, within 4 months to advance my career in machine learning'
          }
        });

      expect(response.body.data.smartScores.overall).toBeGreaterThan(0.7);
      
      if (response.body.data.phaseTransition) {
        expect(response.body.data.phaseTransition.from).toBeDefined();
        expect(response.body.data.phaseTransition.to).toBeDefined();
        expect(response.body.data.phaseTransition.reason).toBeDefined();
      }
    });
  });

  describe('Memory Persistence', () => {
    it('should store and retrieve conversation history', async () => {
      // Send a message
      await request(app)
        .post('/api/v1/neural-chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-OpenAI-API-Key', process.env.OPENAI_API_KEY || 'test-key')
        .send({
          conversationId,
          sessionId,
          message: {
            role: 'user',
            content: 'This is a test message for memory persistence'
          }
        });

      // Retrieve history
      const historyResponse = await request(app)
        .get(`/api/v1/neural-chat/history/${conversationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.success).toBe(true);
      expect(historyResponse.body.data.history).toBeDefined();
      expect(historyResponse.body.data.history.length).toBeGreaterThan(0);
    });

    it('should retrieve SMART score history', async () => {
      const scoresResponse = await request(app)
        .get(`/api/v1/neural-chat/scores/${conversationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(scoresResponse.status).toBe(200);
      expect(scoresResponse.body.success).toBe(true);
      expect(scoresResponse.body.data.currentScores).toBeDefined();
      expect(scoresResponse.body.data.currentPhase).toBeDefined();
      expect(scoresResponse.body.data.history).toBeDefined();
    });

    it('should create and restore memory snapshots', async () => {
      const snapshotId = `test-snapshot-${Date.now()}`;
      
      // Create snapshot
      const snapshotResponse = await request(app)
        .post('/api/v1/neural-chat/snapshot')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ snapshotId });

      expect(snapshotResponse.status).toBe(200);
      expect(snapshotResponse.body.success).toBe(true);
      expect(snapshotResponse.body.data.snapshotId).toBe(snapshotId);

      // Restore snapshot
      const restoreResponse = await request(app)
        .post('/api/v1/neural-chat/snapshot/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ snapshotId });

      expect(restoreResponse.status).toBe(200);
      expect(restoreResponse.body.success).toBe(true);
    });
  });

  describe('Streaming Responses', () => {
    it('should stream neural chat responses', async () => {
      const response = await request(app)
        .post('/api/v1/neural-chat/stream')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-OpenAI-API-Key', process.env.OPENAI_API_KEY || 'test-key')
        .send({
          conversationId,
          sessionId,
          message: {
            role: 'user',
            content: 'Tell me about goal setting strategies'
          },
          streamOptions: {
            chunkSize: 50,
            includeMetrics: true
          }
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
    });
  });

  describe('Feedback and Training', () => {
    it('should accept feedback and initiate neural training', async () => {
      const feedbackResponse = await request(app)
        .post('/api/v1/neural-chat/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          conversationId,
          sessionId,
          feedback: {
            success: true,
            rating: 5,
            comments: 'Excellent response quality',
            improvements: ['More specific examples']
          }
        });

      expect(feedbackResponse.status).toBe(200);
      expect(feedbackResponse.body.success).toBe(true);
      expect(feedbackResponse.body.data.trainingInitiated).toBe(true);
    });

    it('should provide neural status information', async () => {
      const statusResponse = await request(app)
        .get(`/api/v1/neural-chat/status/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data.sessionId).toBe(sessionId);
      expect(statusResponse.body.data.memoryStats).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing API key gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/neural-chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          conversationId,
          sessionId,
          message: {
            role: 'user',
            content: 'Test message'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_API_KEY');
    });

    it('should handle invalid conversation ID', async () => {
      const response = await request(app)
        .get('/api/v1/neural-chat/history/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.history).toHaveLength(0);
    });

    it('should validate request schemas', async () => {
      const response = await request(app)
        .post('/api/v1/neural-chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-OpenAI-API-Key', process.env.OPENAI_API_KEY || 'test-key')
        .send({
          // Missing required fields
          message: {
            role: 'user'
            // Missing content
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Performance and Coordination', () => {
    it('should complete processing within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/v1/neural-chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-OpenAI-API-Key', process.env.OPENAI_API_KEY || 'test-key')
        .send({
          conversationId,
          sessionId,
          message: {
            role: 'user',
            content: 'Quick test message'
          }
        });

      const processingTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(processingTime).toBeLessThan(30000); // 30 seconds max
      expect(response.body.data.metrics.processingTime).toBeDefined();
    });

    it('should demonstrate neural coordination features', async () => {
      // Test with multiple agents
      const responses = await Promise.all([
        request(app)
          .post('/api/v1/neural-chat/message')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-OpenAI-API-Key', process.env.OPENAI_API_KEY || 'test-key')
          .send({
            conversationId: `${conversationId}-parallel-1`,
            sessionId: `${sessionId}-parallel-1`,
            message: {
              role: 'user',
              content: 'Analyze goal from systems thinking perspective'
            },
            options: { cognitivePattern: 'systems' }
          }),
        request(app)
          .post('/api/v1/neural-chat/message')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-OpenAI-API-Key', process.env.OPENAI_API_KEY || 'test-key')
          .send({
            conversationId: `${conversationId}-parallel-2`,
            sessionId: `${sessionId}-parallel-2`,
            message: {
              role: 'user',
              content: 'Analyze goal from critical thinking perspective'
            },
            options: { cognitivePattern: 'critical' }
          })
      ]);

      expect(responses[0].status).toBe(200);
      expect(responses[1].status).toBe(200);
      expect(responses[0].body.data.message.metadata.cognitivePattern).toBe('systems');
      expect(responses[1].body.data.message.metadata.cognitivePattern).toBe('critical');
    });
  });
});

// Unit tests for individual components
describe('Neural Chat Components', () => {
  let neuralChat: NeuralChatCoordinator;
  let memoryManager: MemoryPersistenceManager;
  let scoreTracker: SmartScoreTracker;

  beforeEach(() => {
    neuralChat = new NeuralChatCoordinator();
    memoryManager = new MemoryPersistenceManager();
    scoreTracker = new SmartScoreTracker();
  });

  describe('SmartScoreTracker', () => {
    it('should extract scores from content', async () => {
      const content = 'This is a specific goal that is measurable with clear metrics';
      const scores = await scoreTracker.extractScores(content);
      
      expect(scores.specific).toBeGreaterThan(0);
      expect(scores.measurable).toBeGreaterThan(0);
      expect(scores.overall).toBeDefined();
    });

    it('should validate phase transitions', async () => {
      const scores = {
        specific: 0.9,
        measurable: 0.8,
        achievable: 0.7,
        relevant: 0.8,
        timeBound: 0.6,
        overall: 0.76
      };

      const validation = await scoreTracker.validatePhaseTransition(
        'goal_refinement',
        'milestone_planning',
        scores
      );

      expect(validation.allowed).toBe(true);
    });

    it('should generate improvement suggestions', () => {
      const scores = {
        specific: 0.9,
        measurable: 0.4,
        achievable: 0.8,
        relevant: 0.7,
        timeBound: 0.3
      };

      const suggestions = scoreTracker.generateSuggestions(scores);
      
      expect(suggestions).toContain(
        expect.stringContaining('measurable')
      );
      expect(suggestions).toContain(
        expect.stringContaining('timeframe')
      );
    });
  });

  describe('MemoryPersistenceManager', () => {
    it('should store and retrieve memories', async () => {
      await memoryManager.initialize();
      
      const testData = { message: 'Test memory', timestamp: Date.now() };
      await memoryManager.store('test/memory/1', testData);
      
      const retrieved = await memoryManager.retrieve('test/memory/1');
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].value).toEqual(testData);
    });

    it('should create knowledge graph connections', async () => {
      await memoryManager.initialize();
      
      await memoryManager.store('test/goal/1', { type: 'goal', category: 'learning' });
      await memoryManager.store('test/milestone/1', { type: 'milestone', category: 'learning' });
      
      const related = await memoryManager.getRelatedMemories('test/goal/1');
      expect(related).toHaveLength(1);
      expect(related[0].key).toBe('test/milestone/1');
    });
  });
});

export {};