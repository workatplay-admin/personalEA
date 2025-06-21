# PersonalEA Development Plan

## Overview
This document outlines the development plan for the personalEA system, following API-first design principles and industry best practices for microservices development.

## 🚨 **CRITICAL: STAGING ENVIRONMENT FOUNDATION**

### **⚠️ MANDATORY READING FOR ALL NEW DEVELOPERS**
Before starting any development work, ALL team members must review and follow the staging environment architecture:

- **📋 [Staging Environment Plan](staging-environment-plan.md)** - Complete architecture overview
- **🚀 [Staging Implementation Roadmap](staging-implementation-roadmap.md)** - Detailed implementation steps
- **🗓️ [Calendar Functionality Architecture Plan](calendar-functionality-architecture-plan.md)** - Complete calendar implementation architecture
- **✅ [Calendar Implementation Checklist](calendar-implementation-checklist.md)** - Detailed task breakdown for calendar features

### **Key Requirements:**
- ✅ **Use Staging Environment**: All development MUST use the Docker-based staging environment
- ✅ **Consistent Ports**: API (3000), Frontend (5173), Email (3001), Calendar (3003)
- ✅ **User Testing Milestones**: Test after each service completion
- ✅ **No Ad-hoc Development**: Follow the established staging workflow

### **Current Staging Status:**
- ✅ **Goal Strategy Service**: Working with timeout fixes implemented
- ✅ **Frontend Interface**: React testing UI operational
- 🔄 **Docker Environment**: Ready for implementation (Phase 1)
- 🔄 **Service Integration**: Incremental rollout planned

**🎯 Next Action**: Implement Phase 1 of staging environment before any new feature development.

---

## 🤖 **AI Architecture Principles**

### **⚠️ MANDATORY FOR ALL AI/LLM INTEGRATIONS**
- **External Configuration**: All AI models, parameters, and prompts must be in external files (JSON/YAML/Markdown)
- **Provider Independence**: Business logic must work with any AI provider through abstraction layers
- **No Hardcoding**: Zero tolerance for hardcoded prompts, model names, or AI-specific logic in application code

**📋 See [AI Integration Architecture](ai-integration-architecture.md) for full guidelines.**
**🔧 See [AI Integration Enforcement](ai-integration-enforcement.md) for lint rules and PR checklist.**

---

## Phase 1: API Contract Foundation ✅ COMPLETED

### 1.1 OpenAPI Specifications
- [x] **Shared Components** (`docs/components/common.yaml`)
  - Common schemas, parameters, and responses
  - Standardized error handling and pagination
  - JWT security schemes with granular scopes
- [x] **Email Processing Service API** (`docs/email-service-api-v1.yaml`)
- [x] **Goal & Strategy Service API** (`docs/goal-strategy-service-api-v1.yaml`)
- [x] **Calendar Service API** (`docs/calendar-service-api-v1.yaml`)

### 1.2 API Governance Setup
- [x] Semantic versioning strategy defined
- [x] Standardized webhook naming conventions
- [x] Cross-cutting concerns implemented (auth, pagination, error handling)

## Phase 2: API Validation & Tooling ✅ COMPLETED

### 2.1 API Linting and Validation ✅ COMPLETED
- [x] **Setup Spectral for OpenAPI linting**
  ```bash
  npm install -g @stoplight/spectral-cli
  ```
- [x] **Create Spectral ruleset** (`docs/.spectral.yaml`)
  - Enforce naming conventions
  - Validate security schemes
  - Check for required examples
  - Ensure consistent error responses
- [x] **Add pre-commit hooks** for API validation
- [x] **CI/CD integration** for automatic API contract validation

### 2.2 Documentation Generation ✅ COMPLETED
- [x] **Setup Redocly CLI** for interactive documentation
- [x] **Generate API documentation** from OpenAPI specs
- [x] **Create developer portal** with getting started guides
- [x] **Add comprehensive documentation** with usage examples

### 2.3 Mock Server Generation ✅ COMPLETED
- [x] **Setup Prism mock servers** for each service
  ```bash
  npm run mock:email
  npm run mock:goals
  npm run mock:calendar
  ```
