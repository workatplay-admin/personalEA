# PersonalEA - Personal AI Assistant System

A microservices-based personal AI assistant system built with API-first design principles.

## 🏗️ Architecture Overview

PersonalEA follows a microservices architecture with three core services:

- **Email Processing Service** - Email synchronization, summarization, and action item extraction
- **Goal & Strategy Service** - Goal management, task prioritization, and strategic planning
- **Calendar Service** - Calendar integration, intelligent scheduling, and availability management

## 📋 API Specifications

All services are designed with OpenAPI 3.1 specifications following contract-first development:

- [`docs/email-service-api-v1.yaml`](docs/email-service-api-v1.yaml) - Email Processing Service API
- [`docs/goal-strategy-service-api-v1.yaml`](docs/goal-strategy-service-api-v1.yaml) - Goal & Strategy Service API  
- [`docs/calendar-service-api-v1.yaml`](docs/calendar-service-api-v1.yaml) - Calendar Service API
- [`docs/components/common.yaml`](docs/components/common.yaml) - Shared components and schemas

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Git

### Setup Development Environment

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd personalEA
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Validate API specifications**
   ```bash
   npm run validate:api
   ```

4. **Start mock servers for development**
   ```bash
   # Start all mock servers
   npm run mock:all
   
   # Or start individual services
   npm run mock:email    # Port 8083
   npm run mock:goals    # Port 8085
   npm run mock:calendar # Port 8086
   ```

5. **Generate and serve API documentation**
   ```bash
   npm run docs:build  # Generate static HTML docs
   npm run docs:serve  # Serve interactive docs on port 8080
   ```

## 🛠️ Development Workflow

### API-First Development

1. **Design APIs first** - All features start with OpenAPI specification updates
2. **Validate contracts** - Use Spectral linting to ensure consistency
3. **Generate mocks** - Use Prism to create mock servers for frontend development
4. **Implement services** - Build services that conform to the API contracts
5. **Test contracts** - Verify implementations match specifications

### Available Scripts

```bash
# API Development
npm run lint:api          # Lint all API specifications
npm run validate:api      # Validate API contracts
npm run docs:build        # Generate API documentation
npm run docs:serve        # Serve interactive documentation

# Mock Servers
npm run mock:email        # Start Email Service mock server
npm run mock:goals        # Start Goal & Strategy Service mock server  
npm run mock:calendar     # Start Calendar Service mock server
npm run mock:all          # Start all mock servers concurrently

# Code Generation
npm run generate:types    # Generate TypeScript types from OpenAPI specs

# Testing
npm run test:contract     # Run contract tests (when implemented)
```

### API Standards

Our APIs follow these standards:

- **OpenAPI 3.1** specification format
- **Semantic versioning** (MAJOR.MINOR.PATCH)
- **JWT authentication** with granular scopes
- **ETag-based optimistic locking** for concurrency control
- **Cursor-based pagination** for list operations
- **Standardized error responses** with correlation IDs
- **Idempotency support** for write operations
- **Webhook naming convention**: `/v1/events/{event-name}`

### Security

- **JWT tokens** with scoped permissions:
  - `email.read`, `email.write` - Email service access
  - `goals.read`, `goals.write` - Goal service access  
  - `calendar.read`, `calendar.write`, `calendar.sync` - Calendar service access
- **Rate limiting** per service and operation type
- **Input validation** with comprehensive schemas
- **Correlation IDs** for request tracing

## 📖 API Documentation

### Service Endpoints

#### Email Processing Service (Port 8083)
- `POST /v1/sync` - Synchronize emails from providers
- `GET /v1/digest` - Get email digest with summaries
- `GET /v1/emails/{id}/summary` - Get email summary
- `GET /v1/emails/{id}/action-items` - Extract action items

#### Goal & Strategy Service (Port 8085)  
- `GET /v1/goals` - List user goals
- `POST /v1/goals` - Create new goal
- `GET /v1/goals/{id}/tasks` - Get tasks for goal
- `GET /v1/priorities` - Get AI-suggested priorities
- `PATCH /v1/tasks/{id}/progress` - Update task progress

#### Calendar Service (Port 8086)
- `GET /v1/calendars` - List connected calendars
- `POST /v1/calendars` - Connect new calendar
- `GET /v1/events` - Get calendar events
- `GET /v1/availability` - Check availability
- `POST /v1/scheduling/suggestions` - Get scheduling suggestions

### Interactive Documentation

Access interactive API documentation:
- Email Service: http://localhost:8080 (when running `npm run docs:serve`)
- Generated HTML docs available after running `npm run docs:build`

## 🧪 Testing

### Mock Server Testing

Mock servers provide realistic API responses for development and testing:

```bash
# Test Email Service mock
curl http://localhost:8083/v1/health

# Test Goals Service mock  
curl http://localhost:8085/v1/health

# Test Calendar Service mock
curl http://localhost:8086/v1/health
```

### Contract Testing

Contract tests ensure service implementations match API specifications:

```bash
npm run test:contract  # Run contract tests (when implemented)
```

## 🔧 Configuration

### Spectral Linting

API specifications are validated using Spectral with custom rules in [`docs/.spectral.yaml`](docs/.spectral.yaml):

- Enforce semantic versioning
- Require correlation ID headers
- Validate security schemes
- Check for consistent error responses
- Ensure proper webhook naming

### Pre-commit Hooks

Git hooks automatically validate API changes:

```bash
npm run prepare  # Install Husky hooks
```

## 🚢 Deployment

### CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/api-validation.yml`) automatically:

- Validates API specifications on every push
- Checks for breaking changes in pull requests
- Generates and deploys documentation
- Runs security scans on API contracts
- Creates mock servers for testing

### Production Deployment

See [`docs/development-plan.md`](docs/development-plan.md) for detailed deployment strategy including:

- Containerization with Docker
- Kubernetes manifests
- Infrastructure as Code
- Monitoring and observability

## 📚 Documentation

- [`docs/personal-ea-prd.md`](docs/personal-ea-prd.md) - Product Requirements Document
- [`docs/development-plan.md`](docs/development-plan.md) - Detailed development roadmap
- [`docs/api-spec.md`](docs/api-spec.md) - API specification guidelines
- Generated API docs in `docs/*-docs.html`

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch** from `develop`
3. **Update API specifications** first (contract-first approach)
4. **Validate changes** with `npm run validate:api`
5. **Implement service changes** to match API contracts
6. **Submit a pull request** with comprehensive description

### API Change Guidelines

- **Breaking changes** require MAJOR version bump
- **New endpoints/fields** require MINOR version bump  
- **Bug fixes/docs** require PATCH version bump
- **All changes** must include examples and documentation
- **Security implications** must be documented

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Issues**: GitHub Issues for bug reports and feature requests
- **Discussions**: GitHub Discussions for questions and ideas
- **Documentation**: Check `docs/` directory for detailed guides

---

**Built with ❤️ using API-first design principles**
