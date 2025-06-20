# Goal & Strategy Service

The Goal & Strategy Service implements a sophisticated 8-step goal-setting and strategic planning workflow that transforms high-level user goals into actionable, scheduled tasks with proper capacity management and dependency tracking.

## 🎯 Overview

This service is part of the PersonalEA microservices architecture and provides intelligent goal management capabilities powered by AI. It follows the comprehensive specification outlined in [`docs/goal-strategy-service-specification.md`](../../docs/goal-strategy-service-specification.md).

## ✅ Phase 1 Implementation Status (COMPLETED)

### Core Goal Management Features
- ✅ **SMART Goal Translation** - AI-powered conversion of vague goals into Specific, Measurable, Achievable, Relevant, Time-bound objectives
- ✅ **Critical Success Metric Identification** - Define primary and supporting metrics for goal achievement
- ✅ **Milestone Breakdown** - AI-generated 2-6 measurable mini-wins per goal with timeline distribution
- ✅ **Goal CRUD Operations** - Complete goal lifecycle management with progress tracking
- ✅ **Interactive Clarification** - AI-driven question system to improve goal specificity

### Technical Implementation
- ✅ **Database Schema** - Complete Prisma schema with 10+ core entities
- ✅ **AI Integration** - OpenAI GPT-4 integration for intelligent goal processing
- ✅ **RESTful API** - 15+ endpoints following OpenAPI 3.1 specification
- ✅ **Authentication & Authorization** - JWT-based security with scope-based permissions
- ✅ **Input Validation** - Comprehensive Zod schema validation
- ✅ **Error Handling** - Structured error responses with correlation IDs
- ✅ **Logging & Monitoring** - Winston-based structured logging

## 🏗️ Architecture

### Service Components

#### 1. SMART Goal Processor (`src/services/smart-goal-processor.ts`)
- AI-powered goal analysis and translation
- Interactive clarification system
- SMART criteria validation and scoring
- Goal completeness analysis

#### 2. Milestone Generator (`src/services/milestone-generator.ts`)
- Intelligent milestone breakdown using AI
- Timeline optimization and validation
- Dependency-aware milestone sequencing
- Multiple distribution strategies (EVEN, FRONT_LOADED, BACK_LOADED)

#### 3. API Routes
- **Goals** (`src/routes/goals.ts`) - Complete goal management
- **Milestones** (`src/routes/milestones.ts`) - Milestone operations and progress tracking
- **Health** (`src/routes/health.ts`) - Service health monitoring

### Database Schema

The service uses a comprehensive PostgreSQL schema with the following core entities:

```sql
-- Core goal management
Goals (id, user_id, title, description, smart_criteria, status, priority, target_date)
GoalMetrics (id, goal_id, name, type, target_value, current_value, is_primary)
GoalClarifications (id, goal_id, question, answer, smart_criterion, status)

-- Milestone and progress tracking
Milestones (id, goal_id, title, description, target_date, completion_criteria, status, order_index)
MilestoneProgress (id, milestone_id, progress_percentage, notes, recorded_at, recorded_by)

-- Task management (Phase 2)
Tasks (id, milestone_id, parent_task_id, title, description, estimated_hours, status, priority)
TaskDependencies (id, predecessor_task_id, successor_task_id, dependency_type, lag_time)

-- Estimation and scheduling (Phase 2-3)
TaskEstimates (id, task_id, estimation_method, estimated_hours, confidence_score)
TaskSchedules (id, task_id, start_time, end_time, calendar_event_id, is_focus_time)

-- Capacity management (Phase 4)
TeamCapacity (id, user_id, available_hours_per_week, weekend_preference, focus_time_preferences)
CapacityAllocations (id, user_id, task_id, allocated_hours, week_start_date, utilization_rate)
```

## 🔌 API Endpoints

### Goal Management