- [x] **Configure realistic mock data** with dynamic examples
- [x] **Enable contract testing** against mock servers

## Phase 3: Development Environment Setup ✅ COMPLETED

### 3.1 Project Structure ✅ COMPLETED
```
personalEA/
├── services/
│   ├── email-processing/     # Email Processing Service ✅ SETUP
│   ├── goal-strategy/        # Goal & Strategy Service
│   ├── calendar/            # Calendar Service
│   └── dialog-gateway/      # Dialog Gateway (API Gateway)
├── shared/
│   ├── auth/               # JWT authentication library ✅ SETUP
│   ├── database/           # Database schemas and migrations
│   └── monitoring/         # Logging, metrics, tracing
├── docs/                   # API specifications and documentation
├── tests/                  # Integration and contract tests
└── infrastructure/         # Docker, K8s, Terraform configs
```

### 3.2 Technology Stack Selection ✅ COMPLETED
- [x] **Backend Framework**: Node.js with Express/Fastify
- [x] **Database**: PostgreSQL with Redis for caching
- [x] **Message Queue**: Redis or RabbitMQ for async processing
- [x] **Authentication**: JWT with refresh tokens
- [x] **API Gateway**: Kong, Envoy, or custom Dialog Gateway
- [x] **Monitoring**: Prometheus + Grafana, OpenTelemetry for tracing

### 3.3 Development Tools ✅ COMPLETED
- [x] **Code Generation**: OpenAPI Generator for client SDKs and server stubs
- [x] **Database**: Prisma or TypeORM for database access
- [x] **Testing**: Jest/Vitest for unit tests, Supertest for API tests
- [x] **Linting**: ESLint/Pylint with consistent code style
- [x] **Type Safety**: TypeScript for Node.js or Pydantic for Python

## Phase 3.5: User Experience & Deployment ✅ COMPLETED

### 3.5.1 User-Friendly Installation ✅ COMPLETED
- [x] **User Installation Guide** (`docs/user-installation-guide.md`)
  - One-click cloud deployment options (Railway, Render)
  - Docker Desktop setup for Mac/Windows users
  - Local installation with automated scripts
  - Step-by-step configuration wizard
  - Troubleshooting and support resources

- [x] **Automated Setup Scripts** (`scripts/setup-user.sh`)
  - Cross-platform compatibility (Linux, macOS, Windows)
  - Prerequisite checking and automatic installation
  - Multiple setup methods (Docker, manual, development)
  - Interactive configuration with user prompts
  - Desktop shortcut creation and browser integration

### 3.5.2 Configuration Management System ✅ COMPLETED
- [x] **Configuration Management Plan** (`docs/configuration-management-plan.md`)
  - Multi-layer configuration architecture
  - Web-based configuration dashboard design
  - Progressive disclosure for different user levels
  - Smart defaults and configuration profiles
  - Import/export and migration tools

- [x] **User-Friendly Configuration Files**
  - Comprehensive environment template (`.env.user.example`)
  - Detailed comments and explanations for all settings
  - Security-first defaults with clear guidance
  - Integration settings for email, calendar, and AI services
  - Privacy and data protection options

- [x] **API Key Management System** ✅ COMPLETED
  - User-configurable OpenAI API keys for AI-powered features
  - Secure browser-based storage with session management
  - Testing interface integration for immediate validation
  - Future-ready architecture for production user settings
  - Privacy-first approach with local key storage

### 3.5.3 Production-Ready Deployment ✅ COMPLETED
- [x] **User Docker Configuration** (`docker-compose.user.yml`)
  - Simplified service orchestration for end users
  - Health checks and automatic restart policies
  - Persistent data volumes and backup-friendly structure
  - Security-hardened container configuration
  - Resource optimization for home/small office use

- [x] **User-Optimized Dockerfile** (`Dockerfile.user`)
  - Multi-stage build for production efficiency
  - Non-root user for enhanced security
  - Health checks and signal handling
  - Minimal attack surface with Alpine Linux
  - Optimized for stability and performance

