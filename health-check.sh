#!/bin/bash
set -euo pipefail

# =============================================================================
# PersonalEA Testing Infrastructure Health Check
# =============================================================================
# Comprehensive health check for all testing services
# Usage: ./health-check.sh [options]
# Options:
#   --verbose      Show detailed health information
#   --json         Output results in JSON format
#   --exit-code    Exit with non-zero code if any service is unhealthy
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_PORT=5174
BACKEND_PORT=8085
MOCK_API_PORT=3000
OPENAI_API_PORT=8086
VERBOSE=false
JSON_OUTPUT=false
EXIT_ON_FAILURE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --verbose)
      VERBOSE=true
      shift
      ;;
    --json)
      JSON_OUTPUT=true
      shift
      ;;
    --exit-code)
      EXIT_ON_FAILURE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--verbose] [--json] [--exit-code]"
      exit 1
      ;;
  esac
done

# Health check results
declare -A HEALTH_RESULTS
OVERALL_HEALTH=true

# Logging functions (only for non-JSON output)
log_info() {
  if [ "$JSON_OUTPUT" = false ]; then
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
  fi
}

log_success() {
  if [ "$JSON_OUTPUT" = false ]; then
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✅ $1${NC}"
  fi
}

log_error() {
  if [ "$JSON_OUTPUT" = false ]; then
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌ $1${NC}"
  fi
}

log_warning() {
  if [ "$JSON_OUTPUT" = false ]; then
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️  $1${NC}"
  fi
}

# Function to check service health with detailed response
check_service_health() {
  local url=$1
  local service_name=$2
  local expected_status=${3:-200}
  
  local start_time=$(date +%s%N)
  local response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" "$url" 2>/dev/null || echo "HTTPSTATUS:000;TIME:0")
  local end_time=$(date +%s%N)
  
  local http_status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
  local response_time=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
  local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*;TIME:[0-9.]*$//')
  local total_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
  
  local health_data="{
    \"status\": \"$([[ "$http_status" == "$expected_status" ]] && echo "healthy" || echo "unhealthy")\",
    \"http_status\": $http_status,
    \"response_time_ms\": $total_time,
    \"curl_time\": \"${response_time}s\",
    \"url\": \"$url\",
    \"timestamp\": \"$(date -Iseconds)\"
  }"
  
  if [[ "$http_status" == "$expected_status" ]]; then
    HEALTH_RESULTS["$service_name"]="$health_data"
    if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
      log_success "$service_name is healthy (${total_time}ms)"
    fi
    return 0
  else
    HEALTH_RESULTS["$service_name"]="$health_data"
    OVERALL_HEALTH=false
    if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
      log_error "$service_name is unhealthy (HTTP: $http_status, ${total_time}ms)"
    fi
    return 1
  fi
}

# Function to check if port is open
check_port_open() {
  local port=$1
  local service_name=$2
  
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    local pid=$(lsof -ti :$port 2>/dev/null || echo "unknown")
    local port_data="{
      \"status\": \"open\",
      \"port\": $port,
      \"pid\": \"$pid\",
      \"timestamp\": \"$(date -Iseconds)\"
    }"
    HEALTH_RESULTS["${service_name}_port"]="$port_data"
    if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
      log_success "$service_name port $port is open (PID: $pid)"
    fi
    return 0
  else
    local port_data="{
      \"status\": \"closed\",
      \"port\": $port,
      \"pid\": null,
      \"timestamp\": \"$(date -Iseconds)\"
    }"
    HEALTH_RESULTS["${service_name}_port"]="$port_data"
    OVERALL_HEALTH=false
    if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
      log_error "$service_name port $port is closed"
    fi
    return 1
  fi
}

# Function to run a comprehensive API test
test_api_functionality() {
  local base_url=$1
  local service_name=$2
  
  local start_time=$(date +%s%N)
  
  # Test goal translation endpoint
  local test_payload='{"raw_goal": "I want to exercise more"}'
  local response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "X-OpenAI-API-Key: test-key" \
    -d "$test_payload" \
    "$base_url/api/v1/goals/translate" 2>/dev/null || echo "HTTPSTATUS:000")
  
  local http_status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
  local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
  local end_time=$(date +%s%N)
  local total_time=$(( (end_time - start_time) / 1000000 ))
  
  local api_test_data="{
    \"status\": \"$([[ "$http_status" =~ ^(200|400|401)$ ]] && echo "functional" || echo "non_functional")\",
    \"http_status\": $http_status,
    \"response_time_ms\": $total_time,
    \"endpoint\": \"/api/v1/goals/translate\",
    \"timestamp\": \"$(date -Iseconds)\"
  }"
  
  HEALTH_RESULTS["${service_name}_api_test"]="$api_test_data"
  
  if [[ "$http_status" =~ ^(200|400|401)$ ]]; then
    if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
      log_success "$service_name API is functional (${total_time}ms)"
    fi
    return 0
  else
    OVERALL_HEALTH=false
    if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
      log_error "$service_name API test failed (HTTP: $http_status, ${total_time}ms)"
    fi
    return 1
  fi
}

