# OpenAI Integration Deployment Scripts

## Quick Start Scripts

### 1. Custom GPT Creation Script
```python
# create-custom-gpt.py
"""
Automated Custom GPT configuration generator
Run: python create-custom-gpt.py
"""

custom_gpt_config = {
    "name": "Personal EA - SMART Goal Assistant",
    "description": "I help transform your goals into SMART format through intelligent conversation",
    "instructions": """
You are an expert goal-setting assistant specializing in SMART goal methodology.

Your process:
1. Analyze user's initial goal for SMART criteria
2. Identify missing components
3. Guide user through refinement via conversation
4. Track progress with scores (0-100) for each component
5. Celebrate when overall score reaches 80%

SMART Components:
- Specific: Clear, detailed, well-defined
- Measurable: Quantifiable metrics and indicators
- Achievable: Realistic given constraints
- Relevant: Aligned with broader objectives  
- Time-bound: Clear deadlines and milestones

Always:
- Be encouraging and supportive
- Provide concrete examples
- Ask clarifying questions
- Show score improvements
- Maintain conversation context
""",
    "conversation_starters": [
        "I want to improve my health",
        "Help me set a career goal",
        "I need to learn a new skill",
        "Transform my vague goal into SMART format"
    ],
    "capabilities": {
        "web_browsing": False,
        "code_interpreter": False,
        "image_generation": False
    }
}

print("=== Custom GPT Configuration ===")
for key, value in custom_gpt_config.items():
    print(f"\n{key.upper()}:")
    print(value)
print("\n✅ Copy this configuration to GPT Builder")
```

### 2. Direct API Deployment Script
```bash
#!/bin/bash
# deploy-openai-integration.sh

set -e

echo "🚀 Deploying OpenAI Integration..."

# Environment setup
export NODE_ENV=production
export API_VERSION=v1

# Build checks
echo "📦 Building application..."
cd services/goal-strategy
npm ci --production=false
npm run build

# Run tests
echo "🧪 Running tests..."
npm run test:ci

# Docker build
echo "🐳 Building Docker image..."
docker build -t personalea/goal-strategy:latest \
  --build-arg NODE_ENV=production \
  --target production \
  .

# Health check
echo "❤️ Verifying build health..."
docker run --rm personalea/goal-strategy:latest npm run health-check

# Tag for registry
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
docker tag personalea/goal-strategy:latest personalea/goal-strategy:$TIMESTAMP

# Push to registry
echo "📤 Pushing to registry..."
docker push personalea/goal-strategy:latest
docker push personalea/goal-strategy:$TIMESTAMP

# Deploy to staging first
echo "🎯 Deploying to staging..."
kubectl apply -f k8s/staging/
kubectl -n staging rollout status deployment/goal-strategy

# Run smoke tests
echo "🔥 Running smoke tests..."
npm run test:smoke -- --env=staging

# Deploy to production
echo "🚀 Deploying to production..."
kubectl apply -f k8s/production/
kubectl -n production rollout status deployment/goal-strategy

echo "✅ Deployment complete!"
```

### 3. CI/CD GitHub Actions Workflow
```yaml
# .github/workflows/openai-integration.yml
name: OpenAI Integration CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  DOCKER_REGISTRY: personalea

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: services/goal-strategy/package-lock.json
      
      - name: Install dependencies
        working-directory: services/goal-strategy
        run: npm ci
      
      - name: Lint code
        working-directory: services/goal-strategy
        run: npm run lint
      
      - name: Run unit tests
        working-directory: services/goal-strategy
        run: npm run test:unit
      
      - name: Run integration tests
        working-directory: services/goal-strategy
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY_TEST }}
        run: npm run test:integration
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: services/goal-strategy/coverage

  browser-tests:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      - name: Install dependencies
        working-directory: testing/goal-strategy-test
        run: |
          npm ci
          npx playwright install chromium
      
      - name: Run browser tests
        working-directory: testing/goal-strategy-test
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY_TEST }}
        run: npm run test:browser
      
      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: testing/goal-strategy-test/playwright-report/

  build:
    runs-on: ubuntu-latest
    needs: [test, browser-tests]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: services/goal-strategy
          push: true
          tags: |
            ${{ env.DOCKER_REGISTRY }}/goal-strategy:latest
            ${{ env.DOCKER_REGISTRY }}/goal-strategy:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    environment: staging
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure kubectl
        uses: azure/setup-kubectl@v3
      
      - name: Deploy to staging
        env:
          KUBE_CONFIG: ${{ secrets.KUBE_CONFIG_STAGING }}
        run: |
          echo "$KUBE_CONFIG" | base64 -d > kubeconfig
          export KUBECONFIG=$(pwd)/kubeconfig
          kubectl apply -f k8s/staging/
          kubectl -n staging rollout status deployment/goal-strategy
      
      - name: Run smoke tests
        run: |
          npm run test:smoke -- --env=staging

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment: production
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure kubectl
        uses: azure/setup-kubectl@v3
      
      - name: Deploy to production
        env:
          KUBE_CONFIG: ${{ secrets.KUBE_CONFIG_PRODUCTION }}
        run: |
          echo "$KUBE_CONFIG" | base64 -d > kubeconfig
          export KUBECONFIG=$(pwd)/kubeconfig
          kubectl apply -f k8s/production/
          kubectl -n production rollout status deployment/goal-strategy
      
      - name: Verify deployment
        run: |
          kubectl -n production get pods
          kubectl -n production get services
```