```http
# SMART Goal Translation
POST /api/v1/goals/translate
POST /api/v1/goals/clarify

# Goal CRUD Operations
POST /api/v1/goals
GET /api/v1/goals
GET /api/v1/goals/{id}
PUT /api/v1/goals/{id}
DELETE /api/v1/goals/{id}

# Goal Analysis
GET /api/v1/goals/{id}/smart-analysis

# Success Metrics
POST /api/v1/goals/{id}/metrics
GET /api/v1/goals/{id}/metrics/tracking
```

### Milestone Management

```http
# Milestone Generation
POST /api/v1/goals/{goalId}/milestones/generate

# Milestone CRUD
POST /api/v1/goals/{goalId}/milestones
GET /api/v1/goals/{goalId}/milestones
GET /api/v1/milestones/{id}
PUT /api/v1/milestones/{id}
DELETE /api/v1/milestones/{id}

# Progress Tracking
GET /api/v1/milestones/{id}/progress
POST /api/v1/milestones/{id}/progress
```

### Work Breakdown Structure (WBS)

```http
# WBS Generation
POST /api/v1/wbs/generate

# WBS Management
PUT /api/v1/wbs/{milestoneId}/refine
GET /api/v1/wbs/{milestoneId}
GET /api/v1/wbs/{milestoneId}/metrics
```

### Dependency Management

```http
# Dependency Analysis
POST /api/v1/dependencies/analyze

# Dependency CRUD
POST /api/v1/dependencies/add
DELETE /api/v1/dependencies/remove

# Analysis Endpoints
GET /api/v1/dependencies/{milestoneId}/critical-path
GET /api/v1/dependencies/{milestoneId}/parallel-tracks
GET /api/v1/dependencies/{milestoneId}/resource-conflicts
GET /api/v1/dependencies/{milestoneId}/optimization
```

### Task Estimation

```http
# Estimation Engine
POST /api/v1/estimations/estimate
POST /api/v1/estimations/batch

# Learning & Analytics
PUT /api/v1/estimations/{taskId}/actual
GET /api/v1/estimations/methods
GET /api/v1/estimations/{taskId}/history
GET /api/v1/estimations/analytics/accuracy
```

### Health Monitoring

```http
GET /health                    # Simple health check
GET /api/v1/health            # Detailed health status
GET /api/v1/health/ready      # Readiness probe
GET /api/v1/health/live       # Liveness probe
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- OpenAI API key

### Installation

1. **Install dependencies:**
   ```bash
   cd services/goal-strategy
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start the service:**
   ```bash
   npm run dev
   ```

### Environment Configuration

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/goal_strategy"

# Authentication
JWT_SECRET="your-jwt-secret"

# AI Integration
OPENAI_API_KEY="your-openai-api-key"
OPENAI_MODEL="gpt-4"

# Service Configuration
PORT=3002
NODE_ENV=development
API_VERSION=v1

# Feature Flags
FEATURE_AI_GOAL_TRANSLATION=true
FEATURE_MILESTONE_GENERATION=true
FEATURE_WBS_AUTOMATION=true
FEATURE_DEPENDENCY_MAPPING=true
FEATURE_ESTIMATION_ENGINE=true
FEATURE_CALENDAR_INTEGRATION=false
FEATURE_CAPACITY_MANAGEMENT=false

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGINS="http://localhost:3000,http://localhost:3001"
CORS_CREDENTIALS=true
```

## 📖 Usage Examples

### 1. Translate a Raw Goal to SMART Format

```javascript
const response = await fetch('/api/v1/goals/translate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    raw_goal: "Grow revenue",
    context: {
      timeframe: "Q3 2024",
      resources: ["marketing team", "sales team"],
      constraints: ["budget limit $50k"]
    }
  })
});

