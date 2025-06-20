#!/bin/bash

# PersonalEA Security Hardening Script
# This script helps users rotate default secrets and secure their installation

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

# Function to generate secure random string
generate_secret() {
    local length=${1:-32}
    openssl rand -hex $length
}

# Function to backup existing .env file
backup_env() {
    if [ -f .env ]; then
        local backup_file=".env.backup.$(date +%Y%m%d_%H%M%S)"
        cp .env "$backup_file"
        print_success "Backed up existing .env to $backup_file"
    fi
}

# Function to update .env file
update_env_value() {
    local key=$1
    local value=$2
    local env_file=${3:-.env}
    
    if grep -q "^${key}=" "$env_file"; then
        # Key exists, update it
        sed -i "s/^${key}=.*/${key}=${value}/" "$env_file"
    else
        # Key doesn't exist, add it
        echo "${key}=${value}" >> "$env_file"
    fi
}

# Main hardening function
main() {
    print_status "Starting PersonalEA Security Hardening..."
    echo
    
    # Check if we're in the right directory
    if [ ! -f "docker-compose.user.yml" ] && [ ! -f "docker-compose.yml" ]; then
        print_error "This script must be run from the PersonalEA root directory"
        exit 1
    fi
    
    # Check if .env file exists
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from template..."
        if [ -f ".env.user.example" ]; then
            cp .env.user.example .env
            print_success "Created .env from .env.user.example"
        else
            print_error ".env.user.example not found. Please create .env file manually."
            exit 1
        fi
    fi
    
    # Backup existing .env
    backup_env
    
    print_status "Generating new security secrets..."
    
    # Generate new secrets
    JWT_SECRET=$(generate_secret 32)
    ENCRYPTION_KEY=$(generate_secret 16)
    DB_PASSWORD=$(generate_secret 24)
    REDIS_PASSWORD=$(generate_secret 24)
    SESSION_SECRET=$(generate_secret 32)
    
    # Update .env file with new secrets
    print_status "Updating .env file with new secrets..."
    
    update_env_value "JWT_SECRET" "$JWT_SECRET"
    update_env_value "ENCRYPTION_KEY" "$ENCRYPTION_KEY"
    update_env_value "DB_PASSWORD" "$DB_PASSWORD"
    update_env_value "REDIS_PASSWORD" "$REDIS_PASSWORD"
    update_env_value "SESSION_SECRET" "$SESSION_SECRET"
    
    # Set secure defaults
    update_env_value "NODE_ENV" "production"
    update_env_value "SECURE_COOKIES" "true"
    update_env_value "FORCE_HTTPS" "true"
    update_env_value "RATE_LIMIT_ENABLED" "true"
    
    print_success "Updated .env file with new security secrets"
    
    # Display next steps
    echo
    print_status "Security hardening completed! Next steps:"
    echo
    echo "1. 🔐 Change default admin password:"
    echo "   - Login with: admin / personalea-admin-2024"
    echo "   - Go to Settings > Account > Change Password"
    echo
    echo "2. 🔄 Restart PersonalEA services:"
    echo "   docker compose down && docker compose up -d"
    echo
    echo "3. 🛡️ Enable 2FA (Two-Factor Authentication):"
    echo "   - Go to Settings > Security > Enable 2FA"
    echo "   - Scan QR code with your authenticator app"
    echo
    echo "4. ✅ Verify health after restart:"
    echo "   curl http://localhost:3000/health"
    echo
    echo "5. 🗑️ Remove backup files when satisfied:"
    echo "   rm .env.backup.*"
    echo
    
    print_warning "IMPORTANT: Save your new admin password in a secure location!"
    print_warning "The default password will no longer work after you change it."
    
    echo
    print_success "Security hardening script completed successfully!"
}

# Check for required tools
check_dependencies() {
    local missing_deps=()
    
    if ! command -v openssl &> /dev/null; then
        missing_deps+=("openssl")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing required dependencies: ${missing_deps[*]}"
        print_error "Please install the missing tools and try again."
        exit 1
    fi
}

# Show help
show_help() {
    echo "PersonalEA Security Hardening Script"
    echo
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  --dry-run      Show what would be changed without making changes"
    echo
    echo "This script will:"
    echo "  - Generate new JWT signing keys"
    echo "  - Rotate database passwords"
    echo "  - Create new encryption keys"
    echo "  - Set secure production defaults"
    echo "  - Backup your existing .env file"
    echo
    echo "After running this script, you must:"
    echo "  1. Change the default admin password"
    echo "  2. Restart PersonalEA services"
    echo "  3. Enable 2FA in the admin panel"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --dry-run)
            print_status "DRY RUN MODE - No changes will be made"
            DRY_RUN=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run the script
if [ "$DRY_RUN" = true ]; then
    print_status "DRY RUN: Would generate new secrets and update .env file"
    print_status "DRY RUN: Would backup existing .env file"
    print_status "DRY RUN: Would set secure production defaults"
else
    check_dependencies
    main
fi