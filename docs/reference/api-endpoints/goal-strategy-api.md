# Goal Strategy API Reference

The Goal Strategy API provides intelligent 8-phase goal processing with AI-powered refinement, milestone generation, and task planning.

## Base URL
```
Development: http://localhost:3001/api
Staging: https://staging-api.personalea.com/api
Production: https://api.personalea.com/api
```

## Authentication

All endpoints require JWT authentication except where noted.

```http
Authorization: Bearer <jwt-token>
```

## Endpoints

### Goals

#### Create Goal
Creates a new goal and processes it through all 8 phases.

```http
POST /goals
```

**Request Body:**
```json
{
  "title": "string",
  "description": "string (optional)",
  "timeframe": "string",
  "category": "string (optional)",
  "context": "object (optional)"
}
```

**Response (201 Created):**
```json
{
  "id": "goal_abc123",
  "userId": "user_123",
  "title": "Launch a successful SaaS product",
  "status": "active",
  "createdAt": "2025-06-25T10:00:00Z",
  "phases": {
    "goalStatement": {
      "original": "Launch a SaaS product",
      "refined": "Launch a B2B project management SaaS targeting small teams with 1000 paying customers within 6 months",
      "assumptions": [
        "Market demand exists for simplified project management",
        "Target audience willing to pay $29-99/month",
        "Technical expertise available"
      ],
      "constraints": [
        "6-month timeline",
        "Bootstrap funding only",
        "Team of 3 people"
      ],
      "successMetrics": [
        "1000 paying customers",
        "$30K MRR",
        "4.5+ star rating"
      ]
    },
    "smartCriteria": {
      "specific": {
        "value": true,
        "details": "B2B SaaS for project management targeting small teams (5-20 people)"
      },
      "measurable": {
        "value": true,
        "details": "1000 customers, $30K MRR, 4.5 star rating"
      },
      "achievable": {
        "value": true,
        "details": "Realistic with focused MVP and strong marketing"
      },
      "relevant": {
        "value": true,
        "details": "Addresses real pain point in small team collaboration"
      },
      "timeBound": {
        "value": true,
        "details": "6-month timeline with clear monthly targets"
      },
      "overallScore": 0.95
    },
    "milestones": [
      {
        "id": "ms_1",
        "title": "MVP Development Complete",
        "description": "Core features implemented and tested",
        "targetDate": "2025-08-25",
        "criteria": [
          "Task management functional",
          "User authentication working",
          "Basic UI complete"
        ],
        "dependencies": []
      },
      {
        "id": "ms_2",
        "title": "Beta Launch",
        "description": "Private beta with 50 users",
        "targetDate": "2025-09-25",
        "criteria": [
          "50 active beta users",
          "Feedback system implemented",
          "Core bugs fixed"
        ],
        "dependencies": ["ms_1"]
      },
      {
        "id": "ms_3",
        "title": "Public Launch",
        "description": "Full product launch with payment",
        "targetDate": "2025-10-25",
        "criteria": [
          "Payment integration complete",
          "Marketing site live",
          "100 paying customers"
        ],
        "dependencies": ["ms_2"]
      }
    ],
    "workBreakdown": {
      "structure": [
        {
          "id": "wbs_1",
          "title": "Product Development",
          "level": 1,
          "children": [
            {
              "id": "wbs_1_1",
              "title": "Backend Development",
              "level": 2,
              "tasks": [
                {
                  "id": "task_1",
                  "title": "Set up API framework",
                  "estimation": "16 hours",
                  "skills": ["Node.js", "Express"]
                },
                {
                  "id": "task_2",
                  "title": "Implement authentication",
                  "estimation": "24 hours",
                  "skills": ["JWT", "OAuth"]
                }
              ]
            },
            {
              "id": "wbs_1_2",
              "title": "Frontend Development",
              "level": 2,
              "tasks": [
                {
                  "id": "task_3",
                  "title": "Create React app structure",
                  "estimation": "8 hours",
                  "skills": ["React", "TypeScript"]
                }
              ]
            }
          ]
        }
      ],
      "totalTasks": 47,
      "estimatedHours": 960
    },
    "resourceRequirements": {
      "human": [
        {
          "role": "Full-stack Developer",
          "quantity": 2,
          "skills": ["React", "Node.js", "PostgreSQL"],
          "allocation": "100%"
        },
        {
          "role": "UI/UX Designer",
          "quantity": 1,
          "skills": ["Figma", "User Research"],
          "allocation": "50%"
        }
      ],
      "technical": [
        {
          "category": "Infrastructure",
          "items": ["AWS/GCP", "PostgreSQL", "Redis", "CDN"]
        },
        {
          "category": "Tools",
          "items": ["GitHub", "Figma", "Stripe", "SendGrid"]
        }
      ],
      "financial": {
        "estimated": "$5000-7000",
        "breakdown": {
          "infrastructure": "$500/month",
          "tools": "$200/month",
          "marketing": "$1000/month"
        }
      }
    },
    "taskPrioritization": {
      "method": "MoSCoW + Dependencies",
      "priorities": [
        {
          "level": "must-have",
          "tasks": ["task_1", "task_2", "task_3"],
          "reason": "Core functionality required for MVP"
        },
        {
          "level": "should-have",
          "tasks": ["task_4", "task_5"],
          "reason": "Important for user experience"
        },
        {
          "level": "could-have",
          "tasks": ["task_6", "task_7"],
          "reason": "Nice to have features"
        }
      ],
      "criticalPath": ["task_1", "task_2", "task_8", "task_15"]
    },
    "possibleBlockers": [
      {
        "id": "risk_1",
        "description": "Technical complexity in real-time collaboration",
        "probability": "medium",
        "impact": "high",
        "mitigation": "Start with async collaboration, add real-time in v2"
      },
      {
        "id": "risk_2",
        "description": "User acquisition challenges",
        "probability": "high",
        "impact": "high",
        "mitigation": "Build email list early, content marketing, ProductHunt launch"
      }
    ],
    "planSummary": {
      "overview": "6-month journey from concept to 1000 paying customers for B2B SaaS",
      "keyPhases": [
        "Months 1-2: MVP Development",
        "Month 3: Beta Testing",
        "Month 4: Public Launch",
        "Months 5-6: Growth & Optimization"
      ],
      "successFactors": [
        "Focus on core features that solve real problems",
        "Continuous user feedback integration",
        "Aggressive but sustainable marketing"
      ],
      "firstSteps": [
        "Set up development environment",
        "Create detailed wireframes",
        "Begin backend API development"
      ]
    }
  }
}
```

