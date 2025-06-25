#!/bin/bash

# PersonalEA Health Monitoring Script
# Continuous health monitoring with self-healing capabilities

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
MONITOR_LOG="$LOG_DIR/health-monitor.log"
ALERT_LOG="$LOG_DIR/health-alerts.log"

# Service configurations
BACKEND_PORT=8085
OPENAI_API_PORT=8086
FRONTEND_PORT=5174

# Monitoring intervals (seconds)
CHECK_INTERVAL=10
RESTART_DELAY=30
MAX_RESTART_ATTEMPTS=3

# State tracking
declare -A restart_counts
declare -A last_restart_time

# Initialize logs
mkdir -p "$LOG_DIR"
touch "$MONITOR_LOG" "$ALERT_LOG"

log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$MONITOR_LOG"
    
    if [ "$level" = "ERROR" ] || [ "$level" = "ALERT" ]; then
        echo "[$timestamp] [$level] $message" >> "$ALERT_LOG"
    fi
}

check_service_health() {
    local service_name=$1
    local port=$2
    local health_endpoint=$3
    
    # Check if port is listening
    if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        log "ERROR" "$service_name is not listening on port $port"
        return 1
    fi
    
    # Check health endpoint if provided
    if [ ! -z "$health_endpoint" ]; then
        local response=$(curl -s -o /dev/null -w "%{http_code}" "$health_endpoint" 2>/dev/null || echo "000")
        if [ "$response" != "200" ]; then
            log "ERROR" "$service_name health check failed (HTTP $response)"
            return 1
        fi
    fi
    
    return 0
}

check_api_connectivity() {
    # Test Backend API
    local backend_test=$(curl -s -X POST "http://localhost:$BACKEND_PORT/api/v1/goals/translate" \
        -H "Content-Type: application/json" \
        -d '{"raw_goal":"test"}' \
        -o /dev/null -w "%{http_code}" 2>/dev/null || echo "000")
    
    if [ "$backend_test" != "200" ] && [ "$backend_test" != "201" ]; then
        log "WARN" "Backend API test failed (HTTP $backend_test)"
        return 1
    fi
    
    # Test OpenAI API
    local openai_test=$(curl -s -X POST "http://localhost:$OPENAI_API_PORT/api/v1/generate-jwt" \
        -H "Content-Type: application/json" \
        -d '{"apiKey":"sk-test123"}' \
        -o /dev/null -w "%{http_code}" 2>/dev/null || echo "000")
    
    if [ "$openai_test" != "200" ]; then
        log "WARN" "OpenAI API test failed (HTTP $openai_test)"
        return 1
    fi
    
    return 0
}

check_memory_usage() {
    # Check system memory
    local mem_usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    if [ $mem_usage -gt 90 ]; then
        log "ALERT" "High memory usage: $mem_usage%"
    fi
    
    # Check disk usage
    local disk_usage=$(df -h "$PROJECT_ROOT" | tail -1 | awk '{print int($5)}')
    if [ $disk_usage -gt 90 ]; then
        log "ALERT" "High disk usage: $disk_usage%"
    fi
}

should_restart_service() {
    local service_name=$1
    local current_time=$(date +%s)
    
    # Initialize if needed
    if [ -z "${restart_counts[$service_name]}" ]; then
        restart_counts[$service_name]=0
        last_restart_time[$service_name]=0
    fi
    
    # Check if we've exceeded max attempts
    if [ ${restart_counts[$service_name]} -ge $MAX_RESTART_ATTEMPTS ]; then
        local time_since_last=$((current_time - ${last_restart_time[$service_name]}))
        if [ $time_since_last -lt 3600 ]; then  # Within 1 hour
            log "ERROR" "$service_name has been restarted ${restart_counts[$service_name]} times. Skipping auto-restart."
            return 1
        else
            # Reset counter after 1 hour
            restart_counts[$service_name]=0
        fi
    fi
    
    return 0
}

restart_service() {
    local service_name=$1
    local start_command=$2
    
    if ! should_restart_service "$service_name"; then
        return 1
    fi
    
    log "INFO" "Attempting to restart $service_name..."
    
    # Execute restart command
    cd "$PROJECT_ROOT"
    eval "$start_command"
    
    # Update restart tracking
    restart_counts[$service_name]=$((${restart_counts[$service_name]} + 1))
    last_restart_time[$service_name]=$(date +%s)
    
    # Wait for service to stabilize
    sleep $RESTART_DELAY
    
    return 0
}

perform_health_checks() {
    local all_healthy=true
    
    # Check Backend Service
    if ! check_service_health "Backend" $BACKEND_PORT "http://localhost:$BACKEND_PORT/api/v1/health"; then
        all_healthy=false
        if restart_service "Backend" "$SCRIPT_DIR/start-backend.sh"; then
            log "INFO" "Backend service restarted successfully"
        fi
    fi
    
    # Check OpenAI API Server
    if ! check_service_health "OpenAI API" $OPENAI_API_PORT ""; then
        all_healthy=false
        if restart_service "OpenAI API" "$SCRIPT_DIR/start-openai-api.sh"; then
            log "INFO" "OpenAI API server restarted successfully"
        fi
    fi
    
    # Check Frontend
    if ! check_service_health "Frontend" $FRONTEND_PORT ""; then
        all_healthy=false
        if restart_service "Frontend" "$SCRIPT_DIR/start-frontend.sh"; then
            log "INFO" "Frontend restarted successfully"
        fi
    fi
    
    # Check API connectivity only if all services are running
    if [ "$all_healthy" = true ]; then
        if ! check_api_connectivity; then
            log "WARN" "API connectivity issues detected"
        fi
    fi
    
    # Check system resources
    check_memory_usage
    
    return 0
}

collect_metrics() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local metrics_file="$LOG_DIR/health-metrics.json"
    
    # Collect service metrics
    local backend_status="down"
    local openai_status="down"
    local frontend_status="down"
    
    check_service_health "Backend" $BACKEND_PORT "http://localhost:$BACKEND_PORT/api/v1/health" && backend_status="up"
    check_service_health "OpenAI API" $OPENAI_API_PORT "" && openai_status="up"
    check_service_health "Frontend" $FRONTEND_PORT "" && frontend_status="up"
    
    # Write metrics
    cat > "$metrics_file" <<EOF
{
  "timestamp": "$timestamp",
  "services": {
    "backend": {
      "status": "$backend_status",
      "port": $BACKEND_PORT,
      "restarts": ${restart_counts[Backend]:-0}
    },
    "openai_api": {
      "status": "$openai_status",
      "port": $OPENAI_API_PORT,
      "restarts": ${restart_counts[OpenAI API]:-0}
    },
    "frontend": {
      "status": "$frontend_status",
      "port": $FRONTEND_PORT,
      "restarts": ${restart_counts[Frontend]:-0}
    }
  },
  "system": {
    "memory_usage": $(free | grep Mem | awk '{print int($3/$2 * 100)}'),
    "disk_usage": $(df -h "$PROJECT_ROOT" | tail -1 | awk '{print int($5)}')
  }
}
EOF
}

main_loop() {
    log "INFO" "Health monitoring started"
    
    while true; do
        perform_health_checks
        collect_metrics
        sleep $CHECK_INTERVAL
    done
}

# Signal handlers
trap 'log "INFO" "Health monitoring stopped"; exit 0' SIGTERM SIGINT

# Start monitoring
main_loop