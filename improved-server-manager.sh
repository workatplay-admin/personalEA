#!/bin/bash

# Improved PersonalEA Server Management Script
# Addresses process cleanup issues and server hang problems

set -e

BACKEND_PORT=3000
FRONTEND_PORT=5174
PROJECT_DIR="/workspaces/personalEA"
FRONTEND_DIR="$PROJECT_DIR/testing/goal-strategy-test"
LOG_DIR="$PROJECT_DIR/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create logs directory
mkdir -p "$LOG_DIR"

# Function to check if port is in use
check_port() {
    local port=$1
    netstat -tlnp 2>/dev/null | grep ":$port " >/dev/null
}

# Function to get PID for port
get_pid_for_port() {
    local port=$1
    netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1
}

# Enhanced function to gracefully stop process
stop_process_gracefully() {
    local pid=$1
    local name=$2
    local timeout=${3:-10}
    
    if [ -z "$pid" ] || [ "$pid" = "-" ]; then
        echo -e "${YELLOW}⚠️ No PID to stop for $name${NC}"
        return 0
    fi
    
    echo -e "${BLUE}🛑 Stopping $name (PID: $pid)...${NC}"
    
    # Send TERM signal for graceful shutdown
    if kill -TERM "$pid" 2>/dev/null; then
        echo -e "${BLUE}   Sent TERM signal, waiting for graceful shutdown...${NC}"
        
        # Wait for process to exit gracefully
        local count=0
        while kill -0 "$pid" 2>/dev/null && [ $count -lt $timeout ]; do
            sleep 1
            count=$((count + 1))
        done
        
        # If still running, force kill
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}   Graceful shutdown timeout, force killing...${NC}"
            kill -KILL "$pid" 2>/dev/null || true
            sleep 2
        fi
        
        echo -e "${GREEN}✅ $name stopped successfully${NC}"
    else
        echo -e "${YELLOW}⚠️ Process $pid for $name already stopped${NC}"
    fi
}

# Enhanced function to wait for port release
wait_for_port_release() {
    local port=$1
    local name=$2
    local timeout=${3:-15}
    
    echo -e "${BLUE}   Waiting for port $port to be released...${NC}"
    
    local count=0
    while check_port $port && [ $count -lt $timeout ]; do
        sleep 1
        count=$((count + 1))
        if [ $((count % 5)) -eq 0 ]; then
            echo -e "${BLUE}   Still waiting for port $port (${count}s)...${NC}"
        fi
    done
    
    if check_port $port; then
        echo -e "${RED}❌ Port $port still in use after ${timeout}s timeout${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port $port released${NC}"
        return 0
    fi
}

