# Chat API Reliability Fix Implementation Plan

## Root Cause
The backend returns 503 (Service Unavailable) for ANY OpenAI API error, causing the frontend to display "service unavailable" messages. This is compounded by database connection exhaustion from multiple Prisma client instances.

## Implementation Steps

### 1. **CRITICAL - Fix Error Handler** (5 minutes)
- File: `services/goal-strategy/src/middleware/error-handler.ts`
- Line: 139
- Change: Return 502 (Bad Gateway) instead of 503 for OpenAI errors
- Impact: Frontend will know backend is running even when OpenAI fails

### 2. **HIGH - Implement Prisma Singleton** (15 minutes)
- Create: `services/goal-strategy/src/utils/db.ts`
- Update all files to import from singleton instead of creating new clients
- Add connection pool parameters to DATABASE_URL

### 3. **HIGH - Add OpenAI Retry Logic** (20 minutes)
- File: `services/goal-strategy/src/routes/goals-chat-endpoints.ts`
- Update `callOpenAI` function with exponential backoff
- Add timeout handling
- Skip retries for 4xx errors

### 4. **MEDIUM - Update Frontend Error Handling** (15 minutes)
- File: `testing/goal-strategy-test/src/services/api.ts`
- Differentiate between 502 (retry) and 503 (service down)
- File: `testing/goal-strategy-test/src/components/ChatClarification.tsx`
- Add auto-retry logic for transient errors

### 5. **Testing Steps**
1. Test with invalid API key - should return 502, not 503
2. Test with rate limit - should retry automatically
3. Test with network timeout - should retry with backoff
4. Monitor database connections - should stay stable

## Quick Win
Just implementing step 1 (changing 503 to 502) will immediately fix the "service unavailable" issue. The other steps improve reliability and performance.

## Database Connection String Update
Add to .env files:
```
DATABASE_URL="postgresql://user:password@host:port/db?pool_timeout=20&connection_limit=10"
```

## Monitoring
After implementation:
- Check `/health/detailed` endpoint for connection pool status
- Monitor error logs for retry patterns
- Track 502 vs 503 error rates