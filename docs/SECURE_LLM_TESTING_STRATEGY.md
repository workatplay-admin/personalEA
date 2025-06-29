# Secure LLM Testing Strategy

## Executive Summary

This document outlines a comprehensive secure testing strategy for LLM integration with real API keys in the PersonalEA project. The strategy ensures that automated tests can validate LLM functionality without exposing sensitive credentials or compromising security.

## Core Security Principles

### 1. **Zero-Trust Testing Architecture**
- Never trust test environments with production credentials
- Assume all test data could be exposed
- Implement defense-in-depth security layers

### 2. **Credential Isolation**
- Separate test API keys from production keys
- Use dedicated test accounts with limited quotas
- Implement key rotation for test environments

### 3. **Data Minimization**
- Use minimal test data sets
- Avoid processing real user data in tests
- Sanitize all test outputs

## Testing Architecture

### Three-Tier Testing Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Environment                     │
│                  (Real API Keys - Isolated)                  │
└─────────────────────────────────────────────────────────────┘
                               ▲
                               │ Promotion
┌─────────────────────────────────────────────────────────────┐
│                    Staging Environment                        │
│              (Test API Keys - Rate Limited)                  │
└─────────────────────────────────────────────────────────────┘
                               ▲
                               │ Validation
┌─────────────────────────────────────────────────────────────┐
│                  Development Environment                      │
│            (Mock Services + Limited Test Keys)               │
└─────────────────────────────────────────────────────────────┘
```

## API Key Management Strategy

### 1. Test-Specific API Keys

```bash
# Environment-specific key naming convention
OPENAI_API_KEY_TEST="sk-test-..." # Rate-limited test key
OPENAI_API_KEY_STAGING="sk-stage-..." # Staging environment key
OPENAI_API_KEY_PROD="sk-prod-..." # Production key (never in tests)
```

### 2. Key Isolation Mechanisms

#### a) Vault-Based Secret Management
```javascript
// services/secrets/vault-manager.js
class VaultManager {
  constructor() {
    this.vault = new HashiCorp.Vault({
      endpoint: process.env.VAULT_ENDPOINT,
      token: process.env.VAULT_TOKEN
    });
  }

  async getTestApiKey(environment) {
    const path = `secret/test/${environment}/openai`;
    const secret = await this.vault.read(path);
    return secret.data.api_key;
  }
}
```

#### b) Encrypted Test Credentials
```javascript
// tests/helpers/secure-credentials.js
const crypto = require('crypto');

class SecureTestCredentials {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.key = Buffer.from(process.env.TEST_ENCRYPTION_KEY, 'hex');
  }

  encryptApiKey(apiKey) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decryptApiKey(encryptedData) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### 3. Runtime Key Injection

```javascript
// tests/setup/test-environment.js
class SecureTestEnvironment {
  async setup() {
    // Load encrypted test credentials
    const encryptedCreds = await this.loadEncryptedCredentials();
    
    // Decrypt in memory only
    const apiKey = this.decryptCredentials(encryptedCreds);
    
    // Inject into test process with limited scope
    process.env.OPENAI_API_KEY_TEST = apiKey;
    
    // Set automatic cleanup
    setTimeout(() => {
      delete process.env.OPENAI_API_KEY_TEST;
    }, 300000); // 5 minute timeout
  }
}
```

## Test Environment Isolation

### 1. Docker-Based Test Isolation

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  test-runner:
    build: 
      context: .
      dockerfile: Dockerfile.test
    environment:
      - NODE_ENV=test
      - TEST_ISOLATION=true
    volumes:
      - /dev/null:/etc/passwd:ro # Prevent credential leakage
      - ./tests:/app/tests:ro
    networks:
      - test-network
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
      - /app/node_modules/.cache

  api-proxy:
    image: nginx:alpine
    volumes:
      - ./nginx/test-proxy.conf:/etc/nginx/nginx.conf:ro
    networks:
      - test-network
    depends_on:
      - test-runner

networks:
  test-network:
    driver: bridge
    internal: true # No external network access
```

### 2. Network-Level API Isolation

```nginx
# nginx/test-proxy.conf
events {
    worker_connections 1024;
}

