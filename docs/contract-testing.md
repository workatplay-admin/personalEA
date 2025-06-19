# Contract Testing Guide

This document outlines the contract testing strategy for the personalEA system, covering API contract testing with Schemathesis and Dredd, and service contract testing with Pact.

## Overview

Contract testing ensures that:
1. **API implementations** match their OpenAPI specifications
2. **Service integrations** work correctly between microservices
3. **Breaking changes** are detected before deployment
4. **API contracts** remain consistent across versions

## Testing Strategy

### 1. API Contract Testing

#### Schemathesis (Property-Based Testing)
- **Purpose**: Generates test cases automatically from OpenAPI specs
- **Benefits**: Finds edge cases and validates schema compliance
- **Coverage**: All endpoints, request/response validation, error handling

```bash
# Run Schemathesis tests
npm run test:contract:schemathesis

# Individual service testing
schemathesis run docs/email-service-api-v1.yaml --base-url http://localhost:8083
```

#### Dredd (Implementation Validation)
- **Purpose**: Tests actual API implementations against specifications
- **Benefits**: Validates real service behavior, custom business logic
- **Coverage**: Request/response validation, status codes, headers

```bash
# Run Dredd tests
npm run test:contract:dredd

# Individual service testing
dredd docs/email-service-api-v1.yaml http://localhost:8083
```

### 2. Service Contract Testing

#### Pact (Consumer-Driven Contracts)
- **Purpose**: Tests interactions between microservices
- **Benefits**: Prevents integration issues, enables independent deployment
- **Coverage**: Service-to-service communication, API evolution

```bash
# Run Pact tests
npm run test:contract:pact

# Consumer tests (Dialog Gateway calling services)
npm run test:contract:pact:consumer

# Provider tests (Services validating contracts)
npm run test:contract:pact:provider
```

## Test Structure

```
tests/
├── pact/
│   ├── consumer/           # Consumer contract tests
│   │   ├── email-service.consumer.test.ts
│   │   ├── goal-strategy.consumer.test.ts
│   │   └── calendar.consumer.test.ts
│   ├── provider/           # Provider contract tests
│   │   ├── email-service.provider.test.ts
│   │   ├── goal-strategy.provider.test.ts
│   │   └── calendar.provider.test.ts
│   └── pacts/             # Generated contract files
├── dredd/                 # Dredd hook files
│   ├── email-service-hooks.js
│   ├── goal-strategy-hooks.js
│   └── calendar-hooks.js
├── env.setup.js          # Environment configuration
└── setup.ts              # Test setup and utilities
```

## Running Tests

### Local Development

1. **Start mock servers**:
   ```bash
   npm run mock:all
   ```

2. **Run all contract tests**:
   ```bash
   npm run test:contract
   ```

3. **Run specific test types**:
   ```bash
   npm run test:contract:api          # Schemathesis + Dredd
   npm run test:contract:schemathesis  # Property-based testing
   npm run test:contract:dredd        # Implementation validation
   npm run test:contract:pact         # Service contracts
   ```

### CI/CD Pipeline

Contract tests run automatically in GitHub Actions:

1. **API Validation** → **Contract Testing** → **Security Scan** → **Deploy Docs**
2. Tests run against mock servers for API validation
3. Results are uploaded as artifacts and commented on PRs
4. Pact contracts are published to broker on main branch

## Test Configuration

### Schemathesis Configuration

```python
# Configured via CLI parameters
--hypothesis-max-examples=25    # Number of test cases per endpoint
--hypothesis-deadline=5000      # Timeout per test case (ms)
--validate-schema=true          # Validate response schemas
--checks=all                    # Run all available checks
```

### Dredd Configuration

```yaml
# dredd.yml
reporter: apiary
custom:
  email-service:
    server: http://localhost:8083
    blueprint: docs/email-service-api-v1.yaml
    hookfiles: tests/dredd/email-service-hooks.js
```

### Pact Configuration

