# Backend Services Requirements Documentation

## Table of Contents
1. [Overview](#overview)
2. [Service Architecture](#service-architecture)
3. [Goal Strategy Service](#goal-strategy-service)
4. [Email Processing Service](#email-processing-service)
5. [Authentication & Security](#authentication--security)
6. [Database Schema](#database-schema)
7. [External Service Integration](#external-service-integration)
8. [API Standards](#api-standards)
9. [Monitoring & Logging](#monitoring--logging)
10. [Environment Configuration](#environment-configuration)

## Overview

The Personal EA backend consists of microservices built with Node.js/TypeScript and Express.js framework. The architecture follows a modular design with separate services for different business domains, centralized authentication, and standardized API patterns.

### Key Technologies
- **Runtime**: Node.js (v18+)
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based
- **API Design**: RESTful with JSON responses
- **Documentation**: OpenAPI/Swagger compatible

## Service Architecture

### Active Services
1. **Goal Strategy Service** (Port: 8085) - Primary service for goal management, SMART goal processing, milestone generation, and task scheduling
2. **Email Processing Service** (Port: 8084) - Email synchronization and AI-powered processing

### Planned Services
1. **Calendar Service** (Port: 8086) - Calendar integration and event management (not yet implemented)
2. **Dialog Gateway** - Unified communication interface (not yet implemented)

### Service Communication
- Services communicate via HTTP REST APIs
- Each service has its own database schema
- Shared authentication using JWT tokens
- Correlation ID tracking across services

## Goal Strategy Service

### Core Functionalities

#### 1. SMART Goal Processing
- **AI-Powered Translation**: Convert raw goals into SMART format using LLM
- **Interactive Refinement**: Progressive goal clarification through conversation
- **Multi-mode Support**: Automatic and interactive processing modes
- **Confidence Scoring**: Track confidence for each SMART criterion

#### 2. Milestone Generation
- **AI-driven breakdown**: Generate milestones from SMART goals
- **Distribution strategies**: Even, front-loaded, or back-loaded
- **Progress tracking**: Monitor milestone completion
- **Task association**: Link tasks to milestones

#### 3. Work Breakdown Structure (WBS)
- **Hierarchical task decomposition**: Break milestones into tasks
- **Effort estimation**: AI-powered task duration estimates
- **Dependency management**: Track task relationships
- **Resource leveling**: Optimize task allocation

#### 4. Task Estimation Engine
- **Multiple methods**: Expert judgment, analogy-based, PERT, parametric, bottom-up
- **Confidence intervals**: Provide estimation ranges
- **Learning capability**: Improve accuracy with historical data
- **Batch processing**: Estimate multiple tasks efficiently

#### 5. Dependency Mapping
- **Critical path analysis**: Identify project bottlenecks
- **Parallel optimization**: Find opportunities for concurrent work
- **Resource conflict detection**: Identify scheduling conflicts
- **Schedule optimization**: Suggest improvements

#### 6. Planning & Scheduling
- **Personalized schedules**: Consider working hours and preferences
- **Energy-based optimization**: Match tasks to energy levels
- **Conflict resolution**: Handle scheduling conflicts
- **AI suggestions**: Intelligent scheduling recommendations

### API Endpoints

#### Goal Management
- `POST /api/v1/goals/translate` - Convert raw goal to SMART format
- `POST /api/v1/goals/clarify` - Process clarification answers
- `POST /api/v1/goals/:id/clarify` - Get clarification questions for specific goal
- `GET /api/v1/goals` - List user goals with filtering
- `GET /api/v1/goals/:id` - Get goal details
- `POST /api/v1/goals` - Create new goal
- `PUT /api/v1/goals/:id` - Update goal
- `DELETE /api/v1/goals/:id` - Delete goal
- `GET /api/v1/goals/:id/smart-analysis` - Analyze SMART criteria
- `POST /api/v1/goals/:id/metrics` - Add success metric
- `GET /api/v1/goals/:id/metrics/tracking` - Get metric tracking
- `POST /api/v1/goals/interactive-refine` - Interactive refinement
- `POST /api/v1/goals/analyze-without-transform` - Analyze without transformation
- `POST /api/v1/goals/conversation` - LLM-first conversation endpoint
- `POST /api/v1/goals/contextual-help` - Get contextual help
- `POST /api/v1/goals/component-question` - Component-specific questions

#### Milestone Management
- `POST /api/v1/goals/:goalId/milestones/generate` - Generate milestones using AI
- `POST /api/v1/goals/:goalId/milestones` - Create milestone manually
- `GET /api/v1/goals/:goalId/milestones` - List milestones for goal
- `GET /api/v1/milestones/:id` - Get milestone details
- `PUT /api/v1/milestones/:id` - Update milestone
- `DELETE /api/v1/milestones/:id` - Delete milestone
- `GET /api/v1/milestones/:id/progress` - Get progress tracking
- `POST /api/v1/milestones/:id/progress` - Record progress update

#### Work Breakdown Structure
- `POST /api/v1/wbs/generate` - Generate WBS for milestone
- `PUT /api/v1/wbs/:milestoneId/refine` - Refine existing WBS
- `GET /api/v1/wbs/:milestoneId` - Get WBS for milestone
- `GET /api/v1/wbs/:milestoneId/metrics` - Get WBS analysis metrics

#### Task Estimation
- `POST /api/v1/estimations/estimate` - Estimate single task
- `POST /api/v1/estimations/batch` - Batch task estimation
- `PUT /api/v1/estimations/:taskId/actual` - Update with actual hours
- `GET /api/v1/estimations/methods` - List estimation methods
- `GET /api/v1/estimations/:taskId/history` - Get estimation history
- `GET /api/v1/estimations/analytics/accuracy` - Get accuracy analytics

#### Dependency Management
- `POST /api/v1/dependencies/analyze` - Analyze dependencies
- `POST /api/v1/dependencies/add` - Add task dependency
- `DELETE /api/v1/dependencies/remove` - Remove dependency
- `GET /api/v1/dependencies/:milestoneId/critical-path` - Get critical path
- `GET /api/v1/dependencies/:milestoneId/parallel-tracks` - Get parallel tracks
- `GET /api/v1/dependencies/:milestoneId/resource-conflicts` - Get conflicts
- `GET /api/v1/dependencies/:milestoneId/optimization` - Get optimization suggestions

#### Planning & Scheduling
- `POST /api/v1/planner/schedule` - Generate optimized schedule
- `GET /api/v1/planner/schedule/:goalId` - Get current schedule
- `PUT /api/v1/planner/schedule` - Update schedule
- `GET /api/v1/planner/conflicts/:goalId` - Get scheduling conflicts
- `POST /api/v1/planner/conflicts/resolve` - Resolve conflicts
- `GET /api/v1/planner/suggestions/:goalId` - Get AI suggestions
- `GET /api/v1/planner/analytics/:goalId` - Get schedule analytics

#### Health & Monitoring
- `GET /api/v1/health` - Basic health check
- `GET /api/v1/health/detailed` - Detailed health status
- `GET /api/v1/health/ready` - Readiness probe
- `GET /api/v1/health/live` - Liveness probe
- `GET /api/v1/health/metrics` - Service metrics

### Data Models

#### Core Entities
1. **Goal**: Main goal entity with SMART criteria
2. **GoalMetric**: Success metrics for goals
3. **GoalClarification**: Q&A for goal refinement
4. **Milestone**: Major checkpoints for goals
5. **MilestoneProgress**: Progress tracking records
6. **Task**: Individual work items
7. **TaskDependency**: Task relationships
8. **TaskEstimate**: Time estimates for tasks
9. **TaskSchedule**: Scheduled time blocks
10. **GoalConversation**: LLM conversation tracking (extension)

## Email Processing Service

### Core Functionalities
1. **Email Provider Integration**: Support for Gmail (more providers planned)
2. **Email Synchronization**: Sync emails from external providers
3. **AI Processing**: Summarize and categorize emails
4. **Action Item Extraction**: Identify actionable items

### API Endpoints
- `POST /api/v1/email/sync` - Trigger email synchronization
- `GET /api/v1/email/sync/:jobId` - Get sync job status
- `POST /api/v1/email/digest` - Generate email digest
- `GET /api/v1/email/:emailId` - Get email details
- `POST /api/v1/email/:emailId/summarize` - Summarize specific email
- `POST /api/v1/email/:emailId/action-items` - Extract action items

## Authentication & Security

### JWT-based Authentication
- **Token Structure**: Contains user ID, email, and scopes
- **Expiration**: Configurable (default 24h)
- **Secret**: Stored in environment variable

### Scope-based Authorization
- `goals:read` - Read goal data
- `goals:write` - Create/update/delete goals
- `milestones:read` - Read milestone data
- `milestones:write` - Create/update/delete milestones
- `tasks:read` - Read task data
- `tasks:write` - Create/update/delete tasks
- `capacity:read` - Read capacity data
- `capacity:write` - Update capacity settings
- `admin` - Administrative access

### Security Features
- **CORS**: Configurable allowed origins
- **Rate Limiting**: Request throttling (100 requests/15 min default)
- **Helmet**: Security headers
- **Request Logging**: All requests logged with correlation ID
- **Error Handling**: Standardized error responses

## Database Schema

### Primary Database: PostgreSQL

#### Key Tables
1. **goals** - Core goal information with SMART criteria (JSON)
2. **goal_metrics** - Success metrics and KPIs
3. **goal_clarifications** - Q&A history for goals
4. **milestones** - Goal milestones with progress tracking
5. **milestone_progress** - Progress history records
6. **tasks** - Work breakdown items
7. **task_dependencies** - Task relationships
8. **task_estimates** - Estimation records
9. **similar_tasks** - Task similarity mappings
10. **estimation_history** - Historical accuracy data
11. **task_schedules** - Calendar blocks
12. **team_capacity** - User capacity settings
13. **capacity_allocations** - Resource allocations
14. **goal_templates** - Reusable goal patterns
15. **workflow_patterns** - Workflow templates

### Data Types & Enums
- **GoalStatus**: DRAFT, ACTIVE, ON_HOLD, COMPLETED, CANCELLED
- **MilestoneStatus**: NOT_STARTED, IN_PROGRESS, COMPLETED, BLOCKED, CANCELLED
- **TaskStatus**: NOT_STARTED, IN_PROGRESS, COMPLETED, BLOCKED, CANCELLED
- **Priority**: LOW, MEDIUM, HIGH, CRITICAL
- **MetricType**: NUMERIC, PERCENTAGE, BOOLEAN, CURRENCY, COUNT
- **ClarificationStatus**: PENDING, ANSWERED, SKIPPED
- **DependencyType**: FINISH_TO_START, START_TO_START, FINISH_TO_FINISH, START_TO_FINISH
- **EstimationMethod**: EXPERT_JUDGMENT, ANALOGY_BASED, THREE_POINT_PERT, HISTORICAL_DATA
- **WeekendPreference**: NO_WEEKENDS, LIGHT_WEEKENDS, FULL_WEEKENDS

## External Service Integration

### OpenAI Integration
- **Purpose**: Power AI features (goal translation, estimation, etc.)
- **Model**: Configurable (default: gpt-4-turbo-preview)
- **Features**:
  - SMART goal translation
  - Milestone generation
  - Task estimation
  - Schedule optimization
  - Conversation management
- **API Key Management**: 
  - Environment variable for service key
  - User-provided keys via header (X-OpenAI-API-Key)

### Email Provider Integration
- **Gmail**: OAuth2-based authentication
- **Future**: Outlook, IMAP support planned

### Calendar Integration (Planned)
- **Google Calendar**: Event synchronization
- **Outlook Calendar**: Microsoft integration

## API Standards

### Request/Response Format
```json
// Success Response
{
  "success": true,
  "data": { /* response data */ },
  "correlation_id": "unique-request-id",
  "meta": {
    "timestamp": "2024-01-15T10:00:00Z",
    "version": "v1"
  }
}

// Error Response
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { /* optional error details */ },
    "correlationId": "unique-request-id"
  }
}
```

### Pagination
```json
{
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

### Validation
- Request validation using Zod schemas
- Type-safe request/response handling
- Detailed validation error messages

## Monitoring & Logging

### Logging Configuration
- **Framework**: Winston
- **Levels**: error, warn, info, debug
- **Format**: JSON (configurable)
- **Correlation ID**: Tracked across all requests
- **File Logging**: Optional (disabled by default)

### Performance Monitoring
- Request duration tracking
- Slow request alerts (>2 seconds)
- Database query monitoring
- External API call tracking

### Health Checks
- Basic health endpoint
- Detailed health with dependency checks
- Readiness and liveness probes
- Service metrics endpoint

## Environment Configuration

### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.7

# JWT
JWT_SECRET=minimum-32-character-secret
JWT_EXPIRES_IN=24h

# Server
PORT=8085
NODE_ENV=development|production|test
API_VERSION=v1

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:8080
CORS_CREDENTIALS=true

# Redis (Optional)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=1

# External Services
EMAIL_SERVICE_URL=http://localhost:8084
CALENDAR_SERVICE_URL=http://localhost:8086

# AI Configuration
AI_CONFIDENCE_THRESHOLD=0.7
AI_MAX_RETRIES=3
AI_TIMEOUT_MS=30000

# Feature Flags
FEATURE_AI_GOAL_TRANSLATION=true
FEATURE_MILESTONE_GENERATION=true
FEATURE_WBS_AUTOMATION=true
FEATURE_DEPENDENCY_MAPPING=true
FEATURE_ESTIMATION_ENGINE=true
FEATURE_CALENDAR_INTEGRATION=true
FEATURE_CAPACITY_MANAGEMENT=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE_ENABLED=false
LOG_FILE_PATH=./logs/goal-strategy.log
```

### Configuration Management
- Environment-based configuration
- Feature flags for gradual rollout
- Zod schema validation for configs
- Development/production presets

## Development Requirements

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 13+
- Redis (optional, for caching)
- OpenAI API key

### Local Development Setup
```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Code Standards
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Jest for testing
- Module aliases (@/)

### Testing Requirements
- Unit tests for services
- Integration tests for API endpoints
- Mock external dependencies
- Test coverage targets (>80%)

## Production Considerations

### Deployment
- Docker containerization
- Environment-specific configs
- Health check endpoints
- Graceful shutdown handling

### Scaling
- Stateless service design
- Horizontal scaling ready
- Database connection pooling
- Redis caching support

### Security
- HTTPS enforcement
- API key rotation
- Request validation
- SQL injection prevention (Prisma)
- XSS protection (Helmet)

### Monitoring
- Structured logging
- Error tracking
- Performance metrics
- Uptime monitoring
- Database performance

## Future Enhancements

### Planned Features
1. **Calendar Integration**: Two-way sync with calendar services
2. **Team Collaboration**: Multi-user goal sharing
3. **Advanced Analytics**: ML-powered insights
4. **Mobile API**: Optimized endpoints for mobile
5. **Webhook Support**: Real-time notifications
6. **GraphQL API**: Alternative to REST
7. **Batch Operations**: Bulk updates
8. **Data Export**: CSV/PDF reports

### Technical Improvements
1. **Caching Layer**: Redis integration
2. **Message Queue**: Async job processing
3. **API Versioning**: Better version management
4. **Documentation**: OpenAPI/Swagger
5. **Performance**: Query optimization
6. **Testing**: E2E test suite
7. **Monitoring**: APM integration

## Appendix

### Error Codes
- `MISSING_AUTH_HEADER` - No authorization header
- `INVALID_TOKEN` - JWT validation failed
- `TOKEN_EXPIRED` - JWT expired
- `INSUFFICIENT_SCOPES` - Missing required permissions
- `GOAL_NOT_FOUND` - Goal doesn't exist or no access
- `MILESTONE_NOT_FOUND` - Milestone not found
- `INVALID_API_KEY` - OpenAI key format invalid
- `RATE_LIMIT_EXCEEDED` - Too many requests

### API Versioning Strategy
- URL-based versioning (/api/v1/)
- Backward compatibility maintained
- Deprecation notices in headers
- Migration guides provided