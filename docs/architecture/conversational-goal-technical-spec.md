# Conversational SMART Goal System - Technical Specification

## Overview

This technical specification details the implementation approach for the conversational SMART goal system, focusing on practical implementation patterns, API contracts, and deployment configurations.

## API Specification

### Base Configuration

```yaml
base_url: https://api.personalea.com
version: v1
authentication: Bearer token or API key
content_type: application/json
```

### Endpoints

#### 1. Start Conversation

```http
POST /api/v1/conversations/start
```

**Request:**
```json
{
  "message": "I want to learn programming",
  "context": {
    "userId": "user_123",
    "sessionId": "session_abc",
    "preferences": {
      "language": "en",
      "timezone": "America/New_York"
    }
  }
}
```

**Response:**
```json
{
  "conversationId": "conv_xyz789",
  "message": "That's a great aspiration! To help you create a clear plan...",
  "state": {
    "phase": "clarifying",
    "confidence": 0.3,
    "currentDraft": {
      "title": "Learn programming",
      "smartCriteria": {
        "specific": null,
        "measurable": null,
        "achievable": null,
        "relevant": null,
        "timeBound": null
      }
    },
    "missingComponents": ["specific", "measurable", "achievable", "relevant", "timeBound"],
    "suggestions": [
      "What programming language interests you?",
      "What would you like to build?",
      "Is this for career advancement or personal interest?"
    ]
  },
  "metadata": {
    "timestamp": "2024-01-10T10:30:00Z",
    "processingTime": 234
  }
}
```

#### 2. Continue Conversation

```http
POST /api/v1/conversations/{conversationId}/message
```

**Request:**
```json
{
  "message": "I want to build web applications with React"
}
```

**Response:**
```json
{
  "message": "Excellent choice! React is perfect for web applications...",
  "state": {
    "phase": "clarifying",
    "confidence": 0.5,
    "currentDraft": {
      "title": "Learn React for web development",
      "smartCriteria": {
        "specific": "Learn React framework",
        "measurable": null,
        "achievable": null,
        "relevant": "Web application development",
        "timeBound": null
      }
    },
    "missingComponents": ["measurable", "achievable", "timeBound"],
    "nextQuestion": "What specific project would you like to build to demonstrate your React skills?"
  }
}
```

#### 3. Get Conversation State

```http
GET /api/v1/conversations/{conversationId}
```

**Response:**
```json
{
  "conversationId": "conv_xyz789",
  "status": "active",
  "startedAt": "2024-01-10T10:30:00Z",
  "lastActivity": "2024-01-10T10:32:15Z",
  "state": {
    "phase": "clarifying",
    "confidence": 0.5,
    "currentDraft": {...},
    "messages": [
      {
        "role": "user",
        "content": "I want to learn programming",
        "timestamp": "2024-01-10T10:30:00Z"
      },
      {
        "role": "assistant",
        "content": "That's a great aspiration...",
        "timestamp": "2024-01-10T10:30:05Z"
      }
    ]
  }
}
```

#### 4. Complete Conversation

```http
POST /api/v1/conversations/{conversationId}/complete
```

**Request:**
```json
{
  "confirmGoal": true,
  "generateMilestones": true
}
```

**Response:**
```json
{
  "goalId": "goal_abc123",
  "finalGoal": {
    "title": "Build and deploy a React todo app with authentication in 3 months",
    "description": "Create a fully functional todo application...",
    "smartCriteria": {
      "specific": "React todo app with user auth and real-time sync",
      "measurable": "Complete app with 5 core features deployed to production",
      "achievable": "Builds on existing JavaScript knowledge",
      "relevant": "Supports transition to frontend developer role",
      "timeBound": "3 months (by April 10, 2024)"
    },
    "confidence": 0.92
  },
  "milestones": [
    {
      "id": "m1",
      "title": "Complete React fundamentals",
      "targetDate": "2024-02-10",
      "tasks": ["Complete React tutorial", "Build simple components"]
    },
    {
      "id": "m2",
      "title": "Build basic todo functionality",
      "targetDate": "2024-03-10",
      "tasks": ["Create todo CRUD", "Add local storage"]
    },
    {
      "id": "m3",
      "title": "Add authentication and sync",
      "targetDate": "2024-04-10",
      "tasks": ["Implement auth", "Add real-time sync", "Deploy to production"]
    }
  ]
}
```

## Service Architecture

### Core Services