#### Get Goal by ID
Retrieves a specific goal with all phases.

```http
GET /goals/{goalId}
```

**Response (200 OK):**
```json
{
  "id": "goal_abc123",
  "userId": "user_123",
  "title": "Launch a successful SaaS product",
  "status": "active",
  "progress": {
    "overall": 0.35,
    "milestones": 1,
    "tasks": 12
  },
  "phases": { /* Same as create response */ }
}
```

#### List User Goals
Retrieves all goals for the authenticated user.

```http
GET /goals
```

**Query Parameters:**
- `status` (optional): Filter by status (active, completed, archived)
- `category` (optional): Filter by category
- `sort` (optional): Sort field (createdAt, updatedAt, priority)
- `order` (optional): Sort order (asc, desc)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (200 OK):**
```json
{
  "goals": [
    {
      "id": "goal_abc123",
      "title": "Launch SaaS product",
      "status": "active",
      "progress": 0.35,
      "createdAt": "2025-06-25T10:00:00Z",
      "milestoneCount": 3,
      "nextMilestone": {
        "title": "MVP Complete",
        "dueDate": "2025-08-25"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

#### Update Goal
Updates goal metadata (not phases).

```http
PATCH /goals/{goalId}
```

**Request Body:**
```json
{
  "title": "Updated title (optional)",
  "status": "active|paused|completed|archived (optional)",
  "category": "Updated category (optional)"
}
```

#### Delete Goal
Archives a goal (soft delete).

```http
DELETE /goals/{goalId}
```

**Response (204 No Content)**

### Progress Tracking

#### Update Task Progress
Updates the progress of a specific task.

```http
POST /goals/{goalId}/tasks/{taskId}/progress
```

**Request Body:**
```json
{
  "status": "not_started|in_progress|completed|blocked",
  "percentComplete": 75,
  "hoursSpent": 12,
  "notes": "Implemented core functionality, testing remains",
  "blockers": ["Waiting for API documentation"]
}
```

#### Update Milestone Status
Updates milestone completion status.

```http
POST /goals/{goalId}/milestones/{milestoneId}/complete
```

**Request Body:**
```json
{
  "completedDate": "2025-08-20T10:00:00Z",
  "notes": "Completed ahead of schedule",
  "metrics": {
    "tasksCompleted": 15,
    "actualHours": 180
  }
}
```

### Chat Integration

#### Initialize Chat Session
Starts a chat session for goal refinement.

```http
POST /chat/sessions
```

**Request Body:**
```json
{
  "context": "goal_refinement",
  "goalDraft": {
    "title": "I want to get fit",
    "timeframe": "3 months"
  }
}
```

**Response (201 Created):**
```json
{
  "sessionId": "chat_session_123",
  "token": "session_token_abc",
  "expiresAt": "2025-06-25T12:00:00Z"
}
```

#### Send Chat Message
Sends a message in an active chat session.

```http
POST /chat/sessions/{sessionId}/messages
```

**Request Body:**
```json
{
  "message": "I want to lose 20 pounds and run a 5K"
}
```

**Response (200 OK):**
```json
{
  "messageId": "msg_123",
  "response": "Great! Let's make this more specific. What's your current fitness level?",
  "suggestions": [
    "I'm a beginner",
    "I exercise occasionally",
    "I'm already fairly active"
  ],
  "refinedGoal": {
    "title": "Lose 20 pounds and complete a 5K run",
    "measurableTargets": ["20 pound weight loss", "5K completion time"],
    "suggestedTimeframe": "3-4 months"
  }
}
```

#### Complete Chat Session
Finalizes the chat and creates a goal.

```http
POST /chat/sessions/{sessionId}/complete
```

**Response (200 OK):**
```json
{
  "goalId": "goal_new_123",
  "finalGoal": {
    "title": "Lose 20 pounds and run a 5K in 3 months",
    "refined": true
  }
}
```

### Analytics

#### Get Goal Analytics
Retrieves analytics for a specific goal.

```http
GET /goals/{goalId}/analytics
```

**Response (200 OK):**
```json
{
  "progress": {
    "overall": 0.45,
    "trend": "improving",
    "projectedCompletion": "2025-12-15"
  },
  "milestones": {
    "completed": 1,
    "total": 3,
    "onTrack": 2,
    "atRisk": 0
  },
  "tasks": {
    "completed": 23,
    "inProgress": 5,
    "total": 47,
    "averageCompletionTime": "18 hours"
  },
  "timeTracking": {
    "estimated": 960,
    "actual": 432,
    "efficiency": 0.95
  }
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Goal or resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| GOAL_LIMIT_REACHED | 403 | User has reached goal limit |
| PROCESSING_ERROR | 500 | Error during AI processing |
| RATE_LIMIT | 429 | Too many requests |

## Webhooks

Configure webhooks to receive real-time updates:

```http
POST /webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhook",
  "events": ["goal.created", "milestone.completed", "task.updated"],
  "secret": "your-webhook-secret"
}
```

### Webhook Events

- `goal.created` - New goal created
- `goal.updated` - Goal metadata updated
- `milestone.completed` - Milestone marked complete
- `task.updated` - Task progress updated
- `goal.completed` - Goal marked complete

### Webhook Payload

```json
{
  "event": "milestone.completed",
  "timestamp": "2025-06-25T10:00:00Z",
  "data": {
    "goalId": "goal_123",
    "milestoneId": "ms_1",
    "milestone": { /* milestone data */ }
  }
}
```

## Rate Limits

| Endpoint | Rate Limit |
|----------|------------|
| Goal Creation | 10 per hour |
| Goal Updates | 100 per hour |
| Chat Messages | 60 per hour |
| Analytics | 100 per hour |
| General API | 1000 per hour |

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1719316800
```