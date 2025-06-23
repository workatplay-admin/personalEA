#!/bin/bash

# PersonalEA Health Monitor - Automatic restart on failure
# Run this as a background process to monitor server health

set -e

BACKEND_PORT=3000
FRONTEND_PORT=5174
CHECK_INTERVAL=30  # Check every 30 seconds
MAX_FAILURES=3    # Restart after 3 consecutive failures
LOG_DIR="/workspaces/personalEA/logs"
MANAGER_SCRIPT="/workspaces/personalEA/server-manager.sh"

# Create logs directory
mkdir -p "$LOG_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
backend_failures=0
frontend_failures=0

log_message() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" | tee -a "$LOG_DIR/health-monitor.log"
}

# Function to check if port is responding
check_port_health() {
    local port=$1
    netstat -tlnp 2>/dev/null | grep ":$port " >/dev/null
}

# Function to check backend API health
check_backend_api() {
    curl -s --max-time 5 "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1
}

# Function to restart service
restart_service() {
    local service="$1"
    log_message "🔄 Restarting $service due to health check failure"
    
    case $service in
        "backend")
            $MANAGER_SCRIPT backend
            ;;
        "frontend")
            $MANAGER_SCRIPT frontend
            ;;
        "both")
            $MANAGER_SCRIPT restart
            ;;
    esac
}

# Main monitoring loop
monitor_health() {
    log_message "🔍 Health monitor started (checking every ${CHECK_INTERVAL}s)"
    
    while true; do
        # Check backend
        if check_port_health $BACKEND_PORT && check_backend_api; then
            if [ $backend_failures -gt 0 ]; then
                log_message "✅ Backend recovered"
                backend_failures=0
            fi
        else
            backend_failures=$((backend_failures + 1))
            log_message "❌ Backend health check failed ($backend_failures/$MAX_FAILURES)"
            
            if [ $backend_failures -ge $MAX_FAILURES ]; then
                restart_service "backend"
                backend_failures=0
            fi
        fi
        
        # Check frontend
        if check_port_health $FRONTEND_PORT; then
            if [ $frontend_failures -gt 0 ]; then
                log_message "✅ Frontend recovered"
                frontend_failures=0
            fi
        else
            frontend_failures=$((frontend_failures + 1))
            log_message "❌ Frontend health check failed ($frontend_failures/$MAX_FAILURES)"
            
            if [ $frontend_failures -ge $MAX_FAILURES ]; then
                restart_service "frontend"
                frontend_failures=0
            fi
        fi
        
        sleep $CHECK_INTERVAL
    done
}

# Handle script termination
cleanup() {
    log_message "🛑 Health monitor stopping"
    exit 0
}

trap cleanup INT TERM

case "$1" in
    "start")
        # Start in background
        nohup $0 monitor > "$LOG_DIR/health-monitor.log" 2>&1 &
        echo $! > "$LOG_DIR/health-monitor.pid"
        echo -e "${GREEN}✅ Health monitor started (PID: $!)${NC}"
        echo -e "${BLUE}📋 Monitor logs: tail -f $LOG_DIR/health-monitor.log${NC}"
        ;;
    "stop")
        if [ -f "$LOG_DIR/health-monitor.pid" ]; then
            local pid=$(cat "$LOG_DIR/health-monitor.pid")
            kill $pid 2>/dev/null || true
            rm -f "$LOG_DIR/health-monitor.pid"
            echo -e "${GREEN}✅ Health monitor stopped${NC}"
        else
            echo -e "${YELLOW}⚠️ Health monitor not running${NC}"
        fi
        ;;
    "monitor")
        # Internal command - run monitoring loop
        monitor_health
        ;;
    "status")
        if [ -f "$LOG_DIR/health-monitor.pid" ]; then
            local pid=$(cat "$LOG_DIR/health-monitor.pid")
            if ps -p $pid > /dev/null 2>&1; then
                echo -e "${GREEN}✅ Health monitor running (PID: $pid)${NC}"
            else
                echo -e "${RED}❌ Health monitor not running (stale PID file)${NC}"
                rm -f "$LOG_DIR/health-monitor.pid"
            fi
        else
            echo -e "${RED}❌ Health monitor not running${NC}"
        fi
        ;;
    *)
        echo -e "${BLUE}📖 PersonalEA Health Monitor${NC}"
        echo ""
        echo "Usage: $0 {start|stop|status}"
        echo ""
        echo "Commands:"
        echo "  start   - Start health monitoring in background"
        echo "  stop    - Stop health monitoring"
        echo "  status  - Check if monitor is running"
        echo ""
        echo "The monitor will:"
        echo "  • Check backend API health every ${CHECK_INTERVAL} seconds"
        echo "  • Check frontend port availability"
        echo "  • Auto-restart services after $MAX_FAILURES consecutive failures"
        echo "  • Log all activity to $LOG_DIR/health-monitor.log"
        ;;
esac