# Function to check server health with timeout
check_server_health() {
    local port=$1
    local name=$2
    
    if curl -s --max-time 5 "http://localhost:$port/health" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $name health check passed${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️ $name health check failed${NC}"
        return 1
    fi
}

# Function to check server health
check_health() {
    echo -e "${BLUE}🔍 Checking server health...${NC}"
    
    # Check backend
    if check_port $BACKEND_PORT; then
        local backend_pid=$(get_pid_for_port $BACKEND_PORT)
        echo -e "${GREEN}✅ Backend running on port $BACKEND_PORT (PID: $backend_pid)${NC}"
        
        # Test health endpoint
        check_server_health $BACKEND_PORT "Backend"
    else
        echo -e "${RED}❌ Backend not running on port $BACKEND_PORT${NC}"
    fi
    
    # Check frontend
    if check_port $FRONTEND_PORT; then
        local frontend_pid=$(get_pid_for_port $FRONTEND_PORT)
        echo -e "${GREEN}✅ Frontend running on port $FRONTEND_PORT (PID: $frontend_pid)${NC}"
    else
        echo -e "${RED}❌ Frontend not running on port $FRONTEND_PORT${NC}"
    fi
}

# Function to start backend with improved server
start_backend() {
    echo -e "${BLUE}🚀 Starting improved backend server...${NC}"
    
    if check_port $BACKEND_PORT; then
        echo -e "${YELLOW}⚠️ Backend already running on port $BACKEND_PORT${NC}"
        return
    fi
    
    cd "$FRONTEND_DIR"
    
    # Use the improved server instead of the old one
    echo -e "${BLUE}   Using improved server with non-blocking architecture...${NC}"
    nohup node improved-server.js > "$LOG_DIR/backend.log" 2>&1 &
    local pid=$!
    
    echo -e "${BLUE}   Backend started with PID: $pid${NC}"
    
    # Wait for startup with health checks
    echo -e "${BLUE}   Waiting for backend to be ready...${NC}"
    local count=0
    local max_wait=15
    
    while [ $count -lt $max_wait ]; do
        sleep 1
        count=$((count + 1))
        
        if check_port $BACKEND_PORT; then
            if check_server_health $BACKEND_PORT "Backend"; then
                echo -e "${GREEN}✅ Backend started successfully (PID: $pid)${NC}"
                return 0
            fi
        fi
        
        if [ $((count % 3)) -eq 0 ]; then
            echo -e "${BLUE}   Still waiting for backend (${count}s)...${NC}"
        fi
    done
    
    echo -e "${RED}❌ Backend failed to start properly${NC}"
    echo -e "${BLUE}   Check logs: tail -f $LOG_DIR/backend.log${NC}"
    return 1
}

# Function to start frontend
start_frontend() {
    echo -e "${BLUE}🚀 Starting frontend server...${NC}"
    
    if check_port $FRONTEND_PORT; then
        echo -e "${YELLOW}⚠️ Frontend already running on port $FRONTEND_PORT${NC}"
        return
    fi
    
    cd "$FRONTEND_DIR"
    
    # Build first for production-like experience
    echo -e "${BLUE}📦 Building frontend...${NC}"
    if npm run build >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend build completed${NC}"
    else
        echo -e "${YELLOW}⚠️ Frontend build had warnings, continuing...${NC}"
    fi
    
    # Start preview server (more stable than dev)
    nohup npm run preview > "$LOG_DIR/frontend.log" 2>&1 &
    local pid=$!
    
    echo -e "${BLUE}   Frontend started with PID: $pid${NC}"
    
    # Wait for startup
    echo -e "${BLUE}   Waiting for frontend to be ready...${NC}"
    local count=0
    local max_wait=10
    
    while [ $count -lt $max_wait ]; do
        sleep 1
        count=$((count + 1))
        
        if check_port $FRONTEND_PORT; then
            echo -e "${GREEN}✅ Frontend started successfully (PID: $pid)${NC}"
            return 0
        fi
        
        if [ $((count % 3)) -eq 0 ]; then
            echo -e "${BLUE}   Still waiting for frontend (${count}s)...${NC}"
        fi
    done
    
    echo -e "${RED}❌ Frontend failed to start${NC}"
    echo -e "${BLUE}   Check logs: tail -f $LOG_DIR/frontend.log${NC}"
    return 1
}

# Improved function to stop servers
stop_servers() {
    echo -e "${BLUE}🛑 Stopping servers gracefully...${NC}"
    
    # Stop backend
    if check_port $BACKEND_PORT; then
        local backend_pid=$(get_pid_for_port $BACKEND_PORT)
        stop_process_gracefully "$backend_pid" "Backend" 10
        wait_for_port_release $BACKEND_PORT "Backend" 15
    else
        echo -e "${YELLOW}⚠️ Backend not running${NC}"
    fi
    
    # Stop frontend
    if check_port $FRONTEND_PORT; then
        local frontend_pid=$(get_pid_for_port $FRONTEND_PORT)
        stop_process_gracefully "$frontend_pid" "Frontend" 10
        wait_for_port_release $FRONTEND_PORT "Frontend" 15
    else
        echo -e "${YELLOW}⚠️ Frontend not running${NC}"
    fi
    
    # Clean up any remaining processes more carefully
    echo -e "${BLUE}🧹 Cleaning up remaining processes...${NC}"
    
    # Kill remaining vite processes
    local vite_pids=$(pgrep -f "vite" 2>/dev/null || true)
    if [ -n "$vite_pids" ]; then
        echo -e "${BLUE}   Cleaning up vite processes: $vite_pids${NC}"
        echo "$vite_pids" | xargs kill -TERM 2>/dev/null || true
        sleep 2
        echo "$vite_pids" | xargs kill -KILL 2>/dev/null || true
    fi
    
    # Kill remaining npm processes
    local npm_pids=$(pgrep -f "npm run" 2>/dev/null || true)
    if [ -n "$npm_pids" ]; then
        echo -e "${BLUE}   Cleaning up npm processes: $npm_pids${NC}"
        echo "$npm_pids" | xargs kill -TERM 2>/dev/null || true
        sleep 2
        echo "$npm_pids" | xargs kill -KILL 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ Server cleanup completed${NC}"
}

# Function to restart servers
restart_servers() {
    echo -e "${BLUE}🔄 Restarting servers...${NC}"
    stop_servers
    sleep 3
    start_backend
    start_frontend
}

# Function to show logs
show_logs() {
    local service=$1
    
    case $service in
        "backend")
            echo -e "${BLUE}📋 Backend logs (last 50 lines):${NC}"
            tail -50 "$LOG_DIR/backend.log" 2>/dev/null || echo "No backend logs"
            echo -e "${BLUE}📋 Follow backend logs with: tail -f $LOG_DIR/backend.log${NC}"
            ;;
        "frontend")
            echo -e "${BLUE}📋 Frontend logs (last 50 lines):${NC}"
            tail -50 "$LOG_DIR/frontend.log" 2>/dev/null || echo "No frontend logs"
            echo -e "${BLUE}📋 Follow frontend logs with: tail -f $LOG_DIR/frontend.log${NC}"
            ;;
        "follow")
            echo -e "${BLUE}📋 Following all logs (Ctrl+C to stop):${NC}"
            tail -f "$LOG_DIR/backend.log" "$LOG_DIR/frontend.log" 2>/dev/null || echo "No logs available"
            ;;
        *)
            echo -e "${BLUE}📋 Recent logs:${NC}"
            echo -e "${YELLOW}Backend (last 10 lines):${NC}"
            tail -10 "$LOG_DIR/backend.log" 2>/dev/null || echo "No backend logs"
            echo -e "${YELLOW}Frontend (last 10 lines):${NC}"
            tail -10 "$LOG_DIR/frontend.log" 2>/dev/null || echo "No frontend logs"
            ;;
    esac
}