### 3.5.4 User Experience Design Principles ✅ COMPLETED
- [x] **Progressive Complexity**
  - Beginner mode with essential settings only
  - Advanced mode for power users
  - Expert mode with full configuration access
  - Contextual help and guided tutorials

- [x] **Security by Default**
  - Strong default passwords and encryption
  - Two-factor authentication support
  - Local-first data processing options
  - Privacy-preserving configuration choices

- [x] **Cross-Platform Support**
  - Windows, macOS, and Linux compatibility
  - Mobile-responsive configuration interface
  - Progressive Web App capabilities
  - Offline configuration editing

### 3.5.5 Documentation and Support ✅ COMPLETED
- [x] **Comprehensive User Documentation**
  - Installation guide with multiple deployment options
  - Configuration management with visual examples
  - Troubleshooting guides with common solutions
  - Best practices and security recommendations

- [x] **Community Support Infrastructure**
  - GitHub Discussions for community Q&A
  - Issue templates for bug reports and feature requests
  - Contributing guidelines for community involvement
  - Professional support options for business users

## Phase 4: Service Implementation (Following PRD Milestones) 🚧 IN PROGRESS

### 4.1 Milestone 1.1: Email Processing Service ✅ COMPLETED
**Timeline: 2-3 weeks**

#### Core Features ✅ COMPLETED
- [x] **Email Provider Integration**
  - Gmail API integration with OAuth2 ✅
  - Rate limiting and error handling ✅
  - IMAP/SMTP fallback support (planned for future)
- [x] **Email Synchronization**
  - Incremental sync with cursor-based pagination ✅
  - Idempotency for safe retries ✅
  - Background job processing ✅
- [x] **AI Processing Pipeline**
  - Email summarization using LLM APIs ✅
  - Action item extraction with confidence scoring ✅
  - Content categorization and priority detection ✅

#### Implementation Steps ✅ COMPLETED
1. [x] **Setup service skeleton** with OpenAPI-generated stubs
2. [x] **Implement authentication** and JWT middleware
3. [x] **Database schema** design and migrations
4. [x] **Email provider adapters** (Gmail)
5. [x] **Sync engine** with job queue integration
6. [x] **AI processing** pipeline with external LLM APIs
7. [x] **API endpoints** implementation following OpenAPI spec
8. [ ] **Unit and integration tests** with >80% coverage
9. [ ] **Performance testing** and optimization

### 4.2 Milestone 1.2: Goal & Strategy Service ✅ PHASE 1 COMPLETED
**Timeline: 12-15 weeks (6-phase implementation)**
**Specification: [`docs/goal-strategy-service-specification.md`](docs/goal-strategy-service-specification.md)**
**OpenAPI Architecture: [`testing/goal-strategy-test/OPENAPI_ARCHITECTURE_PLAN.md`](../testing/goal-strategy-test/OPENAPI_ARCHITECTURE_PLAN.md)**

#### 8-Step Sophisticated Workflow Implementation
Based on the comprehensive technical specification, this milestone implements an advanced goal-setting and strategy workflow that transforms high-level goals into actionable, scheduled tasks.

#### Core Workflow Steps
- [x] **Step 1: SMART Goal Translation** ✅ COMPLETED
  - AI-powered conversion of vague goals into SMART objectives
  - Interactive clarification system for missing specifics
  - Natural language processing for goal analysis
- [x] **Step 2: Critical Success Metric Identification** ✅ COMPLETED
  - Single metric definition with supporting indicators
  - Measurable outcome specification
  - Success criteria validation
- [x] **Step 3: Milestone Breakdown** ✅ COMPLETED
  - 2-6 measurable mini-wins per quarter
  - Timeline distribution and progress tracking
  - Milestone dependency mapping
- [x] **Step 4: Work Breakdown Structure (WBS)** ✅ COMPLETED
  - Recursive decomposition to ≤1 day tasks
  - Completion criteria definition
  - Task template library and pattern recognition
