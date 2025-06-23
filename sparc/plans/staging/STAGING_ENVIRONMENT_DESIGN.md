# Staging Environment Design for User Testing

## Overview

The staging environment provides a production-like environment for comprehensive user testing of PersonalEA microservices. This design ensures reliable user acceptance testing, performance validation, and integration verification before production deployment.

## Staging Environment Architecture

### Multi-Stage Deployment Pipeline

```mermaid
graph LR
    subgraph "Development"
        DEV[Development Environment<br/>localhost:3000-3003]
    end
    
    subgraph "Staging Environments"
        FS[Feature Staging<br/>feature.staging.personalea.dev]
        IS[Integration Staging<br/>integration.staging.personalea.dev]
        UAT[User Acceptance Testing<br/>uat.staging.personalea.dev]
        PERF[Performance Testing<br/>perf.staging.personalea.dev]
    end
    
    subgraph "Production"
        PROD[Production Environment<br/>personalea.com]
    end
    
    DEV --> FS
    FS --> IS
    IS --> UAT
    UAT --> PERF
    PERF --> PROD
```

### Service Architecture in Staging

```mermaid
graph TB
    subgraph "Load Balancer Layer"
        LB[Nginx Load Balancer<br/>staging.personalea.dev]
    end
    
    subgraph "Application Layer"
        ES[Email Service<br/>Port 3001<br/>2 replicas]
        GS[Goal Strategy Service<br/>Port 3000<br/>2 replicas]
        CS[Calendar Service<br/>Port 3003<br/>2 replicas]
        AG[API Gateway<br/>Port 8080<br/>2 replicas]
    end
    
    subgraph "Testing Interface"
        UI[React Testing UI<br/>Port 5173<br/>Enhanced for staging]
        MON[Monitoring Dashboard<br/>Port 3001]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Primary + Replica)]
        RD[(Redis Cluster<br/>Cache + Sessions)]
    end
    
    subgraph "External Services"
        GM[Gmail API<br/>Test Account]
        GC[Google Calendar<br/>Test Account]
        OAI[OpenAI API<br/>Managed Keys]
    end
    
    LB --> AG
    AG --> ES
    AG --> GS  
    AG --> CS
    
    ES --> PG
    GS --> PG
    CS --> PG
    
    ES --> RD
    GS --> RD
    
    ES --> GM
    CS --> GC
    GS --> OAI
    
    UI --> AG
    MON --> ES
    MON --> GS
    MON --> CS
```

## Staging Environment Specifications

### Feature Staging Environment

**Purpose**: Test individual features in isolation

**Configuration**:
```yaml
# docker-compose.feature-staging.yml
version: '3.8'
services:
  # Service under test (dynamic based on feature)
  feature-service:
    build: ./services/${FEATURE_SERVICE}
    environment:
      - NODE_ENV=staging
      - LOG_LEVEL=debug
      - FEATURE_FLAGS=${FEATURE_FLAGS}
    ports:
      - "${SERVICE_PORT}:${SERVICE_PORT}"
    
  # Supporting services (mocked or minimal)
  mock-services:
    image: stoplight/prism:4
    command: mock -h 0.0.0.0 /tmp/specs/*.yaml
    volumes:
      - ./docs:/tmp/specs
    ports:
      - "8080-8090:4010"
      
  # Test database
  postgres-test:
    image: postgres:14
    environment:
      POSTGRES_DB: personalea_feature_test
      POSTGRES_USER: test_user  
      POSTGRES_PASSWORD: test_password
    volumes:
      - feature_test_data:/var/lib/postgresql/data
      
  # Redis for caching
  redis-test:
    image: redis:7-alpine
    volumes:
      - feature_test_cache:/data

volumes:
  feature_test_data:
  feature_test_cache:
```

### Integration Staging Environment

**Purpose**: Test service integration and workflows

