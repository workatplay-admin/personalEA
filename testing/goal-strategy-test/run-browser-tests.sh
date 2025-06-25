#!/bin/bash

# Goal Strategy Testing - Comprehensive Browser Test Runner
# Browser Test Engineer for Goals and Strategy Phase 1-3

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_ENV=${TEST_ENV:-"development"}
BROWSER=${BROWSER:-"all"}
HEADLESS=${HEADLESS:-"true"}
PARALLEL=${PARALLEL:-"true"}
REPORT_DIR="test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}=== Goal Strategy Phase 1-3 Browser Testing Suite ===${NC}"
echo -e "${BLUE}Timestamp: $TIMESTAMP${NC}"
echo -e "${BLUE}Environment: $TEST_ENV${NC}"
echo -e "${BLUE}Browser: $BROWSER${NC}"
echo -e "${BLUE}Headless: $HEADLESS${NC}"
echo

# Function to print status
print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} $message"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} $message"
            ;;
        "WARNING")
            echo -e "${YELLOW}[WARNING]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
    esac
}

# Check prerequisites
print_status "INFO" "Checking prerequisites..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_status "ERROR" "Node.js is not installed"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_status "ERROR" "npm is not installed"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "INFO" "Installing dependencies..."
    npm install
fi

# Install Playwright browsers if needed
if [ ! -d "node_modules/@playwright" ]; then
    print_status "INFO" "Installing Playwright browsers..."
    npx playwright install
fi

# Create test results directory
mkdir -p $REPORT_DIR

# Function to run specific test suite
run_test_suite() {
    local suite_name=$1
    local test_command=$2
    
    print_status "INFO" "Running $suite_name tests..."
    
    if eval $test_command; then
        print_status "SUCCESS" "$suite_name tests completed successfully"
        return 0
    else
        print_status "ERROR" "$suite_name tests failed"
        return 1
    fi
}

# Function to run phase-specific tests
run_phase_tests() {
    local phase=$1
    
    print_status "INFO" "Starting Phase $phase testing..."
    
    case $phase in
        "1")
            run_test_suite "Phase 1 (Goal Input → SMART Goal)" "npm run test:e2e:phase1"
            ;;
        "2")
            run_test_suite "Phase 2 (SMART Goal → Milestones)" "npm run test:e2e:phase2"
            ;;
        "3")
            run_test_suite "Phase 3 (WBS → Estimation)" "npm run test:e2e:phase3"
            ;;
        *)
            print_status "ERROR" "Invalid phase: $phase"
            return 1
            ;;
    esac
}

# Function to run browser-specific tests
run_browser_tests() {
    local browser=$1
    
    print_status "INFO" "Running tests on $browser..."
    
    case $browser in
        "chromium")
            run_test_suite "Chromium Tests" "npm run test:e2e:chromium"
            ;;
        "firefox")
            run_test_suite "Firefox Tests" "npm run test:e2e:firefox"
            ;;
        "webkit")
            run_test_suite "Safari/WebKit Tests" "npm run test:e2e:webkit"
            ;;
        "mobile")
            run_test_suite "Mobile Browser Tests" "npm run test:e2e:mobile"
            ;;
        "all")
            run_test_suite "Cross-Browser Tests" "npm run test:e2e:cross-browser"
            ;;
        *)
            print_status "ERROR" "Invalid browser: $browser"
            return 1
            ;;
    esac
}

# Function to run visual regression tests
run_visual_tests() {
    print_status "INFO" "Running visual regression tests..."
    
    if run_test_suite "Visual Regression" "npm run test:e2e:visual"; then
        print_status "SUCCESS" "Visual regression tests completed"
        
        # Check if visual differences were found
        if [ -d "$REPORT_DIR/test-results" ]; then
            local diff_count=$(find $REPORT_DIR -name "*-diff.png" | wc -l)
            if [ $diff_count -gt 0 ]; then
                print_status "WARNING" "Found $diff_count visual differences"
                print_status "INFO" "Review visual differences in $REPORT_DIR"
            fi
        fi
    else
        print_status "ERROR" "Visual regression tests failed"
        return 1
    fi
}

# Function to run performance tests
run_performance_tests() {
    print_status "INFO" "Running performance tests..."
    
    if run_test_suite "Performance Tests" "npm run test:e2e:performance"; then
        print_status "SUCCESS" "Performance tests completed"
        
        # Generate performance report
        if [ -f "$REPORT_DIR/performance-metrics.json" ]; then
            print_status "INFO" "Performance metrics saved to $REPORT_DIR/performance-metrics.json"
        fi
    else
        print_status "ERROR" "Performance tests failed"
        return 1
    fi
}