- [x] **Step 5: Dependency Mapping & Sequencing** ✅ COMPLETED
  - Critical path analysis and optimization
  - Parallel execution identification
  - Blocking relationship management
- [x] **Step 6: Task Estimation Engine** ✅ COMPLETED
  - Multi-method estimation (expert judgment, analogy, three-point PERT)
  - Historical data learning and pattern recognition
  - Confidence scoring and uncertainty handling
- [ ] **Step 7: Calendar Integration & Scheduling**
  - Constraint-aware scheduling with focus time management
  - Conflict detection and resolution
  - Availability analysis and optimization
- [ ] **Step 8: Capacity Management & Optimization**
  - Team workload balancing and utilization monitoring
  - Resource allocation and preference management
  - Performance analytics and optimization

#### Technical Architecture Components
- [x] **SMART Goal Processor** ✅ COMPLETED - AI-powered goal analysis and translation
- [x] **Milestone Generator** ✅ COMPLETED - Intelligent breakdown with pattern recognition
- [x] **WBS Engine** ✅ COMPLETED - Recursive task decomposition with templates
- [x] **Dependency Mapper** ✅ COMPLETED - Graph analysis and critical path calculation
- [x] **Estimation Engine** ✅ COMPLETED - Multi-method estimation with learning system
- [ ] **Calendar Scheduler** - Constraint solver with conflict resolution
- [ ] **Capacity Manager** - Workload balancer with preference engine

#### 6-Phase Implementation Roadmap
**Phase 1: Core Goal Management (Weeks 1-3)** ✅ COMPLETED
- [x] SMART Goal Translation service ✅
- [x] Critical Success Metric identification ✅
- [x] Basic goal CRUD operations with AI enhancement ✅
- [x] Database schema implementation ✅
- [x] Milestone generation and management ✅

**Phase 2: Advanced Planning (Weeks 4-6)** ✅ COMPLETED
- [x] Work Breakdown Structure (WBS) engine ✅
- [x] Dependency mapping and graph analysis ✅
- [x] Critical path calculation ✅
- [x] Multi-method estimation engine ✅
- [x] Task decomposition with recursive logic ✅
- [x] Template library and pattern recognition ✅

**Phase 3: Dependency & Estimation (Weeks 7-9)** ✅ COMPLETED
- [x] Dependency mapping and graph analysis ✅
- [x] Critical path calculation ✅
- [x] Multi-method estimation engine ✅
- [x] Historical learning system ✅

**Phase 2.5: Testing & Validation** 🚧 IN PROGRESS
- [x] React + Vite testing interface ✅
- [x] Core workflow validation (SMART → Milestones → WBS → Estimation) ✅
- [x] AI output quality assessment ✅
- [x] User experience testing ✅
- [x] Performance and accuracy metrics collection ✅
- [x] **Timeout Fix Implementation** ✅ COMPLETED - Resolved hanging request issues

**Phase 4: Calendar Integration (Weeks 10-12)** 🔄 NEXT
- [ ] Calendar service integration
- [ ] Constraint-aware scheduling
- [ ] Conflict detection and resolution
- [ ] Focus time management
- **📋 See [Calendar Functionality Architecture Plan](calendar-functionality-architecture-plan.md) for complete implementation details**
- **✅ See [Calendar Implementation Checklist](calendar-implementation-checklist.md) for detailed task breakdown**

**Phase 5: Capacity Management (Weeks 13-14)**
- [ ] Workload balancing algorithms
- [ ] Resource allocation optimization
- [ ] Team capacity analysis
- [ ] Performance monitoring

**Phase 6: Intelligence & Optimization (Week 15)**
- [ ] AI-powered optimization
- [ ] Learning system refinement
- [ ] Advanced analytics and reporting
- [ ] System integration testing

#### Integration Dependencies
- [x] **Email Service Integration** ✅ - Action item extraction to goal conversion (ready)
- [x] **AI Service Integration** ✅ - Enhanced for SMART translation and optimization
- [x] **Shared Database Schema** ✅ - Extended for complex goal management entities
- [ ] **Calendar Service Integration** - Required for scheduling and availability