**Configuration**:
```yaml
# docker-compose.integration-staging.yml
version: '3.8'
services:
  email-service:
    build: ./services/email-processing
    environment:
      - NODE_ENV=staging
      - DATABASE_URL=postgresql://staging_user:staging_password@postgres:5432/personalea_staging
      - REDIS_URL=redis://redis:6379
      - GMAIL_CLIENT_ID=${STAGING_GMAIL_CLIENT_ID}
      - OPENAI_API_KEY=${STAGING_OPENAI_API_KEY}
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
      
  goal-strategy-service:
    build: ./services/goal-strategy
    environment:
      - NODE_ENV=staging
      - DATABASE_URL=postgresql://staging_user:staging_password@postgres:5432/personalea_staging
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${STAGING_OPENAI_API_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
      
  calendar-service:
    build: ./services/calendar
    environment:
      - NODE_ENV=staging
      - DATABASE_URL=postgresql://staging_user:staging_password@postgres:5432/personalea_staging
      - REDIS_URL=redis://redis:6379
      - GOOGLE_CALENDAR_CLIENT_ID=${STAGING_GOOGLE_CALENDAR_CLIENT_ID}
    ports:
      - "3003:3003"
    depends_on:
      - postgres
      - redis
      
  api-gateway:
    build: ./services/api-gateway
    environment:
      - NODE_ENV=staging
      - EMAIL_SERVICE_URL=http://email-service:3001
      - GOAL_SERVICE_URL=http://goal-strategy-service:3000
      - CALENDAR_SERVICE_URL=http://calendar-service:3003
    ports:
      - "8080:8080"
    depends_on:
      - email-service
      - goal-strategy-service
      - calendar-service
      
  testing-ui:
    build: ./testing/goal-strategy-test
    environment:
      - VITE_API_BASE_URL=http://localhost:8080/api/v1
      - VITE_STAGING_MODE=true
    ports:
      - "5173:5173"
    depends_on:
      - api-gateway
      
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: personalea_staging
      POSTGRES_USER: staging_user
      POSTGRES_PASSWORD: staging_password
    volumes:
      - staging_postgres_data:/var/lib/postgresql/data
      - ./scripts/init-staging-db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
      
  redis:
    image: redis:7-alpine
    volumes:
      - staging_redis_data:/data
    ports:
      - "6379:6379"
      
  monitoring:
    build: ./monitoring
    environment:
      - SERVICES=email-service,goal-strategy-service,calendar-service
    ports:
      - "3001:3001"
    depends_on:
      - email-service
      - goal-strategy-service
      - calendar-service

volumes:
  staging_postgres_data:
  staging_redis_data:
```

### User Acceptance Testing Environment

**Purpose**: Production-like environment for user testing

**Features**:
- Real external API integrations (with test accounts)
- Production-like data volumes
- Performance monitoring
- User feedback collection
- A/B testing capabilities

**Configuration**:
```yaml
# docker-compose.uat-staging.yml
version: '3.8'
services:
  # All services with production configuration
  # but using staging/test external accounts
  
  # Enhanced monitoring and feedback collection
  user-feedback:
    build: ./monitoring/user-feedback
    environment:
      - FEEDBACK_DB_URL=postgresql://staging_user:staging_password@postgres:5432/personalea_feedback
    ports:
      - "3002:3002"
      
  analytics:
    build: ./monitoring/analytics
    environment:
      - ANALYTICS_DB_URL=postgresql://staging_user:staging_password@postgres:5432/personalea_analytics
    ports:
      - "3003:3003"
      
  # Performance monitoring
  prometheus:
    image: prom/prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
      
  grafana:
    image: grafana/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=staging_password
    volumes:
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    ports:
      - "3000:3000"
```

## User Testing Framework

### Testing Milestone Structure

