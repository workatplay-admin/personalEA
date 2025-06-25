import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import goalsRouter from '../../../src/routes/goals';
import { createMockPrismaClient, mockGoal, mockGoalMetric } from '../../mocks/prisma.mock';
import { mockGoalTranslationResult, createMockOpenAIFetch } from '../../mocks/openai.mock';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../../src/services/smart-goal-processor');

describe('Goals Routes', () => {
  let app: Express;
  let mockPrisma: any;
  const validApiKey = 'sk-test-1234567890abcdef';
  const invalidApiKey = 'invalid-key';
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req: any, res, next) => {
      req.user = mockUser;
      req.correlationId = 'test-correlation-123';
      next();
    });
    
    app.use('/api/v1/goals', goalsRouter);
    
    mockPrisma = createMockPrismaClient();
    global.fetch = createMockOpenAIFetch();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/goals/translate', () => {
    const validTranslateRequest = {
      raw_goal: "I want to increase website traffic",
      context: {
        timeframe: "6 months",
        resources: ["SEO tools", "Content team"],
        constraints: ["Limited budget"],
        priority: "HIGH"
      }
    };

    it('should translate a raw goal successfully', async () => {
      const response = await request(app)
        .post('/api/v1/goals/translate')
        .send(validTranslateRequest)
        .expect(200);

      expect(response.body).toHaveProperty('smart_goal');
      expect(response.body).toHaveProperty('smart_criteria');
      expect(response.body).toHaveProperty('confidence');
      expect(response.body).toHaveProperty('clarification_questions');
      expect(response.body).toHaveProperty('correlation_id');
      expect(response.body.confidence).toBeGreaterThan(0);
      expect(response.body.confidence).toBeLessThanOrEqual(1);
    });

    it('should accept user-provided OpenAI API key', async () => {
      const response = await request(app)
        .post('/api/v1/goals/translate')
        .set('x-openai-api-key', validApiKey)
        .send(validTranslateRequest)
        .expect(200);

      expect(response.body).toHaveProperty('smart_goal');
    });

    it('should reject invalid OpenAI API key format', async () => {
      const response = await request(app)
        .post('/api/v1/goals/translate')
        .set('x-openai-api-key', invalidApiKey)
        .send(validTranslateRequest)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_API_KEY');
    });

    it('should handle minimal goal input', async () => {
      const minimalRequest = {
        raw_goal: "Learn Python"
      };

      const response = await request(app)
        .post('/api/v1/goals/translate')
        .send(minimalRequest)
        .expect(200);

      expect(response.body).toHaveProperty('smart_goal');
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        context: { timeframe: "6 months" }
        // Missing raw_goal
      };

      await request(app)
        .post('/api/v1/goals/translate')
        .send(invalidRequest)
        .expect(400);
    });

    it('should handle empty goal string', async () => {
      const emptyGoalRequest = { raw_goal: "" };

      await request(app)
        .post('/api/v1/goals/translate')
        .send(emptyGoalRequest)
        .expect(400);
    });

    it('should validate priority enum values', async () => {
      const invalidPriorityRequest = {
        raw_goal: "Test goal",
        context: { priority: "INVALID_PRIORITY" }
      };

      await request(app)
        .post('/api/v1/goals/translate')
        .send(invalidPriorityRequest)
        .expect(400);
    });

    it('should handle OpenAI service errors gracefully', async () => {
      // Mock fetch to return error
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ error: { message: "Rate limit exceeded" } })
      });

      await request(app)
        .post('/api/v1/goals/translate')
        .send(validTranslateRequest)
        .expect(500);
    });
  });

  describe('POST /api/v1/goals/clarify', () => {
    const validClarifyRequest = {
      goal_id: 'goal-123',
      answers: [
        {
          question: "What is your current monthly website traffic baseline?",
          answer: "About 5,000 unique visitors per month",
          smartCriterion: "measurable"
        }
      ]
    };

    beforeEach(() => {
      mockPrisma.goal.findFirst.mockResolvedValue(mockGoal);
      mockPrisma.goal.update.mockResolvedValue({
        ...mockGoal,
        title: mockGoalTranslationResult.smartGoal
      });
      mockPrisma.goalClarification.create.mockResolvedValue({
        id: 'clarification-123',
        goalId: 'goal-123',
        question: validClarifyRequest.answers[0].question,
        answer: validClarifyRequest.answers[0].answer,
        smartCriterion: validClarifyRequest.answers[0].smartCriterion,
        status: 'ANSWERED'
      });
    });

    it('should process clarification answers successfully', async () => {
      const response = await request(app)
        .post('/api/v1/goals/clarify')
        .send(validClarifyRequest)
        .expect(200);

      expect(response.body).toHaveProperty('goal');
      expect(response.body).toHaveProperty('smart_criteria');
      expect(response.body).toHaveProperty('confidence');
      expect(response.body).toHaveProperty('correlation_id');
      expect(mockPrisma.goal.update).toHaveBeenCalled();
      expect(mockPrisma.goalClarification.create).toHaveBeenCalled();
    });

    it('should validate goal ownership', async () => {
      mockPrisma.goal.findFirst.mockResolvedValue(null);

      await request(app)
        .post('/api/v1/goals/clarify')
        .send(validClarifyRequest)
        .expect(404);
    });

    it('should validate CUID format for goal_id', async () => {
      const invalidRequest = {
        goal_id: 'invalid-id',
        answers: validClarifyRequest.answers
      };

      await request(app)
        .post('/api/v1/goals/clarify')
        .send(invalidRequest)
        .expect(400);
    });

    it('should validate smartCriterion enum values', async () => {
      const invalidRequest = {
        goal_id: 'goal-123',
        answers: [{
          question: "Test question",
          answer: "Test answer",
          smartCriterion: "invalid_criterion"
        }]
      };

      await request(app)
        .post('/api/v1/goals/clarify')
        .send(invalidRequest)
        .expect(400);
    });

    it('should handle empty answers array', async () => {
      const emptyAnswersRequest = {
        goal_id: 'goal-123',
        answers: []
      };

      const response = await request(app)
        .post('/api/v1/goals/clarify')
        .send(emptyAnswersRequest)
        .expect(200);

      expect(response.body).toHaveProperty('goal');
    });
  });

  describe('POST /api/v1/goals', () => {
    const validCreateRequest = {
      title: "Increase website traffic by 25%",
      description: "Improve SEO and content marketing",
      smart_criteria: mockGoalTranslationResult.smartCriteria,
      priority: "HIGH",
      category: "Marketing",
      tags: ["SEO", "Traffic"],
      target_date: "2024-12-31T23:59:59Z"
    };

    beforeEach(() => {
      mockPrisma.goal.create.mockResolvedValue({
        ...mockGoal,
        ...validCreateRequest,
        id: 'new-goal-123'
      });
    });

    it('should create a new goal successfully', async () => {
      const response = await request(app)
        .post('/api/v1/goals')
        .send(validCreateRequest)
        .expect(201);

      expect(response.body).toHaveProperty('goal');
      expect(response.body).toHaveProperty('correlation_id');
      expect(response.body.goal.title).toBe(validCreateRequest.title);
      expect(mockPrisma.goal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.id,
          title: validCreateRequest.title,
          description: validCreateRequest.description,
          smartCriteria: validCreateRequest.smart_criteria,
          priority: validCreateRequest.priority,
          status: 'DRAFT'
        }),
        include: { metrics: true, milestones: true }
      });
    });

    it('should create goal with minimal required data', async () => {
      const minimalRequest = {
        title: "Learn Python",
        smart_criteria: mockGoalTranslationResult.smartCriteria
      };

      const response = await request(app)
        .post('/api/v1/goals')
        .send(minimalRequest)
        .expect(201);

      expect(response.body.goal.title).toBe(minimalRequest.title);
      expect(response.body.goal.priority).toBe('MEDIUM'); // Default value
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        description: "Missing title and smart_criteria"
      };

      await request(app)
        .post('/api/v1/goals')
        .send(invalidRequest)
        .expect(400);
    });

    it('should validate smart_criteria structure', async () => {
      const invalidRequest = {
        title: "Test goal",
        smart_criteria: { invalid: "structure" }
      };

      await request(app)
        .post('/api/v1/goals')
        .send(invalidRequest)
        .expect(400);
    });

    it('should handle database errors', async () => {
      mockPrisma.goal.create.mockRejectedValue(new Error('Database error'));

      await request(app)
        .post('/api/v1/goals')
        .send(validCreateRequest)
        .expect(500);
    });
  });

  describe('GET /api/v1/goals', () => {
    beforeEach(() => {
      mockPrisma.goal.findMany.mockResolvedValue([mockGoal]);
      mockPrisma.goal.count.mockResolvedValue(1);
    });

    it('should list user goals with default pagination', async () => {
      const response = await request(app)
        .get('/api/v1/goals')
        .expect(200);

      expect(response.body).toHaveProperty('goals');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
      expect(Array.isArray(response.body.goals)).toBe(true);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/goals?page=2&limit=10')
        .expect(200);

      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
      expect(mockPrisma.goal.findMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 10, // (page - 1) * limit
        take: 10
      });
    });

    it('should filter by status', async () => {
      await request(app)
        .get('/api/v1/goals?status=ACTIVE')
        .expect(200);

      expect(mockPrisma.goal.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          status: 'ACTIVE'
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      });
    });

    it('should filter by category and priority', async () => {
      await request(app)
        .get('/api/v1/goals?category=Marketing&priority=HIGH')
        .expect(200);

      expect(mockPrisma.goal.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          category: 'Marketing',
          priority: 'HIGH'
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      });
    });

    it('should limit maximum page size', async () => {
      await request(app)
        .get('/api/v1/goals?limit=200')
        .expect(200);

      // Should be capped at 100
      expect(mockPrisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });
  });

  describe('GET /api/v1/goals/:id', () => {
    beforeEach(() => {
      mockPrisma.goal.findFirst.mockResolvedValue({
        ...mockGoal,
        milestones: [
          {
            id: 'milestone-1',
            status: 'COMPLETED',
            tasks: [
              { id: 'task-1', status: 'COMPLETED' },
              { id: 'task-2', status: 'IN_PROGRESS' }
            ]
          }
        ]
      });
    });

    it('should return goal with progress calculation', async () => {
      const response = await request(app)
        .get('/api/v1/goals/goal-123')
        .expect(200);

      expect(response.body).toHaveProperty('goal');
      expect(response.body).toHaveProperty('progress');
      expect(response.body.progress).toHaveProperty('percentage');
      expect(response.body.progress).toHaveProperty('completed_tasks');
      expect(response.body.progress).toHaveProperty('total_tasks');
      expect(response.body.progress.total_tasks).toBe(2);
      expect(response.body.progress.completed_tasks).toBe(1);
      expect(response.body.progress.percentage).toBe(50);
    });

    it('should validate goal ownership', async () => {
      mockPrisma.goal.findFirst.mockResolvedValue(null);

      await request(app)
        .get('/api/v1/goals/goal-123')
        .expect(404);
    });

    it('should handle goals without milestones', async () => {
      mockPrisma.goal.findFirst.mockResolvedValue({
        ...mockGoal,
        milestones: []
      });

      const response = await request(app)
        .get('/api/v1/goals/goal-123')
        .expect(200);

      expect(response.body.progress.percentage).toBe(0);
      expect(response.body.progress.total_tasks).toBe(0);
    });
  });

  describe('PUT /api/v1/goals/:id', () => {
    const updateRequest = {
      title: "Updated goal title",
      priority: "CRITICAL",
      status: "ACTIVE"
    };

    beforeEach(() => {
      mockPrisma.goal.findFirst.mockResolvedValue(mockGoal);
      mockPrisma.goal.update.mockResolvedValue({
        ...mockGoal,
        ...updateRequest
      });
    });

    it('should update goal successfully', async () => {
      const response = await request(app)
        .put('/api/v1/goals/goal-123')
        .send(updateRequest)
        .expect(200);

      expect(response.body).toHaveProperty('goal');
      expect(response.body.goal.title).toBe(updateRequest.title);
      expect(mockPrisma.goal.update).toHaveBeenCalledWith({
        where: { id: 'goal-123' },
        data: expect.objectContaining({
          title: updateRequest.title,
          priority: updateRequest.priority,
          status: updateRequest.status,
          updatedAt: expect.any(Date)
        }),
        include: { metrics: true, milestones: true }
      });
    });

    it('should set completedAt when status is COMPLETED', async () => {
      const completeRequest = { status: "COMPLETED" };

      await request(app)
        .put('/api/v1/goals/goal-123')
        .send(completeRequest)
        .expect(200);

      expect(mockPrisma.goal.update).toHaveBeenCalledWith({
        where: { id: 'goal-123' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          completedAt: expect.any(Date)
        }),
        include: { metrics: true, milestones: true }
      });
    });

    it('should validate goal ownership', async () => {
      mockPrisma.goal.findFirst.mockResolvedValue(null);

      await request(app)
        .put('/api/v1/goals/goal-123')
        .send(updateRequest)
        .expect(404);
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { priority: "LOW" };

      const response = await request(app)
        .put('/api/v1/goals/goal-123')
        .send(partialUpdate)
        .expect(200);

      expect(mockPrisma.goal.update).toHaveBeenCalledWith({
        where: { id: 'goal-123' },
        data: expect.objectContaining({
          priority: 'LOW',
          updatedAt: expect.any(Date)
        }),
        include: { metrics: true, milestones: true }
      });
    });
  });

  describe('DELETE /api/v1/goals/:id', () => {
    beforeEach(() => {
      mockPrisma.goal.findFirst.mockResolvedValue(mockGoal);
      mockPrisma.goal.delete.mockResolvedValue(mockGoal);
    });

    it('should delete goal successfully', async () => {
      const response = await request(app)
        .delete('/api/v1/goals/goal-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPrisma.goal.delete).toHaveBeenCalledWith({
        where: { id: 'goal-123' }
      });
    });

    it('should validate goal ownership', async () => {
      mockPrisma.goal.findFirst.mockResolvedValue(null);

      await request(app)
        .delete('/api/v1/goals/goal-123')
        .expect(404);
    });
  });

  describe('GET /api/v1/goals/:id/smart-analysis', () => {
    beforeEach(() => {
      mockPrisma.goal.findFirst.mockResolvedValue(mockGoal);
    });

    it('should return SMART analysis for goal', async () => {
      const response = await request(app)
        .get('/api/v1/goals/goal-123/smart-analysis')
        .expect(200);

      expect(response.body).toHaveProperty('goal_id');
      expect(response.body).toHaveProperty('smart_criteria');
      expect(response.body).toHaveProperty('analysis');
      expect(response.body.analysis).toHaveProperty('completenessScore');
      expect(response.body.analysis).toHaveProperty('strengths');
      expect(response.body.analysis).toHaveProperty('weaknesses');
      expect(response.body.analysis).toHaveProperty('recommendations');
    });

    it('should accept user-provided API key', async () => {
      await request(app)
        .get('/api/v1/goals/goal-123/smart-analysis')
        .set('x-openai-api-key', validApiKey)
        .expect(200);
    });

    it('should validate goal ownership', async () => {
      mockPrisma.goal.findFirst.mockResolvedValue(null);

      await request(app)
        .get('/api/v1/goals/goal-123/smart-analysis')
        .expect(404);
    });
  });

  describe('POST /api/v1/goals/:id/metrics', () => {
    const metricRequest = {
      name: "Monthly Unique Visitors",
      type: "NUMERIC",
      target_value: 10000,
      baseline_value: 7500,
      unit: "visitors",
      measurement_frequency: "monthly",
      is_primary: true
    };

    beforeEach(() => {
      mockPrisma.goal.findFirst.mockResolvedValue(mockGoal);
      mockPrisma.goalMetric.create.mockResolvedValue(mockGoalMetric);
      mockPrisma.goalMetric.updateMany.mockResolvedValue({ count: 1 });
    });

    it('should create goal metric successfully', async () => {
      const response = await request(app)
        .post('/api/v1/goals/goal-123/metrics')
        .send(metricRequest)
        .expect(201);

      expect(response.body).toHaveProperty('metric');
      expect(response.body.metric.name).toBe(metricRequest.name);
      expect(mockPrisma.goalMetric.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          goalId: 'goal-123',
          name: metricRequest.name,
          type: metricRequest.type,
          targetValue: metricRequest.target_value,
          isPrimary: metricRequest.is_primary
        })
      });
    });

    it('should unset other primary metrics when creating primary metric', async () => {
      await request(app)
        .post('/api/v1/goals/goal-123/metrics')
        .send(metricRequest)
        .expect(201);

      expect(mockPrisma.goalMetric.updateMany).toHaveBeenCalledWith({
        where: { goalId: 'goal-123' },
        data: { isPrimary: false }
      });
    });

    it('should validate goal ownership', async () => {
      mockPrisma.goal.findFirst.mockResolvedValue(null);

      await request(app)
        .post('/api/v1/goals/goal-123/metrics')
        .send(metricRequest)
        .expect(404);
    });

    it('should validate metric type enum', async () => {
      const invalidRequest = {
        ...metricRequest,
        type: "INVALID_TYPE"
      };

      await request(app)
        .post('/api/v1/goals/goal-123/metrics')
        .send(invalidRequest)
        .expect(400);
    });
  });

  describe('GET /api/v1/goals/:id/metrics/tracking', () => {
    beforeEach(() => {
      mockPrisma.goal.findFirst.mockResolvedValue({
        ...mockGoal,
        metrics: [mockGoalMetric]
      });
    });

    it('should return metric tracking information', async () => {
      const response = await request(app)
        .get('/api/v1/goals/goal-123/metrics/tracking')
        .expect(200);

      expect(response.body).toHaveProperty('goal_id');
      expect(response.body).toHaveProperty('metrics');
      expect(Array.isArray(response.body.metrics)).toBe(true);
      expect(response.body.metrics[0]).toHaveProperty('progress_percentage');
    });

    it('should calculate progress percentage correctly', async () => {
      const response = await request(app)
        .get('/api/v1/goals/goal-123/metrics/tracking')
        .expect(200);

      const metric = response.body.metrics[0];
      // Based on mockGoalMetric: current=8000, baseline=7500, target=10000
      // Progress = (8000-7500)/(10000-7500) * 100 = 500/2500 * 100 = 20%
      expect(metric.progress_percentage).toBe(20);
    });

    it('should validate goal ownership', async () => {
      mockPrisma.goal.findFirst.mockResolvedValue(null);

      await request(app)
        .get('/api/v1/goals/goal-123/metrics/tracking')
        .expect(404);
    });
  });
});