# Main health check function
run_health_check() {
  if [ "$JSON_OUTPUT" = false ]; then
    log_info "Starting comprehensive health check..."
    echo ""
  fi
  
  # Check Frontend
  if [ "$JSON_OUTPUT" = false ] && [ "$VERBOSE" = true ]; then
    log_info "Checking Frontend service..."
  fi
  check_port_open $FRONTEND_PORT "frontend"
  check_service_health "http://localhost:$FRONTEND_PORT" "frontend"
  
  # Check Backend API
  if [ "$JSON_OUTPUT" = false ] && [ "$VERBOSE" = true ]; then
    log_info "Checking Backend API service..."
  fi
  check_port_open $BACKEND_PORT "backend"
  check_service_health "http://localhost:$BACKEND_PORT/health" "backend"
  
  # Check API servers (Mock or OpenAI)
  local api_server_found=false
  
  # Check OpenAI API Server
  if lsof -Pi :$OPENAI_API_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    if [ "$JSON_OUTPUT" = false ] && [ "$VERBOSE" = true ]; then
      log_info "Checking OpenAI API server..."
    fi
    check_port_open $OPENAI_API_PORT "openai_api"
    check_service_health "http://localhost:$OPENAI_API_PORT/health" "openai_api"
    test_api_functionality "http://localhost:$OPENAI_API_PORT" "openai_api"
    api_server_found=true
  fi
  
  # Check Mock API Server
  if lsof -Pi :$MOCK_API_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    if [ "$JSON_OUTPUT" = false ] && [ "$VERBOSE" = true ]; then
      log_info "Checking Mock API server..."
    fi
    check_port_open $MOCK_API_PORT "mock_api"
    check_service_health "http://localhost:$MOCK_API_PORT/health" "mock_api"
    test_api_functionality "http://localhost:$MOCK_API_PORT" "mock_api"
    api_server_found=true
  fi
  
  if [ "$api_server_found" = false ]; then
    OVERALL_HEALTH=false
    HEALTH_RESULTS["api_server"]='{"status": "not_running", "message": "No API server found running", "timestamp": "'$(date -Iseconds)'"}'
    if [ "$JSON_OUTPUT" = false ]; then
      log_error "No API server found running on expected ports"
    fi
  fi
}

# Output results
output_results() {
  if [ "$JSON_OUTPUT" = true ]; then
    # JSON output
    echo "{"
    echo "  \"overall_health\": $([[ "$OVERALL_HEALTH" == true ]] && echo "true" || echo "false"),"
    echo "  \"timestamp\": \"$(date -Iseconds)\","
    echo "  \"services\": {"
    
    local first=true
    for service in "${!HEALTH_RESULTS[@]}"; do
      if [ "$first" = false ]; then
        echo ","
      else
        first=false
      fi
      echo -n "    \"$service\": ${HEALTH_RESULTS[$service]}"
    done
    echo ""
    echo "  }"
    echo "}"
  else
    # Human-readable output
    echo ""
    if [ "$OVERALL_HEALTH" = true ]; then
      log_success "All services are healthy!"
    else
      log_error "Some services are unhealthy"
    fi
    
    echo ""
    echo -e "${BLUE}Health Summary:${NC}"
    for service in "${!HEALTH_RESULTS[@]}"; do
      local status=$(echo "${HEALTH_RESULTS[$service]}" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
      case $status in
        "healthy"|"functional"|"open")
          echo -e "  ${GREEN}$service${NC}: ${GREEN}$status${NC}"
          ;;
        *)
          echo -e "  ${RED}$service${NC}: ${RED}$status${NC}"
          ;;
      esac
    done
  fi
}

# Run the health check
run_health_check
output_results

# Exit with appropriate code
if [ "$EXIT_ON_FAILURE" = true ] && [ "$OVERALL_HEALTH" = false ]; then
  exit 1
fi