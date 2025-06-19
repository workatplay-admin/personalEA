module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverageFrom: [
    'tests/**/*.{ts,js}',
    '!tests/**/*.d.ts',
    '!tests/pact/pacts/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  // Pact-specific configuration
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/pact/pacts/'
  ],
  // Environment variables for tests
  setupFiles: ['<rootDir>/tests/env.setup.js']
};