const result = await response.json();
// Returns: SMART goal, criteria breakdown, missing info, clarification questions
```

### 2. Create a Goal with SMART Criteria

```javascript
const response = await fetch('/api/v1/goals', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    title: "Increase MRR by 15% in Q3 without raising CAC above $150",
    description: "Focus on existing customer expansion and referral programs",
    smart_criteria: {
      specific: {
        value: "Increase Monthly Recurring Revenue by exactly 15%",
        confidence: 0.9
      },
      measurable: {
        value: "MRR increase from $100k to $115k",
        metrics: ["MRR", "CAC", "Customer Count"],
        confidence: 0.95
      },
      // ... other SMART criteria
    },
    priority: "HIGH",
    target_date: "2024-09-30T23:59:59Z"
  })
});
```

### 3. Generate Milestones for a Goal

```javascript
const response = await fetch('/api/v1/goals/{goalId}/milestones/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    preferences: {
      milestone_count: 4,
      distribution_strategy: "EVEN",
      include_buffer_time: true
    }
  })
});

const result = await response.json();
// Returns: Generated milestones with timeline and rationale
```

### 4. Track Milestone Progress

```javascript
const response = await fetch('/api/v1/milestones/{milestoneId}/progress', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    progress_percentage: 75,
    notes: "Completed user research and initial design mockups"
  })
});
```

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### API Contract Tests
```bash
npm run test:contract
```

## 📊 Monitoring & Observability

### Health Checks
- **Basic Health**: `GET /health`
- **Detailed Health**: `GET /api/v1/health`
- **Readiness**: `GET /api/v1/health/ready`
- **Liveness**: `GET /api/v1/health/live`

### Metrics
- Goal creation and completion rates
- SMART translation accuracy
- Milestone generation success rates
- API response times and error rates
- AI service integration health

### Logging
All requests include correlation IDs for distributed tracing. Logs are structured JSON format with:
- Request/response logging
- Performance monitoring
- Error tracking with stack traces
- AI service interaction logs

## 🔮 Upcoming Phases

### Phase 2: Advanced Planning (Weeks 4-6)
- [ ] Work Breakdown Structure (WBS) engine
- [ ] Task decomposition with recursive logic
- [ ] Dependency mapping and critical path analysis
- [ ] Template library and pattern recognition

### Phase 3: Calendar Integration (Weeks 7-9)
- [ ] Calendar service integration
- [ ] Constraint-aware scheduling
- [ ] Conflict detection and resolution
- [ ] Focus time management

### Phase 4: Capacity Management (Weeks 10-12)
- [ ] Team capacity analysis
- [ ] Workload optimization algorithms
- [ ] Resource allocation and balancing
- [ ] Performance monitoring and analytics

### Phase 5: Intelligence & Learning (Weeks 13-14)
- [ ] Estimation accuracy tracking
- [ ] Pattern recognition for similar tasks
- [ ] Automated recommendations
- [ ] Continuous improvement algorithms

### Phase 6: Advanced Features (Week 15)
- [ ] Real-time collaboration
- [ ] Advanced analytics and reporting
- [ ] Mobile app support
- [ ] Third-party integrations

## 🤝 Integration

### Email Service Integration
- Import action items from emails as goal inputs
- Send milestone completion notifications
- Automated deadline reminders

### Calendar Service Integration
- Bi-directional calendar synchronization
- Availability checking for task scheduling
- Meeting coordination around goal work

### Shared Authentication
Uses the shared auth library (`../../shared/auth`) for:
- JWT token validation
- Scope-based authorization
- User context management

## 🛡️ Security

- **Authentication**: JWT tokens with scope-based permissions
- **Authorization**: Role-based access control (RBAC)
- **Input Validation**: Comprehensive Zod schema validation
- **Rate Limiting**: Configurable request rate limits
- **CORS**: Configurable cross-origin resource sharing
- **Security Headers**: Helmet.js security middleware

## 📝 Contributing

1. Follow the existing code patterns and TypeScript strict mode
2. Add comprehensive tests for new features
3. Update API documentation for endpoint changes
4. Include correlation IDs in all logging
5. Follow the established error handling patterns

## 📄 License

This project is part of the PersonalEA system. See the main project LICENSE file for details.