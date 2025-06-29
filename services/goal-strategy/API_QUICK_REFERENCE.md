# Goal Strategy Service API Quick Reference

## Authentication
- **Get Test Token:** `GET /api/v1/auth/test-token`

## Health Checks
- **Basic Health:** `GET /api/v1/health`
- **Detailed Health:** `GET /api/v1/health/detailed`
- **Readiness Probe:** `GET /api/v1/health/ready`
- **Liveness Probe:** `GET /api/v1/health/live`
- **Metrics:** `GET /api/v1/health/metrics`

## Goals
- **Translate Raw Goal:** `POST /api/v1/goals/translate`
- **Process Clarifications:** `POST /api/v1/goals/clarify`
- **Process Clarifications (Specific Goal):** `POST /api/v1/goals/:id/clarify`
- **Create Goal:** `POST /api/v1/goals`
- **List Goals:** `GET /api/v1/goals`
- **Get Goal Details:** `GET /api/v1/goals/:id`
- **Update Goal:** `PUT /api/v1/goals/:id`
- **Delete Goal:** `DELETE /api/v1/goals/:id`
- **SMART Analysis:** `GET /api/v1/goals/:id/smart-analysis`
- **Add Metric:** `POST /api/v1/goals/:id/metrics`
- **Get Metric Tracking:** `GET /api/v1/goals/:id/metrics/tracking`
- **Interactive Refinement:** `POST /api/v1/goals/interactive-refine`
- **Analyze Without Transform:** `POST /api/v1/goals/analyze-without-transform`
- **Contextual Help:** `POST /api/v1/goals/contextual-help`
- **Component Question:** `POST /api/v1/goals/component-question`
- **Goal Conversation:** `POST /api/v1/goals/conversation`

## Milestones
- **Generate Milestones:** `POST /api/v1/goals/:goalId/milestones/generate`
- **Create Milestone:** `POST /api/v1/goals/:goalId/milestones`
- **List Goal Milestones:** `GET /api/v1/goals/:goalId/milestones`
- **Get Milestone Details:** `GET /api/v1/milestones/:id`
- **Update Milestone:** `PUT /api/v1/milestones/:id`
- **Delete Milestone:** `DELETE /api/v1/milestones/:id`
- **Get Progress:** `GET /api/v1/milestones/:id/progress`
- **Record Progress:** `POST /api/v1/milestones/:id/progress`

## Estimations
- **Estimate Task:** `POST /api/v1/estimations/estimate`
- **Update Actual Hours:** `PUT /api/v1/estimations/:taskId/actual`
- **Batch Estimation:** `POST /api/v1/estimations/batch`
- **Get Methods:** `GET /api/v1/estimations/methods`
- **Get History:** `GET /api/v1/estimations/:taskId/history`
- **Get Accuracy Analytics:** `GET /api/v1/estimations/analytics/accuracy`

## Dependencies
- **Analyze Dependencies:** `POST /api/v1/dependencies/analyze`
- **Add Dependency:** `POST /api/v1/dependencies/add`
- **Remove Dependency:** `DELETE /api/v1/dependencies/remove`
- **Get Critical Path:** `GET /api/v1/dependencies/:milestoneId/critical-path`
- **Get Parallel Tracks:** `GET /api/v1/dependencies/:milestoneId/parallel-tracks`
- **Get Resource Conflicts:** `GET /api/v1/dependencies/:milestoneId/resource-conflicts`
- **Get Optimization:** `GET /api/v1/dependencies/:milestoneId/optimization`

## Work Breakdown Structure
- **Generate WBS:** `POST /api/v1/wbs/generate`
- **Refine WBS:** `PUT /api/v1/wbs/:milestoneId/refine`
- **Get WBS:** `GET /api/v1/wbs/:milestoneId`
- **Get WBS Metrics:** `GET /api/v1/wbs/:milestoneId/metrics`

## Feedback
- **Submit Feedback:** `POST /api/v1/feedback`
- **Get Statistics:** `GET /api/v1/feedback/stats`

## Planner
- **Generate Schedule:** `POST /api/v1/planner/schedule`
- **Get Schedule:** `GET /api/v1/planner/schedule/:goalId`
- **Update Schedule:** `PUT /api/v1/planner/schedule`
- **Get Conflicts:** `GET /api/v1/planner/conflicts/:goalId`
- **Resolve Conflict:** `POST /api/v1/planner/conflicts/resolve`
- **Get AI Suggestions:** `GET /api/v1/planner/suggestions/:goalId`
- **Get Analytics:** `GET /api/v1/planner/analytics/:goalId`

## Configuration
- **Environment Config:** `GET /api/v1/config/environment`

## Required Headers
- **All Authenticated Endpoints:** `Authorization: Bearer <token>`
- **AI Features (Optional):** `X-OpenAI-API-Key: sk-...`
- **Request Tracking (Optional):** `X-Correlation-ID: <uuid>`

## Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden / Insufficient Scopes
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error
- `503` - Service Unavailable