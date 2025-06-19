#!/bin/bash

# PersonalEA Mock Server Setup Script
# This script helps you quickly set up and manage mock servers for development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if ports are available
check_ports() {
    local ports=(8083 8085 8086 8090 6379)
    local busy_ports=()
    
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            busy_ports+=($port)
        fi
    done
    
    if [ ${#busy_ports[@]} -ne 0 ]; then
        print_warning "The following ports are already in use: ${busy_ports[*]}"
        print_warning "You may need to stop existing services or change port configurations"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "All required ports are available"
    fi
}

# Function to start mock servers
start_mocks() {
    print_status "Starting PersonalEA mock servers..."
    
    # Navigate to project root
    cd "$(dirname "$0")/.."
    
    # Start Docker Compose services
    docker-compose -f docker-compose.mock.yml up -d
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Check service health
    local services=(
        "http://localhost:8083/v1/health|Email Service"
        "http://localhost:8085/v1/health|Goal & Strategy Service"
        "http://localhost:8086/v1/health|Calendar Service"
    )
    
    for service in "${services[@]}"; do
        IFS='|' read -r url name <<< "$service"
        if curl -s "$url" > /dev/null 2>&1; then
            print_success "$name is healthy"
        else
            print_warning "$name may not be ready yet"
        fi
    done
    
    print_success "Mock servers are running!"
    echo
    echo "📧 Email Service:        http://localhost:8083"
    echo "🎯 Goal & Strategy:      http://localhost:8085"
    echo "📅 Calendar Service:     http://localhost:8086"
    echo "📊 Mock Data Server:     http://localhost:8090"
    echo
    echo "To view logs: npm run mock:docker:logs"
    echo "To stop services: npm run mock:docker:stop"
}

# Function to stop mock servers
stop_mocks() {
    print_status "Stopping PersonalEA mock servers..."
    
    cd "$(dirname "$0")/.."
    docker-compose -f docker-compose.mock.yml down
    
    print_success "Mock servers stopped"
}

# Function to show logs
show_logs() {
    cd "$(dirname "$0")/.."
    docker-compose -f docker-compose.mock.yml logs -f
}

# Function to restart mock servers
restart_mocks() {
    print_status "Restarting PersonalEA mock servers..."
    stop_mocks
    sleep 2
    start_mocks
}

# Function to run client examples
run_examples() {
    print_status "Running client development examples..."
    
    cd "$(dirname "$0")/../client-dev-kit"
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        print_status "Installing client dependencies..."
        npm install
    fi
    
    # Run examples
    print_status "Running Email Service example..."
    npm run examples:email
    
    echo
    print_status "Running Goal Service example..."
    npm run examples:goals
    
    echo
    print_status "Running Calendar Service example..."
    npm run examples:calendar
    
    print_success "All examples completed!"
}

# Function to show status
show_status() {
    print_status "Checking PersonalEA mock server status..."
    
    local services=(
        "8083|Email Service"
        "8085|Goal & Strategy Service"
        "8086|Calendar Service"
        "8090|Mock Data Server"
    )
    
    for service in "${services[@]}"; do
        IFS='|' read -r port name <<< "$service"
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_success "$name (port $port) is running"
        else
            print_warning "$name (port $port) is not running"
        fi
    done
    
    # Check Docker containers
    echo
    print_status "Docker container status:"
    docker-compose -f "$(dirname "$0")/../docker-compose.mock.yml" ps
}

# Function to clean up
cleanup() {
    print_status "Cleaning up PersonalEA mock environment..."
    
    cd "$(dirname "$0")/.."
    
    # Stop and remove containers
    docker-compose -f docker-compose.mock.yml down -v
    
    # Remove unused Docker resources
    docker system prune -f
    
    print_success "Cleanup completed"
}

# Function to show help
show_help() {
    echo "PersonalEA Mock Server Management Script"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  start       Start all mock servers"
    echo "  stop        Stop all mock servers"
    echo "  restart     Restart all mock servers"
    echo "  status      Show status of all services"
    echo "  logs        Show logs from all services"
    echo "  examples    Run client development examples"
    echo "  cleanup     Stop services and clean up Docker resources"
    echo "  help        Show this help message"
    echo
    echo "Examples:"
    echo "  $0 start                 # Start mock servers"
    echo "  $0 examples              # Run client examples"
    echo "  $0 logs                  # View service logs"
    echo
    echo "Service URLs:"
    echo "  Email Service:           http://localhost:8083"
    echo "  Goal & Strategy Service: http://localhost:8085"
    echo "  Calendar Service:        http://localhost:8086"
    echo "  Mock Data Server:        http://localhost:8090"
}

# Main script logic
case "${1:-help}" in
    start)
        check_docker
        check_ports
        start_mocks
        ;;
    stop)
        stop_mocks
        ;;
    restart)
        check_docker
        restart_mocks
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    examples)
        run_examples
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo
        show_help
        exit 1
        ;;
esac