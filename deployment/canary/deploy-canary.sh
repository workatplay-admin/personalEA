#!/bin/bash
# Canary Deployment Script with Real LLM Monitoring

set -euo pipefail

# Configuration
DEPLOYMENT_ID=$(date +%s)
SERVICE_NAME="goal-strategy"
CANARY_CONFIG="./canary-monitoring.yml"
LOG_FILE="/var/log/canary-deploy-${DEPLOYMENT_ID}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${2:-}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..." "$YELLOW"
    
    # Check for required environment variables
    required_vars=(
        "OPENAI_API_KEY"
        "PROMETHEUS_URL"
        "SLACK_WEBHOOK_URL"
        "PROD_LOAD_BALANCER"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log "ERROR: $var is not set" "$RED"
            exit 1
        fi
    done
    
    # Validate OpenAI API key
    if ! validate_api_key "$OPENAI_API_KEY"; then
        log "ERROR: Invalid OpenAI API key" "$RED"
        exit 1
    fi
    
    log "Prerequisites check passed" "$GREEN"
}

# Validate API key by making a test call
validate_api_key() {
    local api_key=$1
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $api_key" \
        https://api.openai.com/v1/models)
    
    [[ "$response" == "200" ]]
}

# Deploy canary instance
deploy_canary() {
    local traffic_percentage=$1
    log "Deploying canary with $traffic_percentage% traffic..." "$YELLOW"
    
    # Tag the new version
    docker tag ${SERVICE_NAME}:latest ${SERVICE_NAME}:canary-${DEPLOYMENT_ID}
    
    # Deploy to canary servers
    docker run -d \
        --name ${SERVICE_NAME}-canary-${DEPLOYMENT_ID} \
        -e NODE_ENV=production \
        -e OPENAI_API_KEY="$OPENAI_API_KEY" \
        -e CANARY_VERSION="${DEPLOYMENT_ID}" \
        -e ENABLE_METRICS=true \
        -p 8080:8080 \
        ${SERVICE_NAME}:canary-${DEPLOYMENT_ID}
    
    # Update load balancer weights
    update_load_balancer_weights "canary" "$traffic_percentage"
    
    log "Canary deployed successfully" "$GREEN"
}

# Update load balancer traffic distribution
update_load_balancer_weights() {
    local target=$1
    local percentage=$2
    
    # This would integrate with your actual load balancer
    # Example for HAProxy or similar
    cat > /tmp/lb-weights.conf <<EOF
backend goal_strategy_backend
    server production weight $((100 - percentage))
    server canary weight $percentage
EOF
    
    # Apply configuration (platform specific)
    # haproxy -f /tmp/lb-weights.conf -sf $(cat /var/run/haproxy.pid)
}

# Monitor canary metrics
monitor_canary() {
    local duration=$1
    local stage_name=$2
    log "Monitoring canary stage: $stage_name for $duration" "$YELLOW"
    
    local start_time=$(date +%s)
    local end_time=$((start_time + $(parse_duration "$duration")))
    
    while [[ $(date +%s) -lt $end_time ]]; do
        # Check success rate
        local success_rate=$(query_prometheus "success_rate")
        local error_rate=$(query_prometheus "error_rate")
        local llm_timeout_rate=$(query_prometheus "llm_timeout_rate")
        local p95_latency=$(query_prometheus "response_time_p95")
        
        log "Metrics - Success: ${success_rate}%, Errors: ${error_rate}%, LLM Timeouts: ${llm_timeout_rate}%, P95: ${p95_latency}ms"
        
        # Check rollback conditions
        if should_rollback "$success_rate" "$error_rate" "$llm_timeout_rate"; then
            log "ROLLBACK TRIGGERED! Metrics outside acceptable range" "$RED"
            rollback_deployment
            exit 1
        fi
        
        # Run smoke tests
        if ! run_smoke_tests; then
            log "Smoke tests failed!" "$RED"
            rollback_deployment
            exit 1
        fi
        
        sleep 30
    done
    
    log "Stage $stage_name completed successfully" "$GREEN"
}

