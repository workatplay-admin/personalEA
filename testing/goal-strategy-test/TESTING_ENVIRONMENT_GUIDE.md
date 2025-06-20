# Goal Strategy Testing Environment Guide

## Overview
This is a consistent, self-contained testing environment for the Goal Strategy application. It includes both the frontend application and a mock API server to ensure reliable testing without external dependencies.

## Quick Start

### Option 1: Automated Setup (Recommended)
```bash
cd testing/goal-strategy-test
chmod +x start-testing.sh
./start-testing.sh
```

### Option 2: Manual Setup
```bash
cd testing/goal-strategy-test
npm install
npm run test-env
```

## URLs
- **Frontend Application**: http://localhost:5173
- **Mock API Server**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## Testing Flow

### 1. Authentication Setup
- **JWT Token**: Use the generated token from `node generate-test-token.js`
- **API Token**: Any string (mock server doesn't validate)

### 2. Goal Translation Testing
1. Enter a goal in the input field
2. Click "Transform into smart goal"
3. Verify the SMART goal is generated correctly
4. Check all SMART criteria are displayed

### 3. Milestone Generation Testing
1. After goal translation, click "Continue to Milestones"
2. Verify milestones are generated
3. Check milestone details and dependencies

### 4. Work Breakdown Structure Testing
1. From milestones view, generate WBS
2. Verify tasks are created for each milestone
3. Check task dependencies and estimates

### 5. Task Estimation Testing
1. From WBS view, estimate individual tasks
2. Verify estimation details and confidence scores
3. Test batch estimation functionality

## Mock API Endpoints

The mock server provides realistic responses for all API endpoints:

- `POST /api/v1/goals/translate` - SMART goal translation
- `POST /api/v1/milestones/generate` - Milestone generation
- `POST /api/v1/wbs/generate` - Work breakdown structure
- `POST /api/v1/estimations/estimate` - Single task estimation
- `POST /api/v1/estimations/batch` - Batch task estimation
- `POST /api/v1/feedback` - Feedback submission
- `GET /health` - Health check

## Development Workflow

### Dev → User Testing → Feedback → Dev Cycle

1. **Development Phase**
   - Make changes to the application
   - Test locally with mock API

2. **User Testing Phase**
   - Start testing environment: `./start-testing.sh`
   - Share URL: http://localhost:5173
   - Collect user feedback

3. **Feedback Integration**
   - Stop testing environment (Ctrl+C)
   - Implement feedback changes
   - Restart testing environment

4. **Next Feature Development**
   - Repeat cycle for new features

## Troubleshooting

### Port Conflicts
If ports 5173 or 3000 are in use:
- Frontend: Modify `vite.config.ts` port setting
- API: Modify `mock-api-server.js` PORT constant

### Dependencies Issues
```bash
rm -rf node_modules package-lock.json
npm install
```

### Mock API Not Responding
- Check if port 3000 is available
- Verify mock-api-server.js is running
- Check console for error messages

## File Structure
```
testing/goal-strategy-test/
├── src/                    # React application source
├── mock-api-server.js      # Mock API server
├── start-testing.sh        # Automated startup script
├── generate-test-token.js  # JWT token generator
├── package.json           # Dependencies and scripts
├── vite.config.ts         # Frontend server config
└── TESTING_ENVIRONMENT_GUIDE.md
```

## Consistent Testing Benefits

1. **No External Dependencies**: Self-contained environment
2. **Predictable Responses**: Mock API provides consistent data
3. **Fast Feedback Loop**: Quick startup and testing
4. **Version Control**: All testing setup is tracked
5. **Reproducible Issues**: Same environment for all testers

## Notes for Testers

- The environment simulates realistic API delays (0.4-1 second)
- All data is generated dynamically but consistently
- No real data is stored or transmitted
- JWT tokens are for testing only and have no real security value