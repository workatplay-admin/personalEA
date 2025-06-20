# API Validation & Tooling Setup

This document describes the API validation and tooling infrastructure for the PersonalEA project.

## Overview

The PersonalEA project follows API-first design principles with comprehensive validation, documentation generation, and mock server capabilities. This setup ensures high-quality API contracts and enables efficient development workflows.

## Tools & Technologies

### API Linting & Validation
- **Spectral CLI**: OpenAPI specification linting with custom rules
- **Custom Ruleset**: Enforces PersonalEA-specific API standards
- **Pre-commit Hooks**: Automatic validation before commits

### Mock Servers
- **Prism CLI**: Dynamic mock servers from OpenAPI specifications
- **Request Validation**: Validates incoming requests against API contracts
- **Dynamic Examples**: Generates realistic mock data

### Documentation Generation
- **Redocly CLI**: Modern API documentation generation
- **Interactive Docs**: Browsable API documentation with examples
- **Multi-format Output**: HTML, PDF, and other formats

## Setup Instructions

### Prerequisites
```bash
# Node.js 18+ and npm 9+
node --version  # Should be 18.0.0 or higher
npm --version   # Should be 9.0.0 or higher
```

### Installation
```bash
# Install all dependencies
npm install

# Install git hooks
npm run prepare
```

## Usage

### API Validation

#### Lint All API Specifications
```bash
# Run Spectral linting with custom rules
npm run lint:api

# Pretty formatted output
npm run lint:api:fix

# Validate and confirm all APIs are valid
npm run validate:api
```

#### Individual API Validation
```bash
# Validate specific API
npx spectral lint docs/email-service-api-v1.yaml --ruleset docs/.spectral.yaml
npx spectral lint docs/goal-strategy-service-api-v1.yaml --ruleset docs/.spectral.yaml
npx spectral lint docs/calendar-service-api-v1.yaml --ruleset docs/.spectral.yaml
```

### Mock Servers

#### Start Individual Mock Servers
```bash
# Email Processing Service (port 8083)
npm run mock:email

# Goal & Strategy Service (port 8085)
npm run mock:goals

# Calendar Service (port 8086)
npm run mock:calendar
```

#### Start All Mock Servers
```bash
# Start all services concurrently
npm run mock:all

# Using Docker Compose
npm run mock:docker

# Stop Docker services
npm run mock:docker:stop
```

#### Test Mock Server Endpoints
```bash
# Check service health
npm run mock:status

# Example API calls
curl -H "Authorization: Bearer test-token" \
     -H "x-correlation-id: test-123" \
     http://localhost:8083/v1/emails/sync

curl -H "Authorization: Bearer test-token" \
     -H "x-correlation-id: test-123" \
     http://localhost:8085/v1/goals

curl -H "Authorization: Bearer test-token" \
     -H "x-correlation-id: test-123" \
     http://localhost:8086/v1/calendars
```

### Documentation Generation

#### Build Static Documentation
```bash
# Generate HTML documentation for all APIs
npm run docs:build

# Serve interactive documentation
npm run docs:serve
```

#### View Generated Documentation
- Email Service: `docs/email-service-docs.html`
- Goal & Strategy Service: `docs/goal-strategy-docs.html`
- Calendar Service: `docs/calendar-service-docs.html`

### Type Generation
```bash
# Generate TypeScript types from OpenAPI specs
npm run generate:types
```

## Validation Rules

### Custom Spectral Rules

Our `.spectral.yaml` configuration enforces:

#### Security Standards
- ✅ All operations must have security schemes
- ✅ JWT scopes must be properly documented
- ✅ Security schemes must document required scopes

#### API Design Standards
- ✅ Semantic versioning for API versions
- ✅ Consistent error responses (401, 403, etc.)
- ✅ Correlation ID headers for tracing
- ✅ ETag headers for optimistic locking
- ✅ Idempotency keys for write operations