http {
    # Rate limiting for test API calls
    limit_req_zone $binary_remote_addr zone=test_limit:10m rate=10r/m;
    
    # Whitelist only OpenAI API endpoints
    upstream openai_api {
        server api.openai.com:443;
    }
    
    server {
        listen 8080;
        
        # Proxy only to OpenAI API with rate limiting
        location /v1/ {
            limit_req zone=test_limit burst=5 nodelay;
            
            # Add test headers for tracking
            proxy_set_header X-Test-Environment "true";
            proxy_set_header X-Test-Request-ID $request_id;
            
            # Log all requests for audit
            access_log /var/log/nginx/test-api-access.log;
            
            proxy_pass https://openai_api;
            proxy_ssl_server_name on;
        }
        
        # Block all other requests
        location / {
            return 403;
        }
    }
}
```

## Test Implementation Patterns

### 1. Secure Test Base Class

```typescript
// tests/base/secure-test-base.ts
import { beforeEach, afterEach } from 'vitest';
import { SecureCredentialManager } from '../helpers/secure-credentials';

export abstract class SecureLLMTestBase {
  protected credentialManager: SecureCredentialManager;
  protected testApiKey: string | null = null;
  protected requestTracker: Map<string, any> = new Map();

  beforeEach(async () => {
    // Initialize secure credential manager
    this.credentialManager = new SecureCredentialManager();
    
    // Get test-specific API key with audit logging
    this.testApiKey = await this.credentialManager.getTestApiKey({
      testName: this.constructor.name,
      purpose: 'llm-integration-test',
      maxRequests: 10,
      ttl: 300 // 5 minutes
    });
    
    // Initialize request tracking
    this.requestTracker.clear();
  });

  afterEach(async () => {
    // Clean up API key from memory
    if (this.testApiKey) {
      await this.credentialManager.revokeTestApiKey(this.testApiKey);
      this.testApiKey = null;
    }
    
    // Log all API requests made during test
    await this.auditApiRequests();
    
    // Clear sensitive data
    this.requestTracker.clear();
  });

  protected async makeSecureApiCall(endpoint: string, data: any) {
    const requestId = crypto.randomUUID();
    
    // Track request for audit
    this.requestTracker.set(requestId, {
      endpoint,
      timestamp: new Date(),
      testName: this.constructor.name
    });
    
    // Make API call through secure proxy
    const response = await fetch(`http://localhost:8080${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.testApiKey}`,
        'X-Request-ID': requestId,
        'X-Test-Name': this.constructor.name
      },
      body: JSON.stringify(data)
    });
    
    // Track response
    this.requestTracker.get(requestId).response = {
      status: response.status,
      timestamp: new Date()
    };
    
    return response;
  }

  private async auditApiRequests() {
    // Log all requests for security audit
    const auditLog = {
      testName: this.constructor.name,
      timestamp: new Date(),
      requests: Array.from(this.requestTracker.values())
    };
    
    await this.credentialManager.logAudit(auditLog);
  }
}
```

### 2. Mock-First Testing Strategy

```typescript
// tests/llm/smart-goal-generation.test.ts
import { describe, it, expect } from 'vitest';
import { SecureLLMTestBase } from '../base/secure-test-base';
import { OpenAIMockServer } from '../mocks/openai-mock-server';

