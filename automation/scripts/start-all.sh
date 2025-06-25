#!/bin/bash

# PersonalEA Comprehensive Startup Script
# One-command startup with health checks and self-healing

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
PID_DIR="$PROJECT_ROOT/.pids"

# Service ports
BACKEND_PORT=8085
OPENAI_API_PORT=8086
FRONTEND_PORT=5174

# Logging setup
mkdir -p "$LOG_DIR" "$PID_DIR"

log() {
    echo -e "${2:-$BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_DIR/startup.log"
}

error() {
    log "$1" "$RED"
}

success() {
    log "$1" "$GREEN"
}

warning() {
    log "$1" "$YELLOW"
}

# Service check functions
check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        warning "Port $port already in use (expected for $service)"
        return 0
    else
        return 1
    fi
}

wait_for_service() {
    local port=$1
    local service=$2
    local timeout=${3:-30}
    local elapsed=0
    
    log "Waiting for $service on port $port..."
    
    while [ $elapsed -lt $timeout ]; do
        if check_port $port $service; then
            success "$service is ready on port $port"
            return 0
        fi
        sleep 1
        ((elapsed++))
    done
    
    error "$service failed to start on port $port within $timeout seconds"
    return 1
}

cleanup_processes() {
    log "Cleaning up existing processes..."
    
    # Kill processes by port
    for port in $BACKEND_PORT $OPENAI_API_PORT $FRONTEND_PORT; do
        if check_port $port "cleanup"; then
            local pid=$(lsof -ti:$port)
            if [ ! -z "$pid" ]; then
                log "Killing process on port $port (PID: $pid)"
                kill -9 $pid 2>/dev/null || true
            fi
        fi
    done
    
    # Clean up PID files
    rm -f "$PID_DIR"/*.pid
    
    # Wait for ports to be released
    sleep 2
}

start_backend_service() {
    log "Starting Goal Strategy Backend Service..."
    
    cd "$PROJECT_ROOT/services/goal-strategy"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        log "Installing backend dependencies..."
        npm install
    fi
    
    # Start the service
    npm start > "$LOG_DIR/backend.log" 2>&1 &
    local pid=$!
    echo $pid > "$PID_DIR/backend.pid"
    
    # Wait for service to be ready
    if wait_for_service $BACKEND_PORT "Backend Service"; then
        # Test health endpoint
        if curl -s "http://localhost:$BACKEND_PORT/api/v1/health" | grep -q "ok"; then
            success "Backend Service health check passed"
            return 0
        else
            error "Backend Service health check failed"
            return 1
        fi
    else
        return 1
    fi
}

start_openai_api_server() {
    log "Starting OpenAI API Mock Server..."
    
    cd "$PROJECT_ROOT/testing/goal-strategy-test"
    
    # Use the working OpenAI server
    node openai-api-server.js > "$LOG_DIR/openai-api.log" 2>&1 &
    local pid=$!
    echo $pid > "$PID_DIR/openai-api.pid"
    
    # Wait for service to be ready
    if wait_for_service $OPENAI_API_PORT "OpenAI API Server"; then
        # Test API endpoint
        if curl -s -X POST "http://localhost:$OPENAI_API_PORT/api/v1/generate-jwt" \
            -H "Content-Type: application/json" \
            -d '{"apiKey":"sk-test123456789"}' | grep -q "jwt"; then
            success "OpenAI API Server validation passed"
            return 0
        else
            error "OpenAI API Server validation failed"
            return 1
        fi
    else
        return 1
    fi
}

start_frontend() {
    log "Starting Frontend Application..."
    
    cd "$PROJECT_ROOT/testing/goal-strategy-test"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        log "Installing frontend dependencies..."
        npm install
    fi
    
    # Start Vite dev server
    npm run dev -- --port $FRONTEND_PORT > "$LOG_DIR/frontend.log" 2>&1 &
    local pid=$!
    echo $pid > "$PID_DIR/frontend.pid"
    
    # Wait for service to be ready
    if wait_for_service $FRONTEND_PORT "Frontend"; then
        # Additional wait for Vite to fully initialize
        sleep 3
        
        # Test if frontend responds
        if curl -s "http://localhost:$FRONTEND_PORT" | grep -q "Goal Strategy"; then
            success "Frontend is ready and serving content"
            return 0
        else
            warning "Frontend is running but content check failed"
            return 0 # Still consider it success if port is open
        fi
    else
        return 1
    fi
}

verify_system_health() {
    log "Verifying system health..."
    
    local all_healthy=true
    
    # Check each service
    if ! check_port $BACKEND_PORT "Backend"; then
        error "Backend Service is not running"
        all_healthy=false
    fi
    
    if ! check_port $OPENAI_API_PORT "OpenAI API"; then
        error "OpenAI API Server is not running"
        all_healthy=false
    fi
    
    if ! check_port $FRONTEND_PORT "Frontend"; then
        error "Frontend is not running"
        all_healthy=false
    fi
    
    if [ "$all_healthy" = true ]; then
        success "All services are healthy"
        return 0
    else
        return 1
    fi
}

show_status() {
    echo
    echo "========================================"
    echo "PersonalEA System Status"
    echo "========================================"
    echo
    
    if check_port $BACKEND_PORT "Backend"; then
        echo -e "✅ Backend Service:    ${GREEN}Running${NC} on http://localhost:$BACKEND_PORT"
    else
        echo -e "❌ Backend Service:    ${RED}Not Running${NC}"
    fi
    
    if check_port $OPENAI_API_PORT "OpenAI API"; then
        echo -e "✅ OpenAI API Server:  ${GREEN}Running${NC} on http://localhost:$OPENAI_API_PORT"
    else
        echo -e "❌ OpenAI API Server:  ${RED}Not Running${NC}"
    fi
    
    if check_port $FRONTEND_PORT "Frontend"; then
        echo -e "✅ Frontend App:       ${GREEN}Running${NC} on http://localhost:$FRONTEND_PORT"
    else
        echo -e "❌ Frontend App:       ${RED}Not Running${NC}"
    fi
    
    echo
    echo "========================================"
    echo
    echo "📁 Logs are available in: $LOG_DIR"
    echo "🔍 To monitor logs: tail -f $LOG_DIR/*.log"
    echo "🛑 To stop all services: $SCRIPT_DIR/stop-all.sh"
    echo
}

main() {
    log "Starting PersonalEA System..."
    
    # Parse arguments
    local clean_start=false
    local skip_cleanup=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --clean)
                clean_start=true
                shift
                ;;
            --skip-cleanup)
                skip_cleanup=true
                shift
                ;;
            --help)
                echo "Usage: $0 [--clean] [--skip-cleanup]"
                echo "  --clean        Force cleanup of all existing processes"
                echo "  --skip-cleanup Skip automatic cleanup of existing processes"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Cleanup if requested or if not skipping
    if [ "$clean_start" = true ] || [ "$skip_cleanup" = false ]; then
        cleanup_processes
    fi
    
    # Start services
    local all_started=true
    
    if ! start_backend_service; then
        error "Failed to start Backend Service"
        all_started=false
    fi
    
    if ! start_openai_api_server; then
        error "Failed to start OpenAI API Server"
        all_started=false
    fi
    
    if ! start_frontend; then
        error "Failed to start Frontend"
        all_started=false
    fi
    
    # Verify system health
    if [ "$all_started" = true ]; then
        sleep 2
        if verify_system_health; then
            success "PersonalEA System started successfully!"
            show_status
            
            # Start monitoring in background
            "$SCRIPT_DIR/monitor-health.sh" &
            echo $! > "$PID_DIR/monitor.pid"
            
            exit 0
        else
            error "System health check failed"
            show_status
            exit 1
        fi
    else
        error "Failed to start all services"
        show_status
        exit 1
    fi
}

# Run main function
main "$@"