#### Documentation Requirements
- ✅ All operations must have descriptions
- ✅ All schemas should have examples
- ✅ Parameters must use snake_case naming
- ✅ Schema names must use PascalCase

#### Webhook Standards
- ✅ Webhook endpoints follow `/v1/events/{event-name}` pattern
- ✅ Consistent event naming conventions

#### Pagination & Performance
- ✅ List operations should support pagination
- ✅ Rate limiting documentation required

## CI/CD Integration

### GitHub Actions Workflow

The project includes automated validation via GitHub Actions:

```yaml
# .github/workflows/api-validation.yml
- API specification validation
- Documentation generation
- Mock server testing
- Security scanning
- Multi-Node.js version testing
```

### Pre-commit Hooks

Automatic validation before commits:
```bash
# Configured in package.json
"husky": {
  "hooks": {
    "pre-commit": "lint-staged"
  }
}

"lint-staged": {
  "docs/**/*-api-*.yaml": [
    "spectral lint --ruleset docs/.spectral.yaml"
  ]
}
```

## Development Workflow

### 1. API Design
1. Create/modify OpenAPI specifications in `docs/`
2. Run `npm run lint:api` to validate
3. Fix any validation errors or warnings
4. Generate documentation with `npm run docs:build`

### 2. Mock Development
1. Start mock servers with `npm run mock:all`
2. Test API endpoints against mocks
3. Validate request/response formats
4. Iterate on API design as needed

### 3. Contract Testing
```bash
# Run contract tests against mock servers
npm run test:contract:mock

# Run Pact contract testing
npm run test:contract:pact
```

### 4. Documentation Review
1. Generate and review API documentation
2. Ensure examples are comprehensive
3. Verify security requirements are documented
4. Check for breaking changes

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check what's using a port
lsof -i :8083

# Kill processes using specific ports
pkill -f "prism mock"
```

#### Spectral Validation Errors
```bash
# Run with verbose output
npx spectral lint docs/email-service-api-v1.yaml --ruleset docs/.spectral.yaml --verbose

# Check specific rule documentation
npx spectral lint --help
```

#### Mock Server Issues
```bash
# Check mock server logs
npm run mock:docker:logs

# Restart Docker services
npm run mock:docker:rebuild
```

### Performance Optimization

#### Spectral Performance
- Use specific file patterns instead of wildcards
- Consider rule-specific configurations for large specs
- Cache node_modules in CI/CD

#### Mock Server Performance
- Use static examples for faster responses
- Configure appropriate timeouts
- Monitor memory usage for long-running mocks

## Best Practices

### API Design
1. **Contract-First**: Design APIs before implementation
2. **Versioning**: Use semantic versioning consistently
3. **Security**: Always include proper authentication/authorization
4. **Documentation**: Provide comprehensive examples and descriptions

### Validation
1. **Incremental**: Validate changes incrementally during development
2. **Automation**: Use pre-commit hooks and CI/CD validation
3. **Feedback**: Address validation warnings promptly
4. **Standards**: Follow established naming and design conventions

### Mock Development
1. **Realistic Data**: Use realistic examples in specifications
2. **Error Cases**: Test both success and error scenarios
3. **Performance**: Consider response times and data volumes
4. **Stateful Testing**: Use stateful mocks for complex workflows

## Next Steps

1. **Enhanced Contract Testing**: Implement comprehensive Pact testing
2. **API Monitoring**: Add runtime API monitoring and alerting
3. **Performance Testing**: Load test against mock servers
4. **Security Scanning**: Integrate additional security validation tools
5. **Breaking Change Detection**: Implement automated breaking change detection

## Resources

- [OpenAPI Specification](https://spec.openapis.org/oas/v3.1.0)
- [Spectral Documentation](https://meta.stoplight.io/docs/spectral)
- [Prism Documentation](https://meta.stoplight.io/docs/prism)
- [Redocly CLI Documentation](https://redocly.com/docs/cli)
- [PersonalEA Development Plan](./development-plan.md)