### 4. Browser Testing Configuration
```javascript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 3001,
    reuseExistingServer: !process.env.CI,
  },
});
```

### 5. Monitoring Setup
```yaml
# monitoring/openai-dashboard.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-openai
data:
  openai-dashboard.json: |
    {
      "dashboard": {
        "title": "OpenAI Integration Metrics",
        "panels": [
          {
            "title": "API Response Time",
            "targets": [{
              "expr": "histogram_quantile(0.95, openai_request_duration_seconds_bucket)"
            }]
          },
          {
            "title": "Token Usage",
            "targets": [{
              "expr": "sum(rate(openai_tokens_used_total[5m])) by (model)"
            }]
          },
          {
            "title": "Cost per Hour",
            "targets": [{
              "expr": "sum(rate(openai_cost_dollars_total[1h]))"
            }]
          },
          {
            "title": "Error Rate",
            "targets": [{
              "expr": "rate(openai_requests_failed_total[5m])"
            }]
          },
          {
            "title": "SMART Score Distribution",
            "targets": [{
              "expr": "histogram_quantile(0.5, smart_score_bucket)"
            }]
          }
        ]
      }
    }
```

### 6. Quick Test Scripts
```bash
#!/bin/bash
# test-openai-integration.sh

echo "🧪 Testing OpenAI Integration..."

# Test 1: API Health
echo "1️⃣ Testing API health..."
curl -s http://localhost:3001/health | jq .

# Test 2: Goal Translation
echo "2️⃣ Testing goal translation..."
curl -X POST http://localhost:3001/api/v1/goals/translate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -H "X-OpenAI-API-Key: $OPENAI_API_KEY" \
  -d '{"raw_goal": "I want to learn Spanish"}' | jq .

# Test 3: Chat Conversation
echo "3️⃣ Testing chat conversation..."
SESSION_ID=$(curl -X POST http://localhost:3001/api/v1/enhanced-chat/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -H "X-OpenAI-API-Key: $OPENAI_API_KEY" \
  -d '{"goal": "Learn Spanish fluently"}' | jq -r .data.sessionId)

echo "Session ID: $SESSION_ID"

curl -X POST http://localhost:3001/api/v1/enhanced-chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -H "X-OpenAI-API-Key: $OPENAI_API_KEY" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"message\": \"I want to be conversational in 6 months\"
  }" | jq .

echo "✅ All tests completed!"
```

### 7. Docker Compose for Local Development
```yaml
# docker-compose.yml
version: '3.8'

services:
  goal-strategy:
    build:
      context: ./services/goal-strategy
      target: development
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - PORT=3001
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/personalea
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./services/goal-strategy:/app
      - /app/node_modules
    depends_on:
      - db
      - redis
    command: npm run dev

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=personalea
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - goal-strategy

volumes:
  postgres_data:
```

### 8. Environment Configuration
```bash
# .env.example
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7

# API Configuration
PORT=3001
API_VERSION=v1
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/personalea

# Redis
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-secret-here
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# Features
FEATURE_AI_GOAL_TRANSLATION=true
FEATURE_ENHANCED_CHAT=true
FEATURE_NEURAL_COORDINATION=true

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=info
```

## Usage Instructions

1. **Quick Local Test**:
   ```bash
   ./test-openai-integration.sh
   ```

2. **Deploy to Staging**:
   ```bash
   ./deploy-openai-integration.sh staging
   ```

3. **Full Production Deploy**:
   ```bash
   ./deploy-openai-integration.sh production
   ```

4. **Create Custom GPT**:
   ```bash
   python create-custom-gpt.py
   ```

5. **Run Browser Tests**:
   ```bash
   cd testing/goal-strategy-test
   npm run test:browser
   ```

These scripts provide a complete deployment pipeline for both Custom GPT creation and Direct API deployment with full CI/CD integration.