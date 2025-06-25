#!/bin/bash

# Comprehensive Test Runner for Goal Translation Fix Verification
# This script runs all automated tests and captures detailed results

set -e  # Exit on any error

echo "🚀 Starting Comprehensive Automated Testing for Goal Translation Fix"
echo "=================================================================="

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEST_DIR="/workspaces/personalEA/testing/goal-strategy-test"
RESULTS_DIR="/workspaces/personalEA/test-results"
REPORT_FILE="$RESULTS_DIR/comprehensive-test-report-$TIMESTAMP.json"
SUMMARY_FILE="$RESULTS_DIR/test-summary-$TIMESTAMP.txt"

# Ensure directories exist
mkdir -p "$RESULTS_DIR/screenshots"
mkdir -p "$RESULTS_DIR/videos"
mkdir -p "$RESULTS_DIR/reports"

# Initialize test results
echo "{"                                                > "$REPORT_FILE"
echo "  \"timestamp\": \"$(date -Iseconds)\","         >> "$REPORT_FILE"
echo "  \"testSuites\": [],"                           >> "$REPORT_FILE"
echo "  \"summary\": {"                                >> "$REPORT_FILE"
echo "    \"total\": 0,"                               >> "$REPORT_FILE"
echo "    \"passed\": 0,"                              >> "$REPORT_FILE"
echo "    \"failed\": 0,"                              >> "$REPORT_FILE"
echo "    \"errors\": []"                              >> "$REPORT_FILE"
echo "  }"                                             >> "$REPORT_FILE"
echo "}"                                               >> "$REPORT_FILE"

# Function to run a test suite
run_test_suite() {
    local suite_name="$1"
    local test_path="$2"
    local browser="$3"
    local timeout="${4:-60000}"
    
    echo ""
    echo "🧪 Running: $suite_name"
    echo "📁 Path: $test_path"
    echo "🌐 Browser: $browser"
    echo "⏱️ Timeout: ${timeout}ms"
    echo "----------------------------------------"
    
    cd "$TEST_DIR"
    
    # Create output files
    local stdout_file="$RESULTS_DIR/${suite_name// /_}_${browser}_stdout.log"
    local stderr_file="$RESULTS_DIR/${suite_name// /_}_${browser}_stderr.log"
    local results_file="$RESULTS_DIR/${suite_name// /_}_${browser}_results.json"
    
    # Run the test
    local start_time=$(date +%s%N)
    local exit_code=0
    
    if timeout 900 npx playwright test "$test_path" \
        --project="$browser" \
        --timeout="$timeout" \
        --reporter=json \
        --output-dir="$RESULTS_DIR" \
        --screenshot=only-on-failure \
        --video=retain-on-failure \
        > "$stdout_file" 2> "$stderr_file"; then
        echo "✅ $suite_name PASSED"
    else
        exit_code=$?
        echo "❌ $suite_name FAILED (exit code: $exit_code)"
    fi
    
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds
    
    # Log the result
    echo "Suite: $suite_name" >> "$SUMMARY_FILE"
    echo "Browser: $browser" >> "$SUMMARY_FILE"
    echo "Result: $([ $exit_code -eq 0 ] && echo "PASSED" || echo "FAILED")" >> "$SUMMARY_FILE"
    echo "Duration: ${duration}ms" >> "$SUMMARY_FILE"
    echo "Stdout: $stdout_file" >> "$SUMMARY_FILE"
    echo "Stderr: $stderr_file" >> "$SUMMARY_FILE"
    echo "----------------------------------------" >> "$SUMMARY_FILE"
    
    # Capture screenshots if any were generated
    find "$RESULTS_DIR" -name "*.png" -newer "$stdout_file" 2>/dev/null | while read -r screenshot; do
        echo "📸 Screenshot captured: $screenshot"
    done
    
    return $exit_code
}

# Function to start test services
start_services() {
    echo "🔧 Starting test services..."
    
    cd "$TEST_DIR"
    
    # Start OpenAI API server in background
    if [ -f "openai-api-server.js" ]; then
        echo "Starting OpenAI API server..."
        node openai-api-server.js > "$RESULTS_DIR/api-server.log" 2>&1 &
        API_SERVER_PID=$!
        echo "API Server started with PID: $API_SERVER_PID"
        
        # Wait for server to start
        sleep 5
        
        # Test if server is running
        if curl -s http://localhost:3001/health >/dev/null 2>&1; then
            echo "✅ API Server is running"
        else
            echo "⚠️ API Server may not be running properly"
        fi
    else
        echo "⚠️ OpenAI API server not found, tests may use mock data"
    fi
    
    # Install browser dependencies
    echo "🌐 Installing browser dependencies..."
    if npx playwright install --with-deps chromium firefox webkit > "$RESULTS_DIR/browser-install.log" 2>&1; then
        echo "✅ Browser dependencies installed"
    else
        echo "⚠️ Browser installation may have issues"
    fi
}

