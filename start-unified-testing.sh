#!/bin/bash
set -euo pipefail

# =============================================================================
# PersonalEA Unified Testing Infrastructure
# =============================================================================
# This script provides a streamlined, reliable way to start all testing servers
# Usage: ./start-unified-testing.sh [options]
# Options:
#   --mock          Use mock API server (default)
#   --openai        Use OpenAI-powered API server
#   --port-check    Only check if ports are available
#   --no-cleanup    Don't kill existing processes
#   --debug         Enable debug logging
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
LOG_DIR="/workspaces/personalEA/logs/testing"
USE_OPENAI=false
NO_CLEANUP=false
DEBUG=false
PORT_CHECK_ONLY=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --mock)
      USE_OPENAI=false
      shift
      ;;
    --openai)
      USE_OPENAI=true
      shift
      ;;
    --port-check)
      PORT_CHECK_ONLY=true
      shift
      ;;
    --no-cleanup)
      NO_CLEANUP=true
      shift
      ;;
    --debug)
      DEBUG=true
      set -x
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: $0 [--mock|--openai] [--port-check] [--no-cleanup] [--debug]"
      exit 1
      ;;
  esac
done

# Logging functions
log_info() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

log_error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

# Create log directory
mkdir -p "$LOG_DIR"

# Function to check if a port is in use
check_port() {
  local port=$1
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    return 0 # Port is in use
  else
    return 1 # Port is free
  fi
}

# Function to wait for a service to be healthy
wait_for_service() {
  local url=$1
  local service_name=$2
  local max_attempts=${3:-30}
  local attempt=1

  log_info "Waiting for $service_name to be healthy..."
  
  while [ $attempt -le $max_attempts ]; do
    if curl -s "$url" > /dev/null 2>&1; then
      log_success "$service_name is healthy!"
      return 0
    fi
    
    if [ $attempt -eq $max_attempts ]; then
      log_error "$service_name failed to start after $max_attempts attempts"
      return 1
    fi
    
    echo -n "."
    sleep 2
    ((attempt++))
  done
}

# Function to kill process on port
kill_port_process() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    kill -9 $pids 2>/dev/null || true
    sleep 1
  fi
}

# Port availability check
if [ "$PORT_CHECK_ONLY" = true ]; then
  log_info "Checking port availability..."
  
  check_port $FRONTEND_PORT && log_warning "Frontend port $FRONTEND_PORT is in use" || log_success "Frontend port $FRONTEND_PORT is available"
  check_port $BACKEND_PORT && log_warning "Backend port $BACKEND_PORT is in use" || log_success "Backend port $BACKEND_PORT is available"
  
  if [ "$USE_OPENAI" = true ]; then
    check_port $OPENAI_API_PORT && log_warning "OpenAI API port $OPENAI_API_PORT is in use" || log_success "OpenAI API port $OPENAI_API_PORT is available"
  else
    check_port $MOCK_API_PORT && log_warning "Mock API port $MOCK_API_PORT is in use" || log_success "Mock API port $MOCK_API_PORT is available"
  fi
  
  exit 0
fi

