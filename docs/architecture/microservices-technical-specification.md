# Microservices Technical Specification

## Goal Core Service Specification

### Technology Stack
- **Framework**: NestJS 10.x with TypeScript 5.x
- **Database**: PostgreSQL 15 with Prisma ORM
- **Caching**: Redis 7.x
- **Message Queue**: Kafka producer
- **API**: REST + GraphQL (Apollo Server)

### Project Structure
```
goal-core-service/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   └── pipes/
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   └── kafka.config.ts
│   ├── modules/
│   │   ├── goals/
│   │   │   ├── goals.module.ts
│   │   │   ├── goals.controller.ts
│   │   │   ├── goals.service.ts
│   │   │   ├── goals.repository.ts
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   └── interfaces/
│   │   ├── smart-scoring/
│   │   │   ├── smart-scoring.module.ts
│   │   │   ├── smart-scoring.service.ts
│   │   │   ├── scoring-engine.ts
│   │   │   └── strategies/
│   │   ├── milestones/
│   │   ├── wbs/
│   │   └── dependencies/
│   └── shared/
│       ├── database/
│       ├── kafka/
│       └── redis/
├── tests/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── Dockerfile
```

### Database Schema
```prisma
model Goal {
  id          String   @id @default(cuid())
  userId      String
  title       String
  description String   @db.Text
  status      GoalStatus @default(DRAFT)
  
  // SMART Components
  smartScores Json
  specific    String?  @db.Text
  measurable  Json?
  achievable  Json?
  relevant    String?  @db.Text
  timeBound   DateTime?
  
  // Relationships
  milestones  Milestone[]
  wbsTasks    WBSTask[]
  dependencies Dependency[]
  
  // Metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  version     Int      @default(1)
  
  @@index([userId, status])
  @@index([createdAt])
}

model Milestone {
  id          String   @id @default(cuid())
  goalId      String
  goal        Goal     @relation(fields: [goalId], references: [id])
  title       String
  description String?  @db.Text
  targetDate  DateTime
  status      MilestoneStatus @default(PENDING)
  progress    Float    @default(0)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([goalId, status])
}

enum GoalStatus {
  DRAFT
  ACTIVE
  PAUSED
  COMPLETED
  ARCHIVED
}

enum MilestoneStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  OVERDUE
}
```

### Core APIs

#### REST Endpoints
```typescript
@Controller('goals')
@UseGuards(AuthGuard)
export class GoalsController {
  @Post()
  @UseInterceptors(CacheInterceptor)
  async createGoal(@Body() createGoalDto: CreateGoalDto) {
    // Validate input
    // Create goal with initial SMART analysis
    // Publish GoalCreated event
    // Return goal with suggestions
  }

  @Get(':id/smart-analysis')
  @UseInterceptors(CacheInterceptor)
  async getSmartAnalysis(@Param('id') id: string) {
    // Retrieve goal
    // Run enhanced SMART scoring
    // Return detailed analysis with improvements
  }

  @Put(':id/refine')
  async refineGoal(
    @Param('id') id: string,
    @Body() refineDto: RefineGoalDto
  ) {
    // Update goal based on conversation
    // Recalculate SMART scores
    // Publish GoalRefined event
    // Return updated goal
  }

  @Post(':id/milestones/generate')
  async generateMilestones(@Param('id') id: string) {
    // Use AI to generate milestones
    // Validate and adjust based on goal
    // Save milestones
    // Return milestone plan
  }
}
```

#### GraphQL Schema
```graphql
type Goal {
  id: ID!
  userId: String!
  title: String!
  description: String!
  status: GoalStatus!
  smartScores: SmartScores!
  milestones: [Milestone!]!
  wbsTasks: [WBSTask!]!
  dependencies: [Dependency!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type SmartScores {
  overall: Float!
  specific: ComponentScore!
  measurable: ComponentScore!
  achievable: ComponentScore!
  relevant: ComponentScore!
  timeBound: ComponentScore!
}

type ComponentScore {
  score: Float!
  confidence: Float!
  feedback: String!
  suggestions: [String!]!
}

type Query {
  goal(id: ID!): Goal
  goals(userId: String!, filter: GoalFilter): [Goal!]!
  smartAnalysis(goalId: ID!): SmartAnalysis!
}

type Mutation {
  createGoal(input: CreateGoalInput!): Goal!
  updateGoal(id: ID!, input: UpdateGoalInput!): Goal!
  refineGoal(id: ID!, refinement: RefinementInput!): Goal!
  generateMilestones(goalId: ID!): [Milestone!]!
}

type Subscription {
  goalUpdated(goalId: ID!): Goal!
  smartScoreChanged(goalId: ID!): SmartScores!
  milestoneProgress(goalId: ID!): MilestoneProgressUpdate!
}
```