# Query Prometheus for metrics
query_prometheus() {
    local metric=$1
    local query=""
    
    case $metric in
        "success_rate")
            query='sum(rate(http_requests_total{service="goal-strategy",status=~"2.."}[5m]))/sum(rate(http_requests_total{service="goal-strategy"}[5m]))*100'
            ;;
        "error_rate")
            query='sum(rate(http_requests_total{service="goal-strategy",status=~"5.."}[5m]))/sum(rate(http_requests_total{service="goal-strategy"}[5m]))*100'
            ;;
        "llm_timeout_rate")
            query='sum(rate(openai_api_timeouts_total{service="goal-strategy"}[5m]))/sum(rate(openai_api_requests_total{service="goal-strategy"}[5m]))*100'
            ;;
        "response_time_p95")
            query='histogram_quantile(0.95,sum(rate(http_request_duration_seconds_bucket{service="goal-strategy"}[5m]))by(le))*1000'
            ;;
    esac
    
    curl -s "${PROMETHEUS_URL}/api/v1/query?query=${query}" | \
        jq -r '.data.result[0].value[1] // "0"'
}

# Check if rollback is needed
should_rollback() {
    local success_rate=$1
    local error_rate=$2
    local llm_timeout_rate=$3
    
    [[ $(echo "$success_rate < 90" | bc -l) -eq 1 ]] || \
    [[ $(echo "$error_rate > 10" | bc -l) -eq 1 ]] || \
    [[ $(echo "$llm_timeout_rate > 10" | bc -l) -eq 1 ]]
}

# Run smoke tests
run_smoke_tests() {
    log "Running smoke tests..."
    
    # Test 1: Create SMART Goal
    local response=$(curl -s -X POST http://localhost:8080/api/v1/goals/translate \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer test-token" \
        -d '{"goal":"Improve my programming skills"}')
    
    if ! echo "$response" | jq -e '.smartGoal' >/dev/null; then
        log "SMART goal creation test failed" "$RED"
        return 1
    fi
    
    # Test 2: Health check
    local health=$(curl -s http://localhost:8080/health)
    if ! echo "$health" | jq -e '.status == "healthy"' >/dev/null; then
        log "Health check failed" "$RED"
        return 1
    fi
    
    # Test 3: LLM connectivity
    local llm_health=$(curl -s http://localhost:8080/health/llm)
    if ! echo "$llm_health" | jq -e '.openai.connected == true' >/dev/null; then
        log "LLM connectivity test failed" "$RED"
        return 1
    fi
    
    log "All smoke tests passed" "$GREEN"
    return 0
}

# Rollback deployment
rollback_deployment() {
    log "Initiating rollback..." "$RED"
    
    # Stop canary container
    docker stop ${SERVICE_NAME}-canary-${DEPLOYMENT_ID} || true
    docker rm ${SERVICE_NAME}-canary-${DEPLOYMENT_ID} || true
    
    # Reset load balancer to 100% production
    update_load_balancer_weights "production" 100
    
    # Send notifications
    send_slack_notification "🚨 Canary deployment rolled back for ${SERVICE_NAME}"
    
    log "Rollback completed" "$YELLOW"
}

# Send Slack notification
send_slack_notification() {
    local message=$1
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"${message}\",\"channel\":\"#deployments\"}" \
        "$SLACK_WEBHOOK_URL"
}

# Parse duration string (e.g., "30m", "1h")
parse_duration() {
    local duration=$1
    local value=${duration//[!0-9]/}
    local unit=${duration//[0-9]/}
    
    case $unit in
        "m") echo $((value * 60)) ;;
        "h") echo $((value * 3600)) ;;
        *) echo "$value" ;;
    esac
}

# Main deployment flow
main() {
    log "Starting canary deployment for $SERVICE_NAME" "$GREEN"
    log "Deployment ID: $DEPLOYMENT_ID"
    
    # Pre-flight checks
    check_prerequisites
    
    # Stage 1: Initial canary (1% traffic)
    deploy_canary 1
    monitor_canary "10m" "Initial Canary"
    
    # Stage 2: Extended canary (10% traffic)
    update_load_balancer_weights "canary" 10
    monitor_canary "30m" "Extended Canary"
    
    # Stage 3: Half traffic (50%)
    update_load_balancer_weights "canary" 50
    monitor_canary "1h" "Half Traffic"
    
    # Stage 4: Full deployment
    log "Promoting canary to production..." "$GREEN"
    docker tag ${SERVICE_NAME}:canary-${DEPLOYMENT_ID} ${SERVICE_NAME}:production
    update_load_balancer_weights "production" 100
    
    # Cleanup
    docker stop ${SERVICE_NAME}-canary-${DEPLOYMENT_ID} || true
    docker rm ${SERVICE_NAME}-canary-${DEPLOYMENT_ID} || true
    
    # Success notification
    send_slack_notification "✅ Canary deployment completed successfully for ${SERVICE_NAME}"
    log "Deployment completed successfully!" "$GREEN"
}

# Run main function
main "$@"