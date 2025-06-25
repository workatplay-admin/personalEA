# API Integration Guide

This guide covers how to integrate with PersonalEA's APIs, including authentication, endpoints, and best practices.

## Authentication

PersonalEA uses JWT (JSON Web Tokens) for API authentication.

### Obtaining Tokens

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600
}
```

### Using Tokens

Include the token in the Authorization header:

```bash
GET /api/goals
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Token Refresh

```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

## Goal Strategy API

The Goal Strategy API provides intelligent goal processing through 8 phases.

### Create a Goal

```bash
POST /api/goals
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Launch a successful startup",
  "description": "Create and launch a SaaS product",
  "timeframe": "6 months"
}
```

Response includes all 8 phases:
```json
{
  "id": "goal_123",
  "phases": {
    "goalStatement": {
      "refined": "Launch a B2B SaaS product for project management targeting small teams",
      "assumptions": ["Market demand exists", "Technical feasibility confirmed"],
      "constraints": ["6-month timeline", "Bootstrap funding"]
    },
    "smartCriteria": {
      "specific": "B2B SaaS for project management",
      "measurable": "1000 paying users, $10K MRR",
      "achievable": true,
      "relevant": true,
      "timeBound": "6 months"
    },
    "milestones": [
      {
        "title": "MVP Development",
        "targetDate": "2025-08-01",
        "criteria": ["Core features complete", "Basic UI/UX"]
      }
    ],
    "workBreakdown": {
      "tasks": [
        {
          "id": "task_1",
          "title": "Market Research",
          "subtasks": ["Competitor analysis", "User interviews"]
        }
      ]
    },
    "resourceRequirements": {
      "human": ["Developer", "Designer", "Marketer"],
      "tools": ["AWS", "Stripe", "Analytics"],
      "budget": "$5000"
    },
    "taskPrioritization": [
      {
        "taskId": "task_1",
        "priority": "high",
        "dependencies": []
      }
    ],
    "possibleBlockers": [
      {
        "risk": "Technical complexity",
        "mitigation": "Start with MVP features"
      }
    ],
    "planSummary": {
      "overview": "6-month journey to launch B2B SaaS",
      "keySuccess": ["Product-market fit", "Revenue generation"],
      "timeline": "Start: June 2025, Launch: December 2025"
    }
  }
}
```

### Update Goal Progress

```bash
PATCH /api/goals/{goalId}/progress
Authorization: Bearer <token>
Content-Type: application/json

{
  "taskId": "task_1",
  "status": "completed",
  "notes": "Market research completed, identified key features"
}
```

### Get Goal Details

```bash
GET /api/goals/{goalId}
Authorization: Bearer <token>
```

### List All Goals

```bash
GET /api/goals?status=active&sort=priority
Authorization: Bearer <token>
```

## OpenAI Chat Integration

The frontend uses OpenAI for goal clarification:

### Initialize Chat

```bash
POST /api/chat/init
Authorization: Bearer <token>
Content-Type: application/json

{
  "context": "Goal refinement session",
  "goalDraft": "I want to get fit"
}
```

### Send Message

```bash
POST /api/chat/message
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionId": "session_123",
  "message": "I want to lose 20 pounds and run a 5K"
}
```

Response:
```json
{
  "response": "Great! Let's make this more specific. What's your target timeframe?",
  "suggestions": [
    "3 months",
    "6 months",
    "1 year"
  ]
}
```

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Invalid or expired token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| RATE_LIMIT | 429 | Too many requests |
| SERVER_ERROR | 500 | Internal server error |

## Rate Limiting

API rate limits:
- **Anonymous**: 10 requests/minute
- **Authenticated**: 100 requests/minute
- **Premium**: 1000 requests/minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1625097600
```

## Best Practices

### 1. Use Pagination

```bash
GET /api/goals?page=1&limit=20
```

### 2. Request Only Needed Fields

```bash
GET /api/goals?fields=id,title,status
```

### 3. Handle Retries

```javascript
async function apiCall(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response.json();
      
      if (response.status === 429) {
        // Rate limited, wait and retry
        await new Promise(r => setTimeout(r, 2 ** i * 1000));
        continue;
      }
      
      throw new Error(`API error: ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

### 4. Cache Responses

```javascript
const cache = new Map();

async function getCachedGoal(goalId) {
  const cacheKey = `goal_${goalId}`;
  
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey);
    if (Date.now() - timestamp < 5 * 60 * 1000) { // 5 minutes
      return data;
    }
  }
  
  const data = await fetchGoal(goalId);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```

## WebSocket Events

For real-time updates:

```javascript
const ws = new WebSocket('wss://api.personalea.com/ws');

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-jwt-token'
  }));
});

ws.on('message', (data) => {
  const event = JSON.parse(data);
  
  switch(event.type) {
    case 'goal.updated':
      updateGoalUI(event.data);
      break;
    case 'task.completed':
      markTaskComplete(event.data);
      break;
  }
});
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { PersonalEA } from '@personalea/sdk';

const client = new PersonalEA({
  apiKey: process.env.PERSONALEA_API_KEY
});

// Create a goal
const goal = await client.goals.create({
  title: 'Launch startup',
  timeframe: '6 months'
});

// Update progress
await client.goals.updateProgress(goal.id, {
  taskId: 'task_1',
  status: 'completed'
});
```

### Python

```python
from personalea import PersonalEA

client = PersonalEA(api_key=os.environ['PERSONALEA_API_KEY'])

# Create a goal
goal = client.goals.create(
    title='Launch startup',
    timeframe='6 months'
)

# Get all phases
phases = goal.get_phases()
print(f"Milestones: {phases['milestones']}")
```

## Testing APIs

### Using cURL

```bash
# Test authentication
curl -X POST https://api.personalea.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Create a goal
curl -X POST https://api.personalea.com/goals \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test goal","timeframe":"3 months"}'
```

### Using Postman

Import our Postman collection:
1. Download `personalea-api.postman_collection.json`
2. Import into Postman
3. Set environment variables
4. Run collection tests

## API Versioning

We use URL versioning:
- Current: `https://api.personalea.com/v1/`
- Beta: `https://api.personalea.com/v2-beta/`

Version sunset notice provided 6 months in advance.

## Support

- **API Status**: https://status.personalea.com
- **Documentation**: https://docs.personalea.com/api
- **Support**: api-support@personalea.com