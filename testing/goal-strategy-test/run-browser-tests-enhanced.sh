#!/bin/bash

# Enhanced Browser Test Runner for Codespaces/CI Environments
# Handles environment-specific configurations and troubleshooting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/test-logs"
MEMORY_DIR="/workspaces/personalEA/memory/data"
SWARM_ID="swarm-auto-centralized-1751222675065"

# Test configuration
TEST_CONFIG=(
  "BROWSER=${BROWSER:-chromium}"
  "HEADLESS=${HEADLESS:-true}"
  "WORKERS=${WORKERS:-1}"
  "RETRIES=${RETRIES:-2}"
  "TIMEOUT=${TIMEOUT:-60000}"
  "SLOW_MO=${SLOW_MO:-0}"
  "DEBUG=${DEBUG:-false}"
)

# Create log directory
mkdir -p "$LOG_DIR"

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)    echo -e "${BLUE}[INFO]${NC} ${timestamp} - $message" | tee -a "$LOG_DIR/test-runner.log" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} ${timestamp} - $message" | tee -a "$LOG_DIR/test-runner.log" ;;
        WARNING) echo -e "${YELLOW}[WARNING]${NC} ${timestamp} - $message" | tee -a "$LOG_DIR/test-runner.log" ;;
        ERROR)   echo -e "${RED}[ERROR]${NC} ${timestamp} - $message" | tee -a "$LOG_DIR/test-runner.log" ;;
        DEBUG)   [ "$DEBUG" = "true" ] && echo -e "${MAGENTA}[DEBUG]${NC} ${timestamp} - $message" | tee -a "$LOG_DIR/test-runner.log" ;;
    esac
}

# Environment detection
detect_environment() {
    log INFO "Detecting environment..."
    
    if [ -n "$CODESPACES" ]; then
        export TEST_ENV="codespaces"
        export DISPLAY=:99
        log INFO "Running in GitHub Codespaces"
    elif [ -n "$CI" ]; then
        export TEST_ENV="ci"
        export DISPLAY=:99
        log INFO "Running in CI environment"
    elif [ -n "$WSL_DISTRO_NAME" ]; then
        export TEST_ENV="wsl"
        log INFO "Running in WSL"
    else
        export TEST_ENV="local"
        log INFO "Running in local environment"
    fi
}

# Check prerequisites
check_prerequisites() {
    log INFO "Checking prerequisites..."
    
    local missing_deps=()
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    else
        log DEBUG "Node.js version: $(node --version)"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    else
        log DEBUG "npm version: $(npm --version)"
    fi
    
    # Check if package.json exists
    if [ ! -f "$SCRIPT_DIR/package.json" ]; then
        log ERROR "package.json not found in $SCRIPT_DIR"
        exit 1
    fi
    
    # Check if node_modules exists
    if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
        log WARNING "node_modules not found. Running npm install..."
        npm ci --prefer-offline --no-audit
    fi
    
    # Check Playwright
    if ! npx playwright --version &> /dev/null; then
        log WARNING "Playwright not found. Installing..."
        npm install @playwright/test
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log ERROR "Missing dependencies: ${missing_deps[*]}"
        exit 1
    fi
    
    log SUCCESS "All prerequisites satisfied"
}

# Setup virtual display for headless environments
setup_virtual_display() {
    if [ "$TEST_ENV" = "codespaces" ] || [ "$TEST_ENV" = "ci" ]; then
        log INFO "Setting up virtual display..."
        
        # Check if Xvfb is installed
        if ! command -v Xvfb &> /dev/null; then
            log WARNING "Xvfb not installed. Installing..."
            sudo apt-get update -qq
            sudo apt-get install -y xvfb
        fi
        
        # Kill any existing Xvfb processes
        pkill -f Xvfb || true
        
        # Start Xvfb
        Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset > "$LOG_DIR/xvfb.log" 2>&1 &
        export XVFB_PID=$!
        export DISPLAY=:99
        
        # Wait for Xvfb to start
        sleep 2
        
        if kill -0 $XVFB_PID 2>/dev/null; then
            log SUCCESS "Virtual display started (PID: $XVFB_PID)"
        else
            log ERROR "Failed to start virtual display"
            exit 1
        fi
    fi
}

