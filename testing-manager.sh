#!/bin/bash
set -euo pipefail

# =============================================================================
# PersonalEA Testing Manager
# =============================================================================
# Simple utility for managing the PersonalEA testing infrastructure
# Usage: ./testing-manager.sh [command]
# Commands:
#   start [--mock|--openai]  Start all testing services
#   stop                     Stop all testing services
#   restart [--mock|--openai] Restart all testing services
#   status                   Show status of all services
#   logs [service]           Show logs for all services or specific service
#   health                   Check health of all services
#   ports                    Check which ports are in use
#   clean                    Clean up logs and temporary files
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="/workspaces/personalEA"
LOG_DIR="/workspaces/personalEA/logs/testing"
UNIFIED_SCRIPT="$SCRIPT_DIR/start-unified-testing.sh"

# Service ports
FRONTEND_PORT=5174
BACKEND_PORT=8085
MOCK_API_PORT=3000
OPENAI_API_PORT=8086

# Logging functions
log_info() {
  echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[$(date +'%H:%M:%S')] ✅ $1${NC}"
}

log_error() {
  echo -e "${RED}[$(date +'%H:%M:%S')] ❌ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️  $1${NC}"
}

# Function to check if a port is in use
check_port() {
  local port=$1
  local service_name=$2
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    local pid=$(lsof -ti :$port 2>/dev/null || echo "unknown")
    echo -e "  ${GREEN}$service_name${NC} (Port $port): ${GREEN}RUNNING${NC} (PID: $pid)"
    return 0
  else
    echo -e "  ${RED}$service_name${NC} (Port $port): ${RED}STOPPED${NC}"
    return 1
  fi
}

# Function to check service health
check_health() {
  local url=$1
  local service_name=$2
  if curl -s "$url" > /dev/null 2>&1; then
    echo -e "  ${GREEN}$service_name${NC}: ${GREEN}HEALTHY${NC}"
    return 0
  else
    echo -e "  ${RED}$service_name${NC}: ${RED}UNHEALTHY${NC}"
    return 1
  fi
}

# Command handlers
cmd_start() {
  local mode_flag=""
  if [[ "${1:-}" == "--openai" ]]; then
    mode_flag="--openai"
    log_info "Starting services with OpenAI integration..."
  elif [[ "${1:-}" == "--mock" ]]; then
    mode_flag="--mock"
    log_info "Starting services with mock API..."
  else
    mode_flag="--mock"
    log_info "Starting services with mock API (default)..."
  fi
  
  if [ ! -f "$UNIFIED_SCRIPT" ]; then
    log_error "Unified testing script not found at: $UNIFIED_SCRIPT"
    exit 1
  fi
  
  "$UNIFIED_SCRIPT" $mode_flag
}

cmd_stop() {
  log_info "Stopping all testing services..."
  
  # Kill processes by port
  for port in $FRONTEND_PORT $BACKEND_PORT $MOCK_API_PORT $OPENAI_API_PORT; do
    local pids=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
      kill -TERM $pids 2>/dev/null || true
      sleep 1
      # Force kill if still running
      kill -9 $pids 2>/dev/null || true
    fi
  done
  
  # Additional cleanup
  pkill -f "npm run dev" 2>/dev/null || true
  pkill -f "tsx watch" 2>/dev/null || true
  pkill -f "node.*mock-api-server" 2>/dev/null || true
  pkill -f "node.*openai-api-server" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true
  
  log_success "All services stopped"
}

cmd_restart() {
  log_info "Restarting testing services..."
  cmd_stop
  sleep 2
  cmd_start "$@"
}

cmd_status() {
  log_info "Checking service status..."
  echo ""
  
  local all_running=true
  
  if ! check_port $FRONTEND_PORT "Frontend"; then all_running=false; fi
  if ! check_port $BACKEND_PORT "Backend API"; then all_running=false; fi
  if ! check_port $MOCK_API_PORT "Mock API" && ! check_port $OPENAI_API_PORT "OpenAI API"; then 
    echo -e "  ${RED}API Server${NC}: ${RED}STOPPED${NC}"
    all_running=false
  fi
  
  echo ""
  if [ "$all_running" = true ]; then
    log_success "All services are running"
  else
    log_warning "Some services are not running"
  fi
}

