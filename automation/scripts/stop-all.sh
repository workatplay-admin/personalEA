#!/bin/bash

# PersonalEA System Shutdown Script

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PID_DIR="$PROJECT_ROOT/.pids"
LOG_DIR="$PROJECT_ROOT/logs"

log() {
    echo -e "${2:-$BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
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

stop_service() {
    local service_name=$1
    local pid_file="$PID_DIR/$service_name.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 $pid 2>/dev/null; then
            log "Stopping $service_name (PID: $pid)..."
            kill -TERM $pid 2>/dev/null || true
            
            # Wait for graceful shutdown
            local count=0
            while kill -0 $pid 2>/dev/null && [ $count -lt 10 ]; do
                sleep 1
                ((count++))
            done
            
            # Force kill if still running
            if kill -0 $pid 2>/dev/null; then
                warning "Force killing $service_name..."
                kill -9 $pid 2>/dev/null || true
            fi
            
            success "$service_name stopped"
        else
            warning "$service_name was not running (stale PID file)"
        fi
        rm -f "$pid_file"
    else
        log "$service_name was not tracked (no PID file)"
    fi
}

stop_by_port() {
    local port=$1
    local service=$2
    
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ ! -z "$pids" ]; then
        log "Stopping $service on port $port..."
        for pid in $pids; do
            kill -TERM $pid 2>/dev/null || true
        done
        sleep 2
        
        # Force kill if still running
        pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ ! -z "$pids" ]; then
            warning "Force killing remaining processes on port $port..."
            for pid in $pids; do
                kill -9 $pid 2>/dev/null || true
            done
        fi
        success "$service on port $port stopped"
    fi
}

main() {
    log "Stopping PersonalEA System..."
    
    # Stop monitor first
    stop_service "monitor"
    
    # Stop services by PID files
    stop_service "frontend"
    stop_service "openai-api"
    stop_service "backend"
    
    # Also stop by port in case PID files are missing
    stop_by_port 5174 "Frontend"
    stop_by_port 8086 "OpenAI API"
    stop_by_port 8085 "Backend"
    
    # Clean up PID directory
    rm -f "$PID_DIR"/*.pid
    
    success "PersonalEA System stopped"
    
    # Show final status
    echo
    echo "========================================"
    echo "System Status: All services stopped"
    echo "========================================"
    echo
    echo "📁 Logs are preserved in: $LOG_DIR"
    echo "🚀 To restart: $SCRIPT_DIR/start-all.sh"
    echo
}

main "$@"