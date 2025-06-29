#!/bin/bash
# PersonalEA Production Deployment Script
# Features: Health checks, automatic rollback, zero-downtime deployment

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOYMENT_CONFIG="${DEPLOYMENT_CONFIG:-production}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}" # 5 minutes
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-10}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verify prerequisites
verify_prerequisites() {
    log_info "Verifying prerequisites..."
    
    local missing_deps=()
    
    # Check required commands
    for cmd in docker docker-compose jq curl; do
        if ! command_exists "$cmd"; then
            missing_deps+=("$cmd")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_error "Please install the missing dependencies and try again."
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running or not accessible"
        exit 1
    fi
    
    # Check environment file
    if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
        log_error "Production environment file not found: .env.production"
        log_error "Please create it from .env.production.example"
        exit 1
    fi
    
    log_success "All prerequisites verified"
}

# Backup current deployment
create_backup() {
    log_info "Creating backup of current deployment..."
    
    local backup_dir="$PROJECT_ROOT/deployment/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup database
    if docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" ps postgres | grep -q "Up"; then
        log_info "Backing up PostgreSQL database..."
        docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" exec -T postgres \
            pg_dumpall -U personalea > "$backup_dir/postgres_backup.sql"
    fi
    
    # Backup volumes
    log_info "Backing up Docker volumes..."
    docker run --rm \
        -v personalea-production_postgres_data:/data/postgres \
        -v personalea-production_redis_data:/data/redis \
        -v "$backup_dir:/backup" \
        alpine tar czf /backup/volumes_backup.tar.gz -C /data .
    
    # Save current image tags
    docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" config \
        | jq -r '.services | to_entries[] | "\(.key):\(.value.image)"' \
        > "$backup_dir/image_tags.txt"
    
    echo "$backup_dir" > "$PROJECT_ROOT/deployment/.last_backup"
    log_success "Backup created at: $backup_dir"
}

# Build and tag images
build_images() {
    log_info "Building Docker images..."
    
    local build_tag="$(date +%Y%m%d_%H%M%S)"
    
    # Build services
    for service in goal-strategy email-processing; do
        log_info "Building $service service..."
        docker build \
            -t "personalea/$service:$build_tag" \
            -t "personalea/$service:latest" \
            -f "$PROJECT_ROOT/services/$service/Dockerfile" \
            "$PROJECT_ROOT/services/$service"
    done
    
    # Build UI
    log_info "Building production UI..."
    docker build \
        -t "personalea/ui:$build_tag" \
        -t "personalea/ui:latest" \
        -f "$PROJECT_ROOT/ui/Dockerfile.production" \
        "$PROJECT_ROOT/ui"
    
    log_success "All images built successfully"
    echo "$build_tag" > "$PROJECT_ROOT/deployment/.build_tag"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Start only database services
    docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" up -d postgres redis
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    local retries=30
    while [ $retries -gt 0 ]; do
        if docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" exec -T postgres \
            pg_isready -U personalea -d personalea >/dev/null 2>&1; then
            break
        fi
        retries=$((retries - 1))
        sleep 2
    done
    
    if [ $retries -eq 0 ]; then
        log_error "Database failed to start"
        return 1
    fi
    
    # Run migrations for each service
    for service in goal-strategy email-processing; do
        log_info "Running migrations for $service..."
        docker run --rm \
            --network personalea-production \
            -e DATABASE_URL="postgresql://personalea:${POSTGRES_PASSWORD}@postgres:5432/personalea" \
            -v "$PROJECT_ROOT/services/$service:/app" \
            -w /app \
            node:18-alpine \
            sh -c "npm install && npx prisma migrate deploy"
    done
    
    log_success "All migrations completed"
}

# Health check function
health_check() {
    local service=$1
    local endpoint=$2
    local port=$3
    local timeout=$4
    
    log_info "Performing health check for $service..."
    
    local elapsed=0
    while [ $elapsed -lt $timeout ]; do
        if curl -f -s "http://localhost:$port$endpoint" >/dev/null; then
            log_success "$service is healthy"
            return 0
        fi
        
        sleep "$HEALTH_CHECK_INTERVAL"
        elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))
        log_info "Waiting for $service to be healthy... ($elapsed/$timeout seconds)"
    done
    
    log_error "$service health check failed after $timeout seconds"
    return 1
}

