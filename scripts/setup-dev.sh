#!/bin/bash

# PersonalEA Development Environment Setup Script
# This script sets up the development environment for the PersonalEA system

set -e

echo "🚀 Setting up PersonalEA Development Environment..."

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

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "Node.js $(node --version) is installed"
}

# Setup environment files
setup_env_files() {
    print_status "Setting up environment files..."
    
    # Root environment configuration (centralized secrets)
    if [ ! -f ".env" ]; then
        cp .env.example .env
        print_success "Created root .env file for centralized configuration"
        print_warning "Please edit .env and add your OpenAI API key and other secrets"
    else
        print_warning "Root .env file already exists"
    fi
    
    # Email Processing Service
    if [ ! -f "services/email-processing/.env" ]; then
        cp services/email-processing/.env.example services/email-processing/.env
        print_success "Created services/email-processing/.env"
    else
        print_warning "services/email-processing/.env already exists"
    fi
    
    # Goal Strategy Service
    if [ ! -f "services/goal-strategy/.env" ]; then
        cp services/goal-strategy/.env.example services/goal-strategy/.env
        print_success "Created services/goal-strategy/.env"
    else
        print_warning "services/goal-strategy/.env already exists"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Root dependencies
    if [ -f "package.json" ]; then
        npm install
        print_success "Installed root dependencies"
    fi
    
    # Email Processing Service
    if [ -f "services/email-processing/package.json" ]; then
        cd services/email-processing
        npm install
        cd ../..
        print_success "Installed email-processing service dependencies"
    fi
    
    # Shared Auth Library
    if [ -f "shared/auth/package.json" ]; then
        cd shared/auth
        npm install
        cd ../..
        print_success "Installed shared auth library dependencies"
    fi
    
    # Client Dev Kit
    if [ -f "client-dev-kit/package.json" ]; then
        cd client-dev-kit
        npm install
        cd ..
        print_success "Installed client-dev-kit dependencies"
    fi
}

# Build shared libraries
build_shared_libs() {
    print_status "Building shared libraries..."
    
    if [ -f "shared/auth/package.json" ]; then
        cd shared/auth
        npm run build
        cd ../..
        print_success "Built shared auth library"
    fi
}

# Start development services
start_services() {
    print_status "Starting development services with Docker Compose..."
    
    # Stop any existing services
    docker-compose -f docker-compose.dev.yml down
    
    # Start services
    docker-compose -f docker-compose.dev.yml up -d postgres redis
    
    print_success "Started PostgreSQL and Redis services"
    print_status "Waiting for services to be ready..."
    
    # Wait for services to be healthy
    sleep 10
    
    print_success "Development services are ready!"
}

# Display service information
show_service_info() {
    echo ""
    echo "🎉 Development environment setup complete!"
    echo ""
    echo "📋 Service Information:"
    echo "  • PostgreSQL: localhost:5432 (user: personalea, password: personalea_dev_password)"
    echo "  • Redis: localhost:6379"
    echo "  • Email Service: localhost:3001 (when started)"
    echo ""
    echo "🚀 Next Steps:"
    echo "  1. Configure your API keys in the root .env file:"
    echo "     nano .env  # Add your OpenAI API key and other secrets"
    echo ""
    echo "  2. Start the email processing service:"
    echo "     cd services/email-processing && npm run dev"
    echo ""
    echo "  3. Or start all services with Docker:"
    echo "     docker-compose -f docker-compose.dev.yml up"
    echo ""
    echo "  4. Test the API:"
    echo "     curl http://localhost:3001/health"
    echo ""
    echo "  5. View API documentation:"
    echo "     open docs/email-service-docs.html"
    echo ""
    echo "📚 Documentation:"
    echo "  • Secret Management Guide: docs/secret-management-guide.md"
    echo "  • Configuration Management: docs/configuration-management-plan.md"
    echo "  • Development Plan: docs/development-plan.md"
    echo "  • API Specs: docs/"
    echo "  • Service README: services/email-processing/README.md"
    echo ""
}

# Main execution
main() {
    echo "🔍 Checking prerequisites..."
    check_docker
    check_node
    
    echo ""
    echo "⚙️  Setting up development environment..."
    setup_env_files
    install_dependencies
    build_shared_libs
    start_services
    
    show_service_info
}

# Run main function
main "$@"