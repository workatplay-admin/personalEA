const hooks = require('hooks');

// Global setup
hooks.beforeAll((transactions, done) => {
  console.log('Setting up Email Service contract tests...');
  
  // Set up authentication token for all requests
  hooks.addHooks(transactions, (transaction) => {
    // Add JWT token to all requests
    transaction.request.headers['Authorization'] = 'Bearer test-jwt-token';
    
    // Add correlation ID
    transaction.request.headers['X-Correlation-ID'] = `test-${Date.now()}`;
    
    // Add idempotency key for write operations
    if (['POST', 'PUT', 'PATCH'].includes(transaction.request.method)) {
      transaction.request.headers['X-Idempotency-Key'] = `test-idempotency-${Date.now()}`;
    }
  });
  
  done();
});

// Skip authentication-related endpoints that require real OAuth
hooks.before('/v1/sync > POST', (transaction, done) => {
  // Mock the sync request body
  transaction.request.body = JSON.stringify({
    provider: 'gmail',
    sync_type: 'incremental',
    date_range: {
      start: '2025-06-01T00:00:00Z',
      end: '2025-06-19T23:59:59Z'
    }
  });
  done();
});

// Handle digest endpoint
hooks.before('/v1/digest > GET', (transaction, done) => {
  // Set query parameters
  transaction.request.uri = transaction.request.uri + '?limit=20&include_confidence=true';
  done();
});

// Handle email summary endpoint
hooks.before('/v1/emails/{email_id}/summary > GET', (transaction, done) => {
  // Replace path parameter with test value
  transaction.request.uri = transaction.request.uri.replace('{email_id}', 'test-email-123');
  done();
});

// Handle action items endpoint
hooks.before('/v1/emails/{email_id}/action-items > GET', (transaction, done) => {
  // Replace path parameter with test value
  transaction.request.uri = transaction.request.uri.replace('{email_id}', 'test-email-123');
  done();
});

// Handle job status endpoint
hooks.before('/v1/jobs/{job_id} > GET', (transaction, done) => {
  // Replace path parameter with test UUID
  transaction.request.uri = transaction.request.uri.replace('{job_id}', '550e8400-e29b-41d4-a716-446655440000');
  done();
});

// Handle webhook endpoint
hooks.before('/v1/events/email-ingested > POST', (transaction, done) => {
  // Mock webhook payload
  transaction.request.body = JSON.stringify({
    event_id: '550e8400-e29b-41d4-a716-446655440001',
    event_type: 'email.ingested',
    timestamp: '2025-06-19T22:15:00Z',
    data: {
      email_id: 'email_123',
      user_id: 'user_456',
      provider: 'gmail',
      subject: 'Test Email Subject'
    }
  });
  done();
});

// Response validation hooks
hooks.after('/v1/digest > GET', (transaction, done) => {
  // Validate digest response structure
  const response = JSON.parse(transaction.real.body);
  
  if (!response.digest || !Array.isArray(response.digest)) {
    transaction.fail = 'Response should contain digest array';
  }
  
  if (!response.pagination) {
    transaction.fail = 'Response should contain pagination object';
  }
  
  if (!response.generated_at) {
    transaction.fail = 'Response should contain generated_at timestamp';
  }
  
  done();
});

hooks.after('/v1/sync > POST', (transaction, done) => {
  // Validate sync response structure
  const response = JSON.parse(transaction.real.body);
  
  if (!response.job_id) {
    transaction.fail = 'Response should contain job_id';
  }
  
  if (!response.status) {
    transaction.fail = 'Response should contain status';
  }
  
  if (transaction.real.statusCode !== 202) {
    transaction.fail = 'Sync should return 202 Accepted';
  }
  
  done();
});

// Global cleanup
hooks.afterAll((transactions, done) => {
  console.log('Cleaning up Email Service contract tests...');
  done();
});

// Error handling
hooks.beforeEachValidation((transaction, done) => {
  // Skip validation for endpoints that require real services
  if (transaction.request.uri.includes('/auth/') || 
      transaction.request.uri.includes('/oauth/')) {
    transaction.skip = true;
  }
  done();
});