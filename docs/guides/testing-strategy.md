# Testing Strategy Guide

This guide outlines PersonalEA's comprehensive testing approach and how to write effective tests.

## Testing Philosophy

We follow a testing pyramid approach:
- **Unit Tests** (70%): Fast, isolated component tests
- **Integration Tests** (20%): Service interaction tests
- **E2E Tests** (10%): Full user journey tests

## Test Types

### Unit Tests

Test individual functions and components in isolation.

```typescript
// Example: Goal validation unit test
describe('GoalValidator', () => {
  it('should validate SMART criteria', () => {
    const goal = {
      title: 'Launch product',
      measurable: '1000 users',
      timeframe: '3 months'
    };
    
    const result = validateSmartGoal(goal);
    
    expect(result.isValid).toBe(true);
    expect(result.score).toBeGreaterThan(0.8);
  });
});
```

### Integration Tests

Test interactions between services and external dependencies.

```typescript
// Example: API integration test
describe('Goal Strategy API', () => {
  it('should create goal with all phases', async () => {
    const response = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test goal',
        timeframe: '6 months'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.phases).toHaveProperty('milestones');
    expect(response.body.phases.milestones).toHaveLength(3);
  });
});
```

### End-to-End Tests

Test complete user workflows using Playwright.

```typescript
// Example: User journey test
test('Complete goal creation flow', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:3000');
  
  // Login
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password');
  await page.click('[data-testid="login-button"]');
  
  // Create goal
  await page.click('[data-testid="create-goal"]');
  await page.fill('[data-testid="goal-title"]', 'Launch startup');
  await page.click('[data-testid="submit-goal"]');
  
  // Verify phases displayed
  await expect(page.locator('[data-testid="milestones"]')).toBeVisible();
  await expect(page.locator('[data-testid="tasks"]')).toBeVisible();
});
```

## Running Tests

### All Tests
```bash
npm run test
```

### Specific Test Suites
```bash
# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Watch mode for development
npm run test:watch
```

### Test Coverage
```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
npm run test:coverage:open
```

## Writing Tests

### Test Structure

Follow the AAA pattern:
- **Arrange**: Set up test data
- **Act**: Execute the function
- **Assert**: Verify the result

```typescript
describe('FeatureName', () => {
  // Arrange - setup before each test
  beforeEach(() => {
    // Reset database
    // Mock external services
  });
  
  it('should perform expected behavior', () => {
    // Arrange
    const input = { data: 'test' };
    
    // Act
    const result = processData(input);
    
    // Assert
    expect(result).toEqual({ processed: true });
  });
});
```

### Mocking

#### Mock External Services
```typescript
// Mock OpenAI API
jest.mock('openai', () => ({
  ChatCompletion: {
    create: jest.fn().mockResolvedValue({
      choices: [{
        message: { content: 'Mocked response' }
      }]
    })
  }
}));
```

#### Mock Database
```typescript
// Using Prisma mock
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();

beforeEach(() => {
  prismaMock.goal.create.mockResolvedValue({
    id: '123',
    title: 'Test Goal',
    createdAt: new Date()
  });
});
```

### Test Data

Use factories for consistent test data:

```typescript
// factories/goal.factory.ts
export const createTestGoal = (overrides = {}) => ({
  title: 'Default test goal',
  description: 'Test description',
  timeframe: '3 months',
  userId: 'test-user-123',
  ...overrides
});

// Usage in tests
const goal = createTestGoal({ title: 'Custom goal' });
```

## Testing Best Practices

### 1. Test Behavior, Not Implementation

❌ Bad:
```typescript
it('should call database.save()', () => {
  service.createGoal(data);
  expect(database.save).toHaveBeenCalled();
});
```

✅ Good:
```typescript
it('should create and return a new goal', async () => {
  const goal = await service.createGoal(data);
  expect(goal.id).toBeDefined();
  expect(goal.title).toBe(data.title);
});
```

### 2. Use Descriptive Test Names

❌ Bad:
```typescript
it('test goal creation', () => {});
```

✅ Good:
```typescript
it('should create goal with SMART criteria when valid input provided', () => {});
```

### 3. Keep Tests Independent

Each test should:
- Set up its own data
- Clean up after itself
- Not depend on test order

### 4. Test Edge Cases

```typescript
describe('Goal validation', () => {
  it('should handle empty title', () => {});
  it('should handle very long title', () => {});
  it('should handle special characters', () => {});
  it('should handle null timeframe', () => {});
});
```

## Testing Tools

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};
```

### Playwright Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
});
```

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Nightly builds

### GitHub Actions Workflow

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e
      - uses: codecov/codecov-action@v3
```

## Performance Testing

### Load Testing
```javascript
// k6 load test script
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 }
  ]
};

export default function() {
  let response = http.get('https://api.personalea.com/goals');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500
  });
}
```

## Debugging Tests

### VS Code Debugging
```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--watchAll=false"],
  "console": "integratedTerminal"
}
```

### Troubleshooting Common Issues

1. **Flaky Tests**: Use `waitFor` for async operations
2. **Timeout Errors**: Increase timeout for slow operations
3. **Database State**: Reset between tests
4. **Mock Leakage**: Clear all mocks in `afterEach`

## Test Reports

### Coverage Reports
- HTML: `coverage/lcov-report/index.html`
- Console: `npm run test:coverage`
- CI Integration: Codecov/Coveralls

### E2E Test Reports
- Playwright HTML: `playwright-report/index.html`
- Screenshots: `test-results/`
- Videos: `test-results/videos/`

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Library](https://testing-library.com/docs/)
- [Test Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)