```mermaid
graph TD
    M1[Milestone 1: Service Functionality] --> M2[Milestone 2: Service Integration]
    M2 --> M3[Milestone 3: User Workflow Validation]
    M3 --> M4[Milestone 4: Performance Acceptance]
    M4 --> M5[Milestone 5: Security Validation]
    M5 --> PROD[Production Ready]
    
    M1 --> M1T[Individual Service Testing]
    M2 --> M2T[Cross-Service Integration Testing]
    M3 --> M3T[End-to-End User Journey Testing]
    M4 --> M4T[Load Testing & Performance Validation]
    M5 --> M5T[Penetration Testing & Security Audit]
```

### Milestone 1: Service Functionality Testing

**Objective**: Validate each service works independently

**Environment**: Feature Staging

**Test Scenarios**:
```typescript
// Email Processing Service Tests
describe('Email Service Functionality', () => {
  it('should sync emails from Gmail account', async () => {
    // Test Gmail OAuth flow
    // Validate email synchronization
    // Check AI summarization quality
  });
  
  it('should extract action items accurately', async () => {
    // Test with sample email dataset
    // Validate action item extraction
    // Check confidence scores
  });
});

// Goal Strategy Service Tests  
describe('Goal Strategy Service Functionality', () => {
  it('should translate vague goals to SMART goals', async () => {
    // Test goal translation workflow
    // Validate AI-powered clarification
    // Check milestone generation
  });
  
  it('should generate realistic task breakdowns', async () => {
    // Test WBS engine
    // Validate estimation accuracy
    // Check dependency mapping
  });
});

// Calendar Service Tests
describe('Calendar Service Functionality', () => {
  it('should sync with Google Calendar', async () => {
    // Test calendar integration
    // Validate event synchronization
    // Check conflict detection
  });
  
  it('should schedule tasks intelligently', async () => {
    // Test scheduling algorithm
    // Validate availability analysis
    // Check optimization suggestions
  });
});
```

**Success Criteria**:
- ✅ All API endpoints respond correctly
- ✅ External integrations work (Gmail, Google Calendar, OpenAI)
- ✅ Database operations complete successfully
- ✅ AI features provide reasonable output
- ✅ Error handling works properly

### Milestone 2: Service Integration Testing

**Objective**: Validate services work together correctly

**Environment**: Integration Staging

**Test Scenarios**:
```typescript
describe('Service Integration Tests', () => {
  it('should complete email-to-goal workflow', async () => {
    // Sync emails with action items
    // Convert action items to goals
    // Generate task breakdown
    // Schedule tasks in calendar
  });
  
  it('should handle cross-service error propagation', async () => {
    // Test service failure scenarios
    // Validate error handling across services
    // Check recovery mechanisms
  });
  
  it('should maintain data consistency', async () => {
    // Test concurrent operations
    // Validate transaction boundaries
    // Check eventual consistency
  });
});
```

**Success Criteria**:
- ✅ End-to-end workflows complete successfully
- ✅ Data consistency maintained across services
- ✅ Error handling graceful across service boundaries
- ✅ Performance acceptable under normal load
- ✅ Monitoring and logging working

### Milestone 3: User Workflow Validation

**Objective**: Validate complete user journeys

**Environment**: User Acceptance Testing

**User Journey Tests**:
```typescript
describe('User Journey Tests', () => {
  describe('New User Onboarding', () => {
    it('should guide user through setup', async () => {
      // Account creation
      // Email/calendar connection
      // First goal creation
      // Initial task scheduling
    });
  });
  
  describe('Daily Workflow', () => {
    it('should process morning email digest', async () => {
      // Email synchronization
      // AI-powered summarization
      // Action item extraction
      // Goal/task updates  
    });
    
    it('should optimize daily schedule', async () => {
      // Calendar analysis
      // Task prioritization
      // Schedule optimization
      // Conflict resolution
    });
  });
  
  describe('Goal Management Workflow', () => {
    it('should support complete goal lifecycle', async () => {
      // Goal creation and clarification
      // Milestone breakdown
      // Task generation and scheduling
      // Progress tracking and adjustment
    });
  });
});
```