describe('SMART Goal Generation', () => {
  class SmartGoalTest extends SecureLLMTestBase {
    private mockServer: OpenAIMockServer;

    beforeEach(async () => {
      await super.beforeEach();
      
      // Use mock server for most tests
      this.mockServer = new OpenAIMockServer();
      await this.mockServer.start();
    });

    afterEach(async () => {
      await this.mockServer.stop();
      await super.afterEach();
    });

    it('should transform goal to SMART format (mocked)', async () => {
      // Configure mock response
      this.mockServer.onCompletion({
        input: 'Learn Spanish',
        response: {
          specific: 'Learn conversational Spanish at B2 level',
          measurable: 'Pass DELE B2 exam with 80% score',
          achievable: 'Study 1 hour daily with structured curriculum',
          relevant: 'For career advancement in international business',
          timeBound: 'Complete within 12 months by December 2025'
        }
      });

      // Test with mock
      const result = await goalService.transformToSmart('Learn Spanish');
      
      expect(result).toMatchObject({
        specific: expect.stringContaining('Spanish'),
        measurable: expect.stringContaining('exam'),
        achievable: expect.stringContaining('daily'),
        relevant: expect.stringContaining('career'),
        timeBound: expect.stringContaining('months')
      });
    });

    it.skipIf(!process.env.RUN_INTEGRATION_TESTS)(
      'should transform goal using real API (integration)',
      async () => {
        // Only run with explicit flag and rate limiting
        const result = await this.makeSecureApiCall('/v1/chat/completions', {
          model: 'gpt-4',
          messages: [{
            role: 'system',
            content: 'Transform the goal into SMART format'
          }, {
            role: 'user',
            content: 'Learn Spanish'
          }],
          max_tokens: 500
        });

        expect(result.status).toBe(200);
        // Additional validations...
      }
    );
  }

  new SmartGoalTest();
});
```

### 3. Canary Testing Pattern

```typescript
// tests/canary/api-health-check.test.ts
describe('API Canary Tests', () => {
  it('should verify test API key is valid but limited', async () => {
    const testKey = await getTestApiKey();
    
    // Make minimal API call to verify key works
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${testKey}`
      }
    });
    
    expect(response.status).toBe(200);
    
    // Verify rate limiting is applied
    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
    expect(parseInt(rateLimitRemaining)).toBeLessThan(100); // Test keys should have low limits
  });
});
```

## Security Guidelines for Test Development

### 1. Never Hardcode Credentials

```typescript
// ❌ NEVER DO THIS
const API_KEY = 'sk-prod-1234567890';

// ✅ DO THIS INSTEAD
const API_KEY = await secureVault.getTestCredential('openai-test');
```

### 2. Use Test Data Generators

```typescript
// tests/generators/test-data.ts
export class SecureTestDataGenerator {
  generateTestGoal(): string {
    // Use predictable test data that doesn't leak information
    const testGoals = [
      'Learn a new programming language',
      'Improve physical fitness',
      'Read more books',
      'Start a small business'
    ];
    
    return testGoals[Math.floor(Math.random() * testGoals.length)];
  }
  
  generateTestUser(): TestUser {
    // Use fake data that can't be traced to real users
    return {
      id: `test-user-${crypto.randomUUID()}`,
      email: `test-${Date.now()}@test.local`,
      name: 'Test User'
    };
  }
}
```

### 3. Implement Test Quotas

```javascript
// tests/helpers/quota-manager.js
class TestQuotaManager {
  constructor() {
    this.quotas = new Map();
    this.dailyLimit = 100; // Maximum API calls per day for all tests
  }
  
  async checkQuota(testName) {
    const today = new Date().toISOString().split('T')[0];
    const key = `${testName}-${today}`;
    
    const current = this.quotas.get(key) || 0;
    if (current >= this.dailyLimit) {
      throw new Error(`Test quota exceeded for ${testName}`);
    }
    
    this.quotas.set(key, current + 1);
    return true;
  }
}
```

## Automated Security Checks

### 1. Pre-Test Security Validation

```javascript
// tests/security/pre-test-checks.js
export async function runSecurityChecks() {
  const checks = [
    checkNoProductionKeys,
    checkTestEnvironmentIsolation,
    checkNetworkRestrictions,
    checkApiProxyConfiguration,
    checkCredentialEncryption
  ];
  
  for (const check of checks) {
    const result = await check();
    if (!result.passed) {
      throw new Error(`Security check failed: ${result.message}`);
    }
  }
}

async function checkNoProductionKeys() {
  // Scan environment for production keys
  const envVars = Object.keys(process.env);
  const prodKeyPattern = /PROD|PRODUCTION|sk-proj-/;
  
  const violations = envVars.filter(key => 
    prodKeyPattern.test(process.env[key])
  );
  
  return {
    passed: violations.length === 0,
    message: violations.length > 0 
      ? `Found production keys in environment: ${violations.join(', ')}`
      : 'No production keys detected'
  };
}
```

### 2. Post-Test Cleanup

```javascript
// tests/security/cleanup.js
export class TestCleanup {
  static async cleanupSensitiveData() {
    // Clear environment variables
    Object.keys(process.env).forEach(key => {
      if (key.includes('API_KEY') || key.includes('SECRET')) {
        delete process.env[key];
      }
    });
    
    // Clear test logs
    await this.sanitizeLogs();
    
    // Revoke temporary credentials
    await this.revokeTestCredentials();
  }
  
  static async sanitizeLogs() {
    const logDir = './test-logs';
    const files = await fs.readdir(logDir);
    
    for (const file of files) {
      const content = await fs.readFile(`${logDir}/${file}`, 'utf8');
      const sanitized = content.replace(/sk-[a-zA-Z0-9]+/g, 'sk-REDACTED');
      await fs.writeFile(`${logDir}/${file}`, sanitized);
    }
  }
}
```

## CI/CD Integration

### 1. GitHub Actions Secure Testing

```yaml
# .github/workflows/secure-llm-tests.yml
name: Secure LLM Integration Tests

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  secure-test:
    runs-on: ubuntu-latest
    environment: test # Requires approval for secret access
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Test Environment
        run: |
          # Create isolated test environment
          docker network create --internal test-network
          
      - name: Configure Test Secrets
        run: |
          # Decrypt test credentials using GitHub secret
          echo "${{ secrets.TEST_CREDENTIALS_ENCRYPTED }}" | base64 -d > test-creds.enc
          
          # Decrypt in memory only
          ./scripts/decrypt-test-creds.sh test-creds.enc
          
      - name: Run Secure Tests
        run: |
          # Run tests in isolated container
          docker run --rm \
            --network test-network \
            --memory=2g \
            --cpus=2 \
            -v $PWD:/app:ro \
            test-runner:latest \
            npm run test:secure:llm
            
      - name: Security Audit
        if: always()
        run: |
          # Check for credential leaks
          ./scripts/audit-test-logs.sh
          
          # Upload audit report
          aws s3 cp test-audit.json s3://security-audits/${{ github.run_id }}/
```

### 2. Local Development Security

```bash
#!/bin/bash
# scripts/run-secure-tests.sh

set -euo pipefail

echo "🔒 Starting secure test environment..."

# Check for production keys
if env | grep -E "sk-proj-|PROD_" > /dev/null; then
  echo "❌ ERROR: Production keys detected in environment!"
  echo "Please remove production credentials before running tests."
  exit 1
fi

# Create temporary test directory
TEST_DIR=$(mktemp -d)
trap "rm -rf $TEST_DIR" EXIT

# Copy test files only (no source code with potential secrets)
cp -r tests/ $TEST_DIR/
cp package.json $TEST_DIR/
cp tsconfig.json $TEST_DIR/

# Run tests in isolated environment
cd $TEST_DIR
npm install --production=false
npm run test:secure

echo "✅ Secure tests completed successfully"
```

## Monitoring and Alerting

### 1. API Usage Monitoring

```javascript
// services/monitoring/test-api-monitor.js
class TestApiMonitor {
  constructor() {
    this.metrics = {
      apiCalls: new Map(),
      errors: new Map(),
      quotaUsage: new Map()
    };
  }
  
  async trackApiCall(testName, endpoint, result) {
    const key = `${testName}:${endpoint}`;
    const current = this.metrics.apiCalls.get(key) || 0;
    this.metrics.apiCalls.set(key, current + 1);
    
    // Alert if unusual activity
    if (current > 50) {
      await this.sendAlert({
        type: 'HIGH_API_USAGE',
        testName,
        endpoint,
        count: current
      });
    }
  }
  
  async sendAlert(alert) {
    // Send to monitoring service
    await fetch(process.env.MONITORING_WEBHOOK, {
      method: 'POST',
      body: JSON.stringify(alert)
    });
  }
}
```

### 2. Security Event Logging

```javascript
// services/logging/security-logger.js
class SecurityLogger {
  logTestApiAccess(event) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType: 'TEST_API_ACCESS',
      testName: event.testName,
      apiEndpoint: event.endpoint,
      responseStatus: event.status,
      executionTime: event.duration,
      environment: process.env.NODE_ENV,
      // Never log the actual API key
      keyIdentifier: this.hashApiKey(event.apiKey)
    };
    
    // Write to secure audit log
    this.writeAuditLog(logEntry);
  }
  
  hashApiKey(apiKey) {
    // Create a one-way hash for tracking without exposing key
    return crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex')
      .substring(0, 8);
  }
}
```

## Best Practices Summary

1. **Always use test-specific API keys** with rate limits and quotas
2. **Never commit API keys** to version control, even encrypted
3. **Isolate test environments** using Docker and network restrictions
4. **Mock first, integrate sparingly** - use real APIs only when necessary
5. **Implement comprehensive audit logging** for all API interactions
6. **Automate security checks** in CI/CD pipelines
7. **Rotate test credentials regularly** (monthly minimum)
8. **Monitor API usage patterns** for anomalies
9. **Clean up sensitive data** after each test run
10. **Document security procedures** and keep them updated

## Conclusion

This secure testing strategy ensures that LLM integration can be thoroughly tested without compromising security. By implementing multiple layers of protection and following these guidelines, teams can confidently test AI features while maintaining the highest security standards.