```typescript
// services/conversation-service.ts
export class ConversationService {
  constructor(
    private db: DatabaseService,
    private ai: AIService,
    private cache: CacheService
  ) {}

  async startConversation(message: string, context?: ConversationContext) {
    // Implementation
  }

  async processMessage(conversationId: string, message: string) {
    // Implementation
  }

  async completeConversation(conversationId: string, options: CompletionOptions) {
    // Implementation
  }
}

// services/goal-processor.ts
export class GoalProcessor {
  async analyzeGoal(input: string): Promise<GoalAnalysis> {
    const prompt = this.buildAnalysisPrompt(input);
    const analysis = await this.ai.complete(prompt);
    return this.parseAnalysis(analysis);
  }

  async refineDraft(draft: GoalDraft, userInput: string): Promise<GoalDraft> {
    // Incorporate user input into draft
  }

  async generateMilestones(goal: SmartGoal): Promise<Milestone[]> {
    // Break down goal into milestones
  }
}

// services/state-manager.ts
export class StateManager {
  async saveState(conversationId: string, state: ConversationState) {
    // Save to Redis with TTL
    await this.redis.setex(
      `conversation:${conversationId}`,
      86400, // 24 hour TTL
      JSON.stringify(state)
    );
  }

  async getState(conversationId: string): Promise<ConversationState> {
    const cached = await this.redis.get(`conversation:${conversationId}`);
    if (cached) return JSON.parse(cached);
    
    // Fallback to database
    return this.loadFromDatabase(conversationId);
  }
}
```

### AI Integration Layer

```typescript
// services/ai/prompts.ts
export const PROMPTS = {
  ANALYZE_GOAL: `
    Analyze the following goal statement and identify:
    1. Which SMART components are present
    2. Which components are missing
    3. Current clarity/confidence score (0-1)
    4. Suggested questions to clarify missing components
    
    Goal: {goal}
    
    Respond in JSON format:
    {
      "present": ["specific", "relevant"],
      "missing": ["measurable", "achievable", "timeBound"],
      "confidence": 0.4,
      "draft": {
        "specific": "extracted specific component",
        "measurable": null,
        ...
      },
      "questions": ["What metrics will you use?", ...]
    }
  `,
  
  GENERATE_QUESTION: `
    The user is refining their goal. Current state:
    Goal: {currentGoal}
    Missing: {missingComponent}
    Context: {conversationHistory}
    
    Generate a natural, conversational question to help clarify the {missingComponent} aspect.
    Make it specific to their goal and provide examples if helpful.
  `,
  
  REFINE_GOAL: `
    Current goal draft: {draft}
    User response: {userResponse}
    Component to improve: {component}
    
    Incorporate the user's response to make the goal more {component}.
    Return the updated goal text.
  `
};

// services/ai/openai-service.ts
export class OpenAIService {
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }
  
  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "system", content: prompt }],
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 500,
      response_format: options?.jsonMode ? { type: "json_object" } : undefined
    });
    
    return completion.choices[0].message.content;
  }
}
```

### Database Models

```typescript
// models/conversation.model.ts
import { prisma } from '@/lib/prisma';

export class ConversationModel {
  static async create(data: {
    userId?: string;
    initialMessage: string;
  }) {
    return prisma.conversation.create({
      data: {
        userId: data.userId,
        status: 'active',
        messages: {
          create: {
            role: 'user',
            content: data.initialMessage
          }
        }
      },
      include: {
        messages: true
      }
    });
  }
  
  static async addMessage(conversationId: string, message: {
    role: 'user' | 'assistant';
    content: string;
    metadata?: any;
  }) {
    return prisma.conversationMessage.create({
      data: {
        conversationId,
        ...message
      }
    });
  }
  
  static async complete(conversationId: string, goalId: string) {
    return prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        finalGoalId: goalId
      }
    });
  }
}
```

## Frontend Implementation

### React Components

```tsx
// components/ConversationInterface.tsx
export function ConversationInterface() {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const startConversation = async () => {
    setLoading(true);
    try {
      const response = await api.startConversation(input);
      setConversation(response.data);
      setMessages([
        { role: 'user', content: input },
        { role: 'assistant', content: response.data.message }
      ]);
      setInput('');
    } finally {
      setLoading(false);
    }
  };
  
  const sendMessage = async () => {
    if (!conversation) return;
    
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    
    try {
      const response = await api.sendMessage(conversation.conversationId, input);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.message 
      }]);
      setInput('');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="conversation-container">
      <MessageList messages={messages} />
      <InputArea
        value={input}
        onChange={setInput}
        onSubmit={conversation ? sendMessage : startConversation}
        disabled={loading}
      />
      {conversation?.state && (
        <StateIndicator state={conversation.state} />
      )}
    </div>
  );
}

// components/StateIndicator.tsx
export function StateIndicator({ state }: { state: ConversationState }) {
  return (
    <div className="state-indicator">
      <div className="phase">Phase: {state.phase}</div>
      <div className="confidence">
        Confidence: {Math.round(state.confidence * 100)}%
      </div>
      <div className="progress">
        <ProgressBar 
          completed={5 - state.missingComponents.length} 
          total={5} 
        />
      </div>
    </div>
  );
}
```

