#!/bin/bash
# Secure Deployment Script with Secret Injection
# This script handles deployments without exposing secrets

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
ENVIRONMENT=""
VERSION=""
CONFIG_FILE=""
DRY_RUN=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        --config)
            CONFIG_FILE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            echo "Usage: $0 --environment <env> --version <version> --config <config-file>"
            echo "Options:"
            echo "  --environment    Deployment environment (staging/production)"
            echo "  --version        Version to deploy"
            echo "  --config         Path to secure config file"
            echo "  --dry-run        Show what would be deployed without deploying"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate inputs
if [[ -z "$ENVIRONMENT" || -z "$VERSION" || -z "$CONFIG_FILE" ]]; then
    echo -e "${RED}Error: Missing required arguments${NC}"
    echo "Use --help for usage information"
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

# Function to securely read configuration
read_secure_config() {
    if [[ ! -f "$CONFIG_FILE" ]]; then
        log_error "Configuration file not found: $CONFIG_FILE"
        exit 1
    fi
    
    # Read config into memory and validate
    local config_json=$(cat "$CONFIG_FILE")
    
    # Validate required fields
    local required_fields=("postgres_password" "redis_password" "jwt_secret" "session_secret" "email_encryption_key")
    for field in "${required_fields[@]}"; do
        if ! echo "$config_json" | jq -e ".$field" >/dev/null 2>&1; then
            log_error "Missing required field in config: $field"
            exit 1
        fi
    done
    
    echo "$config_json"
}

# Function to create secure Docker secrets
create_docker_secrets() {
    local config_json="$1"
    
    log_info "Creating Docker secrets..."
    
    # Create secrets in Docker
    echo "$config_json" | jq -r '.postgres_password' | docker secret create postgres_password_$VERSION - 2>/dev/null || true
    echo "$config_json" | jq -r '.redis_password' | docker secret create redis_password_$VERSION - 2>/dev/null || true
    echo "$config_json" | jq -r '.jwt_secret' | docker secret create jwt_secret_$VERSION - 2>/dev/null || true
    echo "$config_json" | jq -r '.session_secret' | docker secret create session_secret_$VERSION - 2>/dev/null || true
    echo "$config_json" | jq -r '.email_encryption_key' | docker secret create email_encryption_key_$VERSION - 2>/dev/null || true
    
    # Create OpenAI key if provided
    if echo "$config_json" | jq -e '.openai_api_key' >/dev/null 2>&1; then
        echo "$config_json" | jq -r '.openai_api_key' | docker secret create openai_api_key_$VERSION - 2>/dev/null || true
    fi
    
    log_success "Docker secrets created"
}

# Function to generate secure deployment compose file
generate_secure_compose() {
    local config_json="$1"
    local compose_file="$PROJECT_ROOT/docker-compose.secure.$ENVIRONMENT.yml"
    
    log_info "Generating secure compose configuration..."
    
    cat > "$compose_file" << EOF
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: personalea
      POSTGRES_USER: personalea
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    secrets:
      - postgres_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    deploy:
      replicas: 1
      restart_policy:
        condition: any
        delay: 5s

  redis:
    image: redis:7-alpine
    command: >
      sh -c '
      echo "requirepass \$$(cat /run/secrets/redis_password)" > /etc/redis.conf &&
      redis-server /etc/redis.conf
      '
    secrets:
      - redis_password
    volumes:
      - redis_data:/data
    deploy:
      replicas: 1

  goal-strategy-service:
    image: ghcr.io/${GITHUB_REPOSITORY}/goal-strategy:${VERSION}
    environment:
      NODE_ENV: ${ENVIRONMENT}
      PORT: 3000
      LOG_LEVEL: info
    secrets:
      - postgres_password
      - redis_password
      - jwt_secret
      - session_secret
      - openai_api_key
    command: >
      sh -c '
      export DATABASE_URL="postgresql://personalea:\$$(cat /run/secrets/postgres_password)@postgres:5432/personalea" &&
      export REDIS_URL="redis://:\$$(cat /run/secrets/redis_password)@redis:6379" &&
      export JWT_SECRET="\$$(cat /run/secrets/jwt_secret)" &&
      export SESSION_SECRET="\$$(cat /run/secrets/session_secret)" &&
      export OPENAI_API_KEY="\$$(cat /run/secrets/openai_api_key 2>/dev/null || echo '')" &&
      node dist/server.js
      '
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first

  email-processing-service:
    image: ghcr.io/${GITHUB_REPOSITORY}/email-processing:${VERSION}
    environment:
      NODE_ENV: ${ENVIRONMENT}
      PORT: 3001
      LOG_LEVEL: info
    secrets:
      - postgres_password
      - redis_password
      - jwt_secret
      - session_secret
      - email_encryption_key
    command: >
      sh -c '
      export DATABASE_URL="postgresql://personalea:\$$(cat /run/secrets/postgres_password)@postgres:5432/personalea" &&
      export REDIS_URL="redis://:\$$(cat /run/secrets/redis_password)@redis:6379" &&
      export JWT_SECRET="\$$(cat /run/secrets/jwt_secret)" &&
      export SESSION_SECRET="\$$(cat /run/secrets/session_secret)" &&
      export EMAIL_ENCRYPTION_KEY="\$$(cat /run/secrets/email_encryption_key)" &&
      node dist/server.js
      '
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first

  ui:
    image: ghcr.io/${GITHUB_REPOSITORY}/ui:${VERSION}
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 5s

  nginx:
    image: nginx:alpine
    volumes:
      - ./deployment/config/nginx/nginx.secure.conf:/etc/nginx/nginx.conf:ro
      - ./deployment/config/nginx/ssl:/etc/nginx/ssl:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - goal-strategy-service
      - email-processing-service
      - ui
    deploy:
      replicas: 1

secrets:
  postgres_password:
    external: true
    name: postgres_password_${VERSION}
  redis_password:
    external: true
    name: redis_password_${VERSION}
  jwt_secret:
    external: true
    name: jwt_secret_${VERSION}
  session_secret:
    external: true
    name: session_secret_${VERSION}
  email_encryption_key:
    external: true
    name: email_encryption_key_${VERSION}
  openai_api_key:
    external: true
    name: openai_api_key_${VERSION}

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    driver: overlay
    encrypted: true
EOF
    
    log_success "Secure compose file generated"
    echo "$compose_file"
}

