#!/bin/bash
# PersonalEA Environment Setup Script
# This script sets up the deployment environment for PersonalEA

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Default values
ENVIRONMENT=""
SKIP_BUILD=false
SKIP_NETWORKS=false
SKIP_VOLUMES=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-networks)
            SKIP_NETWORKS=true
            shift
            ;;
        --skip-volumes)
            SKIP_VOLUMES=true
            shift
            ;;
        --help)
            echo "Usage: $0 --environment <env> [options]"
            echo "Options:"
            echo "  --environment    Environment to setup (development/staging/production)"
            echo "  --skip-build     Skip building Docker images"
            echo "  --skip-networks  Skip creating Docker networks"
            echo "  --skip-volumes   Skip creating Docker volumes"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate environment
if [[ -z "$ENVIRONMENT" ]]; then
    echo -e "${RED}Error: Environment not specified${NC}"
    echo "Use --help for usage information"
    exit 1
fi

if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo -e "${RED}Error: Invalid environment: $ENVIRONMENT${NC}"
    echo "Valid environments: development, staging, production"
    exit 1
fi

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check environment file
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    if [[ ! -f "$env_file" ]]; then
        log_error "Environment file not found: $env_file"
        log_info "Please create $env_file based on .env.example"
        exit 1
    fi
    
    # Validate required environment variables
    if ! validate_env_file "$env_file"; then
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Function to validate environment file
validate_env_file() {
    local env_file=$1
    local missing_vars=()
    
    # Required variables
    local required_vars=(
        "OPENAI_API_KEY"
        "JWT_SECRET"
        "SESSION_SECRET"
        "EMAIL_ENCRYPTION_KEY"
        "POSTGRES_PASSWORD"
        "REDIS_PASSWORD"
    )
    
    # Source the env file in a subshell
    (
        set -a
        source "$env_file"
        set +a
        
        for var in "${required_vars[@]}"; do
            if [[ -z "${!var:-}" ]] || [[ "${!var}" =~ "YOUR-.*-HERE" ]]; then
                missing_vars+=("$var")
            fi
        done
        
        if [[ ${#missing_vars[@]} -gt 0 ]]; then
            log_error "Missing or invalid required environment variables:"
            for var in "${missing_vars[@]}"; do
                echo "  - $var"
            done
            exit 1
        fi
    )
}

# Function to create Docker networks
create_docker_networks() {
    if [[ "$SKIP_NETWORKS" == "true" ]]; then
        log_info "Skipping network creation"
        return
    fi
    
    log_info "Creating Docker networks..."
    
    local networks=("personalea_frontend" "personalea_backend" "personalea_monitoring")
    
    for network in "${networks[@]}"; do
        if docker network ls | grep -q "$network"; then
            log_info "Network $network already exists"
        else
            docker network create "$network" --driver bridge
            log_success "Created network: $network"
        fi
    done
}

# Function to create Docker volumes
create_docker_volumes() {
    if [[ "$SKIP_VOLUMES" == "true" ]]; then
        log_info "Skipping volume creation"
        return
    fi
    
    log_info "Creating Docker volumes..."
    
    local volumes=(
        "postgres_data"
        "redis_data"
        "nginx_cache"
        "nginx_logs"
        "prometheus_data"
        "grafana_data"
        "loki_data"
        "alertmanager_data"
        "tempo_data"
    )
    
    for volume in "${volumes[@]}"; do
        if docker volume ls | grep -q "$volume"; then
            log_info "Volume $volume already exists"
        else
            docker volume create "$volume"
            log_success "Created volume: $volume"
        fi
    done
}

# Function to build Docker images
build_docker_images() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        log_info "Skipping Docker image builds"
        return
    fi
    
    log_info "Building Docker images for $ENVIRONMENT..."
    
    # Build services
    local services=("goal-strategy" "email-processing")
    
    for service in "${services[@]}"; do
        log_info "Building $service service..."
        
        local service_dir="$PROJECT_ROOT/services/$service"
        if [[ -d "$service_dir" ]]; then
            docker build -t "personalea/$service:latest" \
                --build-arg NODE_ENV="$ENVIRONMENT" \
                "$service_dir"
            log_success "Built $service service"
        else
            log_warning "Service directory not found: $service_dir"
        fi
    done
    
    # Build UI if exists
    if [[ -d "$PROJECT_ROOT/ui" ]]; then
        log_info "Building UI..."
        docker build -t "personalea/ui:latest" \
            --build-arg VITE_PRODUCTION_MODE=true \
            -f "$PROJECT_ROOT/ui/Dockerfile.production" \
            "$PROJECT_ROOT/ui"
        log_success "Built UI"
    fi
}

# Function to initialize databases
initialize_databases() {
    log_info "Initializing databases..."
    
    # Start only database services
    cd "$PROJECT_ROOT"
    docker-compose -f "docker-compose.$ENVIRONMENT.yml" up -d postgres redis
    
    # Wait for PostgreSQL to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    local retries=30
    while [[ $retries -gt 0 ]]; do
        if docker-compose -f "docker-compose.$ENVIRONMENT.yml" exec -T postgres pg_isready -U personalea; then
            log_success "PostgreSQL is ready"
            break
        fi
        retries=$((retries - 1))
        sleep 2
    done
    
    if [[ $retries -eq 0 ]]; then
        log_error "PostgreSQL failed to start"
        return 1
    fi
    
    # Run database migrations for each service
    local services=("goal-strategy" "email-processing")
    
    for service in "${services[@]}"; do
        if [[ -f "$PROJECT_ROOT/services/$service/prisma/schema.prisma" ]]; then
            log_info "Running migrations for $service..."
            docker run --rm \
                --network personalea_backend \
                -e DATABASE_URL="postgresql://personalea:${POSTGRES_PASSWORD}@postgres:5432/personalea" \
                -v "$PROJECT_ROOT/services/$service:/app" \
                -w /app \
                node:18-alpine \
                sh -c "npm install && npx prisma migrate deploy"
            log_success "Migrations completed for $service"
        fi
    done
}

# Function to create initial configuration
create_initial_config() {
    log_info "Creating initial configuration..."
    
    # Create nginx configuration if needed
    local nginx_conf_dir="$PROJECT_ROOT/deployment/config/nginx"
    mkdir -p "$nginx_conf_dir/sites-enabled"
    
    # Create SSL directory
    mkdir -p "$nginx_conf_dir/ssl"
    
    # Generate self-signed certificate for development/staging
    if [[ "$ENVIRONMENT" != "production" ]]; then
        if [[ ! -f "$nginx_conf_dir/ssl/cert.pem" ]]; then
            log_info "Generating self-signed SSL certificate..."
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout "$nginx_conf_dir/ssl/key.pem" \
                -out "$nginx_conf_dir/ssl/cert.pem" \
                -subj "/C=US/ST=State/L=City/O=PersonalEA/CN=localhost"
            log_success "SSL certificate generated"
        fi
    fi
    
    # Create log directories
    mkdir -p "$PROJECT_ROOT/logs"
    mkdir -p "$PROJECT_ROOT/services/goal-strategy/logs"
    mkdir -p "$PROJECT_ROOT/services/email-processing/logs"
}

# Function to verify setup
verify_setup() {
    log_info "Verifying setup..."
    
    # Check networks
    local networks=("personalea_frontend" "personalea_backend" "personalea_monitoring")
    for network in "${networks[@]}"; do
        if ! docker network ls | grep -q "$network"; then
            log_error "Network $network not found"
            return 1
        fi
    done
    
    # Check volumes
    local volumes=("postgres_data" "redis_data")
    for volume in "${volumes[@]}"; do
        if ! docker volume ls | grep -q "$volume"; then
            log_error "Volume $volume not found"
            return 1
        fi
    done
    
    log_success "Setup verification passed"
}

# Main setup flow
main() {
    log_info "Starting PersonalEA environment setup for $ENVIRONMENT"
    
    # Check prerequisites
    check_prerequisites
    
    # Create Docker networks
    create_docker_networks
    
    # Create Docker volumes
    create_docker_volumes
    
    # Build Docker images
    build_docker_images
    
    # Create initial configuration
    create_initial_config
    
    # Initialize databases
    initialize_databases
    
    # Verify setup
    verify_setup
    
    log_success "Environment setup completed successfully!"
    
    echo
    echo "Next steps:"
    echo "1. Review and update your .env.$ENVIRONMENT file"
    echo "2. Start the services:"
    echo "   cd $PROJECT_ROOT"
    echo "   docker-compose -f docker-compose.$ENVIRONMENT.yml up -d"
    echo "3. Check service health:"
    echo "   docker-compose -f docker-compose.$ENVIRONMENT.yml ps"
    echo "4. View logs:"
    echo "   docker-compose -f docker-compose.$ENVIRONMENT.yml logs -f"
    echo
    
    if [[ "$ENVIRONMENT" == "development" ]]; then
        echo "Development URLs:"
        echo "  - Goal Strategy API: http://localhost:8085"
        echo "  - Email Service API: http://localhost:3001"
        echo "  - Grafana: http://localhost:3000"
        echo "  - Prometheus: http://localhost:9090"
    fi
}

# Run main function
main "$@"