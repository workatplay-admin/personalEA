const http = require('http');
const https = require('https');

// Configuration
const CONFIG = {
  goalStrategy: {
    protocol: 'http',
    hostname: 'localhost',
    port: 8085,
    basePath: '/api/v1'
  },
  emailProcessing: {
    protocol: 'http',
    hostname: 'localhost',
    port: 8084,
    basePath: '/api/v1'
  }
};

// Helper function to make requests
async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https' ? https : http;
    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null,
            raw: body
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
            raw: body,
            parseError: e.message
          });
        }
      });
    });
    
    req.on('error', (e) => {
      resolve({
        status: 0,
        error: e.message,
        code: e.code
      });
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    errors: 0
  },
  services: {}
};

// API Test Definitions
const API_TESTS = {
  goalStrategy: [
    // Health endpoints
    {
      name: 'Health Check',
      endpoint: '/health',
      method: 'GET',
      expectedStatus: 200,
      requiresAuth: false
    },
    {
      name: 'Detailed Health Check',
      endpoint: '/health/detailed',
      method: 'GET',
      expectedStatus: 200,
      requiresAuth: false
    },
    {
      name: 'Readiness Check',
      endpoint: '/health/ready',
      method: 'GET',
      expectedStatus: 200,
      requiresAuth: false
    },
    {
      name: 'Liveness Check',
      endpoint: '/health/live',
      method: 'GET',
      expectedStatus: 200,
      requiresAuth: false
    },
    {
      name: 'Metrics',
      endpoint: '/health/metrics',
      method: 'GET',
      expectedStatus: 200,
      requiresAuth: false
    },
    // Auth endpoints
    {
      name: 'Get Test Token',
      endpoint: '/auth/test-token',
      method: 'GET',
      expectedStatus: 200,
      requiresAuth: false,
      saveToken: true
    },
    // Goal endpoints
    {
      name: 'Translate Goal',
      endpoint: '/goals/translate',
      method: 'POST',
      expectedStatus: 200,
      requiresAuth: true,
      body: {
        raw_goal: "I want to become a better software developer",
        mode: "automatic"
      }
    },
    {
      name: 'List Goals',
      endpoint: '/goals',
      method: 'GET',
      expectedStatus: 200,
      requiresAuth: true
    },
    {
      name: 'Create Goal',
      endpoint: '/goals',
      method: 'POST',
      expectedStatus: 201,
      requiresAuth: true,
      body: {
        title: "Test Goal",
        description: "A test goal created by API validator",
        smart_criteria: {
          specific: { value: "Learn React", confidence: 0.8 },
          measurable: { value: "Complete 3 projects", metrics: ["projects completed"], confidence: 0.8 },
          achievable: { value: "Within my skill level", confidence: 0.7 },
          relevant: { value: "For career growth", confidence: 0.9 },
          timeBound: { value: "In 3 months", deadline: "2025-03-01", confidence: 0.8 }
        },
        priority: "MEDIUM"
      }
    },
    {
      name: 'Component Question',
      endpoint: '/goals/component-question',
      method: 'POST',
      expectedStatus: 200,
      requiresAuth: true,
      body: {
        goalTitle: "become a Senior Developer",
        componentKey: "specific",
        currentValue: "Achieve a promotion to senior developer",
        confidence: 0.7,
        isHighConfidence: false,
        goalContext: { title: "become a Senior Developer" }
      }
    },
    {
      name: 'Contextual Help',
      endpoint: '/goals/contextual-help',
      method: 'POST',
      expectedStatus: 200,
      requiresAuth: true,
      body: {
        goalTitle: "become a Senior Developer",
        componentKey: "measurable",
        conversationHistory: [
          {
            role: "assistant",
            content: "Let's make your goal measurable. What metrics will you use?"
          },
          {
            role: "user",
            content: "I don't know what metrics to use"
          }
        ],
        goalContext: {
          title: "become a Senior Developer",
          confidence: 0.7
        }
      }
    },
    {
      name: 'Analyze Without Transform',
      endpoint: '/goals/analyze-without-transform',
      method: 'POST',
      expectedStatus: 200,
      requiresAuth: true,
      body: {
        raw_goal: "Learn machine learning",
        context: {}
      }
    },
    {
      name: 'Conversation',
      endpoint: '/goals/conversation',
      method: 'POST',
      expectedStatus: 200,
      requiresAuth: true,
      body: {
        message: "I want to learn web development",
        conversation_id: "test-conversation-" + Date.now(),
        context: {}
      }
    }
  ],
  emailProcessing: [
    // Health endpoints
    {
      name: 'Health Check',
      endpoint: '/health',
      method: 'GET',
      expectedStatus: 200,
      requiresAuth: false
    },
    // Email endpoints
    {
      name: 'Email Sync',
      endpoint: '/emails/sync',
      method: 'POST',
      expectedStatus: 400, // Will fail without valid credentials
      requiresAuth: false,
      body: {
        user_id: "test-user",
        access_token: "invalid-token"
      }
    },
    {
      name: 'Email Digest',
      endpoint: '/emails/digest',
      method: 'POST',
      expectedStatus: 200,
      requiresAuth: false,
      body: {
        user_id: "test-user",
        time_window: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        }
      }
    }
  ]
};

