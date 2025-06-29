#!/bin/bash

# SMART Goal Testing Environment Setup Script
# This script prepares the environment for comprehensive testing of the SMART goal clarification fixes

set -e  # Exit on error

echo "🚀 Setting up SMART Goal Testing Environment..."

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running from project root
if [ ! -f "docker-compose.dev.yml" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Step 1: Install dependencies
print_status "Installing dependencies..."
cd testing/goal-strategy-test
npm install
cd ../..

# Step 2: Build the frontend
print_status "Building frontend application..."
cd testing/goal-strategy-test
npm run build
cd ../..

# Step 3: Start backend services
print_status "Starting backend services..."
docker-compose -f docker-compose.dev.yml up -d goal-strategy-service postgres redis

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 10

# Step 4: Run database migrations
print_status "Running database migrations..."
docker-compose -f docker-compose.dev.yml exec -T goal-strategy-service npx prisma migrate deploy

# Step 5: Create test data
print_status "Creating test data..."
cat > testing/test-data-seed.sql << 'EOF'
-- Insert test users
INSERT INTO users (id, email, name, created_at, updated_at) VALUES
('test-user-1', 'tester1@example.com', 'Test User 1', NOW(), NOW()),
('test-user-2', 'tester2@example.com', 'Test User 2', NOW(), NOW()),
('test-user-3', 'tester3@example.com', 'Test User 3', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test API keys
INSERT INTO api_keys (id, key, name, user_id, scopes, created_at, expires_at) VALUES
('test-key-1', 'test_key_123456789', 'Test Key 1', 'test-user-1', '["goals:read", "goals:write"]', NOW(), NOW() + INTERVAL '1 year'),
('test-key-2', 'test_key_987654321', 'Test Key 2', 'test-user-2', '["goals:read", "goals:write"]', NOW(), NOW() + INTERVAL '1 year'),
('test-key-3', 'test_key_555555555', 'Test Key 3', 'test-user-3', '["goals:read", "goals:write"]', NOW(), NOW() + INTERVAL '1 year')
ON CONFLICT (id) DO NOTHING;

-- Insert test goals with various states
INSERT INTO goals (id, user_id, title, raw_goal, smart_criteria, status, created_at, updated_at) VALUES
('test-goal-1', 'test-user-1', 'Get fit', 'Get fit', 
'{"specific": {"value": "", "confidence": 0.2}, "measurable": {"value": "", "confidence": 0.2}, "achievable": {"value": "", "confidence": 0.3}, "relevant": {"value": "", "confidence": 0.3}, "timeBound": {"value": "", "confidence": 0.2}}',
'active', NOW(), NOW()),

('test-goal-2', 'test-user-2', 'Learn Spanish to B2 level', 'Learn Spanish',
'{"specific": {"value": "Spanish to B2 level", "confidence": 0.8}, "measurable": {"value": "", "confidence": 0.3}, "achievable": {"value": "", "confidence": 0.4}, "relevant": {"value": "", "confidence": 0.3}, "timeBound": {"value": "", "confidence": 0.2}}',
'active', NOW(), NOW()),

('test-goal-3', 'test-user-3', 'Save $10,000 for emergency fund', 'Save money',
'{"specific": {"value": "$10,000 emergency fund", "confidence": 0.9}, "measurable": {"value": "$10,000", "confidence": 0.9}, "achievable": {"value": "", "confidence": 0.3}, "relevant": {"value": "", "confidence": 0.3}, "timeBound": {"value": "", "confidence": 0.2}}',
'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
EOF

# Execute test data seed
docker-compose -f docker-compose.dev.yml exec -T postgres psql -U postgres -d personalea < testing/test-data-seed.sql

# Step 6: Set up environment variables for testing
print_status "Setting up test environment variables..."
cat > testing/goal-strategy-test/.env.test << EOF
# Test Environment Configuration
VITE_API_BASE_URL=http://localhost:8085/api/v1
VITE_SOCKET_URL=ws://localhost:8085
VITE_ENV=test
VITE_LOG_LEVEL=debug
VITE_TEST_MODE=true

# Test API Keys (DO NOT USE IN PRODUCTION)
VITE_TEST_API_KEY=test_key_123456789
VITE_TEST_OPENAI_KEY=ENVIRONMENT_CONFIGURED
EOF

# Step 7: Create test runner script
print_status "Creating test runner script..."
cat > testing/run-smart-goal-tests.sh << 'EOF'
#!/bin/bash

echo "🧪 Running SMART Goal Clarification Tests..."

# Run unit tests
echo "Running unit tests..."
cd testing/goal-strategy-test
npm run test:unit -- tests/unit/clarification-handling.test.ts

# Run E2E tests
echo "Running E2E tests..."
npm run test:e2e -- tests/e2e/smart-goal-clarification-fix.spec.ts

# Run full test suite
echo "Running complete test suite..."
npm run test

echo "✅ All tests completed!"
EOF

chmod +x testing/run-smart-goal-tests.sh

# Step 8: Create monitoring dashboard
print_status "Setting up monitoring dashboard..."
cat > testing/monitor-clarifications.js << 'EOF'
// Real-time monitoring of clarification requests
const WebSocket = require('ws');
const chalk = require('chalk');

console.log(chalk.blue('📊 SMART Goal Clarification Monitor'));
console.log(chalk.gray('Monitoring clarification requests in real-time...\n'));

// Connect to WebSocket for real-time updates
const ws = new WebSocket('ws://localhost:8085/ws');

ws.on('open', () => {
  console.log(chalk.green('✓ Connected to monitoring service'));
});

ws.on('message', (data) => {
  const event = JSON.parse(data);
  
  if (event.type === 'clarification') {
    console.log(chalk.yellow(`\n[${new Date().toISOString()}] Clarification Request`));
    console.log(chalk.white(`  Goal ID: ${event.goalId}`));
    console.log(chalk.white(`  Component: ${event.component}`));
    console.log(chalk.white(`  Previous Score: ${event.previousScore}%`));
    console.log(chalk.white(`  New Score: ${event.newScore}%`));
    console.log(chalk.green(`  Improvement: +${event.newScore - event.previousScore}%`));
  }
});

ws.on('error', (err) => {
  console.error(chalk.red('Monitoring error:', err));
});
EOF

# Step 9: Create user testing checklist
print_status "Creating user testing checklist..."
cat > testing/USER_TESTING_CHECKLIST.md << 'EOF'
# SMART Goal User Testing Checklist

## Pre-Test Setup
- [ ] Test environment is running (all services up)
- [ ] Test data is loaded
- [ ] Monitoring dashboard is active
- [ ] Browser console is open for debugging

## Test Scenarios

### 1. Basic Flow Test
- [ ] Enter vague goal: "Get fit"
- [ ] Answer clarification for Specific: "Run 5K races"
- [ ] Verify Specific score increases to 70%+
- [ ] Answer clarification for Measurable: "3 times per week"
- [ ] Verify Measurable score increases to 70%+
- [ ] Verify Specific score remains high
- [ ] Complete all clarifications
- [ ] Verify completion in < 5 iterations

### 2. Comprehensive Answer Test
- [ ] Enter goal: "Learn programming"
- [ ] Provide detailed answer: "Learn Python for web development in 3 months by building 5 projects"
- [ ] Verify multiple components update:
  - [ ] Specific: 80%+ (Python, web development)
  - [ ] Measurable: 80%+ (5 projects)
  - [ ] Time-bound: 80%+ (3 months)
- [ ] Verify fewer questions are asked

### 3. Edge Case Tests
- [ ] Test empty answer submission (should request more detail)
- [ ] Test very short answers like "yes" (should request more detail)
- [ ] Test skipping components (should move to next)
- [ ] Test answers that reference context ("do it 3 times")

### 4. Score Preservation Test
- [ ] Get one component to 85%+ score
- [ ] Answer questions for other components
- [ ] Verify original high score doesn't decrease

### 5. Performance Tests
- [ ] Measure time from start to completion
- [ ] Count number of iterations needed
- [ ] Check API response times (< 2 seconds)
- [ ] Verify no duplicate API calls

## Success Metrics
- [ ] Average completion in 3-5 iterations
- [ ] Detailed answers achieve 70%+ scores
- [ ] No score regression on new clarifications
- [ ] Smooth user experience without delays
- [ ] Clear, helpful feedback messages

## Bug Verification
- [ ] Frontend sends only current clarification ✓
- [ ] API filters empty clarifications ✓
- [ ] Backend processes incrementally ✓
- [ ] Scores improve appropriately ✓
- [ ] Context is maintained across conversation ✓

## Notes Section
_Record any unexpected behavior or user feedback here_
EOF

# Step 10: Final status
echo ""
print_status "Testing environment setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Start the frontend dev server: cd testing/goal-strategy-test && npm run dev"
echo "2. Run tests: ./testing/run-smart-goal-tests.sh"
echo "3. Monitor clarifications: node testing/monitor-clarifications.js"
echo "4. Follow checklist: testing/USER_TESTING_CHECKLIST.md"
echo ""
echo "🔗 Access the application at: http://localhost:3001"
echo "📊 API endpoint: http://localhost:8085/api/v1"
echo ""
print_warning "Remember to use test API keys for testing!"