### API Client

```typescript
// lib/api-client.ts
export class GoalConversationAPI {
  private baseURL: string;
  private apiKey: string;
  
  constructor(config: { baseURL: string; apiKey: string }) {
    this.baseURL = config.baseURL;
    this.apiKey = config.apiKey;
  }
  
  private async request<T>(
    method: string,
    path: string,
    data?: any
  ): Promise<T> {
    const response = await fetch(`${this.baseURL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: data ? JSON.stringify(data) : undefined
    });
    
    if (!response.ok) {
      throw new APIError(response.status, await response.text());
    }
    
    return response.json();
  }
  
  async startConversation(message: string, context?: any) {
    return this.request<ConversationResponse>(
      'POST',
      '/api/v1/conversations/start',
      { message, context }
    );
  }
  
  async sendMessage(conversationId: string, message: string) {
    return this.request<MessageResponse>(
      'POST',
      `/api/v1/conversations/${conversationId}/message`,
      { message }
    );
  }
}
```

## Deployment Configuration

### Docker Setup

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate

EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### Environment Configuration

```bash
# .env.production
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/goals

# Redis
REDIS_URL=redis://redis:6379

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview

# Security
JWT_SECRET=your-secret-key
API_RATE_LIMIT=100
API_RATE_WINDOW=900000

# Monitoring
SENTRY_DSN=https://...
LOG_LEVEL=info
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy Goal Service

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: |
          npm run test
          npm run test:integration
      
      - name: Run linting
        run: npm run lint
      
      - name: Type check
        run: npm run typecheck

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ secrets.REGISTRY_URL }}
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          push: true
          tags: |
            ${{ secrets.REGISTRY_URL }}/goal-service:latest
            ${{ secrets.REGISTRY_URL }}/goal-service:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    
    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/goal-service \
            goal-service=${{ secrets.REGISTRY_URL }}/goal-service:${{ github.sha }} \
            -n production
```

## Testing Implementation

### Unit Tests

```typescript
// tests/services/conversation-service.test.ts
describe('ConversationService', () => {
  let service: ConversationService;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockAI: jest.Mocked<AIService>;
  
  beforeEach(() => {
    mockDb = createMockDatabase();
    mockAI = createMockAI();
    service = new ConversationService(mockDb, mockAI, mockCache);
  });
  
  describe('startConversation', () => {
    it('should analyze initial goal and identify missing components', async () => {
      mockAI.complete.mockResolvedValue(JSON.stringify({
        present: ['relevant'],
        missing: ['specific', 'measurable', 'achievable', 'timeBound'],
        confidence: 0.2,
        questions: ['What specific skill do you want to learn?']
      }));
      
      const result = await service.startConversation('I want to learn programming');
      
      expect(result.state.missingComponents).toHaveLength(4);
      expect(result.state.confidence).toBe(0.2);
      expect(result.message).toContain('specific');
    });
  });
});
```

### Integration Tests

```typescript
// tests/integration/conversation-flow.test.ts
describe('Complete Conversation Flow', () => {
  it('should refine vague goal through conversation', async () => {
    // Start with vague goal
    const start = await request(app)
      .post('/api/v1/conversations/start')
      .send({ message: 'I want to be healthier' });
    
    expect(start.status).toBe(200);
    expect(start.body.state.phase).toBe('clarifying');
    
    const conversationId = start.body.conversationId;
    
    // Clarify specific aspect
    const msg1 = await request(app)
      .post(`/api/v1/conversations/${conversationId}/message`)
      .send({ message: 'I want to lose 20 pounds' });
    
    expect(msg1.body.state.currentDraft.specific).toContain('lose 20 pounds');
    
    // Add measurable component
    const msg2 = await request(app)
      .post(`/api/v1/conversations/${conversationId}/message`)
      .send({ message: 'Track weight weekly and body measurements monthly' });
    
    // Continue through all components...
    
    // Complete conversation
    const complete = await request(app)
      .post(`/api/v1/conversations/${conversationId}/complete`)
      .send({ confirmGoal: true });
    
    expect(complete.body.finalGoal.confidence).toBeGreaterThan(0.8);
    expect(complete.body.milestones).toHaveLength(3);
  });
});
```

### E2E Browser Tests

```typescript
// tests/e2e/goal-conversation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Goal Conversation UI', () => {
  test('should complete full conversation flow', async ({ page }) => {
    await page.goto('/');
    
    // Start conversation
    await page.fill('#goal-input', 'I want to start a business');
    await page.click('#start-conversation');
    
    // Wait for AI response
    await page.waitForSelector('.assistant-message');
    const question1 = await page.textContent('.assistant-message');
    expect(question1).toContain('What type of business');
    
    // Answer questions
    await page.fill('#message-input', 'An online coaching business');
    await page.click('#send-message');
    
    // Continue through conversation
    await page.waitForSelector('.confidence-indicator');
    const confidence = await page.textContent('.confidence-indicator');
    
    // Complete when confidence is high
    await page.waitForSelector('#complete-goal:enabled');
    await page.click('#complete-goal');
    
    // Verify final goal
    await page.waitForSelector('.final-goal');
    const finalGoal = await page.textContent('.final-goal');
    expect(finalGoal).toContain('online coaching business');
    expect(finalGoal).toContain('months');
  });
});
```

## Monitoring and Analytics

### Metrics Collection

```typescript
// middleware/metrics.ts
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    metrics.increment('api.requests', {
      endpoint: req.path,
      method: req.method,
      status: res.statusCode
    });
    
    metrics.histogram('api.response_time', duration, {
      endpoint: req.path
    });
  });
  
  next();
};

