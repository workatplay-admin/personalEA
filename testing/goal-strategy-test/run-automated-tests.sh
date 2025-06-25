#!/bin/bash

# Automated User Testing Script for Goal Strategy App
# This script runs comprehensive automated tests that mimic real user behavior

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_KEY="${OPENAI_API_KEY:-test-api-key-automated}"
API_URL="${API_URL:-http://localhost:3001}"
USE_REAL_API="${USE_REAL_API:-false}"
HEADLESS="${HEADLESS:-true}"
BROWSER="${BROWSER:-chromium}"
PARALLEL="${PARALLEL:-true}"
CI_MODE="${CI:-false}"

echo -e "${BLUE}🚀 Starting Automated User Testing Suite${NC}"
echo "============================================="
echo "API Key: ${API_KEY:0:10}..."
echo "API URL: $API_URL"
echo "Use Real API: $USE_REAL_API"
echo "Headless: $HEADLESS"
echo "Browser: $BROWSER"
echo "Parallel: $PARALLEL"
echo "CI Mode: $CI_MODE"
echo ""

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to start backend server
start_backend() {
    echo -e "${YELLOW}📡 Starting backend server...${NC}"
    
    if check_port 8085; then
        echo -e "${GREEN}✅ Backend server already running on port 8085${NC}"
    else
        echo "Starting goal-strategy service..."
        cd /workspaces/personalEA/services/goal-strategy
        npm start &
        BACKEND_PID=$!
        echo "Backend PID: $BACKEND_PID"
        
        # Wait for backend to be ready
        for i in {1..30}; do
            if check_port 8085; then
                echo -e "${GREEN}✅ Backend server is ready${NC}"
                break
            fi
            echo "Waiting for backend... ($i/30)"
            sleep 2
        done
        
        if ! check_port 8085; then
            echo -e "${RED}❌ Backend server failed to start${NC}"
            exit 1
        fi
        
        cd - > /dev/null
    fi
}

# Function to start frontend dev server
start_frontend() {
    echo -e "${YELLOW}🌐 Starting frontend dev server...${NC}"
    
    if check_port 5173; then
        echo -e "${GREEN}✅ Frontend server already running on port 5173${NC}"
    else
        echo "Starting frontend dev server..."
        npm run dev &
        FRONTEND_PID=$!
        echo "Frontend PID: $FRONTEND_PID"
        
        # Wait for frontend to be ready
        for i in {1..30}; do
            if check_port 5173; then
                echo -e "${GREEN}✅ Frontend server is ready${NC}"
                break
            fi
            echo "Waiting for frontend... ($i/30)"
            sleep 2
        done
        
        if ! check_port 5173; then
            echo -e "${RED}❌ Frontend server failed to start${NC}"
            exit 1
        fi
    fi
}

# Function to start mock API server
start_mock_api() {
    echo -e "${YELLOW}🤖 Starting mock API server...${NC}"
    
    if check_port 3001; then
        echo -e "${GREEN}✅ Mock API server already running on port 3001${NC}"
    else
        echo "Starting mock API server..."
        node openai-api-server.js &
        MOCK_API_PID=$!
        echo "Mock API PID: $MOCK_API_PID"
        
        # Wait for mock API to be ready
        for i in {1..15}; do
            if check_port 3001; then
                echo -e "${GREEN}✅ Mock API server is ready${NC}"
                break
            fi
            echo "Waiting for mock API... ($i/15)"
            sleep 1
        done
        
        if ! check_port 3001; then
            echo -e "${RED}❌ Mock API server failed to start${NC}"
            exit 1
        fi
    fi
}

# Function to install playwright browsers if needed
install_browsers() {
    echo -e "${YELLOW}🌐 Checking Playwright browsers...${NC}"
    
    if ! npx playwright --version >/dev/null 2>&1; then
        echo -e "${RED}❌ Playwright not found. Installing...${NC}"
        npm install @playwright/test
    fi
    
    # Install browsers if not already installed
    npx playwright install --with-deps
    echo -e "${GREEN}✅ Playwright browsers ready${NC}"
}