// Test execution function
async function testEndpoint(service, test, authToken = null) {
  const config = CONFIG[service];
  const options = {
    protocol: config.protocol,
    hostname: config.hostname,
    port: config.port,
    path: config.basePath + test.endpoint,
    method: test.method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-correlation-id': `test-${Date.now()}-${Math.random().toString(36).substring(7)}`
    }
  };

  if (test.requiresAuth && authToken) {
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }

  const startTime = Date.now();
  const response = await makeRequest(options, test.body);
  const duration = Date.now() - startTime;

  const result = {
    name: test.name,
    endpoint: test.endpoint,
    method: test.method,
    duration: duration,
    status: response.status,
    expectedStatus: test.expectedStatus,
    passed: response.status === test.expectedStatus,
    requiresAuth: test.requiresAuth,
    response: {
      headers: response.headers,
      body: response.body,
      error: response.error
    }
  };

  // Special handling for token save
  if (test.saveToken && response.body?.data?.token) {
    result.token = response.body.data.token;
  }

  return result;
}

// Main test runner
async function runAllTests() {
  console.log('=== Personal EA API Validation ===');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  let authToken = null;

  // Test Goal Strategy Service
  console.log('Testing Goal Strategy Service...');
  testResults.services.goalStrategy = {
    service: 'Goal Strategy Service',
    port: CONFIG.goalStrategy.port,
    tests: []
  };

  for (const test of API_TESTS.goalStrategy) {
    const result = await testEndpoint('goalStrategy', test, authToken);
    
    // Save token if this is the auth endpoint
    if (result.token) {
      authToken = result.token;
      console.log('✓ Obtained auth token');
    }

    testResults.services.goalStrategy.tests.push(result);
    testResults.summary.total++;
    
    if (result.passed) {
      testResults.summary.passed++;
      console.log(`✓ ${test.name}: ${result.status} (${result.duration}ms)`);
    } else {
      if (result.error) {
        testResults.summary.errors++;
        console.log(`✗ ${test.name}: ERROR - ${result.error}`);
      } else {
        testResults.summary.failed++;
        console.log(`✗ ${test.name}: ${result.status} (expected ${test.expectedStatus})`);
      }
    }

    // Add small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n');

  // Test Email Processing Service
  console.log('Testing Email Processing Service...');
  testResults.services.emailProcessing = {
    service: 'Email Processing Service',
    port: CONFIG.emailProcessing.port,
    tests: []
  };

  for (const test of API_TESTS.emailProcessing) {
    const result = await testEndpoint('emailProcessing', test, null);
    testResults.services.emailProcessing.tests.push(result);
    testResults.summary.total++;
    
    if (result.passed) {
      testResults.summary.passed++;
      console.log(`✓ ${test.name}: ${result.status} (${result.duration}ms)`);
    } else {
      if (result.error) {
        testResults.summary.errors++;
        console.log(`✗ ${test.name}: ERROR - ${result.error}`);
      } else {
        testResults.summary.failed++;
        console.log(`✗ ${test.name}: ${result.status} (expected ${test.expectedStatus})`);
      }
    }

    // Add small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`Passed: ${testResults.summary.passed}`);
  console.log(`Failed: ${testResults.summary.failed}`);
  console.log(`Errors: ${testResults.summary.errors}`);
  console.log(`Success Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(2)}%`);

  // Save results to file
  const fs = require('fs');
  const resultsPath = '/workspaces/personalEA/api-validation-results.json';
  fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
  console.log(`\nDetailed results saved to: ${resultsPath}`);

  return testResults;
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests
runAllTests().then((results) => {
  // Also log critical failures
  console.log('\n=== Critical Issues ===');
  let criticalIssues = 0;
  
  for (const [serviceName, serviceData] of Object.entries(results.services)) {
    const failedTests = serviceData.tests.filter(t => !t.passed);
    if (failedTests.length > 0) {
      console.log(`\n${serviceData.service}:`);
      failedTests.forEach(test => {
        if (test.error) {
          console.log(`  - ${test.name}: Connection Error - ${test.error}`);
          criticalIssues++;
        } else if (test.requiresAuth && test.status === 401) {
          console.log(`  - ${test.name}: Authentication issue`);
        } else {
          console.log(`  - ${test.name}: Status ${test.status} (expected ${test.expectedStatus})`);
        }
      });
    }
  }

  if (criticalIssues > 0) {
    console.log(`\n⚠️  ${criticalIssues} critical connection errors detected!`);
    console.log('Please ensure all services are running.');
  }

  console.log('\nValidation complete!');
}).catch(error => {
  console.error('Fatal error during validation:', error);
  process.exit(1);
});