# Function to stop test services
stop_services() {
    echo "🧹 Stopping test services..."
    
    if [ -n "$API_SERVER_PID" ]; then
        kill $API_SERVER_PID 2>/dev/null || true
        echo "API Server stopped"
    fi
}

# Function to generate final report
generate_report() {
    echo ""
    echo "📊 Generating comprehensive test report..."
    
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    # Count results from log files
    if [ -f "$SUMMARY_FILE" ]; then
        total_tests=$(grep -c "Result:" "$SUMMARY_FILE" 2>/dev/null || echo "0")
        passed_tests=$(grep -c "Result: PASSED" "$SUMMARY_FILE" 2>/dev/null || echo "0")
        failed_tests=$(grep -c "Result: FAILED" "$SUMMARY_FILE" 2>/dev/null || echo "0")
    fi
    
    # Count screenshots
    local screenshot_count=$(find "$RESULTS_DIR" -name "*.png" | wc -l)
    
    # Generate summary
    cat > "$RESULTS_DIR/FINAL_SUMMARY.txt" << EOF
🎯 COMPREHENSIVE TEST EXECUTION SUMMARY
=======================================

📊 Overall Results:
- Total Test Suites: $total_tests
- Passed: $passed_tests
- Failed: $failed_tests
- Success Rate: $(( total_tests > 0 ? (passed_tests * 100) / total_tests : 0 ))%

📸 Screenshots Captured: $screenshot_count
📹 Videos Captured: $(find "$RESULTS_DIR" -name "*.webm" | wc -l)

🧪 Transform to SMART Goal Button Testing Status:
$([ $failed_tests -eq 0 ] && echo "✅ All tests passed - Goal translation fix is working correctly" || echo "⚠️ Some tests failed - Review errors and fix issues")

📁 Test Results Location: $RESULTS_DIR
📄 Detailed Logs: $SUMMARY_FILE
📊 Full Report: $REPORT_FILE

Generated: $(date)
EOF
    
    echo ""
    echo "📋 Final Test Summary:"
    cat "$RESULTS_DIR/FINAL_SUMMARY.txt"
    
    return $([ $failed_tests -eq 0 ] && echo 0 || echo 1)
}

# Trap to ensure cleanup
trap stop_services EXIT

# Main execution
echo "🚀 Initializing test environment..."
start_services

echo ""
echo "🎯 Starting comprehensive test execution..."

# Initialize summary file
echo "COMPREHENSIVE AUTOMATED TESTING REPORT" > "$SUMMARY_FILE"
echo "Generated: $(date)" >> "$SUMMARY_FILE"
echo "========================================" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"

# Track overall success
OVERALL_SUCCESS=0

# Test Suite 1: Existing Phase 1 Tests (Chromium)
if run_test_suite "Phase 1 Goal to SMART" "tests/e2e/phase1/goal-to-smart.spec.ts" "chromium" 60000; then
    echo "✅ Phase 1 tests passed"
else
    echo "❌ Phase 1 tests failed"
    OVERALL_SUCCESS=1
fi

# Test Suite 2: Error Scenarios (Chromium)
if run_test_suite "Error Scenarios" "tests/e2e/error-scenarios/comprehensive-error-testing.spec.ts" "chromium" 90000; then
    echo "✅ Error scenario tests passed"
else
    echo "❌ Error scenario tests failed"
    OVERALL_SUCCESS=1
fi

# Test Suite 3: Network Timeout Testing (Chromium)
if run_test_suite "Network Timeout" "tests/e2e/network-scenarios/network-timeout-testing.spec.ts" "chromium" 120000; then
    echo "✅ Network timeout tests passed"
else
    echo "❌ Network timeout tests failed"
    OVERALL_SUCCESS=1
fi

# Test Suite 4: Edge Cases (Chromium)
if run_test_suite "Edge Cases" "tests/e2e/edge-cases/comprehensive-edge-case-testing.spec.ts" "chromium" 90000; then
    echo "✅ Edge case tests passed"
else
    echo "❌ Edge case tests failed"
    OVERALL_SUCCESS=1
fi

# Test Suite 5: Cross-Browser Testing (Firefox)
if run_test_suite "Cross Browser Firefox" "tests/e2e/phase1/goal-to-smart.spec.ts" "firefox" 60000; then
    echo "✅ Firefox tests passed"
else
    echo "❌ Firefox tests failed"
    OVERALL_SUCCESS=1
fi

# Test Suite 6: Cross-Browser Testing (WebKit)
if run_test_suite "Cross Browser WebKit" "tests/e2e/phase1/goal-to-smart.spec.ts" "webkit" 60000; then
    echo "✅ WebKit tests passed"
else
    echo "❌ WebKit tests failed"
    OVERALL_SUCCESS=1
fi

# Generate final report
generate_report

echo ""
echo "🎯 Testing complete! Check the results in: $RESULTS_DIR"

exit $OVERALL_SUCCESS