# Install browsers with proper error handling
install_browsers() {
    log INFO "Installing Playwright browsers..."
    
    local browsers=("chromium" "firefox" "webkit")
    local failed_browsers=()
    
    for browser in "${browsers[@]}"; do
        log INFO "Installing $browser..."
        if npx playwright install "$browser" > "$LOG_DIR/browser-install-$browser.log" 2>&1; then
            log SUCCESS "$browser installed successfully"
        else
            log WARNING "Failed to install $browser"
            failed_browsers+=("$browser")
        fi
    done
    
    # Install system dependencies
    if [ "$TEST_ENV" = "codespaces" ] || [ "$TEST_ENV" = "ci" ]; then
        log INFO "Installing system dependencies..."
        if npx playwright install-deps > "$LOG_DIR/playwright-deps.log" 2>&1; then
            log SUCCESS "System dependencies installed"
        else
            log WARNING "Some system dependencies may have failed to install"
        fi
    fi
    
    if [ ${#failed_browsers[@]} -eq ${#browsers[@]} ]; then
        log ERROR "All browser installations failed"
        exit 1
    elif [ ${#failed_browsers[@]} -gt 0 ]; then
        log WARNING "Some browsers failed to install: ${failed_browsers[*]}"
    else
        log SUCCESS "All browsers installed successfully"
    fi
}

# Start test servers
start_servers() {
    log INFO "Starting test servers..."
    
    # Start frontend dev server
    if ! lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log INFO "Starting frontend dev server..."
        npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
        FRONTEND_PID=$!
        
        # Wait for server to start
        local count=0
        while ! curl -s http://localhost:5173 > /dev/null && [ $count -lt 30 ]; do
            sleep 1
            ((count++))
        done
        
        if curl -s http://localhost:5173 > /dev/null; then
            log SUCCESS "Frontend server started (PID: $FRONTEND_PID)"
        else
            log ERROR "Frontend server failed to start"
            cat "$LOG_DIR/frontend.log"
            exit 1
        fi
    else
        log INFO "Frontend server already running"
    fi
    
    # Start mock API server if needed
    if [ "$USE_REAL_API" != "true" ] && ! lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log INFO "Starting mock API server..."
        node openai-api-server.js > "$LOG_DIR/mock-api.log" 2>&1 &
        MOCK_API_PID=$!
        
        # Wait for server to start
        local count=0
        while ! curl -s http://localhost:3001/health > /dev/null && [ $count -lt 15 ]; do
            sleep 1
            ((count++))
        done
        
        if curl -s http://localhost:3001/health > /dev/null; then
            log SUCCESS "Mock API server started (PID: $MOCK_API_PID)"
        else
            log WARNING "Mock API server may not have started correctly"
        fi
    fi
}

# Run browser tests with enhanced error handling
run_browser_tests() {
    log INFO "Running browser tests..."
    
    # Export test configuration
    for config in "${TEST_CONFIG[@]}"; do
        export $config
        log DEBUG "Export: $config"
    done
    
    # Build test command
    local test_cmd="npx playwright test"
    
    # Add test file/pattern if specified
    if [ -n "$TEST_PATTERN" ]; then
        test_cmd="$test_cmd $TEST_PATTERN"
    fi
    
    # Add browser project
    test_cmd="$test_cmd --project=$BROWSER"
    
    # Add headed/headless mode
    if [ "$HEADLESS" = "false" ]; then
        test_cmd="$test_cmd --headed"
    fi
    
    # Add workers
    test_cmd="$test_cmd --workers=$WORKERS"
    
    # Add retries
    test_cmd="$test_cmd --retries=$RETRIES"
    
    # Add timeout
    test_cmd="$test_cmd --timeout=$TIMEOUT"
    
    # Add debug mode
    if [ "$DEBUG" = "true" ]; then
        test_cmd="$test_cmd --debug"
        export DEBUG="pw:api"
    fi
    
    # Add reporter
    test_cmd="$test_cmd --reporter=html,json,list"
    
    log INFO "Executing: $test_cmd"
    
    # Run tests
    set +e  # Don't exit on test failure
    eval "$test_cmd" 2>&1 | tee "$LOG_DIR/test-output.log"
    TEST_EXIT_CODE=$?
    set -e
    
    return $TEST_EXIT_CODE
}

# Generate test report
generate_report() {
    log INFO "Generating test report..."
    
    local report_data=$(cat <<EOF
{
  "testRunId": "${SWARM_ID}/test-run-$(date +%s)",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "environment": {
    "type": "$TEST_ENV",
    "browser": "$BROWSER",
    "headless": $HEADLESS,
    "display": "${DISPLAY:-none}",
    "node": "$(node --version)",
    "playwright": "$(npx playwright --version | cut -d' ' -f2)"
  },
  "configuration": {
    "workers": $WORKERS,
    "retries": $RETRIES,
    "timeout": $TIMEOUT,
    "slowMo": $SLOW_MO,
    "debug": $DEBUG
  },
  "results": {
    "exitCode": $TEST_EXIT_CODE,
    "success": $([ $TEST_EXIT_CODE -eq 0 ] && echo "true" || echo "false"),
    "reportPath": "playwright-report/index.html",
    "logsPath": "$LOG_DIR"
  },
  "troubleshooting": {
    "xvfbRunning": $(pgrep -f Xvfb > /dev/null && echo "true" || echo "false"),
    "frontendServerRunning": $(lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 && echo "true" || echo "false"),
    "mockApiServerRunning": $(lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 && echo "true" || echo "false")
  }
}
EOF
)
    
    # Save report
    echo "$report_data" > "$LOG_DIR/test-report.json"
    
    # Save to memory
    if [ -d "$MEMORY_DIR" ]; then
        echo "$report_data" > "$MEMORY_DIR/${SWARM_ID}-test-env-engineer-browser-test-report.json"
        log SUCCESS "Test report saved to Memory"
    fi
    
    # Display summary
    echo ""
    echo "========================================"
    if [ $TEST_EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✅ Browser Tests PASSED${NC}"
    else
        echo -e "${RED}❌ Browser Tests FAILED${NC}"
    fi
    echo "========================================"
    echo "Environment: $TEST_ENV"
    echo "Browser: $BROWSER"
    echo "Exit Code: $TEST_EXIT_CODE"
    echo "Report: playwright-report/index.html"
    echo "Logs: $LOG_DIR"
    echo "========================================"
}

# Cleanup function
cleanup() {
    log INFO "Cleaning up..."
    
    # Kill started processes
    [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null || true
    [ -n "$MOCK_API_PID" ] && kill $MOCK_API_PID 2>/dev/null || true
    [ -n "$XVFB_PID" ] && kill $XVFB_PID 2>/dev/null || true
    
    log SUCCESS "Cleanup completed"
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    log INFO "Starting Enhanced Browser Test Runner"
    echo "======================================"
    
    # Change to script directory
    cd "$SCRIPT_DIR"
    
    # Run setup steps
    detect_environment
    check_prerequisites
    setup_virtual_display
    install_browsers
    start_servers
    
    # Run tests
    run_browser_tests
    TEST_EXIT_CODE=$?
    
    # Generate report
    generate_report
    
    # Exit with test exit code
    exit $TEST_EXIT_CODE
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --browser)
            BROWSER="$2"
            shift 2
            ;;
        --headless)
            HEADLESS="$2"
            shift 2
            ;;
        --workers)
            WORKERS="$2"
            shift 2
            ;;
        --debug)
            DEBUG="true"
            shift
            ;;
        --test)
            TEST_PATTERN="$2"
            shift 2
            ;;
        --help)
            echo "Enhanced Browser Test Runner"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --browser <name>    Browser to use (chromium, firefox, webkit)"
            echo "  --headless <bool>   Run in headless mode (true/false)"
            echo "  --workers <num>     Number of parallel workers"
            echo "  --debug             Enable debug mode"
            echo "  --test <pattern>    Test file or pattern to run"
            echo "  --help              Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  BROWSER             Browser to use (default: chromium)"
            echo "  HEADLESS            Run headless (default: true)"
            echo "  WORKERS             Parallel workers (default: 1)"
            echo "  RETRIES             Test retries (default: 2)"
            echo "  TIMEOUT             Test timeout in ms (default: 60000)"
            echo "  DEBUG               Enable debug mode (default: false)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main