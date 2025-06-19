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

4. **Start enhanced mock servers for development**
   ```bash
   # Quick start with Docker Compose (Recommended)
   npm run mock:docker
   
   # Or use the setup script for full management
   ./mocks/setup.sh start
   
   # Or start individual Prism servers
   npm run mock:all
   ```

5. **Access mock services**
   - Email Service: http://localhost:8083
   - Goal & Strategy Service: http://localhost:8085
   - Calendar Service: http://localhost:8086
   - Mock Data Server: http://localhost:8090

6. **Try the client development kit**
   ```bash
   cd client-dev-kit
   npm install
   npm run examples
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

# Enhanced Mock Servers (Docker Compose)
npm run mock:docker       # Start all services with Docker Compose
npm run mock:docker:stop  # Stop Docker Compose services
npm run mock:docker:logs  # View service logs
npm run mock:status       # Check service health
./mocks/setup.sh start    # Full setup with health checks

# Code Generation
npm run generate:types    # Generate TypeScript types from OpenAPI specs

# Contract Testing
npm run test:contract              # Run all contract tests
npm run test:contract:api          # Run API contract tests (Schemathesis + Dredd)
npm run test:contract:schemathesis # Run property-based API tests
npm run test:contract:dredd        # Run API implementation validation
npm run test:contract:pact         # Run service contract tests (Pact)
npm run test:contract:mock         # Run contract tests against mock servers
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

## 🎯 Client Development

### Enhanced Mock Servers

PersonalEA provides production-ready mock servers with realistic data and stateful responses:

**Features:**
- **Realistic Data**: Business emails, personal goals, calendar events with relationships
- **Stateful Responses**: Created resources persist, updates modify existing data
- **Cross-Service Integration**: Mock data includes realistic relationships between services
- **Docker Compose Setup**: Easy orchestration with health checks and logging
- **CORS Support**: Ready for frontend development

**Quick Start:**
```bash
# Start all enhanced mock servers
npm run mock:docker

# Or use the management script
./mocks/setup.sh start

# Check service health
npm run mock:status

# View logs
npm run mock:docker:logs
```

**Service URLs:**
- Email Service: http://localhost:8083
- Goal & Strategy Service: http://localhost:8085
- Calendar Service: http://localhost:8086
- Mock Data Server: http://localhost:8090

### Client Development Kit

The `client-dev-kit/` directory provides everything needed for frontend development:

**Included:**
- **TypeScript Types**: Generated from OpenAPI specifications
- **API Clients**: Pre-configured HTTP clients with authentication
- **Working Examples**: Comprehensive examples for all services
- **Testing Utilities**: Helpers for API integration testing

**Quick Start:**
```bash
cd client-dev-kit
npm install
npm run examples        # Run all examples
npm run examples:email  # Run Email Service examples
```

**Example Usage:**
```typescript
import { EmailClient } from './clients/email-client';

const emailClient = new EmailClient();

// Get emails with realistic mock data
const emails = await emailClient.getEmails({ limit: 10 });

// Generate email digest
const digest = await emailClient.getDigest();

// Extract action items
const actionItems = await emailClient.extractActionItems(emailId);
```

See [`client-dev-kit/README.md`](client-dev-kit/README.md) and [`docs/mock-servers.md`](docs/mock-servers.md) for detailed guides.

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

Contract tests ensure service implementations match API specifications and validate service-to-service interactions:

#### API Contract Testing
```bash
# Property-based testing with Schemathesis
npm run test:contract:schemathesis

# Implementation validation with Dredd
npm run test:contract:dredd

# Combined API contract testing
npm run test:contract:api
```

#### Service Contract Testing
```bash
# Consumer-driven contracts with Pact
npm run test:contract:pact

# Test against mock servers
npm run test:contract:mock

# Run all contract tests
npm run test:contract
```

**Testing Tools:**
- **Schemathesis**: Property-based testing that generates test cases from OpenAPI specs
- **Dredd**: Validates API implementations against specifications
- **Pact**: Consumer-driven contract testing for service interactions

See [`docs/contract-testing.md`](docs/contract-testing.md) for detailed testing guide.

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

- Validates API specifications with Spectral linting
- Runs comprehensive contract testing (Schemathesis, Dredd, Pact)
- Checks for breaking changes in pull requests
- Generates and deploys documentation
- Runs security scans on API contracts
- Creates mock servers for testing
- Publishes Pact contracts to broker

### Production Deployment

See [`docs/development-plan.md`](docs/development-plan.md) for detailed deployment strategy including:

- Containerization with Docker
- Kubernetes manifests
- Infrastructure as Code
- Monitoring and observability

## 📚 Documentation

- [`docs/personal-ea-prd.md`](docs/personal-ea-prd.md) - Product Requirements Document
- [`docs/development-plan.md`](docs/development-plan.md) - Detailed development roadmap
- [`docs/contract-testing.md`](docs/contract-testing.md) - Contract testing guide and best practices
- [`docs/mock-servers.md`](docs/mock-servers.md) - Enhanced mock server setup and usage guide
- [`client-dev-kit/README.md`](client-dev-kit/README.md) - Client development kit documentation
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
