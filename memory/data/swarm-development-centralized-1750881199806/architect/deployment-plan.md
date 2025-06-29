# PersonalEA Deployment Plan

## Executive Summary
PersonalEA is a microservices-based personal assistant application with partial implementation. The system can be deployed for user testing with significant limitations.

## Pre-Deployment Requirements

### 1. Environment Setup
- **Node.js**: Version 18+ required
- **Docker**: Latest version with docker-compose
- **PostgreSQL**: 14+ (handled by Docker)
- **Redis**: 7+ (handled by Docker)

### 2. API Keys Required
- **OpenAI API Key**: MANDATORY for goal processing functionality
- **Gmail API Credentials**: Optional for email integration

### 3. Security Configuration
Must configure in `.env.user`:
- JWT_SECRET (32+ characters)
- SESSION_SECRET (32+ characters)
- EMAIL_ENCRYPTION_KEY (exactly 32 characters)
- Database and Redis passwords

## Deployment Steps

### Option 1: Docker Compose Deployment (Recommended)

1. **Clone repository and navigate to project root**
   ```bash
   cd /workspaces/personalEA
   ```

2. **Create environment configuration**
   ```bash
   cp .env.user.example .env.user
   # Edit .env.user with required values
   ```

3. **Start services using docker-compose**
   ```bash
   docker-compose -f docker-compose.staging.yml up -d
   ```

4. **Verify deployment**
   ```bash
   # Check service health
   curl http://localhost:3000/api/v1/health  # Goal Strategy Service
   curl http://localhost:3001/health         # Email Service
   curl http://localhost:5173                # Frontend UI
   ```

### Option 2: Manual Service Deployment

1. **Start database and cache**
   ```bash
   # PostgreSQL
   docker run -d --name personalea-db \
     -e POSTGRES_DB=personalea \
     -e POSTGRES_USER=personalea \
     -e POSTGRES_PASSWORD=personalea \
     -p 5432:5432 \
     postgres:14-alpine

   # Redis
   docker run -d --name personalea-redis \
     -p 6379:6379 \
     redis:7-alpine
   ```

2. **Install and start Goal Strategy Service**
   ```bash
   cd services/goal-strategy
   npm install
   npx prisma migrate deploy
   npm run build
   npm start
   ```

3. **Install and start Email Processing Service**
   ```bash
   cd services/email-processing
   npm install
   npx prisma migrate deploy
   npm run build
   npm start
   ```

4. **Install and start Frontend Testing UI**
   ```bash
   cd testing/goal-strategy-test
   npm install
   npm run dev
   ```

### Option 3: Automated Startup Script

```bash
# Use the comprehensive startup script
./automation/scripts/start-all.sh
```

## Service Dependencies & Startup Order

1. **Infrastructure Services** (Must start first)
   - PostgreSQL database
   - Redis cache

2. **Backend Services** (Start after infrastructure)
   - Goal Strategy Service (port 3000)
   - Email Processing Service (port 3001)

3. **Frontend Applications** (Start last)
   - Testing UI (port 5173)
   - Health Monitor (port 8080)

## Port Allocation

| Service | Port | Purpose |
|---------|------|---------|
| Goal Strategy API | 3000 | Main goal processing API |
| Email Service API | 3001 | Email processing API |
| Frontend UI | 5173 | User interface |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache & Queue |
| Health Monitor | 8080 | Service health dashboard |

## Critical Limitations

### Missing Components
1. **Calendar Service**: Not implemented - blocks calendar integration features
2. **Production UI**: Only testing UI available
3. **Data Sovereignty**: No local AI processing - requires external API keys

### Functional Limitations
1. **Partial Workflow**: Only goals and email processing work
2. **No Calendar Sync**: Cannot create calendar events
3. **Limited UI**: Testing interface only, not production-ready

## Monitoring & Health Checks

### Service Health Endpoints
- Goal Strategy: `http://localhost:3000/api/v1/health`
- Email Service: `http://localhost:3001/health`
- Frontend: `http://localhost:5173` (should return HTML)

### Logs Location
- Docker logs: `docker-compose logs -f [service-name]`
- Service logs: `./logs/` directory
- Goal Strategy logs: `services/goal-strategy/logs/`

## Troubleshooting Guide

### Common Issues

1. **Port conflicts**
   ```bash
   # Check what's using a port
   lsof -i :3000
   # Kill process if needed
   kill -9 [PID]
   ```

2. **Database connection issues**
   ```bash
   # Check database is running
   docker ps | grep postgres
   # Check migrations
   cd services/goal-strategy && npx prisma migrate status
   ```

3. **Frontend not loading**
   - Ensure backend services are running first
   - Check browser console for API connection errors
   - Verify CORS settings in backend services

4. **OpenAI API errors**
   - Verify API key is set in environment
   - Check API key has sufficient credits
   - Monitor rate limits

## Rollback Procedure

1. **Stop all services**
   ```bash
   docker-compose -f docker-compose.staging.yml down
   # or
   ./automation/scripts/stop-all.sh
   ```

2. **Clean up data (if needed)**
   ```bash
   docker volume prune
   ```

3. **Restore from backup**
   - Database backups in `./backups/`
   - Configuration backups in `.env.backup`

## Success Criteria

A successful deployment will show:
1. ✅ All health endpoints returning 200 OK
2. ✅ Frontend loads at http://localhost:5173
3. ✅ Can enter a goal and see SMART goal transformation
4. ✅ Can progress through milestones and WBS creation
5. ✅ No errors in service logs

## Next Steps After Deployment

1. **Immediate Testing**
   - Test goal creation workflow
   - Verify API key configuration
   - Check service stability

2. **User Acceptance Testing**
   - Guide users through available features
   - Document any issues encountered
   - Collect feedback on UI/UX

3. **Future Development Priority**
   - Implement Calendar Service
   - Build production UI
   - Add data sovereignty features

---

**Deployment prepared by**: System Architect Agent
**Date**: 2025-01-23
**Version**: 1.0.0