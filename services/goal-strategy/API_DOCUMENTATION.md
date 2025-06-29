# Goal Strategy Service API Documentation

> **🔗 Code References**: This documentation corresponds to the implementation in [`/services/goal-strategy/src/routes/`](src/routes/) 

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Headers](#headers)
- [Error Handling](#error-handling)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication-endpoints)
  - [Health Check](#health-check-endpoints)
  - [Goals](#goals-endpoints)
  - [Milestones](#milestones-endpoints)
  - [Estimations](#estimations-endpoints)
  - [Dependencies](#dependencies-endpoints)
  - [Work Breakdown Structure](#wbs-endpoints)
  - [Feedback](#feedback-endpoints)
  - [Planner](#planner-endpoints)

## Overview

The Goal Strategy Service provides a comprehensive API for managing SMART goals, milestones, task estimation, and project planning. It uses AI-powered features to help users transform raw goals into actionable plans.

## Authentication

> **🔗 Implementation**: [`src/middleware/auth.ts`](src/middleware/auth.ts) - JWT middleware and scope validation

### JWT Authentication
All API endpoints (except health checks and test token generation) require JWT authentication using Bearer tokens.

**Required Header:**
```
Authorization: Bearer <jwt_token>
```

**JWT Payload Structure:**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "scopes": ["goals:read", "goals:write", "milestones:read", "milestones:write"],
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Available Scopes
- `goals:read` - Read access to goals
- `goals:write` - Write access to goals (includes delete)
- `milestones:read` - Read access to milestones
- `milestones:write` - Write access to milestones
- `tasks:read` - Read access to tasks
- `tasks:write` - Write access to tasks
- `capacity:read` - Read access to capacity management
- `capacity:write` - Write access to capacity management
- `admin` - Administrative access

### Optional API Key for AI Features
For AI-powered features, users can provide their own OpenAI API key:

**Optional Header:**
```
X-OpenAI-API-Key: sk-...
```

## Base URL
```
https://api.personalea.com/api/v1
```

## Headers

### Required Headers
- `Content-Type: application/json` - For all POST/PUT requests
- `Authorization: Bearer <token>` - For authenticated endpoints

### Optional Headers
- `X-Correlation-ID: <uuid>` - For request tracking
- `X-OpenAI-API-Key: <api_key>` - User's OpenAI API key for AI features

### CORS Headers
The service supports the following CORS headers:
- `Content-Type`
- `Authorization`
- `X-Correlation-ID`
- `X-Requested-With`
- `Accept`
- `Origin`
- `X-OpenAI-API-Key`

## Error Handling

### Error Response Format
All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}, // Optional additional details
    "correlationId": "request-correlation-id"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `MISSING_AUTH_HEADER` | 401 | Authorization header is missing |
| `MISSING_TOKEN` | 401 | JWT token is missing |
| `TOKEN_EXPIRED` | 401 | JWT token has expired |
| `INVALID_TOKEN` | 401 | Invalid JWT token |
| `INSUFFICIENT_SCOPES` | 403 | User lacks required scopes |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `NOT_FOUND` | 404 | Resource not found |
| `DUPLICATE_RECORD` | 409 | Duplicate record exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `AI_SERVICE_ERROR` | 503 | AI service unavailable |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

### Validation Error Details
For validation errors, additional details are provided:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "title",
        "message": "Title is required",
        "code": "required"
      }
    ],
    "correlationId": "123"
  }
}
```

## API Endpoints

### Authentication Endpoints

#### Generate Test Token
```
GET /api/v1/auth/test-token
```

Generates a test JWT token for development/testing purposes.

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": "test-user-1234567890",
      "email": "test@personalea.dev",
      "scopes": ["goals:read", "goals:write", "milestones:read", "milestones:write", "tasks:read", "tasks:write"]
    },
    "expiresIn": "24h"
  },
  "correlationId": "abc123"
}
```

### Health Check Endpoints

#### Basic Health Check
```
GET /api/v1/health
```

Returns basic service health status.

**Response:**
```json
{
  "status": "healthy",
  "service": "goal-strategy-service",
  "version": "v1",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc123"
}
```

#### Detailed Health Check
```
GET /api/v1/health/detailed
```

Returns detailed health status including database and AI service connectivity.

**Response:**
```json
{
  "status": "healthy",
  "service": "goal-strategy-service",
  "version": "v1",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "duration": 125,
  "checks": {
    "service": "healthy",
    "database": "healthy",
    "ai": "healthy",
    "features": {
      "aiGoalTranslation": true,
      "milestoneGeneration": true,
      "wbsAutomation": true,
      "dependencyMapping": true,
      "estimationEngine": true,
      "calendarIntegration": false,
      "capacityManagement": false
    }
  },
  "correlationId": "abc123"
}
```

#### Readiness Probe
```
GET /api/v1/health/ready
```

Kubernetes readiness probe endpoint.

#### Liveness Probe
```
GET /api/v1/health/live
```

Kubernetes liveness probe endpoint.

#### Metrics
```
GET /api/v1/health/metrics
```

Returns service metrics including database counts and resource usage.

### Goals Endpoints

> **🔗 Implementation**: [`src/routes/goals.ts`](src/routes/goals.ts) - Goals API route handlers
> **🔗 Service Logic**: [`src/services/smart-goal-processor.ts`](src/services/smart-goal-processor.ts) - SMART goal processing engine

#### Translate Raw Goal to SMART Format
```
POST /api/v1/goals/translate
```

Converts a raw goal into SMART criteria using AI.

**Request Body:**
```json
{
  "raw_goal": "I want to lose weight",
  "context": {
    "timeframe": "3 months",
    "resources": ["gym membership", "nutritionist"],
    "constraints": ["busy schedule", "limited budget"],
    "priority": "HIGH"
  },
  "mode": "interactive" // or "automatic"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "goal-123",
    "title": "Lose 15 pounds in 3 months through diet and exercise",
    "description": "...",
    "criteria": {
      "specific": {
        "value": "Lose 15 pounds of body weight",
        "confidence": 0.9,
        "missing": []
      },
      "measurable": {
        "value": "Track weight loss weekly, aiming for 1.25 pounds per week",
        "metrics": ["Weekly weigh-ins", "Body measurements"],
        "confidence": 0.95,
        "missing": []
      },
      "achievable": {
        "value": "With gym membership and nutritionist support, losing 1-2 pounds per week is realistic",
        "confidence": 0.85,
        "missing": []
      },
      "relevant": {
        "value": "Improving health and fitness for better quality of life",
        "confidence": 0.8,
        "missing": ["Specific health motivations"]
      },
      "timeBound": {
        "value": "Complete by April 1, 2024 (3 months)",
        "deadline": "2024-04-01",
        "confidence": 1.0,
        "missing": []
      }
    },
    "missingCriteria": ["Specific health motivations"],
    "clarificationQuestions": [
      {
        "question": "What specific health benefits are you hoping to achieve?",
        "smartCriterion": "relevant"
      }
    ],
    "confidence": 0.88,
    "mode": "interactive",
    "needsRefinement": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Process Clarifications for Goal
```
POST /api/v1/goals/clarify
```

Process clarification answers to improve SMART goal criteria.

**Request Body:**
```json
{
  "goal_id": "goal-123",
  "answers": [
    {
      "question": "What specific health benefits are you hoping to achieve?",
      "answer": "Lower blood pressure and increase energy levels",
      "smartCriterion": "relevant"
    }
  ]
}
```

#### Create Goal
```
POST /api/v1/goals
```

Create a new goal with SMART criteria.

**Request Body:**
```json
{
  "title": "Lose 15 pounds in 3 months",
  "description": "Health improvement goal",
  "smart_criteria": {
    "specific": {
      "value": "Lose 15 pounds of body weight",
      "confidence": 0.9
    },
    "measurable": {
      "value": "Track weight loss weekly",
      "metrics": ["Weekly weigh-ins"],
      "confidence": 0.95
    },
    "achievable": {
      "value": "Realistic with diet and exercise",
      "confidence": 0.85
    },
    "relevant": {
      "value": "Improve health and energy",
      "confidence": 0.9
    },
    "timeBound": {
      "value": "3 months",
      "deadline": "2024-04-01",
      "confidence": 1.0
    }
  },
  "priority": "HIGH",
  "category": "Health",
  "tags": ["fitness", "wellness"],
  "target_date": "2024-04-01T00:00:00.000Z"
}
```

#### List Goals
```
GET /api/v1/goals?page=1&limit=20&status=ACTIVE&category=Health&priority=HIGH
```

List user's goals with filtering and pagination.

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20, max: 100) - Items per page
- `status` (optional) - Filter by status: DRAFT, ACTIVE, ON_HOLD, COMPLETED, CANCELLED
- `category` (optional) - Filter by category
- `priority` (optional) - Filter by priority: LOW, MEDIUM, HIGH, CRITICAL

**Response:**
```json
{
  "success": true,
  "data": {
    "goals": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  },
  "correlation_id": "abc123"
}
```

#### Get Goal Details
```
GET /api/v1/goals/:id
```

Get specific goal with full details including milestones and metrics.

#### Update Goal
```
PUT /api/v1/goals/:id
```

Update goal properties.

**Request Body:**
```json
{
  "title": "Updated title",
  "status": "COMPLETED",
  "priority": "CRITICAL",
  "smart_criteria": {...}
}
```

#### Delete Goal
```
DELETE /api/v1/goals/:id
```

Delete a goal and all associated data.

#### Get SMART Analysis
```
GET /api/v1/goals/:id/smart-analysis
```

Get detailed SMART criteria analysis for a goal.

#### Add Goal Metric
```
POST /api/v1/goals/:id/metrics
```

Add a success metric to a goal.

**Request Body:**
```json
{
  "name": "Weight Loss",
  "type": "NUMERIC",
  "target_value": 15,
  "baseline_value": 180,
  "unit": "pounds",
  "measurement_frequency": "weekly",
  "is_primary": true
}
```

**Metric Types:** NUMERIC, PERCENTAGE, BOOLEAN, CURRENCY, COUNT

#### Get Metric Tracking
```
GET /api/v1/goals/:id/metrics/tracking
```

Get current tracking status for all goal metrics.

#### Interactive Goal Refinement
```
POST /api/v1/goals/interactive-refine
```

Refine a specific SMART component through interactive chat.

**Request Body:**
```json
{
  "goal_id": "goal-123",
  "component": "measurable",
  "user_response": "I want to track body fat percentage too",
  "conversation_history": []
}
```

#### Analyze Without Transform
```
POST /api/v1/goals/analyze-without-transform
```

Analyze a goal without automatic SMART transformation.

#### Contextual Help
```
POST /api/v1/goals/contextual-help
```

Get contextual help during goal refinement.

**Request Body:**
```json
{
  "goalTitle": "Lose weight",
  "componentKey": "measurable",
  "conversationHistory": [],
  "goalContext": {}
}
```

#### Component Question
```
POST /api/v1/goals/component-question
```

Generate dynamic questions for specific SMART components.

#### Goal Conversation
```
POST /api/v1/goals/conversation
```

LLM-first conversation endpoint for goal refinement.

**Request Body:**
```json
{
  "message": "I want to improve my fitness",
  "conversation_id": "conv-123",
  "context": {}
}
```

### Milestones Endpoints

#### Generate Milestones
```
POST /api/v1/goals/:goalId/milestones/generate
```

Generate AI-powered milestone breakdown for a goal.

**Request Body:**
```json
{
  "preferences": {
    "milestone_count": 4,
    "distribution_strategy": "EVEN",
    "include_buffer_time": true
  }
}
```

**Distribution Strategies:** EVEN, FRONT_LOADED, BACK_LOADED

#### Create Milestone
```
POST /api/v1/goals/:goalId/milestones
```

Manually create a milestone for a goal.

**Request Body:**
```json
{
  "title": "Complete initial assessment",
  "description": "Baseline measurements and planning",
  "target_date": "2024-02-01T00:00:00.000Z",
  "completion_criteria": "All baseline metrics recorded",
  "order_index": 1,
  "estimated_effort": 5
}
```

#### List Goal Milestones
```
GET /api/v1/goals/:goalId/milestones
```

Get all milestones for a specific goal.

#### Get Milestone Details
```
GET /api/v1/milestones/:id
```

Get detailed information about a specific milestone.

#### Update Milestone
```
PUT /api/v1/milestones/:id
```

Update milestone properties.

**Request Body:**
```json
{
  "title": "Updated title",
  "status": "IN_PROGRESS",
  "progress_percentage": 50,
  "notes": "Making good progress"
}
```

**Status Values:** NOT_STARTED, IN_PROGRESS, COMPLETED, BLOCKED, CANCELLED

#### Delete Milestone
```
DELETE /api/v1/milestones/:id
```

Delete a milestone.

#### Get Milestone Progress
```
GET /api/v1/milestones/:id/progress
```

Get progress tracking information for a milestone.

#### Record Milestone Progress
```
POST /api/v1/milestones/:id/progress
```

Record a progress update for a milestone.

**Request Body:**
```json
{
  "progress_percentage": 75,
  "notes": "Completed 3 out of 4 tasks"
}
```

### Estimations Endpoints

#### Estimate Task
```
POST /api/v1/estimations/estimate
```

Generate comprehensive task estimation using multiple methods.

**Request Body:**
```json
{
  "taskDescription": "Implement user authentication system",
  "complexity": "COMPLEX",
  "skills": ["Backend Development", "Security", "Database Design"],
  "methods": ["EXPERT_JUDGMENT", "THREE_POINT_PERT"],
  "includeUncertainty": true,
  "confidenceLevel": 0.95
}
```

**Complexity Levels:** SIMPLE, MODERATE, COMPLEX

**Estimation Methods:**
- EXPERT_JUDGMENT - AI-powered estimation
- ANALOGY - Based on similar tasks
- THREE_POINT_PERT - Optimistic/likely/pessimistic
- PARAMETRIC - Statistical estimation
- BOTTOM_UP - Component breakdown

#### Update Actual Hours
```
PUT /api/v1/estimations/:taskId/actual
```

Update estimation with actual completion data for learning.

**Request Body:**
```json
{
  "actualHours": 24.5,
  "completionNotes": "Additional security requirements added complexity"
}
```

#### Batch Estimation
```
POST /api/v1/estimations/batch
```

Estimate multiple tasks in a single request (max 10).

**Request Body:**
```json
{
  "tasks": [
    {
      "taskDescription": "Setup database schema",
      "complexity": "MODERATE",
      "skills": ["Database Design"]
    },
    {
      "taskDescription": "Create API endpoints",
      "complexity": "SIMPLE",
      "skills": ["Backend Development"]
    }
  ]
}
```

#### Get Estimation Methods
```
GET /api/v1/estimations/methods
```

Get available estimation methods and their descriptions.

#### Get Estimation History
```
GET /api/v1/estimations/:taskId/history
```

Get historical estimation data for a task.

#### Get Accuracy Analytics
```
GET /api/v1/estimations/analytics/accuracy
```

Get overall estimation accuracy analytics.

### Dependencies Endpoints

#### Analyze Dependencies
```
POST /api/v1/dependencies/analyze
```

Analyze task dependencies and generate critical path.

**Request Body:**
```json
{
  "milestoneId": "milestone-123",
  "analysisType": "CRITICAL_PATH",
  "includeBuffers": true,
  "bufferPercentage": 20
}
```

**Analysis Types:** CRITICAL_PATH, PARALLEL_OPTIMIZATION, RESOURCE_LEVELING

#### Add Dependency
```
POST /api/v1/dependencies/add
```

Add a task dependency relationship.

**Request Body:**
```json
{
  "predecessorId": "task-123",
  "successorId": "task-456",
  "dependencyType": "FINISH_TO_START",
  "lag": 0,
  "isHard": true
}
```

**Dependency Types:**
- FINISH_TO_START (default)
- START_TO_START
- FINISH_TO_FINISH
- START_TO_FINISH

#### Remove Dependency
```
DELETE /api/v1/dependencies/remove
```

Remove a task dependency.

**Request Body:**
```json
{
  "predecessorId": "task-123",
  "successorId": "task-456"
}
```

#### Get Critical Path
```
GET /api/v1/dependencies/:milestoneId/critical-path
```

Get the critical path for a milestone.

#### Get Parallel Tracks
```
GET /api/v1/dependencies/:milestoneId/parallel-tracks
```

Get parallel execution tracks for optimized scheduling.

#### Get Resource Conflicts
```
GET /api/v1/dependencies/:milestoneId/resource-conflicts
```

Identify resource conflicts in the schedule.

#### Get Optimization Suggestions
```
GET /api/v1/dependencies/:milestoneId/optimization
```

Get schedule optimization suggestions.

### Work Breakdown Structure (WBS) Endpoints

#### Generate WBS
```
POST /api/v1/wbs/generate
```

Generate Work Breakdown Structure for a milestone using AI.

**Request Body:**
```json
{
  "milestoneId": "milestone-123",
  "maxDepth": 3,
  "maxTasksPerLevel": 5,
  "targetTaskSize": 2,
  "includeTemplates": true
}
```

**Parameters:**
- `maxDepth` (optional, 1-5) - Maximum hierarchy depth
- `maxTasksPerLevel` (optional, 2-10) - Max tasks per level
- `targetTaskSize` (optional, 0.25-8 hours) - Target task duration
- `includeTemplates` (optional) - Include task templates

#### Refine WBS
```
PUT /api/v1/wbs/:milestoneId/refine
```

Refine existing Work Breakdown Structure.

**Request Body:**
```json
{
  "refinements": [
    {
      "taskId": "task-123",
      "action": "SPLIT",
      "parameters": {
        "splitInto": 3,
        "reason": "Task too complex"
      }
    }
  ]
}
```

**Actions:** SPLIT, MERGE, ADJUST_ESTIMATE, ADD_DEPENDENCY

#### Get WBS
```
GET /api/v1/wbs/:milestoneId
```

Get existing Work Breakdown Structure for a milestone.

#### Get WBS Metrics
```
GET /api/v1/wbs/:milestoneId/metrics
```

Get WBS analysis metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTasks": 25,
    "totalEstimatedHours": 120,
    "maxDepth": 3,
    "averageTaskSize": 4.8,
    "complexityDistribution": {
      "SIMPLE": 10,
      "MODERATE": 12,
      "COMPLEX": 3
    },
    "skillsRequired": ["Backend Development", "Testing", "Documentation"],
    "criticalPath": ["task-1", "task-5", "task-12"]
  }
}
```

### Feedback Endpoints

#### Submit Feedback
```
POST /api/v1/feedback
```

Submit user feedback for the goal breakdown workflow.

**Request Body:**
```json
{
  "sessionId": "session-123",
  "originalGoal": "Build a mobile app",
  "smartGoalRating": 5,
  "smartGoalFeedback": "Very helpful transformation",
  "milestonesRating": 4,
  "milestonesFeedback": "Good breakdown but could be more detailed",
  "wbsRating": 5,
  "wbsFeedback": "Excellent task decomposition",
  "estimationRating": 3,
  "estimationFeedback": "Estimates seem a bit optimistic",
  "overallRating": 4,
  "overallFeedback": "Great tool overall",
  "wouldUseAgain": true,
  "improvements": "Add more customization options",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Required Fields:** sessionId, originalGoal, overallRating
**Rating Scale:** 1-5

#### Get Feedback Statistics
```
GET /api/v1/feedback/stats
```

Get basic feedback statistics (placeholder endpoint for testing).

### Planner Endpoints

#### Generate Schedule
```
POST /api/v1/planner/schedule
```

Generate optimized schedule for a goal.

**Request Body:**
```json
{
  "goal_id": "goal-123",
  "working_hours": {
    "monday": {
      "enabled": true,
      "start": "09:00",
      "end": "17:00"
    },
    "tuesday": {
      "enabled": true,
      "start": "09:00",
      "end": "17:00"
    }
  },
  "constraints": {
    "max_hours_per_day": 8,
    "max_consecutive_hours": 2,
    "break_duration_minutes": 15,
    "preferred_task_duration_hours": 1,
    "avoid_context_switching": true
  },
  "preferences": {
    "energy_levels": {
      "morning": "HIGH",
      "afternoon": "MEDIUM",
      "evening": "LOW"
    },
    "task_type_preferences": {
      "creative": ["morning"],
      "analytical": ["morning", "afternoon"],
      "administrative": ["afternoon"],
      "communication": ["afternoon"]
    }
  },
  "start_date": "2024-01-01T00:00:00.000Z",
  "end_date": "2024-03-01T00:00:00.000Z"
}
```

#### Get Schedule
```
GET /api/v1/planner/schedule/:goalId
```

Get current schedule for a goal.

#### Update Schedule
```
PUT /api/v1/planner/schedule
```

Update existing schedule.

**Request Body:**
```json
{
  "schedule_id": "schedule-123",
  "updates": [
    {
      "task_id": "task-456",
      "new_start_time": "2024-01-02T10:00:00.000Z",
      "new_end_time": "2024-01-02T12:00:00.000Z",
      "reason": "Team meeting conflict"
    }
  ]
}
```

#### Get Scheduling Conflicts
```
GET /api/v1/planner/conflicts/:goalId
```

Get scheduling conflicts for a goal.

#### Resolve Conflict
```
POST /api/v1/planner/conflicts/resolve
```

Resolve a scheduling conflict.

**Request Body:**
```json
{
  "conflict_id": "conflict-123",
  "resolution_strategy": "RESCHEDULE_TASK",
  "parameters": {
    "new_time_slot": "2024-01-03T14:00:00.000Z"
  }
}
```

**Resolution Strategies:** RESCHEDULE_TASK, SPLIT_TASK, EXTEND_DEADLINE, REDUCE_SCOPE

#### Get AI Scheduling Suggestions
```
GET /api/v1/planner/suggestions/:goalId
```

Get AI-powered scheduling suggestions. Requires X-OpenAI-API-Key header for custom API key.

#### Get Schedule Analytics
```
GET /api/v1/planner/analytics/:goalId
```

Get scheduling analytics and insights.

**Response:**
```json
{
  "analytics": {
    "total_scheduled_hours": 120,
    "average_daily_hours": 6,
    "task_distribution": {
      "morning": 45,
      "afternoon": 60,
      "evening": 15
    },
    "efficiency_score": 0.85,
    "buffer_utilization": 0.3,
    "critical_path_percentage": 0.4,
    "recommendations": [
      "Consider redistributing afternoon tasks",
      "Add more buffer time for complex tasks"
    ]
  }
}
```

### Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Window:** 15 minutes
- **Max Requests:** 100 per window
- **Headers:** Standard rate limit headers are included in responses

When rate limit is exceeded:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests from this IP, please try again later."
  }
}
```

### Environment Configuration Endpoint

```
GET /api/v1/config/environment
```

Returns environment configuration status (always reports no configuration to force manual setup).

**Response:**
```json
{
  "success": true,
  "data": {
    "environmentConfigured": false,
    "message": "No environment API key configured"
  }
}
```

## Security Considerations

1. **JWT Tokens:** Should be stored securely and never exposed in URLs
2. **API Keys:** OpenAI API keys should be transmitted only via HTTPS
3. **CORS:** Configured to accept only allowed origins
4. **Rate Limiting:** Prevents abuse and ensures service availability
5. **Input Validation:** All inputs are validated using Zod schemas
6. **SQL Injection:** Protected via Prisma ORM parameterized queries

## Performance Considerations

1. **Request Logging:** All requests longer than 2 seconds are logged
2. **Timeouts:** AI requests have configurable timeouts (default 30s)
3. **Pagination:** List endpoints support pagination to limit response size
4. **Batch Operations:** Batch endpoints available for bulk operations
5. **Connection Pooling:** Database connections are pooled for efficiency

## Best Practices

1. **Always include correlation IDs** for request tracking
2. **Use appropriate scopes** - request only needed permissions
3. **Handle rate limits gracefully** with exponential backoff
4. **Validate inputs client-side** to reduce server load
5. **Use batch endpoints** when processing multiple items
6. **Cache responses** where appropriate to reduce API calls
7. **Monitor rate limit headers** to avoid hitting limits