### Event Publishing
```typescript
export interface GoalEvents {
  'goal.created': {
    goalId: string;
    userId: string;
    initialScores: SmartScores;
  };
  
  'goal.refined': {
    goalId: string;
    previousScores: SmartScores;
    newScores: SmartScores;
    refinementType: string;
  };
  
  'milestone.generated': {
    goalId: string;
    milestoneCount: number;
    timespan: number;
  };
  
  'goal.completed': {
    goalId: string;
    userId: string;
    completionTime: number;
    finalScores: SmartScores;
  };
}
```

## Conversation Engine Service Specification

### Technology Stack
- **Framework**: FastAPI with Python 3.11
- **AI**: LangChain + OpenAI
- **WebSocket**: FastAPI WebSocket support
- **Cache**: Redis for session state
- **Vector DB**: Pinecone for context

### Project Structure
```
conversation-engine/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── sessions.py
│   │   │   ├── messages.py
│   │   │   └── websocket.py
│   │   └── dependencies.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   └── events.py
│   ├── services/
│   │   ├── conversation_manager.py
│   │   ├── llm_service.py
│   │   ├── context_manager.py
│   │   ├── prompt_optimizer.py
│   │   └── intent_detector.py
│   ├── models/
│   │   ├── session.py
│   │   ├── message.py
│   │   └── context.py
│   └── utils/
│       ├── redis_client.py
│       └── kafka_producer.py
├── tests/
├── prompts/
│   ├── system/
│   ├── refinement/
│   └── templates/
└── Dockerfile
```

### Core Components

#### Conversation Manager
```python
from langchain.memory import ConversationSummaryBufferMemory
from langchain.chains import ConversationChain

class ConversationManager:
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service
        self.sessions: Dict[str, ConversationSession] = {}
        
    async def create_session(
        self, 
        user_id: str, 
        goal_context: Optional[Dict]
    ) -> ConversationSession:
        """Initialize new conversation session with context"""
        session = ConversationSession(
            id=generate_id(),
            user_id=user_id,
            memory=ConversationSummaryBufferMemory(
                llm=self.llm.model,
                max_token_limit=2000
            ),
            context=goal_context or {}
        )
        
        # Load user profile for personalization
        profile = await self.load_user_profile(user_id)
        session.context['user_profile'] = profile
        
        # Initialize with system prompt
        system_prompt = await self.build_system_prompt(session)
        session.add_message(MessageRole.SYSTEM, system_prompt)
        
        self.sessions[session.id] = session
        return session
    
    async def process_message(
        self, 
        session_id: str, 
        message: str
    ) -> ConversationResponse:
        """Process user message and generate response"""
        session = self.sessions.get(session_id)
        if not session:
            raise SessionNotFoundError()
        
        # Detect intent
        intent = await self.detect_intent(message, session.context)
        
        # Update context based on intent
        session.context['current_intent'] = intent
        
        # Generate response based on conversation phase
        response = await self.generate_response(
            session=session,
            message=message,
            intent=intent
        )
        
        # Update session memory
        session.add_message(MessageRole.USER, message)
        session.add_message(MessageRole.ASSISTANT, response.content)
        
        # Check for phase transition
        if response.phase_transition:
            await self.handle_phase_transition(session, response)
        
        # Publish event
        await self.publish_event('message.processed', {
            'session_id': session_id,
            'intent': intent,
            'response_type': response.type
        })
        
        return response
```

#### WebSocket Handler
```python
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        
    def disconnect(self, session_id: str):
        self.active_connections.pop(session_id, None)
        
    async def send_message(self, session_id: str, message: dict):
        websocket = self.active_connections.get(session_id)
        if websocket:
            await websocket.send_json(message)
    
    async def broadcast_to_session(self, session_id: str, data: dict):
        await self.send_message(session_id, {
            "type": "broadcast",
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        })

@app.websocket("/ws/conversation/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    session_id: str,
    token: str = Query(...)
):
    # Verify token
    user = await verify_websocket_token(token)
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return
    
    # Connect
    await manager.connect(websocket, session_id)
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_json()
            
            # Process message
            response = await conversation_manager.process_message(
                session_id=session_id,
                message=data["message"]
            )
            
            # Send response
            await manager.send_message(session_id, {
                "type": "response",
                "data": response.dict(),
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Send any follow-up suggestions
            if response.suggestions:
                await manager.send_message(session_id, {
                    "type": "suggestions",
                    "data": response.suggestions,
                    "timestamp": datetime.utcnow().isoformat()
                })
                
    except WebSocketDisconnect:
        manager.disconnect(session_id)
        await conversation_manager.end_session(session_id)
```