#### Database Schema (10+ Core Entities) ✅ COMPLETED
- [x] Goals, Milestones, Tasks, Dependencies ✅
- [x] Schedules, Capacity, Estimations, Templates ✅
- [x] Learning data, Analytics, Optimization metrics ✅

#### API Specification (25+ Endpoints)
- [x] Goal translation and clarification endpoints ✅
- [x] Milestone generation and management ✅
- [x] WBS and task decomposition ✅
- [x] Dependency mapping and critical path ✅
- [x] Estimation and scheduling endpoints ✅
- [ ] Capacity analysis and optimization

### 4.3 Milestone 1.3: Calendar Service
**Timeline: 6 weeks (3 weeks Goal Service completion + 3 weeks Calendar Service)**
**Architecture: [`docs/calendar-functionality-architecture-plan.md`](calendar-functionality-architecture-plan.md)**
**Implementation: [`docs/calendar-implementation-checklist.md`](calendar-implementation-checklist.md)**

#### Implementation Strategy
Following the established microservices architecture with selective AI integration:

**Phase 4: Goal & Strategy Service Completion (Weeks 1-3)**
- [ ] **Calendar Integration Foundation** - Planner Service module within Goal Service
- [ ] **Capacity Management** - Workload balancing and resource allocation
- [ ] **Intelligence & Optimization** - AI-powered features with external prompts

**Phase 5: Calendar Sync Service Implementation (Weeks 4-6)**
- [ ] **Calendar Sync Service** - Standalone microservice for calendar operations
- [ ] **Google Calendar Integration** - OAuth2, real-time sync, webhook handling
- [ ] **AI Integration & Testing** - Scheduling suggestions, conflict resolution

#### Core Features
- [ ] **Calendar Sync Service (Separate Microservice)**
  - Google Calendar API integration with OAuth2
  - Real-time synchronization with webhook support
  - Batch operations for task scheduling
- [ ] **Planner Service (Within Goal Service)**
  - Deterministic slot scoring and task placement (≤2h blocks)
  - Dependency-aware scheduling with critical path analysis
  - Multi-day task splitting with parent-child relationships
- [ ] **AI-Powered Features (External Prompts)**
  - Schedule optimization suggestions (`prompts/calendar/schedule_advice.md`)
  - Conflict explanations (`prompts/calendar/conflict_explain.md`)
  - Fallback to deterministic rules for reliability
- [ ] **Testing Infrastructure Extension**
  - Calendar Demo tab in React testing interface
  - Visual schedule diff with conflict highlighting
  - Comprehensive test coverage (contract, property-based, E2E)

#### Technical Architecture
- **Service Separation**: Calendar Sync as microservice, Planner logic in Goal Service
- **AI Integration**: Selective use for human judgment, deterministic core algorithms
- **Testing Strategy**: Extend proven React + Vite + enhanced API server pattern
- **Performance Targets**: <100ms slot scoring, <5s calendar sync, >90% test coverage

## Phase 5: Integration & System Testing

### 5.1 Service Integration
- [ ] **Inter-service communication** setup (HTTP/gRPC)
- [ ] **Event-driven architecture** with message queues
- [ ] **Distributed tracing** implementation
- [ ] **Circuit breakers** and resilience patterns

### 5.2 End-to-End Testing
- [ ] **Contract testing** with Pact or similar
- [ ] **Integration test suites** for service interactions
- [ ] **Performance testing** under load
- [ ] **Security testing** and vulnerability scanning

### 5.3 Deployment Pipeline
- [ ] **Containerization** with Docker
- [ ] **Kubernetes manifests** or Docker Compose
- [ ] **CI/CD pipeline** with automated testing
- [ ] **Infrastructure as Code** with Terraform

## Phase 6: Production Readiness

### 6.1 Observability
- [ ] **Structured logging** with correlation IDs
- [ ] **Metrics collection** (business and technical)
- [ ] **Distributed tracing** across services
- [ ] **Health checks** and readiness probes