**User Testing Protocol**:
1. **Recruit Test Users**: 10-15 users representing target demographics
2. **Guided Testing Sessions**: 2-hour sessions with observation
3. **Unguided Usage Period**: 1-week independent usage
4. **Feedback Collection**: Surveys, interviews, and analytics
5. **Iterative Improvement**: Fix issues and retest

**Success Criteria**:
- ✅ >80% task completion rate for key workflows
- ✅ >4.0/5.0 user satisfaction rating
- ✅ <5% of users need support to complete tasks
- ✅ Average time-to-value <15 minutes
- ✅ No critical usability issues identified

### Milestone 4: Performance Acceptance Testing

**Objective**: Validate system performs under expected load

**Environment**: Performance Testing

**Load Testing Scenarios**:
```yaml
# k6 load testing configuration
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up
    { duration: '5m', target: 10 },   // Stay at 10 users
    { duration: '2m', target: 20 },   // Ramp up to 20 users  
    { duration: '5m', target: 20 },   // Stay at 20 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],   // 95% of requests under 200ms
    http_req_failed: ['rate<0.1'],      // Error rate under 10%
  },
};

export default function() {
  // Test critical user journeys under load
  let response = http.post('http://staging.personalea.dev/api/v1/goals/translate', {
    goal: 'I want to improve my productivity',
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(1);
}
```

**Performance Requirements**:
- **Response Time**: <200ms for 95th percentile
- **Throughput**: 100+ requests/second per service
- **Availability**: >99.9% uptime
- **Resource Usage**: <80% CPU/Memory under normal load
- **Database Performance**: <50ms for complex queries

### Milestone 5: Security Validation

**Objective**: Validate security requirements met

**Environment**: Security Testing

**Security Test Categories**:
```bash
# OWASP ZAP baseline scan
zap-baseline.py -t http://staging.personalea.dev -J zap-report.json

# Custom security tests
npm run test:security

# Dependency vulnerability scan  
npm audit
snyk test

# Secrets scanning
truffleHog --regex --entropy=False .

# Container security scan
docker scan personalea/goal-strategy-service:staging
```

**Security Requirements**:
- ✅ No critical or high-severity vulnerabilities
- ✅ All data encrypted in transit and at rest
- ✅ Authentication and authorization working correctly
- ✅ Input validation preventing injection attacks
- ✅ Rate limiting preventing abuse
- ✅ Secrets properly managed and not exposed

## Staging Infrastructure Setup

### Docker Compose Orchestration

**Development Command**:
```bash
# Start feature staging
docker-compose -f docker-compose.feature-staging.yml up -d

# Start integration staging
docker-compose -f docker-compose.integration-staging.yml up -d

# Start UAT staging
docker-compose -f docker-compose.uat-staging.yml up -d
```

### Kubernetes Deployment (Future)

```yaml
# k8s/staging-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: personalea-staging
  labels:
    environment: staging
    
---
# k8s/staging-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: goal-strategy-service
  namespace: personalea-staging
spec:
  replicas: 2
  selector:
    matchLabels:
      app: goal-strategy-service
  template:
    metadata:
      labels:
        app: goal-strategy-service
    spec:
      containers:
      - name: goal-strategy-service
        image: personalea/goal-strategy-service:staging
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "staging"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: staging-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Monitoring and Observability

**Metrics Collection**:
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'personalea-services'
    static_configs:
      - targets: 
        - 'email-service:3001'
        - 'goal-strategy-service:3000' 
        - 'calendar-service:3003'
    metrics_path: '/metrics'
    scrape_interval: 10s
```

**Dashboard Configuration**:
```json
{
  "dashboard": {
    "title": "PersonalEA Staging Environment",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{service}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph", 
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      }
    ]
  }
}
```

## Testing Automation

### Automated Test Execution