# Banner
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}║          PersonalEA Unified Testing Infrastructure          ║${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Environment checks
log_info "Performing environment checks..."

# Check for required directories
if [ ! -d "/workspaces/personalEA/services/goal-strategy" ]; then
  log_error "Backend service directory not found!"
  exit 1
fi

if [ ! -d "/workspaces/personalEA/testing/goal-strategy-test" ]; then
  log_error "Frontend testing directory not found!"
  exit 1
fi

# Check for OpenAI API key if using OpenAI mode
if [ "$USE_OPENAI" = true ]; then
  if [ -z "${OPENAI_API_KEY:-}" ]; then
    log_error "OPENAI_API_KEY environment variable is required for OpenAI mode!"
    log_info "Please set: export OPENAI_API_KEY='your-api-key'"
    exit 1
  fi
  log_success "OpenAI API key detected (${#OPENAI_API_KEY} chars)"
  API_MODE="OpenAI"
  API_PORT=$OPENAI_API_PORT
else
  log_info "Using mock API server (no OpenAI key required)"
  API_MODE="Mock"
  API_PORT=$MOCK_API_PORT
fi

# Cleanup existing processes
if [ "$NO_CLEANUP" = false ]; then
  log_info "Cleaning up existing processes..."
  
  # Kill processes by port
  kill_port_process $FRONTEND_PORT
  kill_port_process $BACKEND_PORT
  kill_port_process $MOCK_API_PORT
  kill_port_process $OPENAI_API_PORT
  
  # Additional cleanup by process name
  pkill -f "npm run dev" 2>/dev/null || true
  pkill -f "tsx watch" 2>/dev/null || true
  pkill -f "node.*mock-api-server" 2>/dev/null || true
  pkill -f "node.*openai-api-server" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true
  
  sleep 2
  log_success "Cleanup completed"
fi

# Track PIDs for cleanup
PIDS=()

# Function to cleanup on exit
cleanup() {
  log_info "Shutting down services..."
  for pid in "${PIDS[@]}"; do
    kill -TERM "$pid" 2>/dev/null || true
  done
  wait
  log_success "All services stopped"
}

# Set trap for cleanup on exit
trap cleanup EXIT INT TERM

# Start Backend Service
log_info "Starting Backend Service..."
cd /workspaces/personalEA/services/goal-strategy

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  log_info "Installing backend dependencies..."
  npm install > "$LOG_DIR/backend-install.log" 2>&1
fi

# Start backend with proper environment
OPENAI_API_KEY="${OPENAI_API_KEY:-}" npm run dev > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
PIDS+=($BACKEND_PID)
log_info "Backend started (PID: $BACKEND_PID)"

# Wait for backend to be healthy
if ! wait_for_service "http://localhost:$BACKEND_PORT/health" "Backend Service" 30; then
  log_error "Backend service failed to start. Check logs at: $LOG_DIR/backend.log"
  tail -n 20 "$LOG_DIR/backend.log"
  exit 1
fi

# Start API Server (Mock or OpenAI)
if [ "$USE_OPENAI" = true ]; then
  log_info "Starting OpenAI API Server..."
  cd /workspaces/personalEA/testing/goal-strategy-test
  
  # Check if openai-api-server.js exists
  if [ ! -f "openai-api-server.js" ]; then
    log_error "openai-api-server.js not found!"
    exit 1
  fi
  
  OPENAI_API_KEY="$OPENAI_API_KEY" node openai-api-server.js > "$LOG_DIR/openai-api.log" 2>&1 &
  API_PID=$!
  PIDS+=($API_PID)
  log_info "OpenAI API Server started (PID: $API_PID)"
  
  # Wait for OpenAI API server
  if ! wait_for_service "http://localhost:$OPENAI_API_PORT/health" "OpenAI API Server" 20; then
    log_error "OpenAI API Server failed to start. Check logs at: $LOG_DIR/openai-api.log"
    tail -n 20 "$LOG_DIR/openai-api.log"
    exit 1
  fi
else
  log_info "Starting Mock API Server..."
  cd /workspaces/personalEA/testing/goal-strategy-test
  
  # Check if mock-api-server.js exists
  if [ ! -f "mock-api-server.js" ]; then
    log_error "mock-api-server.js not found!"
    exit 1
  fi
  
  node mock-api-server.js > "$LOG_DIR/mock-api.log" 2>&1 &
  API_PID=$!
  PIDS+=($API_PID)
  log_info "Mock API Server started (PID: $API_PID)"
  
  # Wait for Mock API server
  if ! wait_for_service "http://localhost:$MOCK_API_PORT/health" "Mock API Server" 20; then
    log_error "Mock API Server failed to start. Check logs at: $LOG_DIR/mock-api.log"
    tail -n 20 "$LOG_DIR/mock-api.log"
    exit 1
  fi
fi

# Start Frontend Service
log_info "Starting Frontend Service..."
cd /workspaces/personalEA/testing/goal-strategy-test

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  log_info "Installing frontend dependencies..."
  npm install > "$LOG_DIR/frontend-install.log" 2>&1
fi

# Start frontend
npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
PIDS+=($FRONTEND_PID)
log_info "Frontend started (PID: $FRONTEND_PID)"

# Wait for frontend to be healthy
if ! wait_for_service "http://localhost:$FRONTEND_PORT" "Frontend Service" 30; then
  log_error "Frontend service failed to start. Check logs at: $LOG_DIR/frontend.log"
  tail -n 20 "$LOG_DIR/frontend.log"
  exit 1
fi

# All services started successfully
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}║         🎉 All Services Started Successfully! 🎉            ║${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Service URLs:${NC}"
echo -e "  Frontend:        ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  Backend API:     ${GREEN}http://localhost:$BACKEND_PORT${NC}"
echo -e "  Backend Health:  ${GREEN}http://localhost:$BACKEND_PORT/health${NC}"
echo -e "  $API_MODE API:      ${GREEN}http://localhost:$API_PORT${NC}"
echo ""
echo -e "${BLUE}Process Information:${NC}"
echo -e "  Backend PID:     $BACKEND_PID"
echo -e "  $API_MODE API PID:  $API_PID"
echo -e "  Frontend PID:    $FRONTEND_PID"
echo ""
echo -e "${BLUE}Log Files:${NC}"
echo -e "  Backend:         $LOG_DIR/backend.log"
echo -e "  $API_MODE API:      $LOG_DIR/$([ "$USE_OPENAI" = true ] && echo "openai-api.log" || echo "mock-api.log")"
echo -e "  Frontend:        $LOG_DIR/frontend.log"
echo ""
echo -e "${YELLOW}Commands:${NC}"
echo -e "  Stop all:        ${GREEN}Press Ctrl+C${NC}"
echo -e "  View logs:       ${GREEN}tail -f $LOG_DIR/*.log${NC}"
echo -e "  Backend logs:    ${GREEN}tail -f $LOG_DIR/backend.log${NC}"
echo -e "  Frontend logs:   ${GREEN}tail -f $LOG_DIR/frontend.log${NC}"
echo ""

# Keep script running and show logs if debug mode
if [ "$DEBUG" = true ]; then
  log_info "Debug mode enabled. Showing combined logs..."
  tail -f "$LOG_DIR"/*.log
else
  log_info "Services are running. Press Ctrl+C to stop all services."
  # Wait for all background processes
  wait
fi