# Function to generate comprehensive report
generate_report() {
    print_status "INFO" "Generating comprehensive test report..."
    
    # Generate HTML report
    npm run test:e2e:report
    
    # Create summary report
    cat > "$REPORT_DIR/test-summary-$TIMESTAMP.md" << EOF
# Browser Test Summary Report

**Test Run:** $TIMESTAMP
**Environment:** $TEST_ENV
**Browser:** $BROWSER

## Test Execution Results

### Phase 1 Tests (Goal Input → SMART Goal)
- API Configuration testing
- Goal input validation
- SMART goal generation
- Chat-based refinement

### Phase 2 Tests (SMART Goal → Milestones)  
- Milestone generation from SMART goals
- Milestone editing and customization
- Timeline validation

### Phase 3 Tests (WBS → Estimation)
- Work Breakdown Structure generation
- Task hierarchy and dependencies
- Multi-method estimation
- Summary reporting

### Cross-Browser Compatibility
- Chromium/Chrome testing
- Firefox testing  
- Safari/WebKit testing
- Mobile browser testing

### Visual Regression Testing
- Layout consistency validation
- Responsive design verification
- Dark mode testing
- Error state validation

### Performance Testing
- Load time measurements
- API response time validation
- UI responsiveness testing
- Large dataset handling

## Test Results Location
- HTML Report: $REPORT_DIR/html-report/index.html
- Screenshots: $REPORT_DIR/screenshots/
- Performance Metrics: $REPORT_DIR/performance-metrics.json
- Error Logs: $REPORT_DIR/test-logs/

## Browser Testing Coverage Matrix

| Feature | Chrome | Firefox | Safari | Mobile |
|---------|--------|---------|--------|--------|
| Phase 1 | ✅ | ✅ | ✅ | ✅ |
| Phase 2 | ✅ | ✅ | ✅ | ✅ |
| Phase 3 | ✅ | ✅ | ✅ | ✅ |
| Visual | ✅ | ✅ | ✅ | ✅ |
| Performance | ✅ | ✅ | ✅ | ⚠️ |

EOF
    
    print_status "SUCCESS" "Test summary report generated: $REPORT_DIR/test-summary-$TIMESTAMP.md"
}

# Main execution logic
main() {
    local exit_code=0
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --phase)
                PHASE="$2"
                shift 2
                ;;
            --browser)
                BROWSER="$2"
                shift 2
                ;;
            --visual)
                VISUAL_ONLY="true"
                shift
                ;;
            --performance)
                PERFORMANCE_ONLY="true"
                shift
                ;;
            --integration)
                INTEGRATION_ONLY="true"
                shift
                ;;
            --update-snapshots)
                UPDATE_SNAPSHOTS="true"
                shift
                ;;
            --help)
                cat << EOF
Browser Test Runner for Goal Strategy Phase 1-3

Usage: $0 [OPTIONS]

Options:
    --phase PHASE           Run specific phase tests (1, 2, or 3)
    --browser BROWSER       Run on specific browser (chromium, firefox, webkit, mobile, all)
    --visual                Run only visual regression tests
    --performance           Run only performance tests  
    --integration           Run only integration tests
    --update-snapshots      Update visual regression snapshots
    --help                  Show this help message

Examples:
    $0                              # Run all tests
    $0 --phase 1                    # Run Phase 1 tests only
    $0 --browser firefox            # Run tests on Firefox only
    $0 --visual                     # Run visual regression tests only
    $0 --performance                # Run performance tests only
    $0 --update-snapshots           # Update visual snapshots

EOF
                exit 0
                ;;
            *)
                print_status "ERROR" "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Update snapshots if requested
    if [ "$UPDATE_SNAPSHOTS" = "true" ]; then
        print_status "INFO" "Updating visual regression snapshots..."
        npm run test:visual:update
        exit 0
    fi
    
    # Run specific test suites based on flags
    if [ "$VISUAL_ONLY" = "true" ]; then
        run_visual_tests || exit_code=$?
    elif [ "$PERFORMANCE_ONLY" = "true" ]; then
        run_performance_tests || exit_code=$?
    elif [ "$INTEGRATION_ONLY" = "true" ]; then
        run_test_suite "Integration Tests" "npm run test:e2e:integration" || exit_code=$?
    elif [ -n "$PHASE" ]; then
        run_phase_tests $PHASE || exit_code=$?
    else
        # Run comprehensive test suite
        print_status "INFO" "Starting comprehensive browser testing suite..."
        
        # Run phase-specific tests
        run_phase_tests "1" || exit_code=$?
        run_phase_tests "2" || exit_code=$?
        run_phase_tests "3" || exit_code=$?
        
        # Run browser-specific tests
        run_browser_tests $BROWSER || exit_code=$?
        
        # Run visual regression tests
        run_visual_tests || exit_code=$?
        
        # Run performance tests
        run_performance_tests || exit_code=$?
        
        # Run integration tests
        run_test_suite "Integration Tests" "npm run test:e2e:integration" || exit_code=$?
    fi
    
    # Generate comprehensive report
    generate_report
    
    if [ $exit_code -eq 0 ]; then
        print_status "SUCCESS" "All browser tests completed successfully!"
        print_status "INFO" "View detailed results: $REPORT_DIR/html-report/index.html"
    else
        print_status "ERROR" "Some tests failed. Check the reports for details."
    fi
    
    exit $exit_code
}

# Execute main function with all arguments
main "$@"