### 6.2 Security
- [ ] **Security audit** of API endpoints
- [ ] **Rate limiting** implementation
- [ ] **Input validation** and sanitization
- [ ] **Secrets management** (Vault, K8s secrets)

### 6.3 Documentation
- [ ] **API documentation** deployment
- [ ] **Developer guides** and tutorials
- [ ] **Operational runbooks** for production
- [ ] **Architecture decision records** (ADRs)

## Best Practices Implemented

### API Design
- ✅ **Contract-first development** with OpenAPI 3.1
- ✅ **Semantic versioning** for API evolution
- ✅ **Consistent error handling** across services
- ✅ **Standardized pagination** with cursor-based approach
- ✅ **Idempotency support** for safe operations

### Security
- ✅ **JWT authentication** with granular scopes
- ✅ **ETag-based optimistic locking** for concurrency
- ✅ **Rate limiting** specifications
- ✅ **Input validation** schemas

### Observability
- ✅ **Correlation IDs** for request tracing
- ✅ **Structured error responses** with codes
- ✅ **Job tracking** for async operations
- ✅ **Confidence scoring** for AI operations

### Development
- ✅ **Comprehensive examples** in API specs
- ✅ **Reusable components** to prevent drift
- ✅ **Clear documentation** with usage patterns
- ✅ **Webhook standardization** for events

## Success Metrics

### Technical Metrics
- **API Response Time**: < 200ms for 95th percentile
- **Service Availability**: > 99.9% uptime
- **Test Coverage**: > 80% for all services
- **API Contract Compliance**: 100% adherence to OpenAPI specs

### Business Metrics
- **Email Processing Accuracy**: > 90% for action item extraction
- **Scheduling Success Rate**: > 95% for conflict-free suggestions
- **User Engagement**: Measured through API usage patterns
- **System Reliability**: Zero data loss, consistent state management

## Risk Mitigation

### Technical Risks
- **API Breaking Changes**: Semantic versioning and deprecation policies
- **Service Dependencies**: Circuit breakers and fallback mechanisms
- **Data Consistency**: Event sourcing and saga patterns
- **Performance Bottlenecks**: Load testing and monitoring

### Business Risks
- **Provider API Changes**: Adapter pattern for external integrations
- **Scalability Issues**: Horizontal scaling and caching strategies
- **Security Vulnerabilities**: Regular audits and penetration testing
- **Compliance Requirements**: GDPR/privacy by design principles

## Next Immediate Actions

1. ✅ **Setup API validation tooling** (Spectral, pre-commit hooks) - COMPLETED
2. ✅ **Generate mock servers** for frontend development - COMPLETED
3. ✅ **Establish CI/CD pipeline** for automated testing - COMPLETED
4. ✅ **Create development environment** setup scripts - COMPLETED
5. ✅ **Setup project structure** for microservices (Phase 3.1) - COMPLETED
6. ✅ **Create user-friendly installation and configuration** (Phase 3.5) - COMPLETED
7. 🚨 **PRIORITY: Implement Staging Environment** (Phase 1 of staging roadmap)
8. 🗓️ **NEXT: Complete Goal & Strategy Service Phases 4-6** (Calendar Integration, Capacity Management, Intelligence)
9. 🗓️ **THEN: Implement Calendar Sync Service** (Standalone microservice with Google Calendar integration)
10. **Setup database schemas and migrations**
11. **Implement email provider integrations**
12. **Create configuration web UI** for non-technical users

### **📋 Calendar Implementation Priority**
Following the user's direction to complete Goal & Strategy Service phases 4-6 first, then implement Calendar Sync Service:
- **Week 1-3**: Goal Service Phase 4 (Calendar Integration), Phase 5 (Capacity Management), Phase 6 (Intelligence)
- **Week 4-6**: Calendar Sync Service implementation with Google Calendar integration
- **Ongoing**: Extend testing infrastructure and maintain staging environment

This plan ensures a systematic, best-practice approach to building the personalEA system with high quality, maintainability, and scalability.