#!/bin/bash

# PersonalEA Health Check Script
# Tests if the user installation is working correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Configuration
MAIN_URL="http://localhost:3000"
CONFIG_URL="http://localhost:3001"
MAX_RETRIES=10
RETRY_DELAY=5

# Function to check health with retries
check_health() {
    local service_name=$1
    local health_url=$2
    local attempt=1
    
    log_info "Checking $service_name health at $health_url"
    
    while [ $attempt -le $MAX_RETRIES ]; do
        log_info "Attempt $attempt/$MAX_RETRIES for $service_name"
        
        if curl -f -s --max-time 10 "$health_url" > /dev/null 2>&1; then
            log_success "$service_name is healthy"
            return 0
        fi
        
        if [ $attempt -eq $MAX_RETRIES ]; then
            log_error "$service_name failed health check after $MAX_RETRIES attempts"
            return 1
        fi
        
        log_warning "$service_name not ready yet, waiting ${RETRY_DELAY}s..."
        sleep $RETRY_DELAY
        attempt=$((attempt + 1))
    done
}

# Function to test API response
test_api_response() {
    local service_name=$1
    local url=$2
    
    log_info "Testing $service_name API response..."
    
    response=$(curl -s "$url" 2>/dev/null || echo "")
    
    if [ -z "$response" ]; then
        log_error "$service_name API not responding"
        return 1
    fi
    
    if echo "$response" | grep -q "status.*ok\|healthy\|PersonalEA"; then
        log_success "$service_name API responding correctly"
        return 0
    else
        log_warning "$service_name API responding but content unexpected"
        echo "Response: $response"
        return 1
    fi
}

# Main health check
main() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║                PersonalEA Health Check                       ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    log_info "Starting PersonalEA health check..."
    
    # Check if Docker Compose is running
    if ! docker-compose -f docker-compose.user.yml ps | grep -q "Up"; then
        log_error "PersonalEA services are not running"
        log_info "Start services with: docker-compose -f docker-compose.user.yml up -d"
        exit 1
    fi
    
    log_success "Docker Compose services are running"
    
    # Check main web interface health
    if check_health "PersonalEA Web" "$MAIN_URL/health"; then
        test_api_response "PersonalEA Web" "$MAIN_URL/health"
    else
        exit 1
    fi
    
    # Check configuration UI health
    if check_health "Configuration UI" "$CONFIG_URL/health"; then
        test_api_response "Configuration UI" "$CONFIG_URL/health"
    else
        exit 1
    fi
    
    # Test main page loads
    log_info "Testing main page accessibility..."
    if curl -s "$MAIN_URL" | grep -q "PersonalEA\|Welcome\|Setup"; then
        log_success "Main page loads successfully"
    else
        log_warning "Main page content unexpected"
    fi
    
    # Test configuration page loads
    log_info "Testing configuration page accessibility..."
    if curl -s "$CONFIG_URL" | grep -q "Configuration\|Settings\|Setup"; then
        log_success "Configuration page loads successfully"
    else
        log_warning "Configuration page content unexpected"
    fi
    
    # Check response times
    log_info "Checking response times..."
    start_time=$(date +%s%N)
    curl -s "$MAIN_URL/health" > /dev/null
    end_time=$(date +%s%N)
    response_time=$(( (end_time - start_time) / 1000000 ))
    
    if [ $response_time -lt 5000 ]; then
        log_success "Response time acceptable: ${response_time}ms"
    else
        log_warning "Response time slow: ${response_time}ms"
    fi
    
    echo
    log_success "🎉 PersonalEA health check completed successfully!"
    echo
    echo "Your PersonalEA installation is working correctly:"
    echo "• Main interface: $MAIN_URL"
    echo "• Configuration: $CONFIG_URL"
    echo
    echo "Next steps:"
    echo "1. Open $MAIN_URL in your browser"
    echo "2. Follow the setup wizard"
    echo "3. Connect your email and calendar accounts"
    echo
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "PersonalEA Health Check Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --quick, -q    Quick health check (fewer retries)"
        echo "  --verbose, -v  Verbose output"
        echo ""
        echo "This script checks if PersonalEA user installation is working correctly."
        echo "It tests health endpoints, API responses, and basic functionality."
        exit 0
        ;;
    --quick|-q)
        MAX_RETRIES=3
        RETRY_DELAY=2
        log_info "Running quick health check..."
        ;;
    --verbose|-v)
        set -x
        log_info "Running verbose health check..."
        ;;
esac

# Run main function
main