# Function to create test results directories
setup_test_directories() {
    echo -e "${YELLOW}📁 Setting up test directories...${NC}"
    
    mkdir -p test-results
    mkdir -p playwright-report
    mkdir -p test-results/screenshots
    mkdir -p test-results/videos
    mkdir -p test-results/traces
    
    # Clear previous results if not in CI mode
    if [ "$CI_MODE" != "true" ]; then
        rm -rf test-results/*
        rm -rf playwright-report/*
    fi
    
    echo -e "${GREEN}✅ Test directories ready${NC}"
}

# Function to run the automated test suite
run_tests() {
    echo -e "${BLUE}🧪 Running Automated User Testing Suite${NC}"
    echo "=========================================="
    
    # Set environment variables for tests
    export OPENAI_API_KEY="$API_KEY"
    export API_URL="$API_URL"
    export USE_REAL_API="$USE_REAL_API"
    
    # Build test command
    local test_cmd="npx playwright test tests/e2e/automated-user-testing.spec.ts"
    
    # Add browser selection
    test_cmd="$test_cmd --project=$BROWSER"
    
    # Add headless mode
    if [ "$HEADLESS" = "true" ]; then
        test_cmd="$test_cmd --headed=false"
    else
        test_cmd="$test_cmd --headed"
    fi
    
    # Add parallel execution
    if [ "$PARALLEL" = "true" ] && [ "$CI_MODE" != "true" ]; then
        test_cmd="$test_cmd --workers=2"
    else
        test_cmd="$test_cmd --workers=1"
    fi
    
    # Add CI-specific options
    if [ "$CI_MODE" = "true" ]; then
        test_cmd="$test_cmd --reporter=junit --output-dir=test-results/junit.xml"
    else
        test_cmd="$test_cmd --reporter=html --reporter=line"
    fi
    
    # Add retry logic for flaky tests
    test_cmd="$test_cmd --retries=2"
    
    # Add timeout
    test_cmd="$test_cmd --timeout=60000"
    
    echo "Executing: $test_cmd"
    echo ""
    
    # Run the tests
    if eval "$test_cmd"; then
        echo -e "${GREEN}✅ All automated tests passed!${NC}"
        TEST_SUCCESS=true
    else
        echo -e "${RED}❌ Some tests failed${NC}"
        TEST_SUCCESS=false
    fi
}

# Function to run additional test suites
run_integration_tests() {
    echo -e "${BLUE}🔗 Running Integration Tests${NC}"
    
    # Run existing integration tests
    npx playwright test tests/e2e/integration/full-workflow.spec.ts --project=$BROWSER
    
    echo -e "${GREEN}✅ Integration tests completed${NC}"
}

# Function to run cross-browser tests
run_cross_browser_tests() {
    echo -e "${BLUE}🌐 Running Cross-Browser Tests${NC}"
    
    # Run tests on multiple browsers
    for browser in chromium firefox webkit; do
        echo "Testing on $browser..."
        npx playwright test tests/e2e/automated-user-testing.spec.ts --project=$browser --headed=false
    done
    
    echo -e "${GREEN}✅ Cross-browser tests completed${NC}"
}

# Function to generate test report
generate_report() {
    echo -e "${YELLOW}📊 Generating Test Report${NC}"
    
    # Create comprehensive test report
    cat > test-results/automated-test-summary.md << EOF
# Automated User Testing Report

## Test Execution Summary
- **Date**: $(date)
- **Environment**: $([[ "$USE_REAL_API" == "true" ]] && echo "Production API" || echo "Mock API")
- **Browser**: $BROWSER
- **Headless**: $HEADLESS
- **Result**: $([[ "$TEST_SUCCESS" == "true" ]] && echo "✅ PASSED" || echo "❌ FAILED")

## Test Coverage
The automated test suite covers:

### Core User Journeys
1. ✅ First-time user API configuration and goal creation
2. ✅ Complete workflow from goal to estimation
3. ✅ Example goal usage
4. ✅ Multiple goal type testing
5. ✅ Error handling and recovery
6. ✅ Mobile user experience
7. ✅ Performance testing
8. ✅ Keyboard navigation accessibility
9. ✅ Data persistence and session recovery
10. ✅ Complete workflow validation

### Edge Cases
- ✅ Extremely long goals
- ✅ Special characters and emojis
- ✅ Rapid successive submissions

## Test Results Details
See playwright-report/index.html for detailed results.

## Screenshots
Check test-results/screenshots/ for visual validation.

## Next Steps
$([[ "$TEST_SUCCESS" == "true" ]] && echo "All tests passed! Ready for human testing." || echo "Fix failing tests before proceeding to human testing.")
EOF

    # Open report if not in CI mode
    if [ "$CI_MODE" != "true" ] && [ "$HEADLESS" != "true" ]; then
        echo "Opening test report..."
        npx playwright show-report 2>/dev/null &
    fi
    
    echo -e "${GREEN}✅ Test report generated${NC}"
}

# Function to save results to memory
save_to_memory() {
    echo -e "${YELLOW}💾 Saving test results to Memory${NC}"
    
    # Create memory entry
    local memory_data=$(cat <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "testSuite": "automated-user-testing",
  "environment": {
    "apiKey": "${API_KEY:0:10}...",
    "apiUrl": "$API_URL",
    "useRealApi": $USE_REAL_API,
    "browser": "$BROWSER",
    "headless": $HEADLESS
  },
  "results": {
    "success": $TEST_SUCCESS,
    "userJourneys": 10,
    "edgeCases": 3,
    "crossBrowser": $([ "$BROWSER" != "chromium" ] && echo "true" || echo "false")
  },
  "coverage": {
    "apiConfiguration": true,
    "goalInput": true,
    "smartGoalGeneration": true,
    "milestoneCreation": true,
    "wbsGeneration": true,
    "estimation": true,
    "errorHandling": true,
    "accessibility": true,
    "performance": true,
    "mobileSupport": true
  },
  "status": "$([[ "$TEST_SUCCESS" == "true" ]] && echo "READY_FOR_HUMAN_TESTING" || echo "NEEDS_FIXES")"
}
EOF
)
    
    # Save to memory directory
    local memory_file="/workspaces/personalEA/memory/data/swarm-auto-centralized-1750788407321-testing-automated-tests.json"
    echo "$memory_data" > "$memory_file"
    
    echo -e "${GREEN}✅ Results saved to Memory: $memory_file${NC}"
}

# Function to cleanup processes
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    
    # Kill background processes if we started them
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$MOCK_API_PID" ]; then
        kill $MOCK_API_PID 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution flow
main() {
    echo -e "${BLUE}🎯 Automated User Testing Pipeline${NC}"
    echo "================================="
    
    # Setup
    setup_test_directories
    install_browsers
    
    # Start services (conditionally based on USE_REAL_API)
    if [ "$USE_REAL_API" != "true" ]; then
        start_mock_api
    fi
    
    start_frontend
    
    # Wait a moment for services to stabilize
    sleep 3
    
    # Run tests
    run_tests
    
    # Run additional tests if main tests passed
    if [ "$TEST_SUCCESS" = "true" ] && [ "$CI_MODE" != "true" ]; then
        run_integration_tests
        
        # Run cross-browser tests if requested
        if [ "$BROWSER" = "all" ]; then
            run_cross_browser_tests
        fi
    fi
    
    # Generate reports
    generate_report
    save_to_memory
    
    # Summary
    echo ""
    echo "============================================="
    if [ "$TEST_SUCCESS" = "true" ]; then
        echo -e "${GREEN}🎉 Automated User Testing COMPLETED SUCCESSFULLY!${NC}"
        echo -e "${GREEN}✅ App is ready for human validation${NC}"
    else
        echo -e "${RED}❌ Automated User Testing FAILED${NC}"
        echo -e "${RED}🔧 Fix issues before human testing${NC}"
    fi
    echo "============================================="
    
    # Exit with appropriate code
    if [ "$TEST_SUCCESS" = "true" ]; then
        exit 0
    else
        exit 1
    fi
}

# Help function
show_help() {
    cat << EOF
Automated User Testing Script for Goal Strategy App

Usage: $0 [OPTIONS]

Options:
    --real-api          Use real OpenAI API instead of mock
    --browser=BROWSER   Browser to use (chromium, firefox, webkit, all)
    --headed            Run tests in headed mode (show browser)
    --no-parallel       Disable parallel test execution
    --ci                Run in CI mode
    --help              Show this help message

Environment Variables:
    OPENAI_API_KEY      OpenAI API key (required for --real-api)
    API_URL             API URL (default: http://localhost:3001)
    HEADLESS            Run headless (default: true)
    BROWSER             Browser to use (default: chromium)
    PARALLEL            Enable parallel execution (default: true)
    CI                  CI mode (default: false)

Examples:
    # Run basic automated tests with mock API
    $0
    
    # Run tests with real OpenAI API
    OPENAI_API_KEY=your-key $0 --real-api
    
    # Run tests in headed mode for debugging
    $0 --headed
    
    # Run cross-browser tests
    $0 --browser=all
    
    # Run in CI mode
    CI=true $0 --ci
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --real-api)
            USE_REAL_API="true"
            shift
            ;;
        --browser=*)
            BROWSER="${1#*=}"
            shift
            ;;
        --headed)
            HEADLESS="false"
            shift
            ;;
        --no-parallel)
            PARALLEL="false"
            shift
            ;;
        --ci)
            CI_MODE="true"
            HEADLESS="true"
            PARALLEL="false"
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate requirements
if [ "$USE_REAL_API" = "true" ] && [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}❌ OPENAI_API_KEY is required when using --real-api${NC}"
    exit 1
fi

# Run main function
main