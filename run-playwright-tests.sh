#!/bin/bash

# PersonalEA Playwright Test Runner
# Comprehensive browser automation testing with conversation quality validation

echo "🎭 PersonalEA Playwright Testing Suite"
echo "======================================"

# Check if services are running
check_services() {
    echo "🔍 Checking services..."
    
    # Check backend API
    if curl -s http://localhost:3000/health > /dev/null; then
        echo "✅ Backend API (port 3000) - Running"
    else
        echo "❌ Backend API (port 3000) - Not accessible"
        echo "🔧 Starting backend API server..."
        cd testing/goal-strategy-test && npm run openai-api &
        sleep 5
    fi
    
    # Check frontend
    if curl -s http://localhost:5174 > /dev/null; then
        echo "✅ Frontend (port 5174) - Running"
    else
        echo "❌ Frontend (port 5174) - Not accessible"
        echo "🔧 Starting frontend server..."
        cd testing/goal-strategy-test && npm run dev &
        sleep 5
    fi
}

# Install Playwright if needed
setup_playwright() {
    echo "🎭 Setting up Playwright..."
    
    if ! command -v npx playwright &> /dev/null; then
        echo "📦 Installing Playwright..."
        npm install --save-dev @playwright/test
        npx playwright install
    else
        echo "✅ Playwright already available"
    fi
}

# Verify environment
check_environment() {
    echo "🔍 Checking environment..."
    
    if [ -z "$OPENAI_API_KEY" ]; then
        echo "❌ OPENAI_API_KEY environment variable not set"
        echo "   This is required for conversation quality testing"
        exit 1
    else
        echo "✅ OPENAI_API_KEY - Available (${OPENAI_API_KEY:0:10}...)"
    fi
    
    if [ ! -f "playwright.config.ts" ]; then
        echo "❌ playwright.config.ts not found"
        exit 1
    else
        echo "✅ Playwright configuration - Found"
    fi
}

# Run specific test suites
run_tests() {
    echo "🧪 Running Playwright test suites..."
    
    # Create results directory
    mkdir -p test-results/playwright
    
    # Test arguments
    ARGS="--reporter=html,json,list"
    
    if [ "$1" = "user-flow" ]; then
        echo "🚀 Running User Flow Tests..."
        npx playwright test tests/playwright/user-flow-test.spec.ts $ARGS
    elif [ "$1" = "conversation" ]; then
        echo "💬 Running Conversation Quality Tests..."
        npx playwright test tests/playwright/conversation-quality-test.spec.ts $ARGS
    elif [ "$1" = "all" ] || [ -z "$1" ]; then
        echo "🎯 Running All Tests..."
        npx playwright test tests/playwright/ $ARGS
    else
        echo "❌ Unknown test suite: $1"
        echo "   Available options: user-flow, conversation, all"
        exit 1
    fi
}

# Generate comprehensive report
generate_report() {
    echo "📊 Generating comprehensive test report..."
    
    # Create report directory
    mkdir -p test-results/reports
    
    # Combine results
    cat > test-results/reports/summary.md << EOF
# PersonalEA Playwright Test Results
**Generated**: $(date)
**Test Suite**: Comprehensive Browser Automation with Conversation Quality

## Test Execution Summary

### Services Status
- Backend API: $(curl -s http://localhost:3000/health > /dev/null && echo "✅ Running" || echo "❌ Not accessible")
- Frontend: $(curl -s http://localhost:5174 > /dev/null && echo "✅ Running" || echo "❌ Not accessible")

### Environment
- OpenAI API Key: $([ -n "$OPENAI_API_KEY" ] && echo "✅ Configured" || echo "❌ Missing")
- Browser Testing: ✅ Playwright configured

### Test Results
See detailed results in:
- HTML Report: \`playwright-report/index.html\`
- JSON Results: \`test-results/results.json\`
- Screenshots: \`test-results/screenshots/\`
- Conversation Analysis: \`test-results/conversation-quality/\`

## Key Metrics Tested
1. **User Flow Completion**: End-to-end goal transformation workflow
2. **Conversation Quality**: AI interaction naturalness and helpfulness
3. **SMART Goal Generation**: Quality and accuracy of generated goals
4. **Performance**: Response times and UI responsiveness
5. **Error Handling**: Edge cases and error recovery

## Next Steps
1. Review HTML report for detailed test execution
2. Analyze conversation quality metrics
3. Address any failing tests
4. Optimize based on performance findings
EOF

    echo "📄 Test summary saved to: test-results/reports/summary.md"
    
    # Open report if available
    if command -v open &> /dev/null; then
        echo "🌐 Opening HTML report..."
        open playwright-report/index.html
    elif command -v xdg-open &> /dev/null; then
        echo "🌐 Opening HTML report..."
        xdg-open playwright-report/index.html
    else
        echo "📋 View HTML report at: playwright-report/index.html"
    fi
}

# Cleanup function
cleanup() {
    echo "🧹 Cleaning up..."
    # Kill background processes if needed
    # pkill -f "npm run dev" 2>/dev/null || true
    # pkill -f "npm run openai-api" 2>/dev/null || true
}

# Main execution
main() {
    echo "🚀 Starting Playwright test execution..."
    
    # Setup and checks
    check_environment
    check_services
    setup_playwright
    
    # Wait for services to be ready
    echo "⏳ Waiting for services to be ready..."
    sleep 3
    
    # Run tests
    run_tests "$1"
    
    # Generate report
    generate_report
    
    echo "✅ Playwright testing completed!"
    echo "📊 Check test-results/ directory for detailed results"
}

# Handle script arguments
case "$1" in
    "help"|"-h"|"--help")
        echo "Usage: $0 [test-suite]"
        echo ""
        echo "Test Suites:"
        echo "  user-flow     - Test complete user workflow"
        echo "  conversation  - Test conversation quality metrics"
        echo "  all           - Run all test suites (default)"
        echo "  help          - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0                    # Run all tests"
        echo "  $0 user-flow          # Run user flow tests only"
        echo "  $0 conversation       # Run conversation quality tests only"
        ;;
    *)
        # Set up cleanup trap
        trap cleanup EXIT
        
        # Run main function
        main "$1"
        ;;
esac