# Function to deploy with zero downtime
deploy_services() {
    local compose_file="$1"
    
    log_info "Deploying services with zero downtime..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN: Would deploy using $compose_file"
        docker stack config -c "$compose_file"
        return 0
    fi
    
    # Deploy stack
    docker stack deploy -c "$compose_file" "personalea-${ENVIRONMENT}"
    
    # Wait for services to be ready
    log_info "Waiting for services to stabilize..."
    sleep 30
    
    # Check service health
    local services=("goal-strategy-service" "email-processing-service" "ui" "nginx")
    for service in "${services[@]}"; do
        log_info "Checking health of $service..."
        
        local retries=30
        while [[ $retries -gt 0 ]]; do
            if docker service ps "personalea-${ENVIRONMENT}_${service}" --format "{{.CurrentState}}" | grep -q "Running"; then
                log_success "$service is running"
                break
            fi
            retries=$((retries - 1))
            sleep 5
        done
        
        if [[ $retries -eq 0 ]]; then
            log_error "$service failed to start"
            return 1
        fi
    done
    
    log_success "All services deployed successfully"
}

# Function to clean up old secrets
cleanup_old_secrets() {
    log_info "Cleaning up old secrets..."
    
    # List all secrets and remove old versions
    local secret_prefixes=("postgres_password" "redis_password" "jwt_secret" "session_secret" "email_encryption_key" "openai_api_key")
    
    for prefix in "${secret_prefixes[@]}"; do
        # Keep only the current version
        docker secret ls --format "{{.Name}}" | grep "^${prefix}_" | grep -v "${prefix}_${VERSION}" | while read -r old_secret; do
            log_info "Removing old secret: $old_secret"
            docker secret rm "$old_secret" 2>/dev/null || true
        done
    done
    
    log_success "Old secrets cleaned up"
}

# Function to verify deployment security
verify_security() {
    log_info "Verifying deployment security..."
    
    # Check that secrets are not exposed in environment
    local services=("goal-strategy-service" "email-processing-service")
    
    for service in "${services[@]}"; do
        log_info "Checking $service for exposed secrets..."
        
        # Get a running container ID
        local container_id=$(docker service ps "personalea-${ENVIRONMENT}_${service}" \
            --filter "desired-state=running" \
            --format "{{.Name}}.{{.ID}}" | head -1)
        
        if [[ -n "$container_id" ]]; then
            # Check environment variables
            if docker inspect "$container_id" 2>/dev/null | grep -E "(password|secret|key).*=" | grep -v "_FILE"; then
                log_error "Exposed secrets found in $service"
                return 1
            fi
        fi
    done
    
    log_success "Security verification passed"
}

# Main deployment flow
main() {
    log_info "Starting secure deployment..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Version: $VERSION"
    
    # Read secure configuration
    local config_json=$(read_secure_config)
    
    # Create Docker secrets
    create_docker_secrets "$config_json"
    
    # Generate secure compose file
    local compose_file=$(generate_secure_compose "$config_json")
    
    # Deploy services
    if ! deploy_services "$compose_file"; then
        log_error "Deployment failed"
        exit 1
    fi
    
    # Verify security
    if ! verify_security; then
        log_error "Security verification failed"
        exit 1
    fi
    
    # Cleanup old secrets
    cleanup_old_secrets
    
    # Remove temporary files
    if [[ -f "$compose_file" ]]; then
        shred -vfz "$compose_file" 2>/dev/null || rm -f "$compose_file"
    fi
    
    log_success "Secure deployment completed successfully!"
}

# Run main function
main "$@"