# Deploy services with rolling update
deploy_services() {
    log_info "Deploying services..."
    
    # Load environment variables
    export $(grep -v '^#' "$PROJECT_ROOT/.env.production" | xargs)
    
    # Deploy services one by one for zero-downtime
    local services=("postgres" "redis" "goal-strategy-service" "email-processing-service" "ui" "nginx")
    
    for service in "${services[@]}"; do
        log_info "Deploying $service..."
        
        # For stateful services, just ensure they're running
        if [[ "$service" == "postgres" || "$service" == "redis" ]]; then
            docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" up -d "$service"
        else
            # For stateless services, do rolling update
            docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" up -d --no-deps --scale "$service=2" "$service"
            sleep 5
            docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" up -d --no-deps "$service"
        fi
    done
    
    log_success "All services deployed"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    local all_healthy=true
    
    # Check each service
    health_check "Goal Strategy Service" "/api/v1/health" 3000 "$HEALTH_CHECK_TIMEOUT" || all_healthy=false
    health_check "Email Processing Service" "/health" 3001 "$HEALTH_CHECK_TIMEOUT" || all_healthy=false
    health_check "UI" "/" 80 "$HEALTH_CHECK_TIMEOUT" || all_healthy=false
    
    if [ "$all_healthy" = true ]; then
        log_success "All services are healthy"
        return 0
    else
        log_error "Some services failed health checks"
        return 1
    fi
}

# Rollback deployment
rollback_deployment() {
    log_warning "Initiating rollback..."
    
    local last_backup=$(cat "$PROJECT_ROOT/deployment/.last_backup" 2>/dev/null)
    
    if [ -z "$last_backup" ] || [ ! -d "$last_backup" ]; then
        log_error "No backup found for rollback"
        return 1
    fi
    
    # Stop current deployment
    docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" down
    
    # Restore database
    if [ -f "$last_backup/postgres_backup.sql" ]; then
        log_info "Restoring database..."
        docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" up -d postgres
        sleep 10
        docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" exec -T postgres \
            psql -U personalea -d personalea < "$last_backup/postgres_backup.sql"
    fi
    
    # Restore volumes
    if [ -f "$last_backup/volumes_backup.tar.gz" ]; then
        log_info "Restoring volumes..."
        docker run --rm \
            -v personalea-production_postgres_data:/data/postgres \
            -v personalea-production_redis_data:/data/redis \
            -v "$last_backup:/backup" \
            alpine tar xzf /backup/volumes_backup.tar.gz -C /data
    fi
    
    # Restore previous images
    if [ -f "$last_backup/image_tags.txt" ]; then
        log_info "Restoring previous images..."
        while IFS=: read -r service image; do
            docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" \
                run --rm --no-deps "$service" true || true
        done < "$last_backup/image_tags.txt"
    fi
    
    # Restart services
    docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" up -d
    
    log_success "Rollback completed"
}

# Cleanup old backups
cleanup_backups() {
    log_info "Cleaning up old backups..."
    
    local backup_dir="$PROJECT_ROOT/deployment/backups"
    local retention_days="${BACKUP_RETENTION_DAYS:-7}"
    
    find "$backup_dir" -type d -name "20*" -mtime +$retention_days -exec rm -rf {} \; 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# Main deployment flow
main() {
    log_info "Starting PersonalEA production deployment..."
    log_info "Deployment configuration: $DEPLOYMENT_CONFIG"
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Verify prerequisites
    verify_prerequisites
    
    # Create backup
    create_backup
    
    # Build images
    build_images
    
    # Run migrations
    if ! run_migrations; then
        log_error "Migration failed"
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            rollback_deployment
        fi
        exit 1
    fi
    
    # Deploy services
    deploy_services
    
    # Verify deployment
    if ! verify_deployment; then
        log_error "Deployment verification failed"
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            rollback_deployment
        fi
        exit 1
    fi
    
    # Cleanup old backups
    cleanup_backups
    
    log_success "Deployment completed successfully!"
    log_info "Access the application at: https://your-domain.com"
    log_info "Monitor health at: https://your-domain.com/health"
}

# Run main function
main "$@"