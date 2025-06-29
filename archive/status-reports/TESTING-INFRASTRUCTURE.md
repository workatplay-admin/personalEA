# PersonalEA Testing Infrastructure

## Overview

The PersonalEA testing infrastructure provides a streamlined, reliable way to start and manage all necessary servers for testing the goal strategy system. This infrastructure includes automated health checks, process management, and comprehensive logging.

## Architecture

The testing environment consists of three main services:

1. **Frontend Service** (Port 5174) - React application with Vite dev server
2. **Backend API Service** (Port 8085) - Node.js/Express API with TypeScript
3. **API Server** - Either:
   - **Mock API Server** (Port 3000) - For testing without OpenAI integration
   - **OpenAI API Server** (Port 8086) - For testing with real OpenAI integration

## Quick Start

### Option 1: Simple Start (Recommended)
```bash
# Start with mock API (no OpenAI key required)
./testing-manager.sh start --mock

# Or start with OpenAI integration (requires OPENAI_API_KEY)
export OPENAI_API_KEY="your-api-key-here"
./testing-manager.sh start --openai
```

### Option 2: Direct Script
```bash
# Start with mock API
./start-unified-testing.sh --mock

# Start with OpenAI integration
export OPENAI_API_KEY="your-api-key-here"
./start-unified-testing.sh --openai
```

## Scripts Overview

### 1. `start-unified-testing.sh` - Main Testing Script

**Purpose**: Single command to start all necessary servers with health checks and process management.

**Features**:
- Automatic dependency installation
- Port conflict resolution
- Health checks with retry logic
- Proper process cleanup on exit
- Comprehensive logging
- Environment validation

**Usage**:
```bash
./start-unified-testing.sh [options]

Options:
  --mock          Use mock API server (default)
  --openai        Use OpenAI-powered API server
  --port-check    Only check if ports are available
  --no-cleanup    Don't kill existing processes
  --debug         Enable debug logging
```

**Examples**:
```bash
# Basic start with mock API
./start-unified-testing.sh

# Start with OpenAI integration
./start-unified-testing.sh --openai

# Check port availability without starting
./start-unified-testing.sh --port-check

# Start without killing existing processes
./start-unified-testing.sh --no-cleanup

# Start with debug logging
./start-unified-testing.sh --debug
```

### 2. `testing-manager.sh` - Process Management

**Purpose**: Simple utility for managing the testing infrastructure.

**Commands**:
```bash
./testing-manager.sh [command] [options]

Commands:
  start [--mock|--openai]   Start all testing services
  stop                      Stop all testing services
  restart [--mock|--openai] Restart all testing services
  status                    Show status of all services
  logs [service]            Show logs for all services or specific service
  health                    Check health of all services
  ports                     Check which ports are in use
  clean                     Clean up logs and temporary files
  help                      Show help message
```

**Examples**:
```bash
# Start services
./testing-manager.sh start --mock
./testing-manager.sh start --openai

# Check status
./testing-manager.sh status
./testing-manager.sh health

# View logs
./testing-manager.sh logs all
./testing-manager.sh logs frontend
./testing-manager.sh logs backend
./testing-manager.sh logs api

# Stop services
./testing-manager.sh stop

# Clean up
./testing-manager.sh clean
```

### 3. `health-check.sh` - Comprehensive Health Monitoring

**Purpose**: Detailed health checking for all services including API functionality tests.

**Features**:
- Port availability checks
- HTTP health endpoint verification
- API functionality testing
- Response time measurement
- JSON and human-readable output
- Exit code support for CI/CD

**Usage**:
```bash
./health-check.sh [options]

Options:
  --verbose      Show detailed health information
  --json         Output results in JSON format
  --exit-code    Exit with non-zero code if any service is unhealthy
```

**Examples**:
```bash
# Basic health check
./health-check.sh

# Detailed health check
./health-check.sh --verbose

# JSON output for automation
./health-check.sh --json

# Exit with error code if unhealthy (for CI/CD)
./health-check.sh --exit-code
```

## Service Configuration

### Frontend Service
- **Port**: 5174
- **Technology**: React + Vite
- **Health Check**: HTTP GET to `http://localhost:5174`
- **Logs**: `/workspaces/personalEA/logs/testing/frontend.log`

### Backend API Service
- **Port**: 8085
- **Technology**: Node.js + Express + TypeScript
- **Health Check**: HTTP GET to `http://localhost:8085/health`
- **Logs**: `/workspaces/personalEA/logs/testing/backend.log`
- **Environment**: Requires `OPENAI_API_KEY` (can be empty for basic functionality)