// Conversation-specific metrics
export const trackConversation = (event: string, data: any) => {
  metrics.increment(`conversation.${event}`, data);
};

// Usage
trackConversation('started', { userId, initialConfidence });
trackConversation('completed', { userId, finalConfidence, duration });
trackConversation('abandoned', { userId, phase, reason });
```

### Error Handling

```typescript
// middleware/error-handler.ts
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errorId = generateErrorId();
  
  logger.error('API Error', {
    errorId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    userId: req.user?.id
  });
  
  // Track error metrics
  metrics.increment('api.errors', {
    type: err.constructor.name,
    endpoint: req.path
  });
  
  // Send appropriate response
  const status = err instanceof APIError ? err.status : 500;
  const message = err instanceof APIError ? err.message : 'Internal server error';
  
  res.status(status).json({
    error: {
      id: errorId,
      message,
      timestamp: new Date().toISOString()
    }
  });
};
```

## Performance Optimizations

### Caching Strategy

```typescript
// services/cache-service.ts
export class CacheService {
  private redis: Redis;
  
  async cacheConversationState(conversationId: string, state: any) {
    await this.redis.setex(
      `conv:${conversationId}`,
      3600, // 1 hour TTL
      JSON.stringify(state)
    );
  }
  
  async cacheAIResponse(prompt: string, response: string) {
    const key = `ai:${createHash('sha256').update(prompt).digest('hex')}`;
    await this.redis.setex(key, 86400, response); // 24 hour TTL
  }
  
  async getCachedResponse(prompt: string): Promise<string | null> {
    const key = `ai:${createHash('sha256').update(prompt).digest('hex')}`;
    return this.redis.get(key);
  }
}
```

### Database Optimization

```sql
-- Indexes for common queries
CREATE INDEX idx_conversations_user_status ON conversations(user_id, status);
CREATE INDEX idx_messages_conversation ON conversation_messages(conversation_id);
CREATE INDEX idx_goals_user_created ON goals(user_id, created_at DESC);

-- Materialized view for analytics
CREATE MATERIALIZED VIEW conversation_analytics AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_conversations,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration,
  AVG((metadata->>'confidence')::float) as avg_confidence
FROM conversations
GROUP BY DATE(created_at);
```

## Security Implementation

### Input Validation

```typescript
// middleware/validation.ts
import { z } from 'zod';

export const conversationSchemas = {
  start: z.object({
    message: z.string().min(1).max(1000),
    context: z.object({
      userId: z.string().optional(),
      sessionId: z.string().optional(),
      preferences: z.any().optional()
    }).optional()
  }),
  
  message: z.object({
    message: z.string().min(1).max(1000)
  }),
  
  complete: z.object({
    confirmGoal: z.boolean(),
    generateMilestones: z.boolean().optional()
  })
};

export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            details: error.errors
          }
        });
      } else {
        next(error);
      }
    }
  };
};
```

### Rate Limiting

```typescript
// middleware/rate-limit.ts
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
}) => {
  const limiter = rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    keyGenerator: options.keyGenerator || ((req) => req.ip),
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          retryAfter: res.getHeader('Retry-After')
        }
      });
    }
  });
  
  return limiter;
};

// Usage
app.use('/api/v1/conversations', createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
```

## Conclusion

This technical specification provides a complete implementation blueprint for the conversational SMART goal system. The architecture is designed to be simple, scalable, and maintainable while providing a rich conversational experience for users.