## Personalization Service Specification

### Technology Stack
- **Framework**: Express with TypeScript
- **Database**: MongoDB for flexible schemas
- **ML**: TensorFlow.js for recommendations
- **Cache**: Redis for user profiles

### Core Features

#### User Profile Schema
```typescript
interface UserProfile {
  userId: string;
  demographics: {
    ageGroup?: string;
    profession?: string;
    experience?: string;
  };
  preferences: {
    communicationStyle: 'formal' | 'casual' | 'motivational';
    learningStyle: 'visual' | 'textual' | 'interactive';
    goalCategories: string[];
    workingHours: TimeRange[];
  };
  behavioral: {
    avgSessionDuration: number;
    preferredGoalLength: 'short' | 'medium' | 'long';
    completionRate: number;
    engagementScore: number;
  };
  adaptiveUI: {
    theme: string;
    layout: string;
    shortcuts: KeyboardShortcut[];
    hiddenFeatures: string[];
  };
  history: {
    goals: GoalSummary[];
    interactions: InteractionLog[];
    achievements: Achievement[];
  };
}
```

#### Recommendation Engine
```typescript
export class RecommendationEngine {
  private model: tf.LayersModel;
  
  async generateRecommendations(
    profile: UserProfile,
    context: RecommendationContext
  ): Promise<Recommendations> {
    // Extract features from profile
    const features = this.extractFeatures(profile);
    
    // Run through TensorFlow model
    const predictions = await this.model.predict(features);
    
    // Generate recommendations
    return {
      goalTemplates: await this.recommendGoalTemplates(
        predictions, 
        profile
      ),
      milestoneStrategies: await this.recommendMilestoneStrategies(
        predictions,
        context
      ),
      timeEstimates: await this.predictTimeEstimates(
        predictions,
        context.goalComplexity
      ),
      learningResources: await this.matchLearningResources(
        profile.preferences.learningStyle,
        context.goalCategory
      )
    };
  }
  
  async updateModel(feedback: UserFeedback): Promise<void> {
    // Collect feedback data
    const trainingData = await this.prepareTrainingData(feedback);
    
    // Retrain model incrementally
    await this.model.fit(
      trainingData.features,
      trainingData.labels,
      {
        epochs: 5,
        batchSize: 32,
        validationSplit: 0.2
      }
    );
    
    // Save updated model
    await this.model.save('file://./models/recommendations');
  }
}
```

## Analytics Service Specification

### Technology Stack
- **Framework**: Python with FastAPI
- **Database**: ClickHouse for time-series
- **Processing**: Apache Spark for batch jobs
- **Visualization**: Grafana integration

### Data Pipeline

#### Event Processing
```python
from clickhouse_driver import Client
from kafka import KafkaConsumer

class AnalyticsProcessor:
    def __init__(self):
        self.clickhouse = Client('clickhouse-server')
        self.consumer = KafkaConsumer(
            'goal-events',
            'conversation-events',
            'user-events',
            bootstrap_servers=['kafka:9092'],
            value_deserializer=lambda m: json.loads(m.decode('utf-8'))
        )
    
    async def process_events(self):
        """Main event processing loop"""
        for message in self.consumer:
            event_type = message.topic
            event_data = message.value
            
            # Transform event for analytics
            analytics_event = await self.transform_event(
                event_type, 
                event_data
            )
            
            # Store in ClickHouse
            await self.store_event(analytics_event)
            
            # Real-time aggregations
            if event_type in ['goal.completed', 'milestone.achieved']:
                await self.update_aggregations(analytics_event)
    
    async def generate_insights(self, user_id: str) -> UserInsights:
        """Generate personalized insights for user"""
        # Query historical data
        goal_stats = await self.query_goal_statistics(user_id)
        completion_trends = await self.analyze_completion_trends(user_id)
        productivity_patterns = await self.find_productivity_patterns(user_id)
        
        # Generate insights
        return UserInsights(
            summary=self.summarize_performance(goal_stats),
            trends=completion_trends,
            patterns=productivity_patterns,
            recommendations=await self.generate_recommendations(
                goal_stats, 
                patterns=productivity_patterns
            ),
            achievements=await self.calculate_achievements(user_id)
        )
```

