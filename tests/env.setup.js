// Environment setup for contract tests
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// API endpoints for testing
process.env.EMAIL_SERVICE_URL = 'http://localhost:8083';
process.env.GOALS_SERVICE_URL = 'http://localhost:8085';
process.env.CALENDAR_SERVICE_URL = 'http://localhost:8086';

// Pact broker configuration (for CI/CD)
process.env.PACT_BROKER_BASE_URL = process.env.PACT_BROKER_BASE_URL || 'http://localhost:9292';
process.env.PACT_BROKER_USERNAME = process.env.PACT_BROKER_USERNAME || '';
process.env.PACT_BROKER_PASSWORD = process.env.PACT_BROKER_PASSWORD || '';

// Test timeouts
process.env.CONTRACT_TEST_TIMEOUT = '30000';
process.env.SCHEMATHESIS_MAX_EXAMPLES = '50';