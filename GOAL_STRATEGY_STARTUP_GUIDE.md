# Goal Strategy System - User Testing Startup Guide

## Executive Summary

The PersonalEA Goal Strategy Service is ready for user testing with 6 of 8 workflow steps implemented. This sophisticated system transforms vague goals into actionable, scheduled tasks using AI-powered analysis.

## System Architecture

### Core Components
1. **Goal Strategy API Service** (Port 3000)
   - TypeScript/Express backend with OpenAI integration
   - PostgreSQL database for persistence
   - Redis cache for performance
   - JWT authentication for security

2. **Goal Testing UI** (Port 5173/5174)
   - React/TypeScript frontend with Vite
   - Interactive workflow for goal translation
   - Real-time AI processing visualization

3. **Supporting Services**
   - PostgreSQL Database (Port 5432)
   - Redis Cache (Port 6379)
   - Health Monitor (Port 8080)

## Implemented Features (Ready for Testing)

### Phase 1: SMART Goal Translation ✅
- AI-powered conversion of vague goals to SMART format
- Interactive clarification questions
- Confidence scoring for each SMART criterion

### Phase 2: Milestone Generation ✅
- Automatic creation of 2-6 milestones per quarter
- Logical sequencing and dependency awareness
- Progress tracking capabilities

### Phase 3: Work Breakdown Structure ✅
- Decomposition of milestones into tasks ≤8 hours
- Hierarchical task organization
- Clear completion criteria for each task

### Additional Features ✅
- Task dependency mapping and critical path analysis
- Three estimation methods (expert, analogy, PERT)
- Basic authentication and user management

## Not Yet Implemented ❌
- Calendar integration (Phase 4)
- Capacity management (Phase 5)
- Data sovereignty framework
- User privacy controls

## Startup Instructions

### Option 1: Docker Deployment (Recommended)

```bash
# 1. Set OpenAI API key
export OPENAI_API_KEY='sk-your-api-key-here'

# 2. Start all services
docker-compose -f docker-compose.staging.yml up -d

# 3. Wait for services to be healthy (30-60 seconds)
docker-compose -f docker-compose.staging.yml ps

# 4. Access the system
# UI: http://localhost:5173
# API: http://localhost:3000/health
# Health Monitor: http://localhost:8080
```

### Option 2: Standalone Mode (No Docker)

```bash
# 1. Set OpenAI API key
export OPENAI_API_KEY='sk-your-api-key-here'

# 2. Run the startup script
./start-goal-testing.sh

# 3. Access the system
# UI: http://localhost:5173
# API: http://localhost:3000/health
```

### Option 3: Simple Start (Minimal Setup)

```bash
# 1. Set OpenAI API key
export OPENAI_API_KEY='sk-your-api-key-here'

# 2. Run simple start
./simple-start.sh

# 3. Access the system
# UI: http://localhost:5174 (different port!)
# API: http://localhost:3000/health
```

## Testing Workflow

1. **Goal Input**
   - Enter a vague goal like "I want to learn programming"
   - System translates to SMART format with AI

2. **Clarification**
   - Answer AI-generated questions to improve goal specificity
   - Watch confidence scores increase

3. **Milestone Generation**
   - Review 2-6 automatically generated milestones
   - Adjust timing and dependencies

4. **Task Breakdown**
   - See milestones decomposed into actionable tasks
   - Review time estimates and dependencies

5. **Dependency Analysis**
   - View task dependency graph
   - Identify critical path

## Example Test Scenarios

### Business Goal
```
Input: "Grow my business revenue"
Expected Output: "Increase monthly recurring revenue by 25% from $50K to $62.5K by Q3 2024"
```

### Personal Development
```
Input: "Learn web development"
Expected Output: "Complete full-stack web development certification with 3 deployed projects by December 2024"
```

### Fitness Goal
```
Input: "Get in better shape"
Expected Output: "Reduce body fat from 25% to 18% and run 5K in under 25 minutes by March 2024"
```

## API Testing

### Basic Goal Translation
```bash
curl -X POST http://localhost:3000/api/v1/goals/translate \
  -H "Content-Type: application/json" \
  -H "X-OpenAI-API-Key: $OPENAI_API_KEY" \
  -d '{
    "raw_goal": "Launch a new product",
    "context": {
      "timeframe": "6 months",
      "priority": "HIGH"
    }
  }'
```

### Generate Milestones
```bash
curl -X POST http://localhost:3000/api/v1/milestones/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "goal_id": "GOAL_ID_HERE"
  }'
```

## Monitoring & Health Checks

### Service Health
```bash
# Check all services
curl http://localhost:3000/health  # Goal API
curl http://localhost:8080         # Health Monitor

# Docker status
docker-compose -f docker-compose.staging.yml ps
```

### Logs
```bash
# View service logs
docker-compose -f docker-compose.staging.yml logs -f goal-strategy-service
docker-compose -f docker-compose.staging.yml logs -f goal-testing-ui
```

## Known Limitations

1. **Privacy**: Uses shared OpenAI API key (violates data sovereignty)
2. **Calendar**: No actual calendar integration yet
3. **Capacity**: No team capacity management
4. **Persistence**: Limited data persistence between sessions

## Troubleshooting

### Port Conflicts
```bash
# Kill processes on required ports
sudo lsof -ti:3000 | xargs kill -9
sudo lsof -ti:5173 | xargs kill -9
sudo lsof -ti:5432 | xargs kill -9
```

### Docker Issues
```bash
# Clean restart
docker-compose -f docker-compose.staging.yml down -v
docker-compose -f docker-compose.staging.yml up -d --build
```

### API Key Issues
- Ensure key starts with "sk-"
- Check key has sufficient credits
- Verify key permissions for GPT-4 access

## Stop Services

### Docker
```bash
docker-compose -f docker-compose.staging.yml down
```

### Standalone
```bash
# Press Ctrl+C in terminal running the script
# Or kill processes:
pkill -f "openai-api-server.js"
pkill -f "vite"
```

## Next Steps

After testing, the following components need implementation:
1. Calendar Service with Google/Outlook integration
2. Data Sovereignty Framework for user privacy
3. Capacity Management for team workload
4. Real-time collaboration features

## Support

For issues or questions during testing:
1. Check service logs for errors
2. Verify all prerequisites are met
3. Ensure ports are available
4. Confirm API key is valid

The Goal Strategy System is now ready for comprehensive user testing of its AI-powered goal transformation capabilities!