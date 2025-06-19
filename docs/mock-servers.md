# Mock Server Setup Guide

This guide explains how to set up and use mock servers for the PersonalEA API services to enable parallel frontend/client development.

## Overview

We provide two approaches for running mock servers:

1. **Local Prism servers** - Individual mock servers using Prism CLI
2. **Docker Compose** - Containerized mock servers with enhanced features

## Quick Start

### Option 1: Docker Compose (Recommended)

Start all mock servers with realistic data:

```bash
npm run mock:docker
```

This will start:
- Email Service Mock: http://localhost:8083
- Goal & Strategy Service Mock: http://localhost:8085
- Calendar Service Mock: http://localhost:8086
- Mock Data Server: http://localhost:8090

### Option 2: Local Prism Servers

Start individual services:

```bash
# Start all services
npm run mock:all

# Or start individual services
npm run mock:email    # Port 8083
npm run mock:goals    # Port 8085
npm run mock:calendar # Port 8086
```

## Service Endpoints

### Email Processing Service (Port 8083)
- **Base URL**: http://localhost:8083
- **Health Check**: GET /v1/health
- **Key Endpoints**:
  - `GET /v1/emails` - List emails with realistic data
  - `POST /v1/emails/sync` - Trigger email synchronization
  - `GET /v1/emails/digest` - Get daily email digest
  - `POST /v1/emails/{id}/summary` - Generate email summary

### Goal & Strategy Service (Port 8085)
- **Base URL**: http://localhost:8085
- **Health Check**: GET /v1/health
- **Key Endpoints**:
  - `GET /v1/goals` - List goals with progress tracking
  - `POST /v1/goals` - Create new goals
  - `GET /v1/goals/{id}/context` - Get goal context and justification
  - `PATCH /v1/goals/{id}/priority` - Update goal priority

### Calendar Service (Port 8086)
- **Base URL**: http://localhost:8086
- **Health Check**: GET /v1/health
- **Key Endpoints**:
  - `GET /v1/events` - List calendar events
  - `POST /v1/events` - Create new events
  - `GET /v1/availability` - Check availability
  - `POST /v1/scheduling/suggest` - Get scheduling suggestions

## Mock Data Features

### Realistic Data
All mock servers return realistic, contextual data:

- **Email Service**: Business emails, personal messages, action items
- **Goal Service**: Professional goals, personal development, project tracking
- **Calendar Service**: Meetings, focus time, personal events

### Stateful Responses
Mock servers maintain state across requests:
- Created resources persist during session
- Updates modify existing data
- Proper HTTP status codes and headers

### Cross-Service Relationships
Mock data includes realistic relationships:
- Email action items link to calendar events
- Goals reference related tasks and deadlines
- Calendar events connect to email sources

## Authentication

All mock servers accept any valid JWT token format for development:

```bash
curl -H "Authorization: Bearer your-dev-token" \
     http://localhost:8083/v1/emails
```

## CORS Support

All mock servers are configured with permissive CORS for development:
- All origins allowed (`*`)
- All methods supported
- Common headers permitted

## Docker Compose Features

### Services Included
- **Mock Services**: Email, Goals, Calendar APIs
- **Data Server**: Nginx serving static mock data
- **Redis**: Optional stateful storage
- **Health Checks**: Automatic service monitoring

### Management Commands

```bash
# Start services
npm run mock:docker

# Stop services
npm run mock:docker:stop

# View logs
npm run mock:docker:logs

# Rebuild and restart
npm run mock:docker:rebuild

# Check service status
npm run mock:status
```

### Service Discovery
Services are accessible via:
- Individual ports (8083, 8085, 8086)
- Internal Docker network for service-to-service communication
- Health check endpoints for monitoring

## Development Workflow

### Frontend Development
1. Start mock servers: `npm run mock:docker`
2. Develop against realistic APIs
3. Test with actual data structures
4. Validate API contracts

### API Testing
1. Use mock servers for contract testing
2. Validate request/response formats
3. Test error scenarios
4. Performance testing with realistic data

### Integration Testing
1. Mock servers provide consistent test data
2. Stateful behavior for complex scenarios
3. Cross-service relationship testing

## Mock Data Customization

### Adding New Data
Mock data is stored in `mocks/data/` directory:

```
mocks/data/
├── email/
│   ├── emails.json
│   └── digest.json
├── goals/
│   └── goals.json
└── calendar/
    ├── events.json
    └── availability.json
```

### Modifying Responses
1. Edit JSON files in `mocks/data/`
2. Restart mock servers to load changes
3. Use realistic data structures matching OpenAPI specs

### Custom Scenarios
Create scenario-specific data files:
- `mocks/data/email/high-volume.json` - High email volume scenario
- `mocks/data/goals/quarterly-review.json` - Quarterly review goals
- `mocks/data/calendar/busy-week.json` - Heavily scheduled week

## Troubleshooting

### Common Issues

**Port Conflicts**
```bash
# Check what's using ports
lsof -i :8083
lsof -i :8085
lsof -i :8086

# Kill processes if needed
kill -9 <PID>
```

**Docker Issues**
```bash
# Clean up containers
docker-compose -f docker-compose.mock.yml down -v

# Rebuild images
docker-compose -f docker-compose.mock.yml build --no-cache
```

**CORS Issues**
- Ensure requests include proper headers
- Check browser developer tools for CORS errors
- Verify mock server CORS configuration

### Health Checks
```bash
# Check all services
npm run mock:status

# Individual service checks
curl http://localhost:8083/v1/health
curl http://localhost:8085/v1/health
curl http://localhost:8086/v1/health
```

### Logs and Debugging
```bash
# Docker logs
npm run mock:docker:logs

# Individual service logs
docker logs personalea_email-service-mock_1
docker logs personalea_goal-strategy-service-mock_1
docker logs personalea_calendar-service-mock_1
```

## Performance Considerations

### Response Times
Mock servers include realistic delays (100-500ms) to simulate network latency.

### Data Volume
Mock data includes pagination and realistic data volumes:
- Email: 156 total emails, 20 per page
- Goals: 3 active goals with detailed progress
- Calendar: 47 events with availability data

### Concurrent Requests
Docker Compose setup supports multiple concurrent clients and requests.

## Next Steps

1. **Enhanced Scenarios**: Add more complex mock scenarios
2. **Dynamic Data**: Implement time-based data changes
3. **Error Simulation**: Add configurable error responses
4. **Performance Testing**: Load testing with realistic data volumes
5. **Integration**: Connect to actual development databases for hybrid testing

## API Documentation

While mock servers are running, access interactive API documentation:
- Email Service: http://localhost:8083/docs
- Goal Service: http://localhost:8085/docs
- Calendar Service: http://localhost:8086/docs

Or build static documentation:
```bash
npm run docs:build