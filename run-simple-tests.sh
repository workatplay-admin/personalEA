#!/bin/bash

# Simple Test Runner - Under 50 lines!
set -e

echo "🚀 PersonalEA Simple Test Runner"
echo "================================"

# Configuration
TEST_DIR="${TEST_DIR:-/workspace/tests/simple}"
RESULTS_DIR="${RESULTS_DIR:-/test-results}"
HEADLESS="${HEADLESS:-true}"

# Create results directory
mkdir -p "$RESULTS_DIR"

# Function to run tests
run_tests() {
    local test_type=$1
    echo "🧪 Running $test_type tests..."
    
    npx playwright test "$TEST_DIR/$test_type.spec.ts" \
        --reporter=html \
        --reporter=json \
        --output-dir="$RESULTS_DIR" \
        $([ "$HEADLESS" = "true" ] && echo "" || echo "--headed") \
        || return 1
        
    echo "✅ $test_type tests completed"
}

# Main execution
echo "📋 Test execution plan:"
echo "  1. Smoke tests (health checks)"
echo "  2. E2E workflow tests"
echo "  3. API integration tests"
echo ""

# Run test suites
run_tests "smoke" && \
run_tests "e2e-workflow" && \
run_tests "api-integration"

# Generate summary
echo ""
echo "📊 Test Summary"
echo "==============="
echo "Results saved to: $RESULTS_DIR"
echo "HTML Report: $RESULTS_DIR/playwright-report/index.html"

# Exit with appropriate code
exit $?