import { jest } from '@jest/globals';

// Mock environment variables for testing
process.env['NODE_ENV'] = 'test';
process.env['OPENAI_API_KEY'] = 'sk-test-mock-key-for-testing';
process.env['OPENAI_MODEL'] = 'gpt-3.5-turbo';
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test_db';

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// Reset all mocks after each test suite
afterAll(() => {
  jest.resetAllMocks();
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidSMARTGoal(): R;
      toHaveHighConfidence(): R;
      toBeValidAPIKey(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidSMARTGoal(received) {
    const isValid = received &&
      typeof received.smartGoal === 'string' &&
      received.smartCriteria &&
      typeof received.confidence === 'number' &&
      received.confidence >= 0 && received.confidence <= 1;
    
    return {
      pass: isValid,
      message: () => isValid 
        ? `Expected ${received} not to be a valid SMART goal`
        : `Expected ${received} to be a valid SMART goal`
    };
  },
  
  toHaveHighConfidence(received) {
    const hasHighConfidence = received && 
      typeof received.confidence === 'number' && 
      received.confidence >= 0.8;
    
    return {
      pass: hasHighConfidence,
      message: () => hasHighConfidence
        ? `Expected confidence ${received.confidence} not to be high (>= 0.8)`
        : `Expected confidence ${received.confidence} to be high (>= 0.8)`
    };
  },
  
  toBeValidAPIKey(received) {
    const isValid = typeof received === 'string' && 
      (received.startsWith('sk-') || received.startsWith('sk-test-'));
    
    return {
      pass: isValid,
      message: () => isValid
        ? `Expected ${received} not to be a valid API key`
        : `Expected ${received} to be a valid API key`
    };
  }
});