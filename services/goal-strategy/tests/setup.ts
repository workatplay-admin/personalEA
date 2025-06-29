import 'module-alias/register';
import { jest } from '@jest/globals';
import dotenv from 'dotenv';
import path from 'path';

// Note: Node.js 18+ already includes global fetch
// Tests can cast to jest.Mock when needed

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.test') });

// Test environment configuration
process.env['NODE_ENV'] = 'test';

// For unit tests, allow mock keys. For integration tests, require real keys.
const isIntegrationTest = process.env['TEST_TYPE'] === 'integration' || 
                         process.argv.some(arg => arg.includes('integration'));

if (isIntegrationTest && (!process.env['OPENAI_API_KEY'] || process.env['OPENAI_API_KEY'].includes('YOUR_'))) {
  throw new Error('Real OPENAI_API_KEY required for integration tests. Set in .env.test or environment variables.');
}

// Set default test values if not provided
process.env['OPENAI_MODEL'] = process.env['OPENAI_MODEL'] || 'gpt-3.5-turbo';
process.env['DATABASE_URL'] = process.env['DATABASE_URL'] || 'postgresql://test:test@localhost:5432/test_db';

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// DO NOT mock fetch globally - we need real API calls for integration tests
// Individual tests can mock fetch if needed for unit testing

// However, ensure fetch is available for test environment
if (!global.fetch) {
  // @ts-ignore - In test environment, fetch might not be available
  global.fetch = jest.fn();
}

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