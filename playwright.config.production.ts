import { defineConfig, devices } from '@playwright/test';

/**
 * Production Environment Testing Configuration
 * For testing against live production systems with safety measures
 */
export default defineConfig({
  testDir: './testing/production',
  
  /* Run tests in files sequentially for production safety */
  fullyParallel: false,
  
  /* No retries in production to avoid excessive load */
  retries: 0,
  
  /* Single worker for production testing */
  workers: 1,
  
  /* Reporter configuration for production monitoring */
  reporter: [
    ['html', { outputFolder: 'production-test-report', open: 'never' }],
    ['json', { outputFile: 'production-results/results.json' }],
    ['junit', { outputFile: 'production-results/junit.xml' }],
    ['list'],
    ['@playwright/test/reporter/github']
  ],
  
  /* Production testing configuration */
  use: {
    /* Production base URL */
    baseURL: process.env.PRODUCTION_BASE_URL || 'https://personalea.com',
    
    /* Longer timeouts for production environment */
    actionTimeout: 30000,
    navigationTimeout: 60000,
    
    /* Minimal traces for production */
    trace: 'retain-on-failure',
    
    /* Screenshots only on failure to minimize storage */
    screenshot: 'only-on-failure',
    
    /* No video recording in production to reduce overhead */
    video: 'retain-on-failure',
    
    /* Production-specific headers */
    extraHTTPHeaders: {
      'User-Agent': 'PersonalEA-ProductionHealthCheck/1.0',
      'X-Test-Environment': 'production-monitoring'
    }
  },
  
  /* Production testing projects */
  projects: [
    {
      name: 'production-health-checks',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: process.env.PRODUCTION_BASE_URL,
        timeout: 30000
      },
      testMatch: '**/health-checks.spec.ts'
    },
    {
      name: 'production-smoke-tests',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: process.env.PRODUCTION_BASE_URL,
        timeout: 60000
      },
      testMatch: '**/smoke-tests.spec.ts'
    },
    {
      name: 'production-api-monitoring',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: process.env.PRODUCTION_API_URL,
        timeout: 45000
      },
      testMatch: '**/api-monitoring.spec.ts'
    },
    {
      name: 'production-user-journeys',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: process.env.PRODUCTION_BASE_URL,
        timeout: 120000
      },
      testMatch: '**/critical-user-journeys.spec.ts'
    },
    {
      name: 'production-mobile-check',
      use: { 
        ...devices['iPhone 12'],
        baseURL: process.env.PRODUCTION_BASE_URL,
        timeout: 90000
      },
      testMatch: '**/mobile-health-check.spec.ts'
    }
  ],
  
  /* Global timeout for production tests */
  timeout: 120000,
  
  /* Expect timeout for production assertions */
  expect: {
    timeout: 15000,
    /* More lenient thresholds for production screenshots */
    toHaveScreenshot: {
      threshold: 0.3,
      mode: 'css',
      animations: 'disabled'
    }
  },
  
  /* Output directories */
  outputDir: 'production-test-results/',
  
  /* Global setup for production testing */
  globalSetup: require.resolve('./testing/production/global-setup.ts'),
  globalTeardown: require.resolve('./testing/production/global-teardown.ts'),
  
  /* Production-specific test configuration */
  webServer: undefined, // Don't start local servers for production testing
  
  /* Metadata for production testing */
  metadata: {
    testType: 'production-monitoring',
    environment: 'production',
    purpose: 'health-checks-and-monitoring'
  }
});