### Mock API Server
- **Port**: 3000
- **Technology**: Node.js + Express
- **Health Check**: HTTP GET to `http://localhost:3000/health`
- **Logs**: `/workspaces/personalEA/logs/testing/mock-api.log`
- **Purpose**: Simulates OpenAI API responses for testing without API costs

### OpenAI API Server
- **Port**: 8086
- **Technology**: Node.js + Express
- **Health Check**: HTTP GET to `http://localhost:8086/health`
- **Logs**: `/workspaces/personalEA/logs/testing/openai-api.log`
- **Purpose**: Provides real OpenAI integration for testing
- **Requirements**: Valid `OPENAI_API_KEY` environment variable

## Environment Setup

### Prerequisites
1. Node.js 18+ installed
2. npm package manager
3. Git repository cloned

### Environment Variables
```bash
# Required for OpenAI integration
export OPENAI_API_KEY="your-openai-api-key-here"

# Optional: Custom log directory
export TESTING_LOG_DIR="/path/to/logs"
```

### Directory Structure
```
/workspaces/personalEA/
├── start-unified-testing.sh      # Main testing script
├── testing-manager.sh            # Process management
├── health-check.sh               # Health monitoring
├── logs/testing/                 # Log directory
│   ├── frontend.log
│   ├── backend.log
│   ├── mock-api.log
│   └── openai-api.log
├── services/goal-strategy/        # Backend service
└── testing/goal-strategy-test/    # Frontend and API servers
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the ports
./testing-manager.sh ports

# Stop all services and restart
./testing-manager.sh stop
./testing-manager.sh start --mock
```

#### Services Won't Start
```bash
# Check service status
./testing-manager.sh status

# View detailed logs
./testing-manager.sh logs all

# Run health check with verbose output
./health-check.sh --verbose
```

#### OpenAI API Key Issues
```bash
# Verify environment variable is set
echo $OPENAI_API_KEY

# Start with mock API instead
./testing-manager.sh start --mock
```

#### Dependencies Missing
```bash
# Clean and reinstall dependencies
./testing-manager.sh clean
./testing-manager.sh start --mock
```

### Log Locations
All logs are stored in `/workspaces/personalEA/logs/testing/`:
- `frontend.log` - Frontend service logs
- `backend.log` - Backend API service logs
- `mock-api.log` - Mock API server logs
- `openai-api.log` - OpenAI API server logs

### Monitoring Commands
```bash
# Real-time log monitoring
tail -f /workspaces/personalEA/logs/testing/*.log

# Service status check
./testing-manager.sh status

# Comprehensive health check
./health-check.sh --verbose

# Port usage check
./testing-manager.sh ports
```

## Testing Workflows

### Development Testing (Mock API)
1. Start services with mock API: `./testing-manager.sh start --mock`
2. Open frontend: http://localhost:5174
3. Test goal creation and management without API costs
4. View logs: `./testing-manager.sh logs all`

### Integration Testing (OpenAI API)
1. Set OpenAI API key: `export OPENAI_API_KEY="your-key"`
2. Start services: `./testing-manager.sh start --openai`
3. Test real AI-powered goal translation
4. Monitor API usage and responses

### Automated Testing
```bash
# Start services for testing
./start-unified-testing.sh --mock

# Run health check with exit codes
./health-check.sh --exit-code

# Run your test suite here
npm test

# Stop services
./testing-manager.sh stop
```

### CI/CD Integration
```yaml
# Example GitHub Actions workflow
- name: Start Testing Infrastructure
  run: ./start-unified-testing.sh --mock

- name: Wait for Services
  run: ./health-check.sh --exit-code --verbose

- name: Run Tests
  run: npm test

- name: Stop Services
  run: ./testing-manager.sh stop
```

## Best Practices

1. **Always use the testing manager**: Prefer `./testing-manager.sh` over direct script calls
2. **Check health before testing**: Use `./health-check.sh` to verify all services are ready
3. **Monitor logs during development**: Use `./testing-manager.sh logs all` for real-time monitoring
4. **Clean up regularly**: Use `./testing-manager.sh clean` to remove old logs
5. **Use mock API for development**: Reserve OpenAI API for integration testing only
6. **Verify environment**: Check `./testing-manager.sh status` if issues occur

## Performance Considerations

- **Startup Time**: Services typically start within 30-45 seconds
- **Health Check Timeout**: 30 seconds for backend, 20 seconds for API servers
- **Resource Usage**: Minimal - suitable for development environments
- **Port Management**: Automatic cleanup prevents port conflicts

## Security Notes

- OpenAI API keys are never logged or exposed in output
- Services run on localhost only (not exposed externally)
- Logs may contain request/response data - review before sharing
- Mock API server provides safe testing without external API calls