```javascript
// Consumer test setup
const provider = new Pact({
  consumer: 'dialog-gateway',
  provider: 'email-service',
  port: 1234,
  spec: 3
});
```

## Writing Contract Tests

### Pact Consumer Test Example

```typescript
describe('Email Service Consumer Contract', () => {
  beforeEach(() => {
    return provider.addInteraction({
      state: 'user has emails in their inbox',
      uponReceiving: 'a request for email digest',
      withRequest: {
        method: 'GET',
        path: '/v1/digest',
        headers: {
          'Authorization': like('Bearer token'),
          'X-Correlation-ID': like('req_123')
        }
      },
      willRespondWith: {
        status: 200,
        body: {
          digest: eachLike({
            email_id: like('email_123'),
            summary: like('Email summary'),
            confidence_score: like(0.95)
          })
        }
      }
    });
  });

  it('should return email digest', async () => {
    const response = await emailService.getDigest();
    expect(response.digest).toBeDefined();
  });
});
```

### Dredd Hook Example

```javascript
// tests/dredd/email-service-hooks.js
hooks.before('/v1/digest > GET', (transaction, done) => {
  // Add authentication
  transaction.request.headers['Authorization'] = 'Bearer test-token';
  transaction.request.headers['X-Correlation-ID'] = 'test-correlation';
  done();
});

hooks.after('/v1/digest > GET', (transaction, done) => {
  // Validate response structure
  const response = JSON.parse(transaction.real.body);
  if (!response.digest || !Array.isArray(response.digest)) {
    transaction.fail = 'Response should contain digest array';
  }
  done();
});
```

## Best Practices

### 1. Test Data Management
- Use deterministic test data for consistent results
- Mock external dependencies (OAuth, third-party APIs)
- Clean up test data after each test run

### 2. Authentication Handling
- Use test JWT tokens for API authentication
- Mock OAuth flows in contract tests
- Validate security headers and scopes

### 3. Error Scenario Testing
- Test error responses (4xx, 5xx status codes)
- Validate error message formats
- Test rate limiting and timeout scenarios

### 4. Version Compatibility
- Test backward compatibility with previous API versions
- Validate semantic versioning compliance
- Check for breaking changes in contract evolution

## Troubleshooting

### Common Issues

1. **Mock server not responding**:
   ```bash
   # Check if servers are running
   curl http://localhost:8083/v1/health
   curl http://localhost:8085/v1/health
   curl http://localhost:8086/v1/health
   ```

2. **Authentication failures**:
   - Verify JWT tokens in test configuration
   - Check security scopes in OpenAPI specs
   - Ensure mock servers accept test tokens

3. **Schema validation errors**:
   - Validate OpenAPI specs with Spectral first
   - Check for missing required fields
   - Verify data type consistency

4. **Pact contract mismatches**:
   - Ensure provider states match consumer expectations
   - Verify request/response formats
   - Check for API version compatibility

### Debug Commands

```bash
# Verbose Schemathesis output
schemathesis run docs/email-service-api-v1.yaml --base-url http://localhost:8083 --verbosity=2

# Dredd with detailed output
dredd docs/email-service-api-v1.yaml http://localhost:8083 --level=debug

# Jest with verbose output
npm run test:contract:pact -- --verbose
```

## Integration with Development Workflow

### Pre-commit Hooks
- API specification validation with Spectral
- Contract test execution on changed APIs
- Automatic contract generation updates

### Pull Request Validation
- Full contract test suite execution
- Breaking change detection
- Contract compatibility verification

### Deployment Pipeline
- Contract tests as deployment gates
- Pact contract publishing to broker
- Provider contract verification in staging

## Metrics and Monitoring

### Test Coverage Metrics
- API endpoint coverage percentage
- Contract test execution time
- Test failure rates and trends

### Contract Evolution Tracking
- API version compatibility matrix
- Breaking change frequency
- Contract drift detection

This comprehensive contract testing strategy ensures high confidence in API reliability and service integration quality throughout the development lifecycle.