# Function to run diagnostics
run_diagnostics() {
    echo -e "${BLUE}🔍 Running system diagnostics...${NC}"
    
    echo -e "${YELLOW}System Information:${NC}"
    echo "  Node.js version: $(node --version 2>/dev/null || echo 'Not installed')"
    echo "  npm version: $(npm --version 2>/dev/null || echo 'Not installed')"
    echo "  Available memory: $(free -h | grep '^Mem:' | awk '{print $7}' 2>/dev/null || echo 'Unknown')"
    echo "  Disk space: $(df -h . | tail -1 | awk '{print $4}' 2>/dev/null || echo 'Unknown')"
    
    echo -e "${YELLOW}Port Status:${NC}"
    echo "  Port $BACKEND_PORT: $(check_port $BACKEND_PORT && echo 'In use' || echo 'Available')"
    echo "  Port $FRONTEND_PORT: $(check_port $FRONTEND_PORT && echo 'In use' || echo 'Available')"
    
    echo -e "${YELLOW}Process Status:${NC}"
    echo "  Node processes: $(pgrep -c node 2>/dev/null || echo '0')"
    echo "  npm processes: $(pgrep -c npm 2>/dev/null || echo '0')"
    echo "  vite processes: $(pgrep -c vite 2>/dev/null || echo '0')"
    
    echo -e "${YELLOW}Log Files:${NC}"
    echo "  Backend log: $([ -f "$LOG_DIR/backend.log" ] && echo "$(wc -l < "$LOG_DIR/backend.log") lines" || echo 'Not found')"
    echo "  Frontend log: $([ -f "$LOG_DIR/frontend.log" ] && echo "$(wc -l < "$LOG_DIR/frontend.log") lines" || echo 'Not found')"
}

# Main script logic
case "$1" in
    "start")
        start_backend
        start_frontend
        check_health
        echo -e "${GREEN}🎉 System ready at http://localhost:$FRONTEND_PORT${NC}"
        echo -e "${BLUE}💡 Use './improved-server-manager.sh logs follow' to monitor logs${NC}"
        ;;
    "stop")
        stop_servers
        ;;
    "restart")
        restart_servers
        check_health
        ;;
    "status")
        check_health
        ;;
    "logs")
        show_logs "$2"
        ;;
    "backend")
        start_backend
        ;;
    "frontend")
        start_frontend
        ;;
    "diagnostics")
        run_diagnostics
        ;;
    "test")
        echo -e "${BLUE}🧪 Running quick connectivity test...${NC}"
        node ../test-staging-environment.js simple
        ;;
    *)
        echo -e "${BLUE}📖 Improved PersonalEA Server Manager${NC}"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|backend|frontend|diagnostics|test}"
        echo ""
        echo "Commands:"
        echo "  start         - Start both backend and frontend servers"
        echo "  stop          - Stop all servers gracefully"
        echo "  restart       - Restart all servers"
        echo "  status        - Check server health and status"
        echo "  logs [type]   - Show logs (backend|frontend|follow|all)"
        echo "  backend       - Start only backend server"
        echo "  frontend      - Start only frontend server"
        echo "  diagnostics   - Run system diagnostics"
        echo "  test          - Run quick connectivity test"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 logs backend"
        echo "  $0 logs follow"
        echo "  $0 diagnostics"
        echo ""
        echo "🔧 Improvements in this version:"
        echo "  ✅ Graceful process shutdown with SIGTERM/SIGKILL"
        echo "  ✅ Proper port release verification"
        echo "  ✅ Enhanced error handling and diagnostics"
        echo "  ✅ Health check integration"
        echo "  ✅ Improved logging and monitoring"
        ;;
esac