cmd_logs() {
  local service="${1:-all}"
  
  if [ ! -d "$LOG_DIR" ]; then
    log_error "Log directory not found: $LOG_DIR"
    exit 1
  fi
  
  case $service in
    "all")
      log_info "Showing all service logs (Ctrl+C to exit)..."
      tail -f "$LOG_DIR"/*.log 2>/dev/null || log_warning "No log files found"
      ;;
    "frontend")
      log_info "Showing frontend logs (Ctrl+C to exit)..."
      tail -f "$LOG_DIR/frontend.log" 2>/dev/null || log_error "Frontend log not found"
      ;;
    "backend")
      log_info "Showing backend logs (Ctrl+C to exit)..."
      tail -f "$LOG_DIR/backend.log" 2>/dev/null || log_error "Backend log not found"
      ;;
    "api"|"mock")
      log_info "Showing API logs (Ctrl+C to exit)..."
      tail -f "$LOG_DIR/mock-api.log" "$LOG_DIR/openai-api.log" 2>/dev/null || log_error "API logs not found"
      ;;
    *)
      log_error "Unknown service: $service"
      echo "Available services: all, frontend, backend, api, mock"
      exit 1
      ;;
  esac
}

cmd_health() {
  log_info "Checking service health..."
  echo ""
  
  local all_healthy=true
  
  if ! check_health "http://localhost:$FRONTEND_PORT" "Frontend"; then all_healthy=false; fi
  if ! check_health "http://localhost:$BACKEND_PORT/health" "Backend API"; then all_healthy=false; fi
  
  # Check which API server is running
  if check_port $OPENAI_API_PORT "temp" > /dev/null 2>&1; then
    if ! check_health "http://localhost:$OPENAI_API_PORT/health" "OpenAI API"; then all_healthy=false; fi
  elif check_port $MOCK_API_PORT "temp" > /dev/null 2>&1; then
    if ! check_health "http://localhost:$MOCK_API_PORT/health" "Mock API"; then all_healthy=false; fi
  else
    echo -e "  ${RED}API Server${NC}: ${RED}NOT RUNNING${NC}"
    all_healthy=false
  fi
  
  echo ""
  if [ "$all_healthy" = true ]; then
    log_success "All services are healthy"
  else
    log_warning "Some services are unhealthy"
  fi
}

cmd_ports() {
  log_info "Checking port usage..."
  echo ""
  
  check_port $FRONTEND_PORT "Frontend" || true
  check_port $BACKEND_PORT "Backend API" || true
  check_port $MOCK_API_PORT "Mock API" || true
  check_port $OPENAI_API_PORT "OpenAI API" || true
}

cmd_clean() {
  log_info "Cleaning up logs and temporary files..."
  
  if [ -d "$LOG_DIR" ]; then
    rm -rf "$LOG_DIR"/*
    log_success "Logs cleaned"
  fi
  
  # Clean up node_modules/.cache if it exists
  if [ -d "/workspaces/personalEA/testing/goal-strategy-test/node_modules/.cache" ]; then
    rm -rf "/workspaces/personalEA/testing/goal-strategy-test/node_modules/.cache"
    log_success "Frontend cache cleaned"
  fi
  
  if [ -d "/workspaces/personalEA/services/goal-strategy/node_modules/.cache" ]; then
    rm -rf "/workspaces/personalEA/services/goal-strategy/node_modules/.cache"
    log_success "Backend cache cleaned"
  fi
  
  log_success "Cleanup completed"
}

cmd_help() {
  echo -e "${BLUE}PersonalEA Testing Manager${NC}"
  echo ""
  echo "Usage: $0 [command] [options]"
  echo ""
  echo "Commands:"
  echo "  start [--mock|--openai]   Start all testing services"
  echo "  stop                      Stop all testing services"
  echo "  restart [--mock|--openai] Restart all testing services"
  echo "  status                    Show status of all services"
  echo "  logs [service]            Show logs (services: all, frontend, backend, api)"
  echo "  health                    Check health of all services"
  echo "  ports                     Check which ports are in use"
  echo "  clean                     Clean up logs and temporary files"
  echo "  help                      Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0 start --mock          Start with mock API"
  echo "  $0 start --openai        Start with OpenAI integration"
  echo "  $0 logs frontend         Show frontend logs"
  echo "  $0 health               Check all service health"
}

# Main command dispatcher
main() {
  local command="${1:-help}"
  
  case $command in
    "start")
      shift
      cmd_start "$@"
      ;;
    "stop")
      cmd_stop
      ;;
    "restart")
      shift
      cmd_restart "$@"
      ;;
    "status")
      cmd_status
      ;;
    "logs")
      shift
      cmd_logs "$@"
      ;;
    "health")
      cmd_health
      ;;
    "ports")
      cmd_ports
      ;;
    "clean")
      cmd_clean
      ;;
    "help"|"-h"|"--help")
      cmd_help
      ;;
    *)
      log_error "Unknown command: $command"
      echo ""
      cmd_help
      exit 1
      ;;
  esac
}

# Run main function
main "$@"