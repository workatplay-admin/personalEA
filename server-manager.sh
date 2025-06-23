#!/bin/bash

# PersonalEA Server Management Script
# Provides reliable start/stop/restart/status commands

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

# Function to check server health
check_health() {
    echo -e "${BLUE}🔍 Checking server health...${NC}"
    
    # Check backend
    if check_port $BACKEND_PORT; then
        local backend_pid=$(get_pid_for_port $BACKEND_PORT)
        echo -e "${GREEN}✅ Backend running on port $BACKEND_PORT (PID: $backend_pid)${NC}"
        
        # Test health endpoint
        if curl -s "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend health check passed${NC}"
        else
            echo -e "${YELLOW}⚠️ Backend health check failed${NC}"
        fi
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

# Function to start backend
start_backend() {
    echo -e "${BLUE}🚀 Starting backend server...${NC}"
    
    if check_port $BACKEND_PORT; then
        echo -e "${YELLOW}⚠️ Backend already running on port $BACKEND_PORT${NC}"
        return
    fi
    
    cd "$FRONTEND_DIR"
    nohup node openai-api-server.js > "$LOG_DIR/backend.log" 2>&1 &
    local pid=$!
    
    # Wait for startup
    sleep 3
    
    if check_port $BACKEND_PORT; then
        echo -e "${GREEN}✅ Backend started successfully (PID: $pid)${NC}"
    else
        echo -e "${RED}❌ Backend failed to start${NC}"
        return 1
    fi
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
    npm run build >/dev/null 2>&1
    
    # Start preview server (more stable than dev)
    nohup npm run preview > "$LOG_DIR/frontend.log" 2>&1 &
    local pid=$!
    
    # Wait for startup
    sleep 5
    
    if check_port $FRONTEND_PORT; then
        echo -e "${GREEN}✅ Frontend started successfully (PID: $pid)${NC}"
    else
        echo -e "${RED}❌ Frontend failed to start${NC}"
        return 1
    fi
}

# Function to stop servers
stop_servers() {
    echo -e "${BLUE}🛑 Stopping servers...${NC}"
    
    # Stop backend
    if check_port $BACKEND_PORT; then
        local backend_pid=$(get_pid_for_port $BACKEND_PORT)
        kill $backend_pid 2>/dev/null || true
        echo -e "${GREEN}✅ Backend stopped${NC}"
    fi
    
    # Stop frontend
    if check_port $FRONTEND_PORT; then
        local frontend_pid=$(get_pid_for_port $FRONTEND_PORT)
        kill $frontend_pid 2>/dev/null || true
        echo -e "${GREEN}✅ Frontend stopped${NC}"
    fi
    
    # Kill any remaining npm/vite processes
    pkill -f "vite" 2>/dev/null || true
    pkill -f "npm run" 2>/dev/null || true
}

# Function to restart servers
restart_servers() {
    echo -e "${BLUE}🔄 Restarting servers...${NC}"
    stop_servers
    sleep 2
    start_backend
    start_frontend
}

# Function to show logs
show_logs() {
    local service=$1
    
    case $service in
        "backend")
            echo -e "${BLUE}📋 Backend logs:${NC}"
            tail -f "$LOG_DIR/backend.log"
            ;;
        "frontend")
            echo -e "${BLUE}📋 Frontend logs:${NC}"
            tail -f "$LOG_DIR/frontend.log"
            ;;
        *)
            echo -e "${BLUE}📋 All logs:${NC}"
            echo -e "${YELLOW}Backend:${NC}"
            tail -10 "$LOG_DIR/backend.log" 2>/dev/null || echo "No backend logs"
            echo -e "${YELLOW}Frontend:${NC}"
            tail -10 "$LOG_DIR/frontend.log" 2>/dev/null || echo "No frontend logs"
            ;;
    esac
}

# Main script logic
case "$1" in
    "start")
        start_backend
        start_frontend
        check_health
        echo -e "${GREEN}🎉 System ready at http://localhost:$FRONTEND_PORT${NC}"
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
    *)
        echo -e "${BLUE}📖 PersonalEA Server Manager${NC}"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|backend|frontend}"
        echo ""
        echo "Commands:"
        echo "  start     - Start both backend and frontend servers"
        echo "  stop      - Stop all servers"
        echo "  restart   - Restart all servers"
        echo "  status    - Check server health and status"
        echo "  logs      - Show recent logs (backend|frontend|all)"
        echo "  backend   - Start only backend server"
        echo "  frontend  - Start only frontend server"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 logs backend"
        echo "  $0 status"
        ;;
esac