#### ClickHouse Schema
```sql
CREATE TABLE goal_events (
    event_id UUID,
    event_type String,
    user_id String,
    goal_id String,
    timestamp DateTime64(3),
    properties String, -- JSON
    
    -- Computed columns
    date Date MATERIALIZED toDate(timestamp),
    hour UInt8 MATERIALIZED toHour(timestamp),
    
    -- Indices
    INDEX idx_user_date (user_id, date) TYPE minmax GRANULARITY 1,
    INDEX idx_goal (goal_id) TYPE bloom_filter GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (user_id, timestamp);

-- Materialized view for real-time stats
CREATE MATERIALIZED VIEW user_goal_stats
ENGINE = SummingMergeTree()
ORDER BY (user_id, date)
AS SELECT
    user_id,
    date,
    countIf(event_type = 'goal.created') as goals_created,
    countIf(event_type = 'goal.completed') as goals_completed,
    avgIf(JSONExtractFloat(properties, 'completion_time'), 
          event_type = 'goal.completed') as avg_completion_time,
    maxIf(JSONExtractFloat(properties, 'smart_score'), 
          event_type = 'goal.created') as max_smart_score
FROM goal_events
GROUP BY user_id, date;
```

## Integration Patterns

### Service Communication

#### Synchronous (REST/GraphQL)
```typescript
// API Gateway routes requests to appropriate services
const routes = {
  '/api/goals/*': 'http://goal-core-service:3000',
  '/api/conversation/*': 'http://conversation-engine:8000',
  '/api/personalization/*': 'http://personalization-service:3001',
  '/api/analytics/*': 'http://analytics-service:8001'
};
```

#### Asynchronous (Event-Driven)
```yaml
Event Flow:
  Goal Created:
    Producer: Goal Core Service
    Consumers:
      - Analytics Service (tracking)
      - Personalization Service (profile update)
      - Notification Service (welcome email)
  
  Conversation Ended:
    Producer: Conversation Engine
    Consumers:
      - Goal Core Service (update goal)
      - Analytics Service (session metrics)
      - Personalization Service (behavior tracking)
```

### Error Handling

#### Circuit Breaker Pattern
```typescript
import CircuitBreaker from 'opossum';

const options = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

const aiServiceBreaker = new CircuitBreaker(callAIService, options);

aiServiceBreaker.on('open', () => {
  logger.warn('Circuit breaker is open, using fallback');
});

aiServiceBreaker.fallback(() => {
  return { 
    score: 0.5, 
    confidence: 0.1, 
    message: 'AI service temporarily unavailable' 
  };
});
```

### Security Implementation

#### Service-to-Service Authentication
```typescript
// JWT with service accounts
const serviceToken = jwt.sign(
  {
    service: 'goal-core',
    permissions: ['read:goals', 'write:goals'],
    iat: Date.now()
  },
  process.env.SERVICE_SECRET,
  { expiresIn: '5m' }
);

// mTLS for additional security
const agent = new https.Agent({
  cert: fs.readFileSync('service-cert.pem'),
  key: fs.readFileSync('service-key.pem'),
  ca: fs.readFileSync('ca-cert.pem')
});
```

## Deployment Configuration

### Kubernetes Manifests
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: goal-core-service
  namespace: goal-strategy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: goal-core
  template:
    metadata:
      labels:
        app: goal-core
    spec:
      containers:
      - name: goal-core
        image: goal-strategy/goal-core:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: goal-core-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Helm Values
```yaml
global:
  environment: production
  domain: api.personalea.com

goalCore:
  replicas: 3
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilization: 70
  
conversationEngine:
  replicas: 2
  resources:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "1Gi"
      cpu: "1000m"

kafka:
  replicas: 3
  storage: 100Gi
  retention: 168h

redis:
  cluster:
    enabled: true
    nodes: 6
  persistence:
    enabled: true
    size: 10Gi
```

This technical specification provides the detailed implementation blueprint for the new microservices architecture. Each service is designed to be independently deployable, scalable, and maintainable while working together through well-defined interfaces and event-driven communication.