```bash
#!/bin/bash
# scripts/run-staging-tests.sh

set -e

echo "Starting staging environment tests..."

# Stage 1: Feature testing
echo "Running feature tests..."
docker-compose -f docker-compose.feature-staging.yml up -d
./scripts/wait-for-services.sh
npm run test:feature
docker-compose -f docker-compose.feature-staging.yml down

# Stage 2: Integration testing  
echo "Running integration tests..."
docker-compose -f docker-compose.integration-staging.yml up -d
./scripts/wait-for-services.sh
npm run test:integration
docker-compose -f docker-compose.integration-staging.yml down

# Stage 3: UAT testing
echo "Running UAT tests..."
docker-compose -f docker-compose.uat-staging.yml up -d
./scripts/wait-for-services.sh
npm run test:uat
docker-compose -f docker-compose.uat-staging.yml down

# Stage 4: Performance testing
echo "Running performance tests..."
docker-compose -f docker-compose.uat-staging.yml up -d
./scripts/wait-for-services.sh
k6 run tests/performance/load-test.js
docker-compose -f docker-compose.uat-staging.yml down

# Stage 5: Security testing
echo "Running security tests..."
docker-compose -f docker-compose.uat-staging.yml up -d
./scripts/wait-for-services.sh
npm run test:security
docker-compose -f docker-compose.uat-staging.yml down

echo "All staging tests completed successfully!"
```

### CI/CD Integration

```yaml
# .github/workflows/staging-tests.yml
name: Staging Environment Tests

on:
  push:
    branches: [develop, staging]
  pull_request:
    branches: [main]

jobs:
  feature-testing:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [email-processing, goal-strategy, calendar]
    steps:
      - uses: actions/checkout@v3
      - name: Test ${{ matrix.service }} service
        run: |
          export FEATURE_SERVICE=${{ matrix.service }}
          docker-compose -f docker-compose.feature-staging.yml up -d
          npm run test:feature:${{ matrix.service }}
          docker-compose -f docker-compose.feature-staging.yml down

  integration-testing:
    runs-on: ubuntu-latest
    needs: feature-testing
    steps:
      - uses: actions/checkout@v3
      - name: Run integration tests
        run: |
          docker-compose -f docker-compose.integration-staging.yml up -d
          npm run test:integration
          docker-compose -f docker-compose.integration-staging.yml down

  user-acceptance-testing:
    runs-on: ubuntu-latest
    needs: integration-testing
    if: github.ref == 'refs/heads/staging'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to UAT environment
        run: |
          docker-compose -f docker-compose.uat-staging.yml up -d
          npm run test:uat
      - name: Keep UAT environment running
        if: success()
        run: echo "UAT environment available at staging.personalea.dev"
```

## Success Metrics and KPIs

### Technical Metrics
- **Deployment Success Rate**: >95% successful deployments
- **Test Pass Rate**: >98% automated test success
- **Mean Time to Recovery**: <15 minutes for service issues
- **Performance Regression**: Zero performance regressions
- **Security Score**: Zero critical/high vulnerabilities

### User Experience Metrics  
- **Task Completion Rate**: >90% for critical user journeys
- **User Satisfaction**: >4.2/5.0 average rating
- **Time to Value**: <10 minutes average onboarding
- **Support Ticket Rate**: <2% of users requiring support
- **Feature Adoption**: >80% adoption of core features within 1 week

### Business Metrics
- **Testing Efficiency**: 50% reduction in manual testing time
- **Bug Detection**: >90% of bugs caught in staging
- **Release Velocity**: 2x faster release cycles
- **User Feedback Quality**: Actionable feedback from >80% of test users
- **Production Incident Rate**: <1 critical incident per month

## Next Steps

1. **Environment Setup**: Configure staging infrastructure
2. **Test Data Creation**: Generate realistic test datasets
3. **User Recruitment**: Identify and recruit test users
4. **Monitoring Setup**: Implement comprehensive observability
5. **Automation**: Implement automated testing pipelines
6. **Documentation**: Create user testing guides and protocols

---

**Document Version**: 1.0  
**Last Updated**: 2025-06-22